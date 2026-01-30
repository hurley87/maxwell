import { NextRequest, NextResponse } from 'next/server';
import { runImsgTriage } from '@/lib/imsg-triage';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for processing

/**
 * GET /api/imsg/triage
 * 
 * Runs iMessage triage on recent messages.
 * 
 * Query params:
 * - hours: Number of hours to look back (default: 8)
 * - limit: Maximum messages per chat (default: 20)
 * - chatIds: Comma-separated list of chat IDs to filter (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const hoursBack = parseInt(searchParams.get('hours') || '8', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const chatIdsParam = searchParams.get('chatIds');
    
    const chatIds = chatIdsParam
      ? chatIdsParam.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : undefined;

    // Validate params
    if (isNaN(hoursBack) || hoursBack < 1 || hoursBack > 168) {
      return NextResponse.json(
        { error: 'hours must be between 1 and 168' },
        { status: 400 }
      );
    }
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const result = await runImsgTriage({
      hoursBack,
      limit,
      chatIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('iMessage triage error:', error);
    
    return NextResponse.json(
      { 
        error: 'iMessage triage failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
