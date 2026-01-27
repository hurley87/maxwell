# Memory Skill

Search and retrieve context from indexed notes.

## When to Use
- Before sending emails: search for context about recipient/topic
- Before making decisions: check for past decisions on similar topics
- When asked about projects: retrieve project observations
- When asked "what did I..." questions: search activity history

## Indexing

Memories are captured from markdown files in `notes/daily/` and `notes/projects/`.

**IMPORTANT**: Call `indexAll()` at the start of agent interactions to ensure the index is current.

```typescript
import { initDb, indexAll } from '@/lib/memory';

// At start of interaction
initDb();
indexAll();
```

## Available Functions

Import from `src/lib/memory`:

### indexAll()
Reindex all notes. Call at the start of agent interactions to capture recent changes.

### search(query: string)
Full-text search across all notes. Returns SearchResult[] with matching entities and observations.

### buildContext({ entity?, date?, query?, recentDays?, includePendingTasks?, limit? })
Build relevant context for a topic/entity/date. Returns ContextResult with entities, observations, and formatted markdown context.

### getPendingTasks(entityId?)
Get incomplete tasks, optionally filtered by entity.

### findEntity(nameOrPermalink: string)
Find an entity by name or permalink. Returns Entity or null.

### getObservations(entityId: string)
Get all observations for a specific entity.

### getRecentActivity(days: number)
Get activity from the last N days.

## Example Usage

Before sending an email about Lazer:
1. Call `initDb()` and `indexAll()` to ensure index is current
2. Call `buildContext({ entity: 'lazer', recentDays: 7 })`
3. Include relevant context in the email draft

When asked "What do I know about Jackson?":
1. Call `search('Jackson')` or `buildContext({ query: 'Jackson' })`
2. Review the formatted context to understand past interactions

When asked "What are my pending tasks?":
1. Call `getPendingTasks()`
2. List the incomplete tasks
