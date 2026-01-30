# RESET.md - Operational Recovery

This file restores full operational awareness after context resets. Read this first.

## What This Repo Is

Maxwell is a daily notes and task management application. It's also a personal memory system for AI agents that triage email, Slack, and iMessage, and track GitHub activity.

## Memory System

**Primary source**: Markdown notes in `notes/daily/` (YYYY-MM-DD.md) and `notes/projects/`.

**How to refresh memory**:
1. Initialize DB: `initDb()` from `@/lib/memory`
2. Index all notes: `indexAll()` (only reindexes changed files)
3. Query: `buildContext({ query, entity, recentDays, recency: true })` or `search(query)`

**Memory API**: `GET /api/memory/search?q=...&context=true&days=7&recency=true`

## Key Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm github:sync      # Sync GitHub PRs/commits to daily notes
pnpm memory:index     # Reindex all notes
```

## Triage Endpoints

- **Email**: `GET /api/email/triage?hours=24`
- **Slack**: `GET /api/slack/triage?hours=8`
- **iMessage**: `GET /api/imsg/triage?hours=8`

All triage endpoints classify messages and generate draft replies. Always log actions after taking them.

## GitHub Sync

- Config: `notes/github-repos.json`
- Syncs PR opened/merged + local commits → `## Code Actions` in daily notes
- Uses stable IDs for dedupe (`integration_events` table)
- Run `pnpm github:sync` to capture today's activity

## Safety Rules

- **Never commit secrets**: Credentials in `.env.local` (gitignored)
- **Never auto-send/unsubscribe**: Always ask user before sending messages or unsubscribing
- **Always log actions**: After email/slack/imsg actions, call the log endpoint so it becomes memory

## Workflow

When triaging comms or working on code:
1. Read `MEMORY.md` for stable preferences
2. Call `initDb()` + `indexAll()` to refresh memory
3. Use `buildContext()` to get relevant past context
4. After actions, log them so they become memory
