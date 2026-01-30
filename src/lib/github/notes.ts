import { promises as fs } from 'node:fs';
import path from 'node:path';

export const CODE_ACTIONS_HEADER = '## Code Actions';

function getDailyNotePath(date: string): string {
  const notesDir = path.join(process.cwd(), 'notes', 'daily');
  return path.join(notesDir, `${date}.md`);
}

/**
 * Append multiple bullet lines under the "## Code Actions" header.
 * - If the header doesn't exist, it is created at the end of the file.
 * - Lines are appended before the next "## " header if present, otherwise at EOF.
 */
export async function appendCodeActionsToDailyNote(args: {
  date: string; // YYYY-MM-DD
  lines: string[];
}): Promise<{ file: string; appended: number }> {
  if (args.lines.length === 0) {
    return { file: `notes/daily/${args.date}.md`, appended: 0 };
  }

  const notePath = getDailyNotePath(args.date);

  let content = '';
  try {
    content = await fs.readFile(notePath, 'utf-8');
  } catch {
    content = '';
  }

  const header = CODE_ACTIONS_HEADER;
  const block = args.lines.join('\n') + '\n';

  if (content.includes(header)) {
    const headerIndex = content.indexOf(header);
    const afterHeader = content.slice(headerIndex + header.length);
    const nextHeaderMatch = afterHeader.match(/\n## /);

    if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
      const insertPoint = headerIndex + header.length + nextHeaderMatch.index;
      content = content.slice(0, insertPoint) + '\n' + block + content.slice(insertPoint);
    } else {
      content = content.trimEnd() + '\n' + block;
    }
  } else {
    content = content.trimEnd();
    const prefix = content.length > 0 ? '\n\n' : '';
    content = content + prefix + header + '\n' + block;
  }

  await fs.writeFile(notePath, content, 'utf-8');
  return { file: `notes/daily/${args.date}.md`, appended: args.lines.length };
}

