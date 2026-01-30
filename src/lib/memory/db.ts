import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'notes', 'maxwell.db');

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initDb() {
  const db = getDb();
  
  // Core tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      permalink TEXT UNIQUE NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      mention_count INTEGER DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_line INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      completed INTEGER,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );
    
    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      from_entity_id TEXT NOT NULL,
      to_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      source_file TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_entity_id) REFERENCES entities(id),
      FOREIGN KEY (to_entity_id) REFERENCES entities(id)
    );
    
    CREATE TABLE IF NOT EXISTS notes (
      path TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );

    -- Local integrations (GitHub, etc) with stable event IDs for dedupe
    CREATE TABLE IF NOT EXISTS integration_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,              -- YYYY-MM-DD bucket
      occurred_at TEXT NOT NULL,       -- ISO timestamp
      project TEXT NOT NULL,
      repo TEXT NOT NULL,
      kind TEXT NOT NULL,
      line TEXT NOT NULL,              -- rendered markdown line
      payload_json TEXT
    );

    CREATE INDEX IF NOT EXISTS integration_events_date_idx ON integration_events(date);
  `);
  
  // FTS5 for full-text search
  // FTS5 requires integer rowids, so we'll use a mapping approach
  db.exec(`
    CREATE TABLE IF NOT EXISTS observations_fts_map (
      observation_id TEXT PRIMARY KEY,
      fts_rowid INTEGER UNIQUE NOT NULL
    );
    
    CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
      content,
      tokenize='porter'
    );
    
    -- Trigger to sync observations with FTS5
    CREATE TRIGGER IF NOT EXISTS observations_fts_insert AFTER INSERT ON observations BEGIN
      INSERT INTO observations_fts_map (observation_id, fts_rowid)
      VALUES (NEW.id, (SELECT COALESCE(MAX(fts_rowid), 0) + 1 FROM observations_fts_map));
      INSERT INTO observations_fts(rowid, content)
      VALUES ((SELECT fts_rowid FROM observations_fts_map WHERE observation_id = NEW.id), NEW.content);
    END;
    
    CREATE TRIGGER IF NOT EXISTS observations_fts_delete AFTER DELETE ON observations BEGIN
      DELETE FROM observations_fts WHERE rowid = (SELECT fts_rowid FROM observations_fts_map WHERE observation_id = OLD.id);
      DELETE FROM observations_fts_map WHERE observation_id = OLD.id;
    END;
    
    CREATE TRIGGER IF NOT EXISTS observations_fts_update AFTER UPDATE ON observations BEGIN
      DELETE FROM observations_fts WHERE rowid = (SELECT fts_rowid FROM observations_fts_map WHERE observation_id = OLD.id);
      INSERT INTO observations_fts(rowid, content)
      SELECT fts_rowid, NEW.content FROM observations_fts_map WHERE observation_id = NEW.id;
    END;
  `);
  
  return db;
}
