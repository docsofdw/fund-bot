// Slack events API handler

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../../lib/config';
import { LISTEN_ALL_CHANNELS } from '../../config/channels';
import { postMessage, addReaction } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics } from '../../lib/sheets/portfolio';
import { sendMessage } from '../../lib/claude/client';
import { buildQuickSystemPrompt } from '../../lib/claude/prompts';
import { addMessageToThread, getThreadMessages } from '../../lib/claude/memory';

// Disable body parsing so we can verify the raw body
export const config_vercel = {
  api: {
    bodyParser: false,
  },
};

// Read raw body from request
async function getRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Verify Slack request signature
function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  // Prevent replay attacks (5 minute window)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = `v0=${createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body and parse it
  const rawBody = await getRawBody(req);
  let body: any;
  
  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Verify request is from Slack
  const slackSignature = req.headers['x-slack-signature'] as string;
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;

  if (!verifySlackSignature(config.slack.signingSecret, slackSignature, slackTimestamp, rawBody)) {
    console.error('Invalid Slack signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, challenge, event } = body;

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
