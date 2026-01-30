---
name: memory
description: Search and retrieve context from indexed notes. Use before sending emails, making decisions, or when asked about projects and past activity.
---

# Memory Skill

Search and retrieve context from indexed notes.

## When to Use
- Before sending emails: search for context about recipient/topic
- Before making decisions: check for past decisions on similar topics
- When asked about projects: retrieve project observations
- When asked "what did I..." questions: search activity history

## Setup

Call at the start of agent interactions:

```typescript
import { initDb, indexAll } from '@/lib/memory';

initDb();
indexAll();
```

## Available Functions

Import from `src/lib/memory`:

- `indexAll()` - Reindex all notes
- `search(query: string)` - Full-text search across all notes
- `buildContext({ entity?, date?, query?, recentDays?, includePendingTasks?, limit? })` - Build relevant context
- `getPendingTasks(entityId?)` - Get incomplete tasks
- `findEntity(nameOrPermalink: string)` - Find an entity by name or permalink
- `getObservations(entityId: string)` - Get all observations for an entity
- `getRecentActivity(days: number)` - Get activity from the last N days

## Example Usage

Before sending an email about a project:
1. Call `initDb()` and `indexAll()`
2. Call `buildContext({ entity: 'project-name', recentDays: 7 })`
3. Include relevant context in the email draft
