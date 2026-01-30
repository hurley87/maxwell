import { execSync } from 'child_process';
import { Chat, IMessage, Attachment, Reaction } from './types';

/**
 * Lists recent chats using the imsg CLI.
 */
export function listChats(limit = 20): Chat[] {
  try {
    const cmd = `imsg chats --limit ${limit} --json`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    
    // imsg outputs NDJSON (one JSON object per line)
    const lines = output.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const chat = JSON.parse(line);
      return {
        id: chat.id,
        name: chat.name || chat.identifier || 'Unknown',
        identifier: chat.identifier || '',
        service: chat.service === 'SMS' ? 'SMS' : 'iMessage',
        lastMessageAt: chat.last_message_at || chat.lastMessageAt || '',
      };
    });
  } catch (error) {
    console.error('Failed to list chats:', error);
    throw new Error(
      `Failed to list chats: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gets message history for a specific chat.
 * Parses NDJSON output from imsg history command.
 */
export function getChatHistory(chatId: number, limit = 50): IMessage[] {
  try {
    const cmd = `imsg history --chat-id ${chatId} --limit ${limit} --attachments --json`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    
    // imsg outputs NDJSON (one JSON object per line)
    const lines = output.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const msg = JSON.parse(line);
      
      // Parse attachments if present
      let attachments: Attachment[] | undefined;
      if (msg.attachments && Array.isArray(msg.attachments)) {
        attachments = msg.attachments.map((att: any) => ({
          filename: att.filename,
          transferName: att.transfer_name,
          uti: att.uti,
          mimeType: att.mime_type,
          totalBytes: att.total_bytes,
          isSticker: att.is_sticker,
          originalPath: att.original_path,
          missing: att.missing,
        }));
      }
      
      // Parse reactions if present
      let reactions: Reaction[] | undefined;
      if (msg.reactions && Array.isArray(msg.reactions)) {
        reactions = msg.reactions.map((r: any) => ({
          name: r.name || r.emoji || '',
          users: r.users || [],
        }));
      }
      
      return {
        id: msg.id || msg.rowid || 0,
        chatId: msg.chat_id || chatId,
        guid: msg.guid || '',
        replyToGuid: msg.reply_to_guid,
        sender: msg.sender || '',
        isFromMe: msg.is_from_me === true || msg.is_from_me === 1,
        text: msg.text || '',
        createdAt: msg.created_at || msg.date || '',
        attachments,
        reactions,
      };
    });
  } catch (error) {
    console.error(`Failed to get chat history for chat ${chatId}:`, error);
    throw new Error(
      `Failed to get chat history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sends a message using the imsg CLI.
 */
export function sendMessage(
  to: string,
  text: string,
  service: 'imessage' | 'sms' | 'auto' = 'auto'
): void {
  try {
    // Escape quotes in text for shell safety
    const escapedText = text.replace(/"/g, '\\"');
    const cmd = `imsg send --to "${to}" --text "${escapedText}" --service ${service}`;
    execSync(cmd, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error);
    throw new Error(
      `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
