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
 * - recency: Enable recency-weighted ranking (default: false)
 * - halfLifeDays: Half-life in days for recency decay, only used when recency=true (default: 30, range: 1-365)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const shouldReindex = searchParams.get('reindex') !== 'false';
    const useContext = searchParams.get('context') === 'true';
    const recentDays = parseInt(searchParams.get('days') || '7', 10);
    const recency = searchParams.get('recency') === 'true';
    const halfLifeDaysParam = searchParams.get('halfLifeDays');
    const halfLifeDays = halfLifeDaysParam ? parseInt(halfLifeDaysParam, 10) : undefined;

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

    if (halfLifeDays !== undefined && (isNaN(halfLifeDays) || halfLifeDays < 1 || halfLifeDays > 365)) {
      return NextResponse.json(
        { error: 'halfLifeDays must be between 1 and 365' },
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
        recency,
        halfLifeDays,
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
    const results = search(query, limit, {
      recency,
      halfLifeDays,
    });

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
