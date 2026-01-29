import { NextRequest, NextResponse } from 'next/server';
import { addReaction } from '@/lib/slack-triage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/slack/react
 * 
 * Adds a reaction to a Slack message.
 * 
 * Body:
 * - channel: Channel ID (required)
 * - timestamp: Message timestamp (required)
 * - emoji: Emoji name or Unicode (required, e.g., "thumbsup" or "👍" or ":thumbsup:")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, timestamp, emoji } = body;

    if (!channel) {
      return NextResponse.json(
        { error: 'channel is required' },
        { status: 400 }
      );
    }

    if (!timestamp) {
      return NextResponse.json(
        { error: 'timestamp is required' },
        { status: 400 }
      );
    }

    if (!emoji) {
      return NextResponse.json(
        { error: 'emoji is required' },
        { status: 400 }
      );
    }

    await addReaction(channel, timestamp, emoji);

    return NextResponse.json({
      success: true,
      channel,
      timestamp,
      emoji,
    });
  } catch (error) {
    console.error('Slack reaction error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add reaction',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
