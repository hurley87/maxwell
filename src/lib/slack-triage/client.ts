import { SlackMessage, SlackChannel } from './types';

const SLACK_API_BASE = 'https://slack.com/api';

// Cache for user info to avoid repeated API calls
const userInfoCache = new Map<string, { name: string; realName?: string }>();

/**
 * Gets the Slack user token from environment variables.
 */
function getSlackToken(): string {
  const token = process.env.SLACK_USER_TOKEN;
  if (!token) {
    throw new Error('SLACK_USER_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Makes a request to the Slack Web API.
 */
async function slackApiRequest(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  const token = getSlackToken();
  const url = new URL(`${SLACK_API_BASE}/${endpoint}`);
  
  // Add params to URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
  }

  return data;
}

/**
 * Fetches messages from a Slack channel.
 * Calls conversations.history API.
 */
export async function fetchChannelMessages(
  channelId: string,
  limit: number = 50,
  oldest?: string
): Promise<SlackMessage[]> {
  const params: Record<string, string | number> = {
    channel: channelId,
    limit,
  };

  if (oldest) {
    params.oldest = oldest;
  }

  const data = await slackApiRequest('conversations.history', params);

  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  return data.messages.map((msg: any) => ({
    id: msg.ts,
    channel: channelId,
    user: msg.user || '',
    text: msg.text || '',
    ts: msg.ts,
    threadTs: msg.thread_ts,
    replyCount: msg.reply_count,
    reactions: msg.reactions?.map((r: any) => ({
      name: r.name,
      users: r.users || [],
      count: r.count,
    })),
    permalink: msg.permalink,
  }));
}

/**
 * Fetches replies in a thread.
 * Calls conversations.replies API.
 */
export async function fetchThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackMessage[]> {
  const data = await slackApiRequest('conversations.replies', {
    channel: channelId,
    ts: threadTs,
  });

  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  // Filter out the parent message (first one)
  const replies = data.messages.slice(1);

  return replies.map((msg: any) => ({
    id: msg.ts,
    channel: channelId,
    user: msg.user || '',
    text: msg.text || '',
    ts: msg.ts,
    threadTs: msg.thread_ts || threadTs,
    reactions: msg.reactions?.map((r: any) => ({
      name: r.name,
      users: r.users || [],
      count: r.count,
    })),
  }));
}

/**
 * Sends a message to a Slack channel.
 * Calls chat.postMessage API.
 */
export async function sendMessage(
  channel: string,
  text: string,
  threadTs?: string
): Promise<{ ts: string; channel: string }> {
  const token = getSlackToken();
  const url = new URL(`${SLACK_API_BASE}/chat.postMessage`);

  const body: Record<string, string> = {
    channel,
    text,
  };

  if (threadTs) {
    body.thread_ts = threadTs;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
  }

  return {
    ts: data.ts,
    channel: data.channel,
  };
}

/**
 * Adds a reaction to a message.
 * Calls reactions.add API.
 */
export async function addReaction(
  channel: string,
  timestamp: string,
  emoji: string
): Promise<void> {
  const token = getSlackToken();
  const url = new URL(`${SLACK_API_BASE}/reactions.add`);

  // Remove colons from emoji name if present (:thumbsup: -> thumbsup)
  const emojiName = emoji.replace(/^:/, '').replace(/:$/, '');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      timestamp,
      name: emojiName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
  }
}

/**
 * Gets user information.
 * Calls users.info API with caching.
 */
export async function getUserInfo(userId: string): Promise<{ name: string; realName?: string }> {
  if (userInfoCache.has(userId)) {
    return userInfoCache.get(userId)!;
  }

  const data = await slackApiRequest('users.info', { user: userId });

  if (!data.user) {
    throw new Error(`User not found: ${userId}`);
  }

  const userInfo = {
    name: data.user.name || '',
    realName: data.user.real_name,
  };

  userInfoCache.set(userId, userInfo);
  return userInfo;
}

/**
 * Lists channels the user has access to.
 * Calls conversations.list API.
 */
export async function listChannels(): Promise<SlackChannel[]> {
  const data = await slackApiRequest('conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: true,
  });

  if (!data.channels || !Array.isArray(data.channels)) {
    return [];
  }

  return data.channels.map((ch: any) => ({
    id: ch.id,
    name: ch.name,
  }));
}
