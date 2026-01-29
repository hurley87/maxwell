import { SlackMessage, ProcessedMessage, TriageResult, FetchOptions } from './types';
import { classifyMessage } from './classifier';
import { generateSummary, generateReplyDraft } from './processor';
import { opik } from './opik-client';
import {
  fetchChannelMessages,
  fetchThreadReplies,
  sendMessage as sendSlackMessage,
  addReaction as addSlackReaction,
  getUserInfo,
} from './client';

/**
 * Gets the user ID from environment variables.
 */
function getUserId(): string {
  const userId = process.env.SLACK_USER_ID;
  if (!userId) {
    throw new Error('SLACK_USER_ID environment variable is not set');
  }
  return userId;
}

/**
 * Gets the default channels to monitor from environment variables.
 */
function getDefaultChannels(): string[] {
  const channels = process.env.SLACK_CHANNELS;
  if (!channels) {
    return [];
  }
  return channels.split(',').map((c) => c.trim()).filter(Boolean);
}

/**
 * Calculates the oldest timestamp to fetch messages from (N hours ago).
 */
function getOldestTimestamp(hoursBack: number): string {
  const now = Date.now();
  const hoursAgo = now - hoursBack * 60 * 60 * 1000;
  return (hoursAgo / 1000).toFixed(6); // Slack timestamps are in seconds with decimals
}

/**
 * Fetches messages from specified channels.
 */
export async function fetchSlackMessages(
  options: FetchOptions = {}
): Promise<SlackMessage[]> {
  const { channels, hoursBack = 8, limit = 50, after } = options;
  
  const channelsToFetch = channels || getDefaultChannels();
  if (channelsToFetch.length === 0) {
    throw new Error('No channels specified. Set SLACK_CHANNELS env var or pass channels option.');
  }

  const oldest = after || getOldestTimestamp(hoursBack);
  const userId = getUserId();

  const allMessages: SlackMessage[] = [];

  // Fetch messages from each channel
  for (const channelId of channelsToFetch) {
    try {
      const messages = await fetchChannelMessages(channelId, limit, oldest);
      
      // Filter out messages from the user themselves
      const otherMessages = messages.filter((msg) => msg.user !== userId);
      
      allMessages.push(...otherMessages);
    } catch (error) {
      console.error(`Failed to fetch messages from channel ${channelId}:`, error);
      // Continue with other channels
    }
  }

  // Also fetch thread replies for messages with high reply counts
  const threadsToFetch: Array<{ channel: string; threadTs: string }> = [];
  for (const msg of allMessages) {
    if (msg.threadTs && msg.replyCount && msg.replyCount > 0) {
      // Check if we already have this thread
      const existing = threadsToFetch.find(
        (t) => t.channel === msg.channel && t.threadTs === msg.threadTs
      );
      if (!existing) {
        threadsToFetch.push({ channel: msg.channel, threadTs: msg.threadTs });
      }
    }
  }

  // Fetch thread replies
  for (const { channel, threadTs } of threadsToFetch) {
    try {
      const replies = await fetchThreadReplies(channel, threadTs);
      // Filter out replies from the user themselves
      const otherReplies = replies.filter((msg) => msg.user !== userId);
      allMessages.push(...otherReplies);
    } catch (error) {
      console.error(`Failed to fetch thread replies for ${threadTs}:`, error);
      // Continue with other threads
    }
  }

  // Sort by timestamp (newest first)
  return allMessages.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));
}

/**
 * Processes a single message: classifies it and generates summary/reply as needed.
 */
async function processMessage(
  message: SlackMessage,
  userId: string,
  trace: ReturnType<typeof opik.trace>
): Promise<ProcessedMessage> {
  // Step 1: Classify
  const classification = await classifyMessage(message, userId, trace);

  const result: ProcessedMessage = {
    message,
    classification,
  };

  // Step 2: Category-specific processing
  if (classification.category === 'needs_response') {
    const reply = await generateReplyDraft(message, classification, trace);
    result.suggestedReply = reply;
  } else if (classification.category === 'informational') {
    const summary = await generateSummary(message, trace);
    result.summary = summary;
  }

  return result;
}

/**
 * Main Slack triage pipeline.
 * Fetches messages from configured channels, classifies them, and generates summaries/replies.
 * All operations are traced with Opik for observability.
 */
export async function runSlackTriage(
  options: FetchOptions = {}
): Promise<TriageResult> {
  const userId = getUserId();

  // Create main trace for this triage run
  const trace = opik.trace({
    name: 'slack_triage',
    input: {
      channels: options.channels || getDefaultChannels(),
      hoursBack: options.hoursBack || 8,
      limit: options.limit || 50,
      after: options.after,
    },
    metadata: {
      triggeredAt: new Date().toISOString(),
    },
  });

  try {
    // Fetch messages
    const messages = await fetchSlackMessages(options);

    const results: TriageResult = {
      processedAt: new Date().toISOString(),
      stats: {
        total: messages.length,
        needsResponse: 0,
        informational: 0,
        mention: 0,
        ignorable: 0,
      },
      needsResponse: [],
      informational: [],
      mention: [],
      ignorable: [],
    };

    // Process messages sequentially (could parallelize with Promise.all for speed)
    for (const message of messages) {
      try {
        const processed = await processMessage(message, userId, trace);

        switch (processed.classification.category) {
          case 'needs_response':
            results.needsResponse.push(processed);
            results.stats.needsResponse++;
            break;
          case 'informational':
            results.informational.push(processed);
            results.stats.informational++;
            break;
          case 'mention':
            results.mention.push(processed);
            results.stats.mention++;
            break;
          case 'ignorable':
            results.ignorable.push(processed);
            results.stats.ignorable++;
            break;
        }
      } catch (error) {
        // Log error but continue processing other messages
        console.error(
          `Error processing message ${message.ts}: ${error instanceof Error ? error.message : String(error)}`
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

// Re-export client functions for direct use
export {
  sendSlackMessage as sendMessage,
  addSlackReaction as addReaction,
  getUserInfo,
  fetchChannelMessages,
  fetchThreadReplies,
};
