import type { CodeActionEvent, GitCommit, PullRequestInfo } from './types';

function formatTimeHHmm(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '??:??';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function escapeQuotes(input: string): string {
  return input.replaceAll('"', '”').trim();
}

export function formatPrLine(args: {
  occurredAt: string;
  project: string;
  pr: PullRequestInfo;
  kind: 'pr_opened' | 'pr_merged';
}): string {
  const time = formatTimeHHmm(args.occurredAt);
  const title = escapeQuotes(args.pr.title);
  const files = args.pr.changedFiles;
  const additions = args.pr.additions;
  const deletions = args.pr.deletions;

  const statsParts: string[] = [];
  if (typeof additions === 'number' && typeof deletions === 'number') {
    statsParts.push(`+${additions}/-${deletions}`);
  }
  if (typeof files === 'number') {
    statsParts.push(`${files} files`);
  }

  const stats = statsParts.length > 0 ? ` (${statsParts.join(', ')})` : '';
  const status = args.kind === 'pr_merged' ? 'merged' : 'opened';

  return `- [${time}] [[${args.project}]] PR #${args.pr.number} "${title}"${stats} — ${status} ${args.pr.url}`;
}

export function formatCommitLine(args: {
  occurredAt: string;
  project: string;
  repoFullName: string;
  commit: GitCommit;
}): string {
  const time = formatTimeHHmm(args.occurredAt);
  const title = escapeQuotes(args.commit.subject);
  const shortSha = args.commit.sha.slice(0, 7);
  const { additions, deletions, filesChanged } = args.commit.diff;

  return `- [${time}] [[${args.project}]] commit ${shortSha} "${title}" (+${additions}/-${deletions}, ${filesChanged} files)`;
}

export function formatGitSummaryLine(args: {
  occurredAt: string;
  project: string;
  commits: number;
  additions: number;
  deletions: number;
  touchedFiles: number;
}): string {
  const time = formatTimeHHmm(args.occurredAt);
  return `- [${time}] [[${args.project}]] git: ${args.commits} commits, +${args.additions}/-${args.deletions}, touched ${args.touchedFiles} files`;
}

export function sortEventsByOccurredAt(events: CodeActionEvent[]): CodeActionEvent[] {
  return [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

