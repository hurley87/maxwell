import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { todayLocalDate } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

type ImsgAction = 'replied' | 'acknowledged';

interface LogEntry {
  action: ImsgAction;
  contact?: string;
  summary?: string;
}

/**
 * POST /api/imsg/log
 * 
 * Log an iMessage action to today's daily notes for memory indexing.
 * 
 * Body:
 * - action: 'replied' | 'acknowledged'
 * - contact: Contact name or identifier (optional)
 * - summary: Brief summary of the interaction (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LogEntry;
    
    const { action, contact, summary } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions: ImsgAction[] = ['replied', 'acknowledged'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Format the log entry
    const logLine = formatLogEntry({ action, contact, summary });
    
    // Get today's date (local timezone)
    const today = todayLocalDate();
    const notesDir = path.join(process.cwd(), 'notes', 'daily');
    const notePath = path.join(notesDir, `${today}.md`);

    // Read existing notes or create new file
    let content = '';
    try {
      content = await fs.readFile(notePath, 'utf-8');
    } catch {
      // File doesn't exist, will create with iMessage section
      content = '';
    }

    // Find or create iMessage Actions section
    const imsgHeader = '## iMessage Actions';
    if (content.includes(imsgHeader)) {
      // Append to existing section
      const headerIndex = content.indexOf(imsgHeader);
      const nextHeaderMatch = content.slice(headerIndex + imsgHeader.length).match(/\n## /);
      
      if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
        // Insert before next header
        const insertPoint = headerIndex + imsgHeader.length + nextHeaderMatch.index;
        content = content.slice(0, insertPoint) + logLine + '\n' + content.slice(insertPoint);
      } else {
        // Append to end
        content = content.trimEnd() + '\n' + logLine + '\n';
      }
    } else {
      // Add new section at end
      content = content.trimEnd() + '\n\n' + imsgHeader + '\n' + logLine + '\n';
    }

    await fs.writeFile(notePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      logged: logLine,
      file: `notes/daily/${today}.md`,
    });
  } catch (error) {
    console.error('iMessage log error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to log iMessage action',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function formatLogEntry({ action, contact, summary }: LogEntry): string {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  let line = `- [${timestamp}] `;
  
  switch (action) {
    case 'replied':
      line += `replied to ${contact || 'contact'}`;
      break;
    case 'acknowledged':
      line += `acknowledged message from ${contact || 'contact'}`;
      break;
  }

  if (summary) {
    line += ` - ${summary}`;
  }

  return line;
}
