import { initDb, getDb } from '@/lib/memory';
import type { CodeActionEvent, GitHubRepoMapping, SyncResult } from './types';
import { loadGitHubReposConfig, DEFAULT_CONFIG_PATH } from './config';
import { fetchPrActivityForDate } from './gh';
import { collectCommitsWithStats } from './git';
import { appendCodeActionsToDailyNote } from './notes';
import { formatCommitLine, formatGitSummaryLine, formatPrLine, sortEventsByOccurredAt } from './format';

function todayLocalDate(): string {
  return new Date().toISOString().split('T')[0];
}

function stablePrId(kind: 'pr_opened' | 'pr_merged', repoFullName: string, number: number): string {
  return `${kind}:${repoFullName}#${number}`;
}

function stableCommitId(repoFullName: string, sha: string): string {
  return `commit:${repoFullName}@${sha}`;
}

function stableGitSummaryId(repoFullName: string, date: string): string {
  return `git_summary:${repoFullName}:${date}`;
}

function insertEventsDedupe(events: CodeActionEvent[]): { added: CodeActionEvent[]; skipped: CodeActionEvent[] } {
  const db = getDb();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO integration_events
      (id, date, occurred_at, project, repo, kind, line, payload_json)
    VALUES
      (?,  ?,    ?,          ?,       ?,    ?,    ?,    ?)
  `);

  const added: CodeActionEvent[] = [];
  const skipped: CodeActionEvent[] = [];

  for (const event of events) {
    const payloadJson = event.payload ? JSON.stringify(event.payload) : null;
    const info = insert.run(
      event.id,
      event.date,
      event.occurredAt,
      event.project,
      event.repoFullName,
      event.kind,
      event.line,
      payloadJson
    );

    if (info.changes === 1) {
      added.push(event);
    } else {
      skipped.push(event);
    }
  }

  return { added, skipped };
}

async function buildEventsForRepo(args: {
  date: string;
  mapping: GitHubRepoMapping;
}): Promise<{ events: CodeActionEvent[]; warnings: string[] }> {
  const { date, mapping } = args;
  const warnings: string[] = [];
  const events: CodeActionEvent[] = [];

  // PR activity via gh
  try {
    const prActivity = await fetchPrActivityForDate({ repoFullName: mapping.repoFullName, date });

    for (const pr of prActivity.opened) {
      const occurredAt = pr.createdAt ?? new Date().toISOString();
      events.push({
        id: stablePrId('pr_opened', mapping.repoFullName, pr.number),
        kind: 'pr_opened',
        date,
        occurredAt,
        project: mapping.project,
        repoFullName: mapping.repoFullName,
        line: formatPrLine({ occurredAt, project: mapping.project, pr, kind: 'pr_opened' }),
        payload: pr,
      });
    }

    for (const pr of prActivity.merged) {
      const occurredAt = pr.mergedAt ?? new Date().toISOString();
      events.push({
        id: stablePrId('pr_merged', mapping.repoFullName, pr.number),
        kind: 'pr_merged',
        date,
        occurredAt,
        project: mapping.project,
        repoFullName: mapping.repoFullName,
        line: formatPrLine({ occurredAt, project: mapping.project, pr, kind: 'pr_merged' }),
        payload: pr,
      });
    }
  } catch (error) {
    warnings.push(
      `PR sync failed for ${mapping.repoFullName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Local commits + git summary
  try {
    const commits = await collectCommitsWithStats({ repoPath: mapping.localPath, date });

    let totalAdd = 0;
    let totalDel = 0;
    const touchedFiles = new Set<string>();

    for (const commit of commits) {
      totalAdd += commit.diff.additions;
      totalDel += commit.diff.deletions;
      for (const f of commit.diff.touchedFiles) touchedFiles.add(f);

      events.push({
        id: stableCommitId(mapping.repoFullName, commit.sha),
        kind: 'commit',
        date,
        occurredAt: commit.committedAt,
        project: mapping.project,
        repoFullName: mapping.repoFullName,
        line: formatCommitLine({
          occurredAt: commit.committedAt,
          project: mapping.project,
          repoFullName: mapping.repoFullName,
          commit,
        }),
        payload: commit,
      });
    }

    if (commits.length > 0) {
      const occurredAt = new Date(`${date}T23:59:59`).toISOString();
      events.push({
        id: stableGitSummaryId(mapping.repoFullName, date),
        kind: 'git_summary',
        date,
        occurredAt,
        project: mapping.project,
        repoFullName: mapping.repoFullName,
        line: formatGitSummaryLine({
          occurredAt,
          project: mapping.project,
          commits: commits.length,
          additions: totalAdd,
          deletions: totalDel,
          touchedFiles: touchedFiles.size,
        }),
        payload: { commits: commits.length, additions: totalAdd, deletions: totalDel, touchedFiles: touchedFiles.size },
      });
    }
  } catch (error) {
    warnings.push(
      `Local git sync failed for ${mapping.repoFullName} (${mapping.localPath}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return { events, warnings };
}

export async function syncGitHubCodeActions(args?: {
  date?: string;
  configPath?: string;
}): Promise<SyncResult> {
  const date = args?.date ?? todayLocalDate();
  const configPath = args?.configPath ?? DEFAULT_CONFIG_PATH;

  // Ensure DB + tables exist
  initDb();

  const config = loadGitHubReposConfig(configPath);
  const warnings: string[] = [];
  const allEvents: CodeActionEvent[] = [];

  for (const mapping of config.repos) {
    const { events, warnings: repoWarnings } = await buildEventsForRepo({ date, mapping });
    allEvents.push(...events);
    warnings.push(...repoWarnings);
  }

  const sorted = sortEventsByOccurredAt(allEvents);
  const { added, skipped } = insertEventsDedupe(sorted);

  // Append only newly-added events to the daily note
  const linesToAppend = added.map((e) => `${e.line} <!-- ${e.id} -->`);
  await appendCodeActionsToDailyNote({ date, lines: linesToAppend });

  return {
    date,
    added: added.length,
    skipped: skipped.length,
    warnings,
  };
}

