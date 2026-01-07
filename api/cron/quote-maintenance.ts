/**
 * Vercel Cron Job: Weekly quote maintenance
 * Ensures quote pool stays healthy with fresh variety
 * 
 * Add to vercel.json:
 * {
 *   "path": "/api/cron/quote-maintenance",
 *   "schedule": "0 2 * * 0"  // Every Sunday at 2 AM
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { weeklyMaintenance } from '../../lib/utils/auto-quote-manager';
import { getQuoteCount } from '../../lib/utils/daily-quotes';
import { config } from '../../lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  
  if (authHeader !== `Bearer ${config.cronSecret}`) {
    console.error('[Quote Maintenance] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Quote Maintenance] Starting weekly maintenance...');
    
    const beforeCounts = getQuoteCount();
    console.log(`[Quote Maintenance] Before: ${beforeCounts.total} quotes`);
    
    await weeklyMaintenance();
    
    const afterCounts = getQuoteCount();
    console.log(`[Quote Maintenance] After: ${afterCounts.total} quotes`);
    
    const added = afterCounts.total - beforeCounts.total;
    
    return res.status(200).json({
      success: true,
      message: `Weekly maintenance complete. Added ${added} quotes.`,
      before: beforeCounts,
      after: afterCounts,
      added
    });
  } catch (error) {
    console.error('[Quote Maintenance] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Weekly maintenance failed'
    });
  }
}

