import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { getDb } from './db';
import type { Entity, Observation, Relation } from './types';

/**
 * Generate a permalink from a name (lowercase, spaces to dashes)
 */
function toPermalink(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Generate entity ID from permalink
 */
function entityId(permalink: string): string {
  // Remove 'entity:' prefix if present to avoid double prefixing
  const cleanPermalink = permalink.startsWith('entity:') ? permalink.slice(7) : permalink;
  return `entity:${cleanPermalink}`;
}

/**
 * Generate observation ID
 */
function observationId(entityId: string, lineNumber: number, content: string): string {
  const hash = createHash('md5').update(`${entityId}:${lineNumber}:${content}`).digest('hex').slice(0, 8);
  return `obs:${hash}`;
}

/**
 * Generate relation ID
 */
function relationId(fromId: string, toId: string, type: string): string {
  const hash = createHash('md5').update(`${fromId}:${toId}:${type}`).digest('hex').slice(0, 8);
  return `rel:${hash}`;
}

/**
 * Extract date from filename (YYYY-MM-DD.md)
 */
function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  return match ? match[1] : null;
}

/**
 * Detect observation category from content
 */
function detectCategory(content: string, isCheckbox: boolean, isUnderReservedHeader: boolean): 'task' | 'decision' | 'note' | 'link' | 'question' | 'reference' {
  if (isCheckbox) return 'task';
  if (isUnderReservedHeader) return 'reference';
  if (/^https?:\/\//.test(content.trim())) return 'link';
  if (content.trim().endsWith('?')) return 'question';
  if (/\b(decided|chose|will use|going to use)\b/i.test(content)) return 'decision';
  return 'note';
}

/**
 * Extract wiki links from content
 */
function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  return matches.map(m => m.slice(2, -2)); // Remove [[ and ]]
}

/**
 * Extract URLs from content
 */
function extractUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const matches = content.match(urlRegex);
  return matches || [];
}

/**
 * Check if content is a checkbox
 */
function isCheckbox(content: string): { isCheckbox: boolean; completed: boolean } {
  const checkboxMatch = content.match(/^-\s+\[([ x])\]\s+(.+)$/);
  if (checkboxMatch) {
    return { isCheckbox: true, completed: checkboxMatch[1] === 'x' };
  }
  return { isCheckbox: false, completed: false };
}

/**
 * Parse a markdown note and extract entities, observations, and relations
 */
