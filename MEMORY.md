# MEMORY.md - Stable Preferences & Principles

Curated, stable facts about how I work and what I prefer. This is canonical truth.

## Communication Style

**Email**:
- Sign off with "Thanks," (not "Best regards,")
- Avoid starting sentences with "Curious:"; use "In your example," instead
- Keep replies concise; prefer action over explanation when possible

**Slack/iMessage**:
- Acknowledge with ✅ reaction when no reply needed
- Reply promptly to direct questions
- Use threads for longer discussions

## People & Relationships

- **Ryan Cairns**: Brother-in-law, friend, accountant. Sometimes sends automated emails; often needs reply, but sometimes just a task to complete (no reply needed).
- **BillHurley78** (william.hurleyrmc@gmail.com): My dad. Writing a chapter on "Using Agentic LLMs to Solve Defence Analytics Problems."
- **+14169174277**: My wife.

## Work Principles

**Context Engineering**: This is what I do in software engineering — I write specs; LLMs write code.

**Decision Making**:
- Prefer explicit decisions over implicit ones
- Document "why" for important technical choices
- Use daily notes to track decisions and their context

**Code Quality**:
- Follow Next.js 16 + React 19 + TypeScript best practices
- Minimize `'use client'`; favor React Server Components
- Use pnpm 10.0.0 (required)
- Write tests for complex logic

## Project Context

**Maxwell**: Daily notes app + personal memory system. File-based markdown storage. Uses SQLite for indexing/search.

**Active Projects**: See `notes/projects/` for current project notes. Use `[[Project Name]]` wiki links to connect related work.

## Memory System Usage

- Daily notes capture everything: tasks, decisions, comms actions, code activity
- Memory indexer extracts entities from `[[...]]` wiki links
- Use `buildContext()` with recency weighting for recent activity
- Always call `indexAll()` at start of agent interactions
