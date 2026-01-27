import { getDb } from './db';
import type { Entity, Observation, SearchResult } from './types';

/**
 * Full-text search across all observations
 */
export function search(query: string, limit: number = 20): SearchResult[] {
  const db = getDb();
  
  // Search FTS5 table
  const ftsResults = db.prepare(`
    SELECT m.observation_id, fts.rank
    FROM observations_fts fts
    JOIN observations_fts_map m ON fts.rowid = m.fts_rowid
    WHERE observations_fts MATCH ?
    ORDER BY fts.rank
    LIMIT ?
  `).all(query, limit) as Array<{ observation_id: string; rank: number }>;

  // Group observations by entity
  const entityMap = new Map<string, { entity: Entity; observations: Observation[]; score: number }>();

  for (const ftsResult of ftsResults) {
    const obs = db.prepare(`
      SELECT o.*, e.id as entity_id, e.name as entity_name, e.kind as entity_kind,
             e.permalink as entity_permalink, e.first_seen as entity_first_seen,
             e.last_seen as entity_last_seen, e.mention_count as entity_mention_count
      FROM observations o
      JOIN entities e ON o.entity_id = e.id
      WHERE o.id = ?
    `).get(ftsResult.observation_id) as any;

    if (!obs) continue;

    const entity: Entity = {
      id: obs.entity_id,
      name: obs.entity_name,
      kind: obs.entity_kind,
      permalink: obs.entity_permalink,
      firstSeen: obs.entity_first_seen,
      lastSeen: obs.entity_last_seen,
      mentionCount: obs.entity_mention_count,
    };

    const observation: Observation = {
      id: obs.id,
      entityId: obs.entity_id,
      category: obs.category,
      content: obs.content,
      sourceFile: obs.source_file,
      sourceLine: obs.source_line,
      createdAt: obs.created_at,
      completed: obs.completed !== null ? Boolean(obs.completed) : undefined,
    };

    if (!entityMap.has(entity.id)) {
      entityMap.set(entity.id, { entity, observations: [], score: 0 });
    }

    const entry = entityMap.get(entity.id)!;
    entry.observations.push(observation);
    // Use best (lowest) rank as score (lower rank = better match)
    entry.score = Math.min(entry.score || Infinity, ftsResult.rank);
  }

  // Convert to SearchResult array and sort by score
  return Array.from(entityMap.values())
    .map(({ entity, observations, score }) => ({ entity, observations, score }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Find entity by name or permalink
 */
export function findEntity(nameOrPermalink: string): Entity | null {
  const db = getDb();
  const permalink = nameOrPermalink.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  const result = db.prepare(`
    SELECT * FROM entities
    WHERE permalink = ? OR name LIKE ?
    LIMIT 1
  `).get(permalink, `%${nameOrPermalink}%`) as any;

  if (!result) return null;

  return {
    id: result.id,
    name: result.name,
    kind: result.kind,
    permalink: result.permalink,
    firstSeen: result.first_seen,
    lastSeen: result.last_seen,
    mentionCount: result.mention_count,
  };
}

/**
 * Get all observations for an entity
 */
export function getObservations(entityId: string): Observation[] {
  const db = getDb();
  
  const results = db.prepare(`
    SELECT * FROM observations
    WHERE entity_id = ?
    ORDER BY created_at DESC, source_line ASC
  `).all(entityId) as any[];

  return results.map(obs => ({
    id: obs.id,
    entityId: obs.entity_id,
    category: obs.category,
    content: obs.content,
    sourceFile: obs.source_file,
    sourceLine: obs.source_line,
    createdAt: obs.created_at,
    completed: obs.completed !== null ? Boolean(obs.completed) : undefined,
  }));
}

/**
 * Get activity for a specific date
 */
export function getActivityByDate(date: string): Observation[] {
  const db = getDb();
  
  // Find date entity
  const dateEntity = db.prepare(`
    SELECT id FROM entities
    WHERE kind = 'date' AND name = ?
  `).get(date) as { id: string } | undefined;

  if (!dateEntity) return [];

  // Get observations for that date entity
  const results = db.prepare(`
    SELECT * FROM observations
    WHERE entity_id = ?
    ORDER BY source_line ASC
  `).all(dateEntity.id) as any[];

  return results.map(obs => ({
    id: obs.id,
    entityId: obs.entity_id,
    category: obs.category,
    content: obs.content,
    sourceFile: obs.source_file,
    sourceLine: obs.source_line,
    createdAt: obs.created_at,
    completed: obs.completed !== null ? Boolean(obs.completed) : undefined,
  }));
}

/**
 * Get activity in a date range
 */
export function getActivityInRange(start: string, end: string): Observation[] {
  const db = getDb();
  
  const results = db.prepare(`
    SELECT o.* FROM observations o
    WHERE o.created_at >= ? AND o.created_at <= ?
    ORDER BY o.created_at DESC, o.source_line ASC
  `).all(start, end) as any[];

  return results.map(obs => ({
    id: obs.id,
    entityId: obs.entity_id,
    category: obs.category,
    content: obs.content,
    sourceFile: obs.source_file,
    sourceLine: obs.source_line,
    createdAt: obs.created_at,
    completed: obs.completed !== null ? Boolean(obs.completed) : undefined,
  }));
}

/**
 * Get recent activity (last N days)
 */
export function getRecentActivity(days: number): Observation[] {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];
  
  return getActivityInRange(cutoff, new Date().toISOString().split('T')[0]);
}

/**
 * Get related entities via relations
 */
export function getRelated(entityId: string, depth: number = 1): Entity[] {
  const db = getDb();
  
  // Simple one-hop relation traversal
  const results = db.prepare(`
    SELECT DISTINCT e.* FROM entities e
    JOIN relations r ON (r.from_entity_id = e.id OR r.to_entity_id = e.id)
    WHERE (r.from_entity_id = ? OR r.to_entity_id = ?)
      AND e.id != ?
    LIMIT 20
  `).all(entityId, entityId, entityId) as any[];

  return results.map(e => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    permalink: e.permalink,
    firstSeen: e.first_seen,
    lastSeen: e.last_seen,
    mentionCount: e.mention_count,
  }));
}

/**
 * Get pending tasks (incomplete tasks)
 */
export function getPendingTasks(entityId?: string): Observation[] {
  const db = getDb();
  
  let query = `
    SELECT * FROM observations
    WHERE category = 'task' AND (completed IS NULL OR completed = 0)
  `;
  
  const params: any[] = [];
  if (entityId) {
    query += ' AND entity_id = ?';
    params.push(entityId);
  }
  
  query += ' ORDER BY created_at DESC, source_line ASC';
  
  const results = db.prepare(query).all(...params) as any[];

  return results.map(obs => ({
    id: obs.id,
    entityId: obs.entity_id,
    category: obs.category,
    content: obs.content,
    sourceFile: obs.source_file,
    sourceLine: obs.source_line,
    createdAt: obs.created_at,
    completed: obs.completed !== null ? Boolean(obs.completed) : undefined,
  }));
}
