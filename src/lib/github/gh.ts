import type { PullRequestInfo } from './types';
import { execFileJson } from './exec';

type GhSearchPr = {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  createdAt?: string;
  mergedAt?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  isDraft?: boolean;
  repository?: { nameWithOwner?: string };
};

function normalizeRepoFullName(repoFullName: string): string {
  return repoFullName.trim();
}

function toPullRequestInfo(repoFullName: string, pr: GhSearchPr): PullRequestInfo {
  return {
    repoFullName: normalizeRepoFullName(repoFullName),
    number: pr.number,
    title: pr.title ?? '',
    url: pr.url ?? '',
    state: pr.state,
    isDraft: pr.isDraft,
    createdAt: pr.createdAt,
    mergedAt: pr.mergedAt,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
  };
}

async function searchPrs(args: {
  repoFullName: string;
  query: string;
  limit: number;
}): Promise<PullRequestInfo[]> {
  const repoFullName = normalizeRepoFullName(args.repoFullName);
  const q = `repo:${repoFullName} is:pr author:@me ${args.query}`.trim();

  const results = await execFileJson<GhSearchPr[]>('gh', [
    'search',
    'prs',
    q,
    '--limit',
    String(args.limit),
    '--json',
    'number,title,url,state,createdAt,mergedAt,additions,deletions,changedFiles,isDraft',
  ]);

  return (results ?? []).map((pr) => toPullRequestInfo(repoFullName, pr));
}

/**
 * Fetch PRs opened and merged on a given date (YYYY-MM-DD) for a repo.
 */
export async function fetchPrActivityForDate(args: {
  repoFullName: string;
  date: string;
  limit?: number;
}): Promise<{ opened: PullRequestInfo[]; merged: PullRequestInfo[] }> {
  const limit = args.limit ?? 50;
  const date = args.date;

  const [opened, merged] = await Promise.all([
    searchPrs({ repoFullName: args.repoFullName, query: `created:${date}`, limit }),
    searchPrs({ repoFullName: args.repoFullName, query: `merged:${date}`, limit }),
  ]);

  return { opened, merged };
}

