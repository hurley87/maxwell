import { NextRequest, NextResponse } from 'next/server';
import { initDb, indexAll, search, buildContext, getStats } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memory/search
 * 
 * Search memories and retrieve context.
 * 
 * Query params:
 * - q: Search query (required)
 * - limit: Max results (default: 20)
 * - reindex: Force reindex before search (default: true)
 * - context: Build full context instead of raw search (default: false)
 * - days: For context mode, include recent days (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const shouldReindex = searchParams.get('reindex') !== 'false';
    const useContext = searchParams.get('context') === 'true';
    const recentDays = parseInt(searchParams.get('days') || '7', 10);

    if (!query) {
      return NextResponse.json(
        { error: 'q parameter is required' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Initialize database
    initDb();
    
    // Reindex to capture recent changes
    if (shouldReindex) {
      indexAll();
    }

    // Get stats for info
    const stats = getStats();

    if (useContext) {
      // Build full context with formatted markdown
      const context = buildContext({
        query,
        recentDays,
        limit,
      });

      return NextResponse.json({
        query,
        stats,
        context: context.formattedContext,
        entities: context.entities,
        observations: context.observations,
      });
    }

    // Raw search results
    const results = search(query, limit);

    return NextResponse.json({
      query,
      stats,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Memory search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Memory search failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
