import { IMessage, Chat, ProcessedMessage, TriageResult, FetchOptions } from './types';
import { listChats, getChatHistory } from './client';
import { classifyMessage } from './classifier';
import { generateSummary, generateReplyDraft } from './processor';
import { opik } from './opik-client';

/**
 * Filters messages by time window (hours back from now).
 */
function filterMessagesByTime(
  messages: IMessage[],
  hoursBack: number
): IMessage[] {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

  return messages.filter((msg) => {
    const msgDate = new Date(msg.createdAt);
    return msgDate >= cutoffTime;
  });
}

/**
 * Fetches messages from specified chats within the time window.
 */
async function fetchMessages(
  options: FetchOptions = {}
): Promise<Array<{ message: IMessage; chat: Chat }>> {
  const { chatIds, hoursBack = 8, limit = 20 } = options;

  // Get all chats or filter by chatIds
  const allChats = listChats(100); // Get more chats to filter from
  const chatsToProcess = chatIds
    ? allChats.filter((chat) => chatIds.includes(chat.id))
    : allChats;

  if (chatsToProcess.length === 0) {
    return [];
  }

  // Fetch messages from each chat
  const messageChatPairs: Array<{ message: IMessage; chat: Chat }> = [];

  for (const chat of chatsToProcess) {
    try {
      const messages = getChatHistory(chat.id, limit);
      
      // Filter out messages from me
      const incomingMessages = messages.filter((msg) => !msg.isFromMe);
      
      // Filter by time window
      const recentMessages = filterMessagesByTime(incomingMessages, hoursBack);
      
      // Add chat context to each message
      for (const message of recentMessages) {
        messageChatPairs.push({ message, chat });
      }
    } catch (error) {
      // Log error but continue processing other chats
      console.error(`Error fetching messages from chat ${chat.id}:`, error);
    }
  }

  return messageChatPairs;
}

/**
 * Processes a single message: classifies it and generates summary/reply as needed.
 */
async function processMessage(
  message: IMessage,
  chat: Chat,
  trace: ReturnType<typeof opik.trace>
): Promise<ProcessedMessage> {
  // Step 1: Classify
  const classification = await classifyMessage(message, chat, trace);

  const result: ProcessedMessage = {
    message,
    chat,
    classification,
  };

  // Step 2: Category-specific processing
  if (classification.category === 'needs_response') {
    const reply = await generateReplyDraft(message, chat, classification, trace);
    result.suggestedReply = reply;
  } else if (
    classification.category === 'informational' ||
    classification.category === 'personal'
  ) {
    const summary = await generateSummary(message, chat, trace);
    result.summary = summary;
  }

  return result;
}

/**
 * Main iMessage triage pipeline.
 * Fetches messages from chats, classifies them, and generates summaries/replies.
 * All operations are traced with Opik for observability.
 */
export async function runImsgTriage(
  options: FetchOptions = {}
): Promise<TriageResult> {
  // Create main trace for this triage run
  const trace = opik.trace({
    name: 'imsg_triage',
    input: {
      hoursBack: options.hoursBack || 8,
      limit: options.limit || 20,
      chatIds: options.chatIds,
    },
    metadata: {
      triggeredAt: new Date().toISOString(),
    },
  });

  try {
    // Fetch messages with chat context
    const messageChatPairs = await fetchMessages(options);

    const results: TriageResult = {
      processedAt: new Date().toISOString(),
      stats: {
        total: messageChatPairs.length,
        needsResponse: 0,
        informational: 0,
        personal: 0,
        ignorable: 0,
      },
      needsResponse: [],
      informational: [],
      personal: [],
      ignorable: [],
    };

    // Process messages sequentially (could parallelize with Promise.all for speed)
    for (const { message, chat } of messageChatPairs) {
      try {
        const processed = await processMessage(message, chat, trace);

        switch (processed.classification.category) {
          case 'needs_response':
            results.needsResponse.push(processed);
            results.stats.needsResponse++;
            break;
          case 'informational':
            results.informational.push(processed);
            results.stats.informational++;
            break;
          case 'personal':
            results.personal.push(processed);
            results.stats.personal++;
            break;
          case 'ignorable':
            results.ignorable.push(processed);
            results.stats.ignorable++;
            break;
        }
      } catch (error) {
        // Log error but continue processing other messages
        console.error(
          `Error processing message ${message.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // End trace - stats are included in the results object returned
    trace.end();

    // Flush traces to Opik
    await opik.flush();

    return results;
  } catch (error) {
    // End trace - error info is in metadata
    trace.end();
    await opik.flush();
    throw error;
  }
}
