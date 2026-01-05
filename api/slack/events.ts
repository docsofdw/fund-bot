// Slack events API handler

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { config } from '../../lib/config';
import { LISTEN_ALL_CHANNELS } from '../../config/channels';
import { postMessage, addReaction } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics } from '../../lib/sheets/portfolio';
import { sendMessage } from '../../lib/claude/client';
import { buildQuickSystemPrompt } from '../../lib/claude/prompts';
import { addMessageToThread, getThreadMessages } from '../../lib/claude/memory';

// Verify Slack request signature
function verifySlackRequest(req: VercelRequest): boolean {
  const slackSignature = req.headers['x-slack-signature'] as string;
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;

  if (!slackSignature || !slackTimestamp) {
    return false;
  }

  // Prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(slackTimestamp)) > 60 * 5) {
    return false;
  }

  const sigBasestring = `v0:${slackTimestamp}:${JSON.stringify(req.body)}`;
  const mySignature = `v0=${createHmac('sha256', config.slack.signingSecret)
    .update(sigBasestring)
    .digest('hex')}`;

  return mySignature === slackSignature;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request is from Slack
  if (!verifySlackRequest(req)) {
    console.error('Invalid Slack signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, challenge, event } = req.body;

  // URL verification challenge
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // Handle event
  if (type === 'event_callback' && event) {
    // Respond quickly to avoid timeout
    res.status(200).json({ ok: true });

    // Process event asynchronously
    handleEvent(event).catch((error) => {
      console.error('Error handling event:', error);
    });

    return;
  }

  return res.status(200).json({ ok: true });
}

async function handleEvent(event: any) {
  const { type, user, text, channel, ts, thread_ts, channel_type, bot_id } = event;

  // Ignore bot messages
  if (bot_id) {
    return;
  }

  // Ignore messages that don't mention the bot unless in specific channels
  const isMention = type === 'app_mention';
  const isDM = channel_type === 'im';
  const isListenChannel = LISTEN_ALL_CHANNELS.includes(channel);

  if (!isMention && !isDM && !isListenChannel) {
    return;
  }

  try {
    // Add thinking reaction
    await addReaction(channel, ts, 'thinking_face');

    // Get thread ID (use thread_ts if in a thread, otherwise use ts)
    const threadId = thread_ts || ts;

    // Clean up the message text (remove bot mention)
    const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();

    if (!cleanText) {
      await postMessage(channel, 'How can I help you today?', { thread_ts: threadId });
      return;
    }

    // Fetch portfolio data
    const [snapshot, metrics] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
    ]);

    // Build system prompt
    const systemPrompt = buildQuickSystemPrompt(snapshot, metrics);

    // Get conversation history if in a thread
    const conversationHistory = getThreadMessages(threadId);

    // Send to Claude
    const response = await sendMessage(systemPrompt, cleanText, conversationHistory);

    // Store in thread memory
    addMessageToThread(threadId, 'user', cleanText);
    addMessageToThread(threadId, 'assistant', response);

    // Post response
    await postMessage(channel, response, { thread_ts: threadId });

    // Add checkmark reaction
    await addReaction(channel, ts, 'white_check_mark');
  } catch (error) {
    console.error('Error processing message:', error);
    
    await postMessage(
      channel,
      `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { thread_ts: thread_ts || ts }
    );

    await addReaction(channel, ts, 'x');
  }
}

