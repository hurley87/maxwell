import { NextRequest, NextResponse } from 'next/server';
import { fetchChannelMessages, sendMessage } from '@/lib/slack-triage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/slack/messages
 * 
 * Fetches messages from a Slack channel.
 * 
 * Query params:
 * - channel: Channel ID (required)
 * - limit: Maximum messages to fetch (default: 50, max: 200)
 * - oldest: Timestamp to fetch messages after (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const oldest = searchParams.get('oldest') || undefined;

    if (!channel) {
      return NextResponse.json(
        { error: 'channel parameter is required' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    const messages = await fetchChannelMessages(channel, limit, oldest);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Slack messages fetch error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slack/messages
 * 
 * Sends a message to a Slack channel.
 * 
 * Body:
 * - channel: Channel ID (required)
 * - text: Message text (required)
 * - threadTs: Thread timestamp to reply in thread (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, text, threadTs } = body;

    if (!channel) {
      return NextResponse.json(
        { error: 'channel is required' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    const result = await sendMessage(channel, text, threadTs);

    return NextResponse.json({
      success: true,
      ts: result.ts,
      channel: result.channel,
    });
  } catch (error) {
    console.error('Slack message send error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
