import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read curated memory files for always-on context injection
 */
export function readCuratedMemory(): {
  reset: string;
  memory: string;
  user: string;
} {
  const rootDir = process.cwd();
  
  let reset = '';
  let memory = '';
  let user = '';

  try {
    reset = readFileSync(join(rootDir, 'RESET.md'), 'utf-8');
  } catch {
    // File doesn't exist
  }

  try {
    memory = readFileSync(join(rootDir, 'MEMORY.md'), 'utf-8');
  } catch {
    // File doesn't exist
  }

  try {
    user = readFileSync(join(rootDir, 'USER.md'), 'utf-8');
  } catch {
    // File doesn't exist
  }

  return { reset, memory, user };
}

/**
 * Format curated memory for prompt injection
 */
export function formatCuratedMemoryForPrompt(): string {
  const { reset, memory, user } = readCuratedMemory();
  const parts: string[] = [];

  if (reset) {
    parts.push('# Operational Context (RESET.md)\n' + reset);
  }

  if (memory) {
    parts.push('# Stable Preferences (MEMORY.md)\n' + memory);
  }

  if (user) {
    parts.push('# About You (USER.md)\n' + user);
  }

  return parts.join('\n\n---\n\n');
}
