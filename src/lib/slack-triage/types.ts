export type MessageCategory = 'needs_response' | 'informational' | 'mention' | 'ignorable';
export type Urgency = 'high' | 'medium' | 'low';

export interface SlackMessage {
  id: string;
  channel: string;
  user: string;
  text: string;
  ts: string; // Slack timestamp
  threadTs?: string; // If this is a thread reply
  replyCount?: number;
  reactions?: Array<{
    name: string;
    users: string[];
    count: number;
  }>;
  permalink?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface Classification {
  category: MessageCategory;
  confidence: number;
  reasoning: string;
  urgency?: Urgency;
}

export interface ProcessedMessage {
  message: SlackMessage;
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
    mention: number;
    ignorable: number;
  };
  needsResponse: ProcessedMessage[];
  informational: ProcessedMessage[];
  mention: ProcessedMessage[];
  ignorable: ProcessedMessage[];
}

export interface FetchOptions {
  channels?: string[]; // Channel IDs to fetch from
  hoursBack?: number;
  limit?: number; // Max messages per channel
  after?: string; // Timestamp to fetch messages after
}
