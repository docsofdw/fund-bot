// Rate limiting to prevent abuse and control costs

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

// In-memory rate limit tracking (resets on cold start)
const rateLimits = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Max requests per window
  maxRequests: 20,
  // Window duration in milliseconds (5 minutes)
  windowMs: 5 * 60 * 1000,
  // Warning threshold (80% of limit)
  warningThreshold: 16,
};

// Cost tracking per user
interface CostEntry {
  tokensUsed: number;
  estimatedCost: number;
  requestCount: number;
  resetTime: number;
}

const costTracking = new Map<string, CostEntry>();

// Cost configuration (Claude Sonnet pricing)
const COST_CONFIG = {
  // Approximate cost per 1M tokens (input + output)
  costPer1MTokens: 15, // $15 per 1M tokens
  // Daily budget per user in dollars
  dailyBudgetPerUser: 10,
  // Window for cost tracking (24 hours)
  costWindowMs: 24 * 60 * 60 * 1000,
};

/**
 * Check if a user has exceeded their rate limit
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  warning?: string;
} {
  const now = Date.now();
  const key = `user:${userId}`;
  
  let entry = rateLimits.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      firstRequestTime: now,
    };
    rateLimits.set(key, entry);
  }

  // Increment count
  entry.count++;

  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count);
  const allowed = entry.count <= RATE_LIMIT_CONFIG.maxRequests;

  // Generate warning if approaching limit
  let warning: string | undefined;
  if (entry.count >= RATE_LIMIT_CONFIG.warningThreshold && entry.count < RATE_LIMIT_CONFIG.maxRequests) {
    warning = `You're approaching your rate limit (${remaining} requests remaining in this ${RATE_LIMIT_CONFIG.windowMs / 60000} min window)`;
  }

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    warning,
  };
}

/**
 * Track cost for a user
 */
export function trackCost(userId: string, inputTokens: number, outputTokens: number): {
  withinBudget: boolean;
  estimatedCost: number;
  budgetRemaining: number;
} {
  const now = Date.now();
  const key = `cost:${userId}`;
  
  let entry = costTracking.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || now >= entry.resetTime) {
    entry = {
      tokensUsed: 0,
      estimatedCost: 0,
      requestCount: 0,
      resetTime: now + COST_CONFIG.costWindowMs,
    };
    costTracking.set(key, entry);
  }

  // Calculate cost for this request
  const totalTokens = inputTokens + outputTokens;
  const requestCost = (totalTokens / 1000000) * COST_CONFIG.costPer1MTokens;

  // Update entry
  entry.tokensUsed += totalTokens;
  entry.estimatedCost += requestCost;
  entry.requestCount++;

  const budgetRemaining = Math.max(0, COST_CONFIG.dailyBudgetPerUser - entry.estimatedCost);
  const withinBudget = entry.estimatedCost <= COST_CONFIG.dailyBudgetPerUser;

  return {
    withinBudget,
    estimatedCost: entry.estimatedCost,
    budgetRemaining,
  };
}

/**
 * Get rate limit stats for a user
 */
export function getRateLimitStats(userId: string): {
  requestCount: number;
  remaining: number;
  resetTime: number;
} {
  const key = `user:${userId}`;
  const entry = rateLimits.get(key);

  if (!entry) {
    return {
      requestCount: 0,
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
    };
  }

  return {
    requestCount: entry.count,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Get cost stats for a user
 */
export function getCostStats(userId: string): {
  tokensUsed: number;
  estimatedCost: number;
  requestCount: number;
  budgetRemaining: number;
  resetTime: number;
} {
  const key = `cost:${userId}`;
  const entry = costTracking.get(key);

  if (!entry) {
    return {
      tokensUsed: 0,
      estimatedCost: 0,
      requestCount: 0,
      budgetRemaining: COST_CONFIG.dailyBudgetPerUser,
      resetTime: Date.now() + COST_CONFIG.costWindowMs,
    };
  }

  return {
    tokensUsed: entry.tokensUsed,
    estimatedCost: entry.estimatedCost,
    requestCount: entry.requestCount,
    budgetRemaining: Math.max(0, COST_CONFIG.dailyBudgetPerUser - entry.estimatedCost),
    resetTime: entry.resetTime,
  };
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  // Clean rate limits
  for (const [key, entry] of rateLimits.entries()) {
    if (now >= entry.resetTime) {
      rateLimits.delete(key);
      cleaned++;
    }
  }

  // Clean cost tracking
  for (const [key, entry] of costTracking.entries()) {
    if (now >= entry.resetTime) {
      costTracking.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  }
}

// Auto-cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);

