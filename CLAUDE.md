# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maxwell is a daily notes and task management application built with Next.js 16, React 19, and TypeScript. It uses file-based markdown storage for notes and tasks.

## Commands

```bash
pnpm dev      # Start development server (localhost:3000)
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

Package manager: pnpm 10.0.0 (required)

## Architecture

### Data Flow

1. **Home page (`/`)**: Reads date from `?date=YYYY-MM-DD` query param or defaults to today, fetches `notes/daily/{date}.md`, parses markdown into nested Task objects
2. **Projects (`/projects/[slug]`)**: Reads `notes/projects/{ProjectName}.md` with case-insensitive slug matching (dashes converted to spaces)

### Task Parsing (`src/lib/tasks/parse-tasks.ts`)

- Markdown bullets (`- Text`) become Task objects with nested children
- 4-space indentation for nesting
- Supports three link types in content:
  - Wiki links: `[[Project Name]]` → `/projects/{slug}`
  - Markdown links: `[text](url)`
  - Plain URLs

### Key Directories

- `notes/daily/` - Daily note files named `YYYY-MM-DD.md`
- `notes/projects/` - Project files
- `src/components/ui/` - shadcn/ui components (button, calendar, popover)
- `src/components/task-list/` - Task rendering components
- `src/lib/tasks/` - Task types and parsing logic

### Client Components

DatePicker, TaskItem, and Calendar are client components that handle user interactions and navigation.

## Styling

- Tailwind CSS 4 with OKLCh color palette
- CSS variables in `src/app/globals.css` for light/dark themes
- shadcn/ui with new-york style variant
- Path alias: `@/*` → `./src/*`

## Daily Notes Format

See `notes/README.md` for complete specification. Key points:
- Checkboxes (`- [ ]`) for commitments/tasks
- Bullets (`-`) for reviews/links under reserved headers
- Reserved headers (case-insensitive): review, links, reading, reference, watch, listen

## Skills

Skills are located in `.claude/skills/`. Each skill has a markdown file with usage instructions.

### gog (Google Workspace)
CLI for Gmail, Calendar, Sheets, and Docs. Use for sending emails, managing calendar events, reading/writing spreadsheets.
- See `.claude/skills/gog.md` for commands

### memory
Search and retrieve context from indexed notes. Call `initDb()` and `indexAll()` at start of interactions.
- `search(query)` - Full-text search across notes
- `buildContext({ entity?, date?, query? })` - Build relevant context
- `getPendingTasks()` - Get incomplete tasks
- See `.claude/skills/memory.md` for full API

### imsg (iMessage)
Triage iMessage/SMS messages via API endpoint.
- Triage: `curl "http://localhost:3000/api/imsg/triage?hours=8"`
- Send: `POST /api/imsg/send` with `{to, text, service}`
- Log actions: `POST /api/imsg/log` with `{action, contact, summary}`
- See `.claude/skills/imsg.md` for details

### email
Triage unread emails via API endpoint.
- Triage: `curl "http://localhost:3000/api/email/triage?hours=24"`
- Log actions: `POST /api/email/log` with `{action, from, subject}`
- Use `gog gmail drafts create` to save draft replies
- See `.claude/skills/email.md` for details

### slack
Triage Slack messages via API endpoint.
- Triage: `curl "http://localhost:3000/api/slack/triage?hours=8"`
- Send: `POST /api/slack/messages` with `{channel, text, threadTs?}`
- React: `POST /api/slack/react` with `{channel, timestamp, emoji}`
- Log actions: `POST /api/slack/log` with `{action, channel, user, text}`
- See `.claude/skills/slack.md` for details

### github
Sync GitHub PR activity and local commits into daily notes.
- Run: `pnpm github:sync`
- Specific date: `pnpm github:sync -- --date 2026-01-30`
- Configure repos in `notes/github-repos.json`
- See `.claude/skills/github.md` for details