export function indexNote(filePath: string): void {
  const db = getDb();
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const dateFromFilename = extractDateFromFilename(filePath.split('/').pop() || '');
  const createdAt = dateFromFilename || new Date().toISOString().split('T')[0];

  // Track current entity context (when we're under a [[Entity]] header)
  let currentEntityId: string | null = null;
  let currentEntityName: string | null = null;
  let reservedHeader = false;
  const reservedHeaders = ['review', 'links', 'reading', 'reference', 'watch', 'listen'];

  // Track parent-child relationships
  const parentStack: Array<{ entityId: string; depth: number }> = [];

  // Create date entity if we have a date
  if (dateFromFilename) {
    const datePermalink = `date:${dateFromFilename}`;
    const dateId = entityId(datePermalink);
    const dateEntity: Entity = {
      id: dateId,
      name: dateFromFilename,
      kind: 'date',
      permalink: datePermalink,
      firstSeen: createdAt,
      lastSeen: createdAt,
      mentionCount: 1,
    };
    
    db.prepare(`
      INSERT INTO entities (id, name, kind, permalink, first_seen, last_seen, mention_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_seen = excluded.last_seen,
        mention_count = mention_count + 1
    `).run(
      dateEntity.id,
      dateEntity.name,
      dateEntity.kind,
      dateEntity.permalink,
      dateEntity.firstSeen,
      dateEntity.lastSeen,
      dateEntity.mentionCount
    );
  }

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmed = line.trim();

    // Check for reserved headers
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').toLowerCase();
      reservedHeader = reservedHeaders.includes(headerText);
      continue;
    }

    // Match bullet pattern: leading whitespace, "- ", then content
    const bulletMatch = line.match(/^(\s*)- (.+)$/);
    if (!bulletMatch) continue;

    const [, indent, content] = bulletMatch;
    const depth = Math.floor(indent.length / 4);

    // Check if this is a checkbox
    const { isCheckbox: isCheck, completed } = isCheckbox(content);
    const actualContent = isCheck ? content.replace(/^-\s+\[[ x]\]\s+/, '') : content.replace(/^-\s+/, '');

    // Extract wiki links from this line
    const wikiLinks = extractWikiLinks(actualContent);
    
    // Extract URLs
    const urls = extractUrls(actualContent);

    // Process wiki links as entities
    for (const linkName of wikiLinks) {
      const permalink = toPermalink(linkName);
      const eId = entityId(permalink);
      
      // Check if entity exists
      const existing = db.prepare('SELECT * FROM entities WHERE id = ?').get(eId) as Entity | undefined;
      
      if (existing) {
        // Update last seen and mention count
        db.prepare(`
          UPDATE entities 
          SET last_seen = ?, mention_count = mention_count + 1 
          WHERE id = ?
        `).run(createdAt, eId);
      } else {
        // Create new entity
        const entity: Entity = {
          id: eId,
          name: linkName,
          kind: 'project',
          permalink,
          firstSeen: createdAt,
          lastSeen: createdAt,
          mentionCount: 1,
        };
        
        db.prepare(`
          INSERT INTO entities (id, name, kind, permalink, first_seen, last_seen, mention_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          entity.id,
          entity.name,
          entity.kind,
          entity.permalink,
          entity.firstSeen,
          entity.lastSeen,
          entity.mentionCount
        );
      }

      // If this is a root-level wiki link, set it as current entity context
      if (depth === 0) {
        currentEntityId = eId;
        currentEntityName = linkName;
        // Clear parent stack at root level
        parentStack.length = 0;
        parentStack.push({ entityId: eId, depth: 0 });
      } else {
        // Nested entity - create child_of relation
        if (parentStack.length > 0) {
          const parent = parentStack[parentStack.length - 1];
          const relId = relationId(parent.entityId, eId, 'child_of');
          db.prepare(`
            INSERT OR IGNORE INTO relations (id, from_entity_id, to_entity_id, relation_type, source_file, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(relId, parent.entityId, eId, 'child_of', filePath, createdAt);
        }
        // Add to stack
        parentStack.push({ entityId: eId, depth });
      }
    }

    // Process URLs as entities
    for (const url of urls) {
      const urlPermalink = `url:${createHash('md5').update(url).digest('hex').slice(0, 12)}`;
      const urlId = entityId(urlPermalink);
      
      const existing = db.prepare('SELECT * FROM entities WHERE id = ?').get(urlId) as Entity | undefined;
      
      if (!existing) {
        const urlEntity: Entity = {
          id: urlId,
          name: url,
          kind: 'url',
          permalink: urlPermalink,
          firstSeen: createdAt,
          lastSeen: createdAt,
          mentionCount: 1,
        };
        
        db.prepare(`
          INSERT INTO entities (id, name, kind, permalink, first_seen, last_seen, mention_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          urlEntity.id,
          urlEntity.name,
          urlEntity.kind,
          urlEntity.permalink,
          urlEntity.firstSeen,
          urlEntity.lastSeen,
          urlEntity.mentionCount
        );
      }

      // Link URL to current entity if we have one
      if (currentEntityId) {
        const relId = relationId(currentEntityId, urlId, 'references');
        db.prepare(`
          INSERT OR IGNORE INTO relations (id, from_entity_id, to_entity_id, relation_type, source_file, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(relId, currentEntityId, urlId, 'references', filePath, createdAt);
      }
    }

    // Create observation for this line
    // Determine which entity this observation belongs to
    let observationEntityId: string;
    if (currentEntityId) {
      observationEntityId = currentEntityId;
    } else if (dateFromFilename) {
      // If no entity context, attach to date entity
      observationEntityId = entityId(`date:${dateFromFilename}`);
    } else {
      // Skip if no entity context and no date
      continue;
    }

    const category = detectCategory(actualContent, isCheck, reservedHeader);
    const obsId = observationId(observationEntityId, lineNum, actualContent);

    const observation: Observation = {
      id: obsId,
      entityId: observationEntityId,
      category,
      content: actualContent,
      sourceFile: filePath,
      sourceLine: lineNum,
      createdAt,
      completed: isCheck ? completed : undefined,
    };

    // Insert observation (FTS5 trigger will handle FTS5 insert)
    db.prepare(`
      INSERT OR REPLACE INTO observations (id, entity_id, category, content, source_file, source_line, created_at, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      observation.id,
      observation.entityId,
      observation.category,
      observation.content,
      observation.sourceFile,
      observation.sourceLine,
      observation.createdAt,
      observation.completed ?? null
    );

    // Update parent stack for nesting
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= depth) {
      parentStack.pop();
    }
    if (parentStack.length > 0 && currentEntityId) {
      parentStack.push({ entityId: currentEntityId, depth });
    }
  }

  // Update notes table
  const hash = createHash('md5').update(content).digest('hex');
  db.prepare(`
    INSERT OR REPLACE INTO notes (path, hash, indexed_at)
    VALUES (?, ?, ?)
  `).run(filePath, hash, new Date().toISOString());
}

/**
 * Index all notes in daily/ and projects/ directories
 * Only reindexes files that have changed (based on hash comparison)
 */
export function indexAll(): void {
  const db = getDb();
  const notesDir = join(process.cwd(), 'notes');
  const dailyDir = join(notesDir, 'daily');
  const projectsDir = join(notesDir, 'projects');

  // Get existing indexed files
  const indexedFiles = new Map<string, string>();
  const existing = db.prepare('SELECT path, hash FROM notes').all() as Array<{ path: string; hash: string }>;
  for (const row of existing) {
    indexedFiles.set(row.path, row.hash);
  }

  // Index daily notes
  if (statSync(dailyDir).isDirectory()) {
    const dailyFiles = readdirSync(dailyDir).filter(f => f.endsWith('.md'));
    for (const file of dailyFiles) {
      const filePath = join(dailyDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const hash = createHash('md5').update(content).digest('hex');
      
      // Only index if file is new or changed
      if (indexedFiles.get(filePath) !== hash) {
        indexNote(filePath);
      }
    }
  }

  // Index project notes
  if (statSync(projectsDir).isDirectory()) {
    const projectFiles = readdirSync(projectsDir).filter(f => f.endsWith('.md'));
    for (const file of projectFiles) {
      const filePath = join(projectsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const hash = createHash('md5').update(content).digest('hex');
      
      // Only index if file is new or changed
      if (indexedFiles.get(filePath) !== hash) {
        indexNote(filePath);
      }
    }
  }
}

/**
 * Get indexing statistics
 */
export function getStats(): { entities: number; observations: number; relations: number } {
  const db = getDb();
  const entities = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
  const observations = db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number };
  const relations = db.prepare('SELECT COUNT(*) as count FROM relations').get() as { count: number };
  
  return {
    entities: entities.count,
    observations: observations.count,
    relations: relations.count,
  };
}
