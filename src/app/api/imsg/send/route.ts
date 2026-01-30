import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/imsg-triage/client';

export const dynamic = 'force-dynamic';

interface SendRequest {
  to: string;
  text: string;
  service?: 'imessage' | 'sms' | 'auto';
}

/**
 * POST /api/imsg/send
 * 
 * Sends an iMessage or SMS.
 * 
 * Body:
 * - to: Phone number or email address (required)
 * - text: Message text (required)
 * - service: 'imessage' | 'sms' | 'auto' (optional, default: 'auto')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SendRequest;
    
    const { to, text, service = 'auto' } = body;

    if (!to || !text) {
      return NextResponse.json(
        { error: 'to and text are required' },
        { status: 400 }
      );
    }

    if (service && !['imessage', 'sms', 'auto'].includes(service)) {
      return NextResponse.json(
        { error: 'service must be one of: imessage, sms, auto' },
        { status: 400 }
      );
    }

    sendMessage(to, text, service);

    return NextResponse.json({
      success: true,
      to,
      service,
    });
  } catch (error) {
    console.error('iMessage send error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
