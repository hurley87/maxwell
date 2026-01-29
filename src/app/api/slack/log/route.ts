import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type SlackAction = 'replied' | 'reacted' | 'acknowledged';

interface LogEntry {
  action: SlackAction;
  channel?: string;
  user?: string;
  text?: string;
  details?: string;
}

/**
 * POST /api/slack/log
 * 
 * Log a Slack action to today's daily notes for memory indexing.
 * 
 * Body:
 * - action: 'replied' | 'reacted' | 'acknowledged'
 * - channel: Channel name or ID (optional)
 * - user: User name or ID (optional)
 * - text: Message text preview (optional)
 * - details: Additional details (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LogEntry;
    
    const { action, channel, user, text, details } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions: SlackAction[] = ['replied', 'reacted', 'acknowledged'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Format the log entry
    const logLine = formatLogEntry({ action, channel, user, text, details });
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const notesDir = path.join(process.cwd(), 'notes', 'daily');
    const notePath = path.join(notesDir, `${today}.md`);

    // Read existing notes or create new file
    let content = '';
    try {
      content = await fs.readFile(notePath, 'utf-8');
    } catch {
      // File doesn't exist, will create with Slack section
      content = '';
    }

    // Find or create Slack Actions section
    const slackHeader = '## Slack Actions';
    if (content.includes(slackHeader)) {
      // Append to existing section
      const headerIndex = content.indexOf(slackHeader);
      const nextHeaderMatch = content.slice(headerIndex + slackHeader.length).match(/\n## /);
      
      if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
        // Insert before next header
        const insertPoint = headerIndex + slackHeader.length + nextHeaderMatch.index;
        content = content.slice(0, insertPoint) + logLine + '\n' + content.slice(insertPoint);
      } else {
        // Append to end
        content = content.trimEnd() + '\n' + logLine + '\n';
      }
    } else {
      // Add new section at end
      content = content.trimEnd() + '\n\n' + slackHeader + '\n' + logLine + '\n';
    }

    await fs.writeFile(notePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      logged: logLine,
      file: `notes/daily/${today}.md`,
    });
  } catch (error) {
    console.error('Slack log error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to log Slack action',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function formatLogEntry({ action, channel, user, text, details }: LogEntry): string {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  let line = `- [${timestamp}] `;
  
  switch (action) {
    case 'replied':
      line += `replied in ${channel || 'channel'}`;
      if (user) line += ` to ${user}`;
      if (text) line += `: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`;
      break;
    case 'reacted':
      line += `reacted in ${channel || 'channel'}`;
      if (user) line += ` to ${user}'s message`;
      if (details) line += ` with ${details}`;
      break;
    case 'acknowledged':
      line += `acknowledged message in ${channel || 'channel'}`;
      if (user) line += ` from ${user}`;
      break;
  }

  if (details && action !== 'reacted') {
    line += ` - ${details}`;
  }

  return line;
}
