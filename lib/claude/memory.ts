// Enhanced thread memory management for conversational context
// Uses in-memory cache with Slack thread history fallback for persistence

import { ThreadContext, ThreadMessage } from '../../types';
import { getThreadHistory } from '../slack/client';

const MAX_MESSAGES_PER_THREAD = 10;
const THREAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SUMMARY_THRESHOLD = 8; // Create summary after this many messages

// In-memory storage (resets on cold start, which is acceptable)
const threadMemory = new Map<string, ThreadContext>();

export function getThreadContext(threadTs: string): ThreadContext | null {
  const context = threadMemory.get(threadTs);

  if (!context) {
    return null;
  }

  // Check if thread has expired
  const now = Date.now();
  if (now - context.lastUpdated > THREAD_TTL_MS) {
    threadMemory.delete(threadTs);
    return null;
  }

  return context;
}

/**
 * Create a summary of older messages to preserve context while reducing token usage
 */
function createConversationSummary(messages: ThreadMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  // Extract key topics from user messages
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

  const topics = new Set<string>();
  
  // Simple keyword extraction for common fund-related topics
  const keywords = [
    'AUM', 'performance', 'position', 'BTC', 'bitcoin', 'holdings',
    'equity', 'cash', 'exposure', 'portfolio', 'risk', 'concentration',
    'premium', 'discount', 'mNAV', 'alpha', 'returns',
  ];

  userMessages.forEach((msg) => {
    const lowerMsg = msg.toLowerCase();
    keywords.forEach((keyword) => {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        topics.add(keyword);
      }
    });
  });

  if (topics.size === 0) {
    return `Previous conversation about portfolio and market data (${messages.length} messages)`;
  }

  return `Previous conversation topics: ${Array.from(topics).join(', ')} (${messages.length} messages)`;
}

export function addMessageToThread(
  threadTs: string,
  role: 'user' | 'assistant',
  content: string
): void {
  let context = threadMemory.get(threadTs);

  if (!context) {
    context = {
      threadTs,
      messages: [],
      lastUpdated: Date.now(),
    };
  }

  context.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });

  // If we have many messages, create a summary and keep recent ones
  if (context.messages.length > MAX_MESSAGES_PER_THREAD) {
    // Keep the most recent messages
    const recentMessages = context.messages.slice(-MAX_MESSAGES_PER_THREAD);
    
    // Create summary of older messages if we haven't already
    if (!context.summary && context.messages.length > SUMMARY_THRESHOLD) {
      const olderMessages = context.messages.slice(0, -MAX_MESSAGES_PER_THREAD);
      context.summary = createConversationSummary(olderMessages);
      console.log(`[Memory] Created summary for thread ${threadTs}: ${context.summary}`);
    }
    
    context.messages = recentMessages;
  }

  context.lastUpdated = Date.now();
  threadMemory.set(threadTs, context);
}

export function getThreadMessages(threadTs: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const context = getThreadContext(threadTs);

  if (!context) {
    return [];
  }

  const messages = context.messages.map(({ role, content }) => ({ role, content }));

  // Prepend summary as a system-like context if it exists
  if (context.summary && messages.length > 0) {
    // Add summary as the first user message for context
    messages.unshift({
      role: 'user',
      content: `[Context from earlier in conversation: ${context.summary}]`,
    });
    messages.unshift({
      role: 'assistant',
      content: 'Noted, I\'ll keep that context in mind.',
    });
  }

  return messages;
}

/**
 * Get thread messages with Slack fallback for cold start recovery
 * This provides persistent conversation history across serverless invocations
 */
export async function getThreadMessagesWithFallback(
  threadTs: string,
  channel: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  // First, try in-memory cache
  const cachedMessages = getThreadMessages(threadTs);

  if (cachedMessages.length > 0) {
    console.log(`[Memory] Using ${cachedMessages.length} cached messages`);
    return cachedMessages;
  }

  // If cache is empty, try to recover from Slack thread history
  console.log('[Memory] Cache empty, fetching from Slack thread history...');

  try {
    const slackHistory = await getThreadHistory(channel, threadTs, MAX_MESSAGES_PER_THREAD);

    if (slackHistory.length > 0) {
      console.log(`[Memory] Recovered ${slackHistory.length} messages from Slack`);

      // Rebuild the in-memory cache from Slack history
      for (const msg of slackHistory) {
        addMessageToThread(threadTs, msg.role, msg.content);
      }

      // Return the recovered messages
      return slackHistory.map(({ role, content }) => ({ role, content }));
    }
  } catch (error) {
    console.warn('[Memory] Failed to fetch Slack history:', error);
  }

  return [];
}

/**
 * Get thread statistics
 */
export function getThreadStats(threadTs: string): {
  messageCount: number;
  hasSummary: boolean;
  ageMinutes: number;
} | null {
  const context = getThreadContext(threadTs);
  
  if (!context) {
    return null;
  }

  const now = Date.now();
  const ageMinutes = Math.floor((now - (context.messages[0]?.timestamp || now)) / 60000);

  return {
    messageCount: context.messages.length,
    hasSummary: !!context.summary,
    ageMinutes,
  };
}

/**
 * Clear a specific thread
 */
export function clearThread(threadTs: string): void {
  threadMemory.delete(threadTs);
  console.log(`[Memory] Cleared thread ${threadTs}`);
}

export function clearExpiredThreads(): void {
  const now = Date.now();
  const threadsToDelete: string[] = [];

  for (const [threadTs, context] of threadMemory.entries()) {
    if (now - context.lastUpdated > THREAD_TTL_MS) {
      threadsToDelete.push(threadTs);
    }
  }

  threadsToDelete.forEach((threadTs) => threadMemory.delete(threadTs));

  if (threadsToDelete.length > 0) {
    console.log(`[Memory] Cleared ${threadsToDelete.length} expired thread(s)`);
  }
}

/**
 * Get memory statistics
 */
export function getMemoryStats(): {
  totalThreads: number;
  totalMessages: number;
  threadsWithSummaries: number;
} {
  let totalMessages = 0;
  let threadsWithSummaries = 0;

  for (const context of threadMemory.values()) {
    totalMessages += context.messages.length;
    if (context.summary) {
      threadsWithSummaries++;
    }
  }

  return {
    totalThreads: threadMemory.size,
    totalMessages,
    threadsWithSummaries,
  };
}

// Auto-cleanup every hour
setInterval(clearExpiredThreads, 60 * 60 * 1000);
