// Anthropic Claude API client with retry logic and error handling

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

let anthropicClient: Anthropic | null = null;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

export function getClaudeClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }

  anthropicClient = new Anthropic({
    apiKey: config.anthropic.apiKey,
    maxRetries: 0, // We handle retries ourselves for better control
  });

  return anthropicClient;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(delay + jitter, MAX_RETRY_DELAY);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on rate limits, timeouts, and server errors
  if (error.status) {
    return error.status === 429 || error.status >= 500;
  }
  
  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error: any): string {
  if (error.status === 429) {
    return "I'm receiving too many requests right now. Please try again in a moment.";
  }
  
  if (error.status === 401) {
    return "There's an authentication issue with my AI service. Please contact the team.";
  }
  
  if (error.status >= 500) {
    return "My AI service is experiencing issues. Please try again in a few moments.";
  }
  
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return "The request timed out. Please try asking your question again.";
  }

  if (error.message?.includes('context_length_exceeded')) {
    return "Your question is too complex or the conversation is too long. Try starting a new thread or asking a simpler question.";
  }

  return `I encountered an error: ${error.message || 'Unknown error'}. Please try again or rephrase your question.`;
}

export interface SendMessageResult {
  response: string;
  inputTokens: number;
  outputTokens: number;
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<SendMessageResult> {
  const client = getClaudeClient();
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...(conversationHistory || []),
        { role: 'user', content: userMessage },
      ];

      console.log(`[Claude] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const responseText = textContent && 'text' in textContent 
        ? textContent.text 
        : 'Sorry, I could not generate a response.';

      // Extract token usage
      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;

      console.log(`[Claude] Success! Input tokens: ${inputTokens}, Output tokens: ${outputTokens}`);

      return {
        response: responseText,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      lastError = error;
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, error);

      // Don't retry if this is the last attempt
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log('[Claude] Error is not retryable, failing immediately');
        break;
      }

      // Wait before retrying
      const delay = getRetryDelay(attempt);
      console.log(`[Claude] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries failed
  const userFriendlyMessage = getUserFriendlyError(lastError);
  console.error('[Claude] All retries exhausted. Last error:', lastError);
  
  throw new Error(userFriendlyMessage);
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

