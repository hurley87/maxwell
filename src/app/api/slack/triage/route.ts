import { NextRequest, NextResponse } from 'next/server';
import { runSlackTriage } from '@/lib/slack-triage';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for processing

/**
 * GET /api/slack/triage
 * 
 * Runs Slack triage on messages from configured channels.
 * 
 * Query params:
 * - hours: Number of hours to look back (default: 8, max: 48)
 * - limit: Maximum messages per channel (default: 50, max: 200)
 * - channels: Comma-separated channel IDs (optional, defaults to SLACK_CHANNELS env var)
 * - after: Timestamp to fetch messages after (optional, overrides hours)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const hoursBack = parseInt(searchParams.get('hours') || '8', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const channelsParam = searchParams.get('channels');
    const after = searchParams.get('after') || undefined;

    // Validate params
    if (isNaN(hoursBack) || hoursBack < 1 || hoursBack > 48) {
      return NextResponse.json(
        { error: 'hours must be between 1 and 48' },
        { status: 400 }
      );
    }
    
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    const channels = channelsParam
      ? channelsParam.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;

    const result = await runSlackTriage({
      hoursBack,
      limit,
      channels,
      after,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Slack triage error:', error);
    
    return NextResponse.json(
      { 
        error: 'Slack triage failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
