// Anthropic Claude API client

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

let anthropicClient: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }

  anthropicClient = new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  return anthropicClient;
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const client = getClaudeClient();

  try {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(conversationHistory || []),
      { role: 'user', content: userMessage },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((block) => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

