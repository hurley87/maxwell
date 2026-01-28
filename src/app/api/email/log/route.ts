import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type EmailAction = 'unsubscribe' | 'draft_created' | 'reply_sent' | 'archived' | 'labeled';

interface LogEntry {
  action: EmailAction;
  from?: string;
  subject?: string;
  details?: string;
}

/**
 * POST /api/email/log
 * 
 * Log an email action to today's daily notes for memory indexing.
 * 
 * Body:
 * - action: 'unsubscribe' | 'draft_created' | 'reply_sent' | 'archived' | 'labeled'
 * - from: Sender name/email (optional)
 * - subject: Email subject (optional)
 * - details: Additional details (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LogEntry;
    
    const { action, from, subject, details } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions: EmailAction[] = ['unsubscribe', 'draft_created', 'reply_sent', 'archived', 'labeled'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Format the log entry
    const logLine = formatLogEntry({ action, from, subject, details });
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const notesDir = path.join(process.cwd(), 'notes', 'daily');
    const notePath = path.join(notesDir, `${today}.md`);

    // Read existing notes or create new file
    let content = '';
    try {
      content = await fs.readFile(notePath, 'utf-8');
    } catch {
      // File doesn't exist, will create with email section
      content = '';
    }

    // Find or create Email Actions section
    const emailHeader = '## Email Actions';
    if (content.includes(emailHeader)) {
      // Append to existing section
      const headerIndex = content.indexOf(emailHeader);
      const nextHeaderMatch = content.slice(headerIndex + emailHeader.length).match(/\n## /);
      
      if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
        // Insert before next header
        const insertPoint = headerIndex + emailHeader.length + nextHeaderMatch.index;
        content = content.slice(0, insertPoint) + logLine + '\n' + content.slice(insertPoint);
      } else {
        // Append to end
        content = content.trimEnd() + '\n' + logLine + '\n';
      }
    } else {
      // Add new section at end
      content = content.trimEnd() + '\n\n' + emailHeader + '\n' + logLine + '\n';
    }

    await fs.writeFile(notePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      logged: logLine,
      file: `notes/daily/${today}.md`,
    });
  } catch (error) {
    console.error('Email log error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to log email action',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function formatLogEntry({ action, from, subject, details }: LogEntry): string {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  let line = `- [${timestamp}] `;
  
  switch (action) {
    case 'unsubscribe':
      line += `unsubscribed from ${from || 'newsletter'}`;
      if (subject) line += ` ("${subject}")`;
      break;
    case 'draft_created':
      line += `created draft reply to ${from || 'email'}`;
      if (subject) line += `: "${subject}"`;
      break;
    case 'reply_sent':
      line += `replied to ${from || 'email'}`;
      if (subject) line += `: "${subject}"`;
      break;
    case 'archived':
      line += `archived email from ${from || 'sender'}`;
      if (subject) line += `: "${subject}"`;
      break;
    case 'labeled':
      line += `labeled email from ${from || 'sender'}`;
      if (details) line += ` as "${details}"`;
      break;
  }

  if (details && action !== 'labeled') {
    line += ` - ${details}`;
  }

  return line;
}
