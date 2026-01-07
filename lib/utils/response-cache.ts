// Response caching for common queries to reduce API costs and improve speed

interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
}

// In-memory cache (resets on cold start)
const responseCache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_CONFIG = {
  // Cache TTL in milliseconds (5 minutes for most queries)
  defaultTTL: 5 * 60 * 1000,
  // Short TTL for frequently changing data (30 seconds)
  shortTTL: 30 * 1000,
  // Long TTL for static/slow-changing data (30 minutes)
  longTTL: 30 * 60 * 1000,
  // Maximum cache size
  maxEntries: 100,
};

/**
 * Generate cache key from query and context
 */
function generateCacheKey(query: string, contextHash?: string): string {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return contextHash ? `${normalizedQuery}:${contextHash}` : normalizedQuery;
}

/**
 * Simple hash function for context (used to detect if portfolio data changed)
 */
export function hashContext(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Determine cache TTL based on query type
 */
function getCacheTTL(query: string): number {
  const lowerQuery = query.toLowerCase();
  
  // Short TTL for price/live data queries
  if (lowerQuery.includes('price') || 
      lowerQuery.includes('current') || 
      lowerQuery.includes('now') ||
      lowerQuery.includes('live')) {
    return CACHE_CONFIG.shortTTL;
  }
  
  // Long TTL for explanatory/static queries
  if (lowerQuery.includes('what is') ||
      lowerQuery.includes('explain') ||
      lowerQuery.includes('how does') ||
      lowerQuery.includes('tell me about')) {
    return CACHE_CONFIG.longTTL;
  }
  
  // Default TTL
  return CACHE_CONFIG.defaultTTL;
}

/**
 * Check if a query should be cached
 */
function shouldCache(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Don't cache very specific time-sensitive queries
  if (lowerQuery.includes('just now') || 
      lowerQuery.includes('this second') ||
      lowerQuery.includes('right now')) {
    return false;
  }
  
  // Don't cache very short queries (likely greetings)
  if (query.length < 10) {
    return false;
  }
  
  return true;
}

/**
 * Get cached response if available and not expired
 */
export function getCachedResponse(
  query: string, 
  contextHash?: string
): string | null {
  if (!shouldCache(query)) {
    return null;
  }

  const key = generateCacheKey(query, contextHash);
  const entry = responseCache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const ttl = getCacheTTL(query);
  const now = Date.now();
  
  // Check if entry is expired
  if (now - entry.timestamp > ttl) {
    responseCache.delete(key);
    console.log(`[Cache] Expired cache entry for: ${query.substring(0, 50)}`);
    return null;
  }
  
  // Update hit count
  entry.hitCount++;
  console.log(`[Cache] Cache hit (${entry.hitCount}x) for: ${query.substring(0, 50)}`);
  
  return entry.response;
}

/**
 * Store response in cache
 */
export function setCachedResponse(
  query: string,
  response: string,
  contextHash?: string
): void {
  if (!shouldCache(query)) {
    return;
  }

  // Check cache size limit
  if (responseCache.size >= CACHE_CONFIG.maxEntries) {
    // Evict oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of responseCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      responseCache.delete(oldestKey);
      console.log('[Cache] Evicted oldest entry to make room');
    }
  }

  const key = generateCacheKey(query, contextHash);
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    hitCount: 0,
  });
  
  console.log(`[Cache] Cached response for: ${query.substring(0, 50)}`);
}

/**
 * Clear all cached responses
 */
export function clearCache(): void {
  responseCache.clear();
  console.log('[Cache] Cleared all cached responses');
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of responseCache.entries()) {
    // Use longest TTL to be safe
    if (now - entry.timestamp > CACHE_CONFIG.longTTL) {
      responseCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned up ${cleaned} expired cache entries`);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  totalHits: number;
  entries: Array<{ query: string; hitCount: number; age: number }>;
} {
  const now = Date.now();
  let totalHits = 0;
  const entries: Array<{ query: string; hitCount: number; age: number }> = [];
  
  for (const [key, entry] of responseCache.entries()) {
    totalHits += entry.hitCount;
    entries.push({
      query: key.substring(0, 50),
      hitCount: entry.hitCount,
      age: Math.floor((now - entry.timestamp) / 1000),
    });
  }
  
  // Sort by hit count descending
  entries.sort((a, b) => b.hitCount - a.hitCount);
  
  return {
    size: responseCache.size,
    totalHits,
    entries: entries.slice(0, 10), // Top 10
  };
}

// Auto-cleanup every 10 minutes
setInterval(cleanupExpiredCache, 10 * 60 * 1000);

