---
name: github
description: Sync GitHub PR activity and local git commits into daily notes as "Code Actions".
---

# GitHub Code Actions Skill

Sync GitHub PR activity and local commits into daily notes.

## Prerequisites
- GitHub CLI installed and authenticated: `gh auth status`
- Repo mapping file: `notes/github-repos.json`

## Setup

Copy template and configure:
```bash
cp notes/github-repos.example.json notes/github-repos.json
```

Edit `notes/github-repos.json` to set `localPath` for each repo.

## Usage

### Sync Today
```bash
pnpm github:sync
```

### Sync Specific Date
```bash
pnpm github:sync -- --date 2026-01-30
```

### Custom Config Path
```bash
pnpm github:sync -- --config /path/to/github-repos.json
```

## Output

JSON summary with:
- `added` - New lines appended to daily note
- `skipped` - Already-seen events (deduped)
- `warnings` - Per-repo errors

## What It Syncs

- **PRs opened** - PRs you opened that day
- **PRs merged** - PRs you merged that day
- **Commits** - Local commits from that day
- **Git summary** - Daily totals (commits, additions, deletions, files touched)

## Notes

- Dedupe stored in `notes/maxwell.db` (`integration_events` table)
- Safe to re-run - won't create duplicates
- Commits bucketed by local day timestamps
