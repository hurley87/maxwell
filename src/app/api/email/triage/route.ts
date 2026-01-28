import { NextRequest, NextResponse } from 'next/server';
import { runEmailTriage } from '@/lib/email-triage';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for processing

/**
 * GET /api/email/triage
 * 
 * Runs email triage on unread emails.
 * 
 * Query params:
 * - hours: Number of hours to look back (default: 24)
 * - max: Maximum emails to process (default: 50)
 * - account: Specific Gmail account to use (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const hoursBack = parseInt(searchParams.get('hours') || '24', 10);
    const maxEmails = parseInt(searchParams.get('max') || '50', 10);
    const account = searchParams.get('account') || undefined;

    // Validate params
    if (isNaN(hoursBack) || hoursBack < 1 || hoursBack > 168) {
      return NextResponse.json(
        { error: 'hours must be between 1 and 168' },
        { status: 400 }
      );
    }
    
    if (isNaN(maxEmails) || maxEmails < 1 || maxEmails > 100) {
      return NextResponse.json(
        { error: 'max must be between 1 and 100' },
        { status: 400 }
      );
    }

    const result = await runEmailTriage({
      hoursBack,
      maxEmails,
      account,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email triage error:', error);
    
    return NextResponse.json(
      { 
        error: 'Email triage failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
