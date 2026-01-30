import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';
import type { GitHubReposConfig, GitHubRepoMapping } from './types';

export const DEFAULT_CONFIG_PATH = resolve(process.cwd(), 'notes', 'github-repos.json');

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) return resolve(os.homedir(), inputPath.slice(2));
  return inputPath;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRepoFullName(value: string): boolean {
  // Best-effort validation: "owner/repo"
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function validateRepoMapping(input: unknown, idx: number): GitHubRepoMapping {
  if (!input || typeof input !== 'object') {
    throw new Error(`Invalid repo mapping at index ${idx}: expected object`);
  }

  const maybe = input as Record<string, unknown>;
  const project = maybe.project;
  const repoFullName = maybe.repoFullName;
  const localPathRaw = maybe.localPath;

  if (!isNonEmptyString(project)) {
    throw new Error(`Invalid repo mapping at index ${idx}: "project" must be a non-empty string`);
  }
  if (!isNonEmptyString(repoFullName) || !isRepoFullName(repoFullName)) {
    throw new Error(
      `Invalid repo mapping at index ${idx}: "repoFullName" must look like "owner/repo"`
    );
  }
  if (!isNonEmptyString(localPathRaw)) {
    throw new Error(`Invalid repo mapping at index ${idx}: "localPath" must be a non-empty string`);
  }

  const localPath = expandTilde(localPathRaw);
  return {
    project: project.trim(),
    repoFullName: repoFullName.trim(),
    localPath,
  };
}

export function loadGitHubReposConfig(configPath: string = DEFAULT_CONFIG_PATH): GitHubReposConfig {
  const raw = readFileSync(configPath, 'utf-8');
  const data: unknown = JSON.parse(raw);

  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid GitHub repos config: expected object in ${configPath}`);
  }
  const maybe = data as Record<string, unknown>;
  if (maybe.version !== 1) {
    throw new Error(
      `Invalid GitHub repos config: expected { version: 1 } in ${configPath} (got ${String(
        maybe.version
      )})`
    );
  }
  if (!Array.isArray(maybe.repos)) {
    throw new Error(`Invalid GitHub repos config: "repos" must be an array in ${configPath}`);
  }

  const repos = maybe.repos.map((r, idx: number) => validateRepoMapping(r, idx));
  return { version: 1, repos };
}

