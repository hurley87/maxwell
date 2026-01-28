export type EmailCategory = 'needs_response' | 'informational' | 'unsubscribe' | 'ignorable';
export type Urgency = 'high' | 'medium' | 'low';

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
}

export interface Classification {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  urgency?: Urgency;
  unsubscribeUrl?: string;
}

export interface ProcessedEmail {
  email: Email;
  classification: Classification;
  summary?: string;
  suggestedReply?: {
    content: string;
    tone: string;
  };
}

export interface TriageResult {
  processedAt: string;
  stats: {
    total: number;
    needsResponse: number;
    informational: number;
    unsubscribe: number;
    ignorable: number;
  };
  needsResponse: ProcessedEmail[];
  informational: ProcessedEmail[];
  unsubscribe: ProcessedEmail[];
  ignorable: ProcessedEmail[];
}

export interface FetchOptions {
  hoursBack?: number;
  maxEmails?: number;
  account?: string;
}
