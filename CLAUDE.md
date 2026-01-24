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
