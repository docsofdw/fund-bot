/**
 * Automatic quote management - ensures quote pool never runs dry
 * Generates new quotes automatically when inventory is low
 */

import { generateQuotes } from './quote-generator';
import { getQuoteCount } from './daily-quotes';
import * as fs from 'fs';
import * as path from 'path';

const QUOTES_FILE = path.join(__dirname, '../../data/generated-quotes.json');

// Configuration
const MIN_QUOTES_THRESHOLD = 50; // Generate more when total falls below this
const TARGET_QUOTES = 100; // Try to maintain this many generated quotes
const BATCH_SIZE = 50; // Generate this many quotes per batch

interface AutoGenConfig {
  minThreshold?: number;
  targetQuotes?: number;
  batchSize?: number;
}

/**
 * Check if quote generation is needed and auto-generate if necessary
 */
export async function autoManageQuotes(config?: AutoGenConfig): Promise<{
  generated: boolean;
  count: number;
  message: string;
}> {
  const minThreshold = config?.minThreshold || MIN_QUOTES_THRESHOLD;
  const targetQuotes = config?.targetQuotes || TARGET_QUOTES;
  const batchSize = config?.batchSize || BATCH_SIZE;

  const counts = getQuoteCount();
  
  console.log(`[Quote Manager] Current inventory: ${counts.total} quotes (${counts.hardcoded} hardcoded + ${counts.generated} generated)`);
  
  // Check if we need more quotes
  if (counts.total >= minThreshold) {
    console.log(`[Quote Manager] ✅ Sufficient quotes (${counts.total} >= ${minThreshold})`);
    return {
      generated: false,
      count: counts.total,
      message: `Sufficient quotes available (${counts.total})`
    };
  }
  
  // Calculate how many we need
  const quotesNeeded = Math.max(batchSize, targetQuotes - counts.generated);
  
  console.log(`[Quote Manager] 🔄 Low on quotes (${counts.total} < ${minThreshold}), generating ${quotesNeeded} new quotes...`);
  
  try {
    // Generate new quotes
    const newQuotes = await generateQuotes(quotesNeeded);
    
    // Load existing and merge
    const existingQuotes = loadGeneratedQuotes();
    const allQuotes = [...existingQuotes, ...newQuotes];
    const uniqueQuotes = deduplicateQuotes(allQuotes);
    
    // Save
    saveGeneratedQuotes(uniqueQuotes);
    
    const newTotal = getQuoteCount().total;
    const message = `Auto-generated ${newQuotes.length} quotes (total now: ${newTotal})`;
    
    console.log(`[Quote Manager] ✅ ${message}`);
    
    return {
      generated: true,
      count: newQuotes.length,
      message
    };
  } catch (error) {
    console.error('[Quote Manager] ❌ Failed to auto-generate quotes:', error);
    
    // Don't throw - fail gracefully and continue with existing quotes
    return {
      generated: false,
      count: 0,
      message: `Failed to generate quotes: ${error}`
    };
  }
}

/**
 * Force generate quotes to reach target inventory
 */
export async function ensureQuoteInventory(targetCount: number = TARGET_QUOTES): Promise<void> {
  const counts = getQuoteCount();
  
  if (counts.total >= targetCount) {
    console.log(`[Quote Manager] ✅ Already have ${counts.total} quotes (target: ${targetCount})`);
    return;
  }
  
  const needed = targetCount - counts.total;
  console.log(`[Quote Manager] 🔄 Building inventory: generating ${needed} quotes to reach target of ${targetCount}...`);
  
  const newQuotes = await generateQuotes(needed);
  const existingQuotes = loadGeneratedQuotes();
  const allQuotes = [...existingQuotes, ...newQuotes];
  const uniqueQuotes = deduplicateQuotes(allQuotes);
  
  saveGeneratedQuotes(uniqueQuotes);
  
  console.log(`[Quote Manager] ✅ Inventory complete: ${getQuoteCount().total} total quotes`);
}

/**
 * Weekly maintenance: ensure healthy quote diversity
 */
export async function weeklyMaintenance(): Promise<void> {
  console.log('[Quote Manager] 🔧 Running weekly maintenance...');
  
  const counts = getQuoteCount();
  
  // If we have less than 100 total quotes, generate more
  if (counts.total < 100) {
    console.log(`[Quote Manager] Building inventory to 150 quotes...`);
    await ensureQuoteInventory(150);
  } else {
    // Just add 20 more for variety
    console.log(`[Quote Manager] Adding 20 new quotes for variety...`);
    const newQuotes = await generateQuotes(20);
    const existingQuotes = loadGeneratedQuotes();
    const allQuotes = [...existingQuotes, ...newQuotes];
    const uniqueQuotes = deduplicateQuotes(allQuotes);
    saveGeneratedQuotes(uniqueQuotes);
  }
  
  const finalCounts = getQuoteCount();
  console.log(`[Quote Manager] ✅ Maintenance complete: ${finalCounts.total} total quotes available`);
}

// Helper functions

function loadGeneratedQuotes(): any[] {
  try {
    if (fs.existsSync(QUOTES_FILE)) {
      const data = fs.readFileSync(QUOTES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('[Quote Manager] Could not load generated quotes:', error);
  }
  return [];
}

function saveGeneratedQuotes(quotes: any[]): void {
  const dataDir = path.dirname(QUOTES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
}

function deduplicateQuotes(quotes: any[]): any[] {
  const seen = new Set<string>();
  return quotes.filter(q => {
    const key = `${q.text.toLowerCase()}-${q.author.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

