// Morning report cron job (9:00 AM CT / 10:00 AM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getCategoryBreakdown } from '../../lib/sheets/portfolio';
import { formatCurrency, formatPercent } from '../../lib/utils/formatting';
import { formatDateCT, formatTimeCT, isWeekday } from '../../lib/utils/dates';
import { getQuoteOfTheDay, formatQuote } from '../../lib/utils/daily-quotes';
import { autoManageQuotes } from '../../lib/utils/auto-quote-manager';
import { fetchOnChainMetrics, formatOnChainBrief } from '../../lib/external/bitcoin-magazine-pro';
import { generateDataQualityReport, shouldRetryDataFetch } from '../../lib/utils/data-validation';
import { saveMorningSnapshot } from '../../lib/supabase/client';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from '../../lib/slack/blocks';

// Configuration for data fetch retry
const DATA_FETCH_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000, // 5 seconds between retries
};

// Helper to wait
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'development'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Only run on weekdays
    if (!isWeekday()) {
      console.log('Skipping morning report - not a weekday');
      return res.status(200).json({ message: 'Skipped - weekend' });
    }

    // Auto-manage quote inventory (non-blocking - won't fail report if it fails)
    try {
      console.log('[Morning Report] Checking quote inventory...');
      await autoManageQuotes({ minThreshold: 80, targetQuotes: 100, batchSize: 50 });
    } catch (quoteError) {
      console.warn('[Morning Report] Quote auto-generation failed (non-fatal):', quoteError);
    }

    // Fetch data with timeout tracking and retry logic for zero values
    const startTime = Date.now();
    console.log('[Morning Report] Starting data fetch...');

    // Helper function to fetch all data in parallel
    async function fetchAllData() {
      const [snapshot, metrics, categories, onChainMetrics] = await Promise.all([
        getPortfolioSnapshot(),
        getPortfolioMetrics(),
        getCategoryBreakdown(),
        fetchOnChainMetrics(),
      ]);
      return { snapshot, metrics, categories, onChainMetrics };
    }

    let data = await fetchAllData();
    let dataQualityReport = generateDataQualityReport(data.snapshot, data.metrics);
    let attempt = 1;

    // Retry loop for data fetch - handles cases where sheet data returns zeros
    while (!dataQualityReport.overallValid && attempt < DATA_FETCH_CONFIG.maxRetries) {
      if (shouldRetryDataFetch(dataQualityReport)) {
        console.warn(`[Morning Report] Data validation failed on attempt ${attempt}, retrying in ${DATA_FETCH_CONFIG.retryDelayMs}ms...`);
        console.warn(`[Morning Report] Errors: ${dataQualityReport.criticalErrors.join(', ')}`);
        await sleep(DATA_FETCH_CONFIG.retryDelayMs);

        attempt++;
        console.log(`[Morning Report] Data fetch attempt ${attempt}/${DATA_FETCH_CONFIG.maxRetries}...`);
        data = await fetchAllData();
        dataQualityReport = generateDataQualityReport(data.snapshot, data.metrics);
      } else {
        console.warn(`[Morning Report] Data validation failed but retry won't help - proceeding`);
        break;
      }
    }

    if (dataQualityReport.overallValid) {
      console.log(`[Morning Report] Data validation passed on attempt ${attempt}`);
    } else {
      console.warn(`[Morning Report] Data validation failed after ${attempt} attempts`);
    }

    const fetchDuration = Date.now() - startTime;
    console.log(`[Morning Report] Data fetch completed in ${fetchDuration}ms (${attempt} attempt(s))`);

    // Extract data for easier access
    const { snapshot, metrics, categories, onChainMetrics } = data;

    // Save morning snapshot to Supabase for EOD 1D calculation
    try {
      await saveMorningSnapshot(snapshot.liveAUM, snapshot.btcPrice);
    } catch (snapshotError) {
      console.warn('[Morning Report] Failed to save morning snapshot (non-fatal):', snapshotError);
    }

    // If data is still invalid after retries, send an alert but continue with best effort
    if (!dataQualityReport.overallValid) {
      console.error('[Morning Report] Proceeding with invalid data - errors:', dataQualityReport.criticalErrors);

      // Send a warning to Slack about data quality issues
      try {
        await postMessage(
          config.channels.dailyReportsId,
          `*WARNING: Morning Report Data Quality Issue*\n` +
          `The following issues were detected:\n` +
          dataQualityReport.criticalErrors.map(e => `- ${e}`).join('\n') +
          `\n\n_Report will proceed with available data. Please check the Google Sheet._`
        );
      } catch (alertError) {
        console.error('[Morning Report] Failed to send data quality alert:', alertError);
      }
    }

    // Build message
    const now = new Date();
    const dateStr = formatDateCT(now);
    const timeStr = formatTimeCT(now);

    // Calculate cash percentage
    const cashCategory = categories.find(cat => cat.category === 'Cash');
    const cashPercent = cashCategory ? cashCategory.weight : 0;

    const blocks = [
      createHeaderBlock(`GOOD MORNING`),
      createSectionBlock(`*${dateStr}* | ${timeStr} CT`),

      createDividerBlock(),

      // ON-CHAIN BRIEF
      createSectionBlock(
        `*ON-CHAIN BRIEF*\n\n` +
        formatOnChainBrief(onChainMetrics, snapshot.btcPrice)
      ),

      createDividerBlock(),

      // FUND BRIEF
      createSectionBlock(
        `*FUND BRIEF*\n\n` +
        `AUM: ${formatCurrency(snapshot.liveAUM)}\n` +
        `Fund MTD: ${formatPercent(snapshot.fundMTD)}\n` +
        `BTC MTD: ${formatPercent(snapshot.btcMTD)}\n` +
        `Cash: ${formatPercent(cashPercent)}`
      ),

      createDividerBlock(),

      createSectionBlock(formatQuote(getQuoteOfTheDay())),
    ];

    // Post to Slack
    await postMessage(
      config.channels.dailyReportsId,
      'Good Morning — Fund Summary',
      { blocks }
    );

    console.log('[Morning Report] Successfully posted to Slack');
    return res.status(200).json({ message: 'Morning report posted successfully' });
  } catch (error) {
    console.error('[Morning Report] ERROR:', error);
    
    // Try to post error notification to Slack
    try {
      await postMessage(
        config.channels.dailyReportsId,
        `*ERROR: Morning Report Failed*\n${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (slackError) {
      console.error('[Morning Report] Failed to send error notification to Slack:', slackError);
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate morning report',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

