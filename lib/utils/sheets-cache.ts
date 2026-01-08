// Caching layer for Google Sheets data to reduce API calls and improve response times

import { PortfolioSnapshot, PortfolioMetrics, Position, CategoryBreakdown } from '../../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SheetsCache {
  portfolioSnapshot: CacheEntry<PortfolioSnapshot> | null;
  portfolioMetrics: CacheEntry<PortfolioMetrics> | null;
  topPositions: CacheEntry<Position[]> | null;
  categoryBreakdown: CacheEntry<CategoryBreakdown[]> | null;
}

// TTL configuration (in milliseconds)
const CACHE_TTL = {
  // Portfolio snapshot changes frequently with BTC price
  portfolioSnapshot: 30 * 1000, // 30 seconds
  // Metrics are derived from snapshot
  portfolioMetrics: 30 * 1000, // 30 seconds
  // Position data changes less frequently
  topPositions: 60 * 1000, // 60 seconds
  // Category breakdown changes rarely
  categoryBreakdown: 60 * 1000, // 60 seconds
};

// In-memory cache
const cache: SheetsCache = {
  portfolioSnapshot: null,
  portfolioMetrics: null,
  topPositions: null,
  categoryBreakdown: null,
};

// Track cache hits/misses for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  lastReset: Date.now(),
};

function isExpired<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return true;
  return Date.now() - entry.timestamp > entry.ttl;
}

// Portfolio Snapshot
export function getCachedPortfolioSnapshot(): PortfolioSnapshot | null {
  if (isExpired(cache.portfolioSnapshot)) {
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
  console.log('[SheetsCache] Cache HIT for portfolioSnapshot');
  return cache.portfolioSnapshot!.data;
}

export function setCachedPortfolioSnapshot(data: PortfolioSnapshot): void {
  cache.portfolioSnapshot = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL.portfolioSnapshot,
  };
  console.log('[SheetsCache] Cached portfolioSnapshot (TTL: 30s)');
}

// Portfolio Metrics
export function getCachedPortfolioMetrics(): PortfolioMetrics | null {
  if (isExpired(cache.portfolioMetrics)) {
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
  console.log('[SheetsCache] Cache HIT for portfolioMetrics');
  return cache.portfolioMetrics!.data;
}

export function setCachedPortfolioMetrics(data: PortfolioMetrics): void {
  cache.portfolioMetrics = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL.portfolioMetrics,
  };
  console.log('[SheetsCache] Cached portfolioMetrics (TTL: 30s)');
}

// Top Positions
export function getCachedTopPositions(): Position[] | null {
  if (isExpired(cache.topPositions)) {
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
  console.log('[SheetsCache] Cache HIT for topPositions');
  return cache.topPositions!.data;
}

export function setCachedTopPositions(data: Position[]): void {
  cache.topPositions = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL.topPositions,
  };
  console.log('[SheetsCache] Cached topPositions (TTL: 60s)');
}

// Category Breakdown
export function getCachedCategoryBreakdown(): CategoryBreakdown[] | null {
  if (isExpired(cache.categoryBreakdown)) {
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
  console.log('[SheetsCache] Cache HIT for categoryBreakdown');
  return cache.categoryBreakdown!.data;
}

export function setCachedCategoryBreakdown(data: CategoryBreakdown[]): void {
  cache.categoryBreakdown = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL.categoryBreakdown,
  };
  console.log('[SheetsCache] Cached categoryBreakdown (TTL: 60s)');
}

// Get last known good data (for graceful degradation)
export function getLastKnownSnapshot(): PortfolioSnapshot | null {
  return cache.portfolioSnapshot?.data || null;
}

export function getLastKnownMetrics(): PortfolioMetrics | null {
  return cache.portfolioMetrics?.data || null;
}

export function getLastKnownPositions(): Position[] | null {
  return cache.topPositions?.data || null;
}

// Cache statistics
export function getCacheStats(): {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  uptimeMinutes: number;
} {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? cacheStats.hits / total : 0;

  let entries = 0;
  if (cache.portfolioSnapshot) entries++;
  if (cache.portfolioMetrics) entries++;
  if (cache.topPositions) entries++;
  if (cache.categoryBreakdown) entries++;

  const uptimeMinutes = Math.floor((Date.now() - cacheStats.lastReset) / 60000);

  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate,
    entries,
    uptimeMinutes,
  };
}

// Clear all cache entries
export function clearCache(): void {
  cache.portfolioSnapshot = null;
  cache.portfolioMetrics = null;
  cache.topPositions = null;
  cache.categoryBreakdown = null;
  console.log('[SheetsCache] Cache cleared');
}

// Reset statistics
export function resetCacheStats(): void {
  cacheStats = {
    hits: 0,
    misses: 0,
    lastReset: Date.now(),
  };
}
