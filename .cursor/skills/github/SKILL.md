---
name: github
description: Sync GitHub PR activity and local git commits into daily notes as "Code Actions".
---

# GitHub Code Actions Skill

Sync GitHub PR activity (opened/merged) and **local** commit diffstats into `notes/daily/YYYY-MM-DD.md` under `## Code Actions`.

This is **local-only** and uses:
- `gh` (GitHub CLI) for PR metadata + diff stats
- `git` in your local clones for commit messages + `--numstat` totals

## Prerequisites

- `pnpm dev` not required (this runs as a script)
- GitHub CLI installed and authenticated:

```bash
gh auth status
```

- Local repo mapping file exists (machine-specific, git-ignored):
  - Copy template: `notes/github-repos.example.json` → `notes/github-repos.json`
  - Fill in `localPath` for each repo you want included.

## Run Sync

### Today

```bash
pnpm github:sync
```

### Specific date

```bash
pnpm github:sync -- --date 2026-01-30
```

### Custom mapping file path (optional)

```bash
pnpm github:sync -- --config /absolute/path/to/github-repos.json
```

## Output

The script prints a JSON summary like:
- `added`: new lines appended to the note (deduped)
- `skipped`: already-seen events
- `warnings`: per-repo errors (e.g. missing repo, gh auth)

## Notes

- Dedupe is stored in `notes/maxwell.db` (`integration_events` table). Re-running the sync is safe.
- Commits are bucketed by **local day** using `git log --since/--until` with local timestamps.

