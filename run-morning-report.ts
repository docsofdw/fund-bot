#!/usr/bin/env ts-node

/**
 * Manual trigger script for morning report
 * Usage: npx tsx run-morning-report.ts [--test]
 *
 * Options:
 *   --test    Post to test channel instead of production
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getCategoryBreakdown } from './lib/sheets/portfolio';
import { formatCurrency, formatPercent } from './lib/utils/formatting';
import { formatDateCT, formatTimeCT } from './lib/utils/dates';
import { getQuoteOfTheDay, formatQuote } from './lib/utils/daily-quotes';
import { autoManageQuotes } from './lib/utils/auto-quote-manager';
import { fetchOnChainMetrics, formatOnChainBrief } from './lib/external/bitcoin-magazine-pro';
import { saveMorningSnapshot } from './lib/supabase/client';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from './lib/slack/blocks';

// Check for --test flag
const useTestChannel = process.argv.includes('--test');

async function runMorningReport() {
  try {
    // Auto-manage quote inventory before generating report
    console.log('Checking quote inventory...\n');
    await autoManageQuotes({
      minThreshold: 80,
      targetQuotes: 100,
      batchSize: 50
    });

    console.log('Generating morning report...\n');

    // Fetch data
    const [snapshot, metrics, categories, onChainMetrics] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
      fetchOnChainMetrics(),
    ]);

    // Save morning snapshot to Supabase for EOD 1D calculation
    try {
      await saveMorningSnapshot(snapshot.liveAUM, snapshot.btcPrice);
      console.log('Morning snapshot saved to Supabase\n');
    } catch (snapshotError) {
      console.warn('Failed to save morning snapshot:', snapshotError);
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

    // Determine which channel to post to
    const channelId = useTestChannel
      ? config.channels.testDailyReportsId
      : config.channels.dailyReportsId;

    if (!channelId) {
      throw new Error('Channel ID not configured');
    }

    console.log(`Posting to ${useTestChannel ? 'TEST' : 'PRODUCTION'} channel...\n`);

    // Post to Slack
    await postMessage(channelId, 'Good Morning — Fund Summary', { blocks });

    console.log('Morning report posted successfully!');
  } catch (error) {
    console.error('Error generating morning report:', error);
    throw error;
  }
}

runMorningReport();
