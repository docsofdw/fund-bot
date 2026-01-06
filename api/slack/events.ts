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

// Event deduplication - track processed events
const processedEvents = new Set<string>();
const EVENT_TTL = 60000; // 1 minute

// Clean up old processed events every minute
setInterval(() => {
  processedEvents.clear();
}, EVENT_TTL);

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
    // Process event (must complete before responding or Vercel kills it)
    try {
      await handleEvent(event);
    } catch (error) {
      console.error('Error handling event:', error);
    }
    
    // Respond after processing
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}

async function handleEvent(event: any) {
  try {
    const { type, user, text, channel, ts, thread_ts, channel_type, bot_id, event_ts } = event;

    // Create unique event ID
    const eventId = `${channel}-${ts}-${event_ts || ts}`;
    
    // Check if we've already processed this event
    if (processedEvents.has(eventId)) {
      console.log('[Dedupe] Ignoring duplicate event:', eventId);
      return;
    }
    
    // Mark event as processed
    processedEvents.add(eventId);
    console.log('[Dedupe] Processing new event:', eventId);
    console.log('[Event] Event type:', type, 'Channel:', channel, 'User:', user);

  // Ignore bot messages
  if (bot_id) {
    console.log('[Filter] Ignoring bot message');
    return;
  }

  // Ignore if no text
  if (!text) {
    console.log('[Filter] Ignoring message with no text');
    return;
  }

  // Ignore messages that don't mention the bot unless in specific channels
  const isMention = type === 'app_mention';
  const isDM = channel_type === 'im';
  const isListenChannel = LISTEN_ALL_CHANNELS.includes(channel);

  console.log('[Filter] isMention:', isMention, 'isDM:', isDM, 'isListenChannel:', isListenChannel);

  if (!isMention && !isDM && !isListenChannel) {
    console.log('[Filter] Ignoring message - not a mention, DM, or in listen channel');
    return;
  }

  // Get thread ID (use thread_ts if in a thread, otherwise use ts)
  const threadId = thread_ts || ts;

  try {
    console.log('[Event] Processing message from user:', user, 'in channel:', channel);
    console.log('[Event] Message text:', text);
    console.log('[Event] Event type:', type);
    
    // Add thinking reaction (ignore if already added)
    try {
      console.log('[Reaction] About to add thinking face...');
      await addReaction(channel, ts, 'thinking_face');
      console.log('[Reaction] Added thinking face');
    } catch (e: any) {
      console.log('[Reaction] Failed to add thinking face:', e?.message || e);
    }

    console.log('[Text] About to clean text...');
    // Clean up the message text (remove bot mention)
    const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
    console.log('[Text] Cleaned text:', cleanText);

    if (!cleanText) {
      console.log('[Text] No text after cleaning, sending help message');
      await postMessage(channel, 'How can I help you today?', { thread_ts: threadId });
      return;
    }

    // Fetch portfolio data
    console.log('[Sheets] Fetching portfolio data...');
    const [snapshot, metrics] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
    ]);
    console.log('[Sheets] Portfolio data fetched successfully');

    // Build system prompt
    console.log('[Claude] Building system prompt...');
    const systemPrompt = buildQuickSystemPrompt(snapshot, metrics);
    console.log('[Claude] System prompt built');

    // Get conversation history if in a thread
    const conversationHistory = getThreadMessages(threadId);
    console.log('[Memory] Retrieved', conversationHistory.length, 'previous messages');

    // Send to Claude
    console.log('[Claude] Sending message to Claude API...');
    const response = await sendMessage(systemPrompt, cleanText, conversationHistory);
    console.log('[Claude] Received response:', response.substring(0, 100) + '...');

    // Store in thread memory
    addMessageToThread(threadId, 'user', cleanText);
    addMessageToThread(threadId, 'assistant', response);
    console.log('[Memory] Stored in thread memory');

    // Post response
    console.log('[Slack] Posting response to channel...');
    await postMessage(channel, response, { thread_ts: threadId });
    console.log('[Slack] Response posted successfully');

    // Add checkmark reaction (ignore if already added)
    try {
      await addReaction(channel, ts, 'white_check_mark');
      console.log('[Reaction] Added checkmark');
    } catch (e) {
      console.log('[Reaction] Checkmark already exists or error (ignoring)');
    }
    
    console.log('[Event] Processing complete!');
  } catch (error) {
    console.error('[Error] Error processing message:', error);
    console.error('[Error] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Error] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const { channel, ts, thread_ts } = event;
    const threadId = thread_ts || ts;
    
    try {
      await postMessage(
        channel,
        `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { thread_ts: threadId }
      );
      await addReaction(channel, ts, 'x');
    } catch (e) {
      console.error('[Error] Failed to post error message:', e);
    }
  }
  } catch (outerError) {
    console.error('[FATAL] Unhandled error in handleEvent:', outerError);
    console.error('[FATAL] Stack:', outerError instanceof Error ? outerError.stack : 'No stack');
  }
}
