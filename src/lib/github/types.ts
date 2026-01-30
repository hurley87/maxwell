export type GitHubRepoMapping = {
  /** Wiki-link project name, e.g. "Maxwell" for [[Maxwell]] */
  project: string;
  /** GitHub repo full name, e.g. "owner/repo" */
  repoFullName: string;
  /** Absolute path to local clone of the repo */
  localPath: string;
};

export type GitHubReposConfig = {
  version: 1;
  repos: GitHubRepoMapping[];
};

export type CodeActionKind = 'pr_opened' | 'pr_merged' | 'commit' | 'git_summary';

export type CodeActionEvent = {
  /**
   * Stable unique ID for dedupe.
   * Examples:
   * - pr_opened:owner/repo#123
   * - pr_merged:owner/repo#123
   * - commit:owner/repo@<sha>
   * - git_summary:owner/repo:YYYY-MM-DD
   */
  id: string;
  kind: CodeActionKind;
  date: string; // YYYY-MM-DD bucket
  occurredAt: string; // ISO timestamp
  project: string; // wiki-link name
  repoFullName: string;
  /**
   * A single markdown bullet line (without trailing newline).
   * This should include `[[Project]]` so memory indexing attributes it.
   */
  line: string;
  payload?: Record<string, unknown>;
};

export type GitDiffStat = {
  additions: number;
  deletions: number;
  filesChanged: number;
  touchedFiles: string[];
};

export type GitCommit = {
  sha: string;
  committedAt: string; // ISO timestamp
  subject: string;
  diff: GitDiffStat;
};

export type PullRequestInfo = {
  repoFullName: string;
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  isDraft?: boolean;
  createdAt?: string;
  mergedAt?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
};

export type SyncResult = {
  date: string;
  added: number;
  skipped: number;
  warnings: string[];
};

