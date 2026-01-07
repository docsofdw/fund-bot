// Input validation and sanitization for user messages

/**
 * Maximum allowed message length to prevent abuse
 */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Minimum message length (after cleaning)
 */
const MIN_MESSAGE_LENGTH = 1;

/**
 * Patterns that might indicate malicious input
 */
const SUSPICIOUS_PATTERNS = [
  // Prompt injection attempts
  /ignore\s+previous\s+instructions/i,
  /disregard\s+all\s+previous/i,
  /forget\s+everything/i,
  /you\s+are\s+now/i,
  /new\s+instructions:/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  
  // Attempts to extract system info
  /show\s+me\s+your\s+prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /reveal\s+your\s+system\s+prompt/i,
  
  // XSS attempts (though Slack should handle this)
  /<script[\s\S]*?>/i,
  /javascript:/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
];

/**
 * Blocked phrases that should never be processed
 */
const BLOCKED_PHRASES = [
  'ignore previous instructions',
  'disregard previous instructions',
  'forget all previous',
  'system:',
  'assistant:',
];

export interface ValidationResult {
  valid: boolean;
  message?: string;
  sanitizedText?: string;
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitizeInput(text: string): ValidationResult {
  // Check if text exists
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      message: 'Please provide a valid message.',
    };
  }

  // Trim whitespace
  const trimmed = text.trim();

  // Check minimum length
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      message: 'Your message is too short. Please ask a question or provide more details.',
    };
  }

  // Check maximum length
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      message: `Your message is too long (${trimmed.length} characters). Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  // Check for blocked phrases
  const lowerText = trimmed.toLowerCase();
  for (const phrase of BLOCKED_PHRASES) {
    if (lowerText.includes(phrase)) {
      return {
        valid: false,
        message: 'Your message contains phrases that cannot be processed. Please rephrase your question.',
      };
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.warn('[Security] Suspicious pattern detected in message:', trimmed.substring(0, 100));
      return {
        valid: false,
        message: 'Your message appears to contain unusual formatting. Please rephrase your question naturally.',
      };
    }
  }

  // Remove null bytes and other control characters
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove excessive whitespace
  const normalized = sanitized.replace(/\s+/g, ' ');

  return {
    valid: true,
    sanitizedText: normalized,
  };
}

/**
 * Clean message text by removing bot mentions and extra whitespace
 */
export function cleanMessageText(text: string): string {
  // Remove bot mentions (Slack format: <@U12345>)
  let cleaned = text.replace(/<@[A-Z0-9]+>/g, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Check if a message is asking for help
 */
export function isHelpRequest(text: string): boolean {
  const helpPatterns = [
    /^help$/i,
    /^what can you do\??$/i,
    /^commands\??$/i,
    /^how do i use you\??$/i,
  ];
  
  const trimmed = text.trim();
  return helpPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Generate help message
 */
export function getHelpMessage(): string {
  return `Hi! I'm FundBot, here to help you with portfolio and market data. Here's what you can ask me:

*📊 Portfolio Questions:*
• "What's our current AUM?"
• "Show me our month-to-date performance"
• "What are our top positions?"
• "What's our Bitcoin exposure?"

*💰 Position Analysis:*
• "Tell me about our [ticker] position"
• "Which equities are trading at a premium?"
• "What's our portfolio concentration?"
• "How much cash do we have?"

*📈 Market Context:*
• "What's Bitcoin's price?"
• "Show me BTCTC companies by mNAV"
• "Which holdings have the best performance?"

*💡 Tips:*
• I have access to real-time data from your Google Sheets
• I can remember context within a thread
• Ask follow-up questions for deeper analysis
• I provide insights on risk metrics and concentration

Just ask me naturally - I'm here to help! 🚀`;
}

/**
 * Rate limit warning message
 */
export function getRateLimitMessage(remaining: number, resetTime: number): string {
  const resetDate = new Date(resetTime);
  const minutesUntilReset = Math.ceil((resetTime - Date.now()) / 60000);
  
  if (remaining === 0) {
    return `⏸️ You've reached your rate limit. Please try again in ${minutesUntilReset} minute${minutesUntilReset === 1 ? '' : 's'}.`;
  }
  
  return `⚠️ You have ${remaining} request${remaining === 1 ? '' : 's'} remaining in this window.`;
}

/**
 * Cost limit warning message
 */
export function getCostLimitMessage(budgetRemaining: number): string {
  if (budgetRemaining <= 0) {
    return "💰 Daily budget limit reached. Your requests will resume tomorrow. This helps control costs.";
  }
  
  if (budgetRemaining < 1) {
    return `💰 You're approaching your daily budget limit ($${budgetRemaining.toFixed(2)} remaining).`;
  }
  
  return '';
}

