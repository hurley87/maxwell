import { getDb } from './db';
import { search, findEntity, getObservations, getRecentActivity, getRelated, getPendingTasks, getActivityByDate, type SearchOptions } from './search';
import type { ContextResult, Entity, Observation } from './types';

export type ContextQuery = {
  query?: string;           // Free-text search
  entity?: string;          // Entity name/permalink
  date?: string;            // Specific date
  recentDays?: number;      // Activity in last N days
  includePendingTasks?: boolean;
  limit?: number;
  recency?: boolean;        // Enable recency-weighted ranking
  halfLifeDays?: number;    // Half-life in days for recency decay (default: 30)
};

/**
 * Build context for agent consumption
 */
export function buildContext(query: ContextQuery): ContextResult {
  const limit = query.limit || 50;
  const entities: Entity[] = [];
  const observations: Observation[] = [];
  const entitySet = new Set<string>();

  // If entity specified, get that entity and its observations
  if (query.entity) {
    const entity = findEntity(query.entity);
    if (entity) {
      entities.push(entity);
      entitySet.add(entity.id);
      
      const entityObs = getObservations(entity.id);
      observations.push(...entityObs.slice(0, limit));
      
      // Get related entities
      const related = getRelated(entity.id);
      for (const relEntity of related) {
        if (!entitySet.has(relEntity.id)) {
          entities.push(relEntity);
          entitySet.add(relEntity.id);
        }
      }
    }
  }

  // If query specified, search
  if (query.query) {
    const searchOptions: SearchOptions = {
      recency: query.recency,
      halfLifeDays: query.halfLifeDays,
    };
    const searchResults = search(query.query, limit, searchOptions);
    for (const result of searchResults) {
      if (!entitySet.has(result.entity.id)) {
        entities.push(result.entity);
        entitySet.add(result.entity.id);
      }
      observations.push(...result.observations);
    }
  }

  // If date specified, get activity for that date
  if (query.date) {
    const dateObs = getActivityByDate(query.date);
    observations.push(...dateObs);
  }

  // If recentDays specified, get recent activity
  if (query.recentDays) {
    const recentObs = getRecentActivity(query.recentDays);
    observations.push(...recentObs.slice(0, limit));
  }

  // If includePendingTasks, add pending tasks
  if (query.includePendingTasks) {
    const pending = query.entity 
      ? getPendingTasks(findEntity(query.entity)?.id)
      : getPendingTasks();
    observations.push(...pending.slice(0, 10)); // Limit pending tasks
  }

  // Deduplicate observations by ID
  const obsMap = new Map<string, Observation>();
  for (const obs of observations) {
    if (!obsMap.has(obs.id)) {
      obsMap.set(obs.id, obs);
    }
  }
  const uniqueObservations = Array.from(obsMap.values());

  // Sort observations by date (most recent first)
  uniqueObservations.sort((a, b) => {
    const dateCompare = b.createdAt.localeCompare(a.createdAt);
    if (dateCompare !== 0) return dateCompare;
    return a.sourceLine - b.sourceLine;
  });

  // Limit final results
  const finalObservations = uniqueObservations.slice(0, limit);

  // Format as markdown
  const formattedContext = formatContextAsMarkdown({
    entities,
    observations: finalObservations,
    formattedContext: '',
  });

  return {
    entities,
    observations: finalObservations,
    formattedContext,
  };
}

/**
 * Format context as markdown for injection into prompts
 */
export function formatContextAsMarkdown(result: ContextResult): string {
  const lines: string[] = [];

  // Group observations by entity
  const obsByEntity = new Map<string, Observation[]>();
  for (const obs of result.observations) {
    if (!obsByEntity.has(obs.entityId)) {
      obsByEntity.set(obs.entityId, []);
    }
    obsByEntity.get(obs.entityId)!.push(obs);
  }

  // Get entity names
  const entityMap = new Map<string, Entity>();
  for (const entity of result.entities) {
    entityMap.set(entity.id, entity);
  }

  // Format each entity's observations
  for (const [entityId, obsList] of obsByEntity.entries()) {
    const entity = entityMap.get(entityId);
    if (!entity) continue;

    lines.push(`## ${entity.name}`);
    lines.push('');

    // Group by date
    const obsByDate = new Map<string, Observation[]>();
    for (const obs of obsList) {
      if (!obsByDate.has(obs.createdAt)) {
        obsByDate.set(obs.createdAt, []);
      }
      obsByDate.get(obs.createdAt)!.push(obs);
    }

    // Sort dates descending
    const sortedDates = Array.from(obsByDate.keys()).sort().reverse();

    for (const date of sortedDates) {
      lines.push(`### ${date}`);
      for (const obs of obsByDate.get(date)!) {
        const prefix = obs.category === 'task' 
          ? (obs.completed ? '- [x]' : '- [ ]')
          : '-';
        lines.push(`${prefix} ${obs.content}`);
      }
      lines.push('');
    }
  }

  // Add pending tasks section if any
  const pendingTasks = result.observations.filter(o => o.category === 'task' && !o.completed);
  if (pendingTasks.length > 0) {
    lines.push('## Pending Tasks');
    lines.push('');
    for (const task of pendingTasks.slice(0, 10)) {
      const entity = entityMap.get(task.entityId);
      const entityName = entity ? ` (${entity.name})` : '';
      lines.push(`- [ ] ${task.content}${entityName}`);
    }
    lines.push('');
  }

  // Add related entities section
  if (result.entities.length > 1) {
    lines.push('## Related Entities');
    lines.push('');
    for (const entity of result.entities.slice(0, 10)) {
      lines.push(`- [[${entity.name}]]`);
    }
  }

  return lines.join('\n');
}
