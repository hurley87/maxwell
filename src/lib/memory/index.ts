// Re-export all public functions
export { initDb, getDb } from './db';
export { indexNote, indexAll, getStats } from './indexer';
export { search, findEntity, getObservations, getPendingTasks, getRecentActivity, getRelated, getActivityByDate, getActivityInRange } from './search';
export { buildContext, formatContextAsMarkdown } from './context';
export { readCuratedMemory, formatCuratedMemoryForPrompt } from './curated';
export { buildActivityDigest } from './activity';
export type * from './types';
export type { ActivityDigestOptions, ActivityDigest } from './activity';
