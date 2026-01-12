#!/usr/bin/env ts-node

/**
 * Test EOD report - posts to #test-daily-reports channel
 * Usage: npx ts-node run-test-eod-report.ts
 *
 * Use this to preview the EOD report before it goes to the main channel.
 * Requires TEST_DAILY_REPORTS_CHANNEL_ID in your .env file.
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics } from './lib/sheets/portfolio';
import { getBTCTCMovers } from './lib/sheets/btctc';
import { formatCurrency, formatNumber, formatPercent, formatPercentChange, formatStockPrice } from './lib/utils/formatting';
import { formatDateCT, formatTimeCT } from './lib/utils/dates';
import { fetchMarketIndicators, formatMarketIndicators } from './lib/external/market-indicators';
import { generateDataQualityReport, shouldRetryDataFetch } from './lib/utils/data-validation';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
  createContextBlock,
} from './lib/slack/blocks';

// Retry configuration
const DATA_FETCH_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to fetch all data in parallel
async function fetchAllData() {
  const [snapshot, metrics, btctcMovers, marketIndicators] = await Promise.all([
    getPortfolioSnapshot(),
    getPortfolioMetrics(),
    getBTCTCMovers(3),
    fetchMarketIndicators(),
  ]);
  return { snapshot, metrics, btctcMovers, marketIndicators };
}

async function runTestEODReport() {
  // Validate test channel is configured
  const testChannelId = config.channels.testDailyReportsId;
  if (!testChannelId) {
    console.error('❌ TEST_DAILY_REPORTS_CHANNEL_ID not configured in .env');
    console.log('\nTo set up:');
    console.log('1. Create #test-daily-reports channel in Slack');
    console.log('2. Invite the bot to the channel');
    console.log('3. Get the channel ID (right-click channel → View channel details → scroll to bottom)');
    console.log('4. Add TEST_DAILY_REPORTS_CHANNEL_ID=CXXXXXXXX to your .env file');
    process.exit(1);
  }

  try {
    console.log('🧪 Generating TEST EOD report...\n');
    console.log(`   Target channel: #test-daily-reports (${testChannelId})\n`);

    // Fetch with retry logic
    let data = await fetchAllData();
    let dataQualityReport = generateDataQualityReport(data.snapshot, data.metrics, data.marketIndicators);
    let attempt = 1;

    while (!dataQualityReport.overallValid && attempt < DATA_FETCH_CONFIG.maxRetries) {
      if (shouldRetryDataFetch(dataQualityReport)) {
        console.warn(`⚠️  Data validation failed on attempt ${attempt}, retrying in ${DATA_FETCH_CONFIG.retryDelayMs / 1000}s...`);
        console.warn(`   Errors: ${dataQualityReport.criticalErrors.join(', ')}`);
        await sleep(DATA_FETCH_CONFIG.retryDelayMs);

        attempt++;
        console.log(`   Retry attempt ${attempt}/${DATA_FETCH_CONFIG.maxRetries}...`);
        data = await fetchAllData();
        dataQualityReport = generateDataQualityReport(data.snapshot, data.metrics, data.marketIndicators);
      } else {
        break;
      }
    }

    const { snapshot, metrics, btctcMovers, marketIndicators } = data;

    // Log data quality status
    if (dataQualityReport.overallValid) {
      console.log('✅ Data validation passed\n');
    } else {
      console.warn('⚠️  Data validation failed - proceeding with available data');
      console.warn(`   Errors: ${dataQualityReport.criticalErrors.join(', ')}\n`);
    }

    // Log key values for inspection
    console.log('📊 Key Values:');
    console.log(`   BTC Price: ${formatCurrency(snapshot.btcPrice)}`);
    console.log(`   Live AUM: ${formatCurrency(snapshot.liveAUM)}`);
    console.log(`   Fund MTD: ${formatPercent(snapshot.fundMTD)}`);
    console.log(`   BTC MTD: ${formatPercent(snapshot.btcMTD)}`);
    console.log(`   Bitcoin Delta: ${formatNumber(metrics.bitcoinDelta)} BTC`);
    console.log('');

    // Build message
    const now = new Date();
    const dateStr = formatDateCT(now);
    const timeStr = formatTimeCT(now);

    const blocks = [
      createHeaderBlock(`🧪 [TEST] End of Day — Fund Summary`),
      createContextBlock([`_This is a TEST report - not sent to the main channel_`]),
      createSectionBlock(`*${dateStr}* • ${timeStr} CT`),
      createSectionBlock(
        `₿ BTC Price: ${formatCurrency(snapshot.btcPrice)}\n\n` +
        `*📊 MARKET INDICATORS*\n` +
        formatMarketIndicators(marketIndicators) + `\n\n` +
        `_Data from <https://docs.google.com/spreadsheets/d/1R5ZXjN3gDb7CVTrbUdqQU_HDLM2cFVUGS5CNynslAzE/edit?gid=777144457#gid=777144457|210k Portfolio Stats>_`
      ),
      createDividerBlock(),

      createSectionBlock(
        `*💰 AUM SNAPSHOT*\n` +
        `Live AUM: ${formatCurrency(snapshot.liveAUM)}\n` +
        `MTM AUM: ${formatCurrency(snapshot.mtmAUM)}\n` +
        `BTC Delta: ${formatNumber(metrics.bitcoinDelta)} BTC`
      ),

      createDividerBlock(),

      createSectionBlock(
        `*📊 MONTH-TO-DATE*\n` +
        `Fund MTD: ${formatPercent(snapshot.fundMTD)}\n` +
        `BTC MTD: ${formatPercent(snapshot.btcMTD)}`
      ),

      createDividerBlock(),

      createSectionBlock(
        `*📊 BTCTC MOVERS*\n\n` +
        `*Top Gainers:*\n` +
        (btctcMovers.gainers.length > 0
          ? btctcMovers.gainers
              .map((m) => `${formatPercentChange(m.changePercent)}  ${m.ticker} (${formatStockPrice(m.price)}) - ${m.company}`)
              .join('\n')
          : '_No gainers today_') +
        `\n\n*Top Losers:*\n` +
        (btctcMovers.losers.length > 0
          ? btctcMovers.losers
              .map((m) => `${formatPercentChange(m.changePercent)}  ${m.ticker} (${formatStockPrice(m.price)}) - ${m.company}`)
              .join('\n')
          : '_No losers today_') +
        `\n\n_Data from <https://docs.google.com/spreadsheets/d/1_whntepzncCFsn-K1oyL5Epqh5D6mauAOnb_Zs7svkk/edit?gid=0#gid=0|BTCTCs Master Sheet>_`
      ),

      createDividerBlock(),

      createSectionBlock(`See you tomorrow! 🌙`),
    ];

    // Add data quality warning if there were issues
    if (!dataQualityReport.overallValid) {
      blocks.push(createDividerBlock());
      blocks.push(createSectionBlock(
        `⚠️ *Data Quality Warning*\n` +
        dataQualityReport.criticalErrors.map(e => `• ${e}`).join('\n')
      ));
    }

    // Post to TEST channel
    await postMessage(testChannelId, '🧪 [TEST] End of Day — Fund Summary', { blocks });

    console.log('✅ Test EOD report posted to #test-daily-reports!');
    console.log('\n💡 If it looks good, the scheduled report will post to #daily-reports at 3:30 PM CT');
  } catch (error) {
    console.error('❌ Error generating test EOD report:', error);
    throw error;
  }
}

runTestEODReport();
