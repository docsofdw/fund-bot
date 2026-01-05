// Slack Web API client

import { WebClient } from '@slack/web-api';
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
    blocks?: unknown[];
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
    blocks?: unknown[];
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

