import type { GitCommit, GitDiffStat } from './types';
import { execFileText } from './exec';

function parseNumStat(output: string): GitDiffStat {
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;
  const touchedFiles: string[] = [];

  const lines = output.split('\n').map((l) => l.trimEnd()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [addStr, delStr, filePath] = parts;

    const add = addStr === '-' ? 0 : Number.parseInt(addStr, 10);
    const del = delStr === '-' ? 0 : Number.parseInt(delStr, 10);

    if (!Number.isNaN(add)) additions += add;
    if (!Number.isNaN(del)) deletions += del;

    filesChanged += 1;
    touchedFiles.push(filePath);
  }

  return { additions, deletions, filesChanged, touchedFiles };
}

function getLocalDayRangeArgs(date: string): { since: string; until: string } {
  // Keep these in local time. `git log --since/--until` parses them as local timestamps.
  return { since: `${date}T00:00:00`, until: `${date}T23:59:59` };
}

export async function listCommitsForDate(args: {
  repoPath: string;
  date: string; // YYYY-MM-DD
  limit?: number;
}): Promise<Array<{ sha: string; committedAt: string; subject: string }>> {
  const { since, until } = getLocalDayRangeArgs(args.date);
  const limit = args.limit ?? 200;

  // Format: sha \t ISO \t subject
  const { stdout } = await execFileText(
    'git',
    [
      'log',
      `--since=${since}`,
      `--until=${until}`,
      '--pretty=format:%H%x09%cI%x09%s',
      `-n`,
      String(limit),
    ],
    { cwd: args.repoPath }
  );

  const lines = stdout.split('\n').filter(Boolean);
  return lines
    .map((line) => {
      const [sha, committedAt, subject] = line.split('\t');
      if (!sha || !committedAt) return null;
      return { sha, committedAt, subject: subject ?? '' };
    })
    .filter((x): x is { sha: string; committedAt: string; subject: string } => Boolean(x));
}

export async function getCommitDiffStat(args: { repoPath: string; sha: string }): Promise<GitDiffStat> {
  const { stdout } = await execFileText('git', ['show', '--numstat', '--format=', args.sha], {
    cwd: args.repoPath,
  });
  return parseNumStat(stdout);
}

export async function collectCommitsWithStats(args: {
  repoPath: string;
  date: string;
  limit?: number;
}): Promise<GitCommit[]> {
  const commits = await listCommitsForDate(args);
  const results: GitCommit[] = [];

  for (const commit of commits) {
    const diff = await getCommitDiffStat({ repoPath: args.repoPath, sha: commit.sha });
    results.push({
      sha: commit.sha,
      committedAt: commit.committedAt,
      subject: commit.subject,
      diff,
    });
  }

  return results;
}

