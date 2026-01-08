// Slack Web API client

import { WebClient, Block, KnownBlock } from '@slack/web-api';
import { config } from '../config';

let slackClient: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (slackClient) {
    return slackClient;
  }

  slackClient = new WebClient(config.slack.botToken);
  return slackClient;
}

export async function postMessage(
  channel: string,
  text: string,
  options?: {
    blocks?: (Block | KnownBlock)[];
    thread_ts?: string;
  }
) {
  const client = getSlackClient();

  try {
    const result = await client.chat.postMessage({
      channel,
      text,
      blocks: options?.blocks,
      thread_ts: options?.thread_ts,
    });

    return result;
  } catch (error) {
    console.error('Error posting message to Slack:', error);
    throw error;
  }
}

export async function postEphemeral(
  channel: string,
  user: string,
  text: string,
  options?: {
    blocks?: (Block | KnownBlock)[];
  }
) {
  const client = getSlackClient();

  try {
    const result = await client.chat.postEphemeral({
      channel,
      user,
      text,
      blocks: options?.blocks,
    });

    return result;
  } catch (error) {
    console.error('Error posting ephemeral message to Slack:', error);
    throw error;
  }
}

export async function addReaction(
  channel: string,
  timestamp: string,
  emoji: string
) {
  const client = getSlackClient();

  try {
    await client.reactions.add({
      channel,
      timestamp,
      name: emoji,
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    // Don't throw - reactions are non-critical
  }
}

/**
 * Fetch thread replies from Slack to reconstruct conversation history
 * This provides persistent memory across cold starts
 */
export async function getThreadHistory(
  channel: string,
  threadTs: string,
  limit: number = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string; ts: string }>> {
  const client = getSlackClient();

  try {
    const result = await client.conversations.replies({
      channel,
      ts: threadTs,
      limit,
      inclusive: true,
    });

    if (!result.messages || result.messages.length === 0) {
      return [];
    }

    // Get the bot's user ID for identifying bot messages
    const authResult = await client.auth.test();
    const botUserId = authResult.user_id;

    // Convert Slack messages to conversation format
    // Skip the first message if it's the thread parent (already included in current context)
    const messages = result.messages
      .slice(1) // Skip thread parent
      .filter((msg) => msg.text && !(msg as any).subtype) // Only regular messages with text
      .map((msg) => ({
        role: (msg.user === botUserId ? 'assistant' : 'user') as 'user' | 'assistant',
        content: cleanSlackMessage(msg.text || ''),
        ts: msg.ts || '',
      }));

    console.log(`[Slack] Retrieved ${messages.length} messages from thread history`);
    return messages;
  } catch (error) {
    console.error('Error fetching thread history:', error);
    // Return empty array on error - non-critical
    return [];
  }
}

/**
 * Clean Slack message formatting for use in conversation context
 */
function cleanSlackMessage(text: string): string {
  return text
    // Remove bot mentions
    .replace(/<@[A-Z0-9]+>/g, '')
    // Convert Slack links to plain text
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

