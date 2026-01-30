export type MessageCategory = 'needs_response' | 'informational' | 'personal' | 'ignorable';
export type Urgency = 'high' | 'medium' | 'low';

export interface Attachment {
  filename?: string;
  transferName?: string;
  uti?: string;
  mimeType?: string;
  totalBytes?: number;
  isSticker?: boolean;
  originalPath?: string;
  missing?: boolean;
}

export interface Reaction {
  name: string;
  users: string[];
}

export interface Chat {
  id: number;
  name: string; // Contact name or group name
  identifier: string; // Phone number or email
  service: 'iMessage' | 'SMS';
  lastMessageAt: string;
}

export interface IMessage {
  id: number;
  chatId: number;
  guid: string;
  replyToGuid?: string;
  sender: string; // Phone/email or empty if from me
  isFromMe: boolean;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Classification {
  category: MessageCategory;
  confidence: number;
  reasoning: string;
  urgency?: Urgency;
}

export interface ProcessedMessage {
  message: IMessage;
  chat: Chat;
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
    personal: number;
    ignorable: number;
  };
  needsResponse: ProcessedMessage[];
  informational: ProcessedMessage[];
  personal: ProcessedMessage[];
  ignorable: ProcessedMessage[];
}

export interface FetchOptions {
  chatIds?: number[]; // Specific chat IDs to fetch from (optional)
  hoursBack?: number;
  limit?: number; // Max messages per chat
}
