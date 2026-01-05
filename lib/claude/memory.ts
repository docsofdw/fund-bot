// Thread memory management for conversational context

import { ThreadContext, ThreadMessage } from '../../types';

const MAX_MESSAGES_PER_THREAD = 10;
const THREAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

  // Keep only the last N messages
  if (context.messages.length > MAX_MESSAGES_PER_THREAD) {
    context.messages = context.messages.slice(-MAX_MESSAGES_PER_THREAD);
  }

  context.lastUpdated = Date.now();
  threadMemory.set(threadTs, context);
}

export function getThreadMessages(threadTs: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const context = getThreadContext(threadTs);
  
  if (!context) {
    return [];
  }

  return context.messages.map(({ role, content }) => ({ role, content }));
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
    console.log(`Cleared ${threadsToDelete.length} expired thread(s)`);
  }
}

