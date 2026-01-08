#!/usr/bin/env ts-node

/**
 * Test morning report - posts to #test-daily-reports channel
 * Usage: npx ts-node run-test-morning-report.ts
 *
 * Use this to preview the morning report before it goes to the main channel.
 * Requires TEST_DAILY_REPORTS_CHANNEL_ID in your .env file.
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getCategoryBreakdown } from './lib/sheets/portfolio';
import { getEquityMovers, getTopEquityHoldings } from './lib/sheets/equities';
import { formatCurrency, formatNumber, formatPercent } from './lib/utils/formatting';
import { formatDateTimeET } from './lib/utils/dates';
import { getQuoteOfTheDay, formatQuote } from './lib/utils/daily-quotes';
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
  const [snapshot, metrics, categories, equityMovers, topEquities, marketIndicators] = await Promise.all([
    getPortfolioSnapshot(),
    getPortfolioMetrics(),
    getCategoryBreakdown(),
    getEquityMovers(5),
    getTopEquityHoldings(5),
    fetchMarketIndicators(),
  ]);
  return { snapshot, metrics, categories, equityMovers, topEquities, marketIndicators };
}

async function runTestMorningReport() {
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
    console.log('🧪 Generating TEST morning report...\n');
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

    const { snapshot, metrics, categories, equityMovers, topEquities, marketIndicators } = data;

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

    // Calculate top holdings concentration
    const topHoldingsTotal = topEquities.reduce((sum, p) => sum + p.value, 0);
    const topHoldingsConcentration = snapshot.liveAUM > 0
      ? topHoldingsTotal / snapshot.liveAUM
      : 0;

    // Find largest single equity position
    const largestEquity = topEquities.length > 0 ? topEquities[0] : null;
    const largestPositionWeight = largestEquity && snapshot.liveAUM > 0
      ? largestEquity.value / snapshot.liveAUM
      : 0;

    // Build message
    const now = new Date();
    const dateTimeStr = formatDateTimeET(now);

    const blocks = [
      createHeaderBlock(`🧪 [TEST] Good Morning — Fund Summary`),
      createContextBlock([`_This is a TEST report - not sent to the main channel_`]),
      createSectionBlock(`*${dateTimeStr}*`),
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
        `BTC MTD: ${formatPercent(snapshot.btcMTD)}\n` +
        `Alpha: ${formatPercent(snapshot.fundMTD - snapshot.btcMTD)}`
      ),

      createDividerBlock(),

      createSectionBlock(
        `*📈 PORTFOLIO ALLOCATION*\n` +
        (categories.length > 0
          ? categories
              .map((cat) => `${cat.category}: ${formatPercent(cat.weight)}`)
              .join('\n')
          : '_No allocation data available_') +
        `\n% Long: ${formatPercent(metrics.percentLong)}`
      ),

      createDividerBlock(),

      createSectionBlock(
        `*🎯 TOP 5 EQUITY HOLDINGS (USD)*\n` +
        (topEquities.length > 0
          ? topEquities
              .map((p, i) => `${i + 1}. ${p.ticker} - ${formatCurrency(p.value)}`)
              .join('\n') +
            `\n\n_Top 5 Concentration: ${formatPercent(topHoldingsConcentration)}_`
          : '_No equity holdings available_')
      ),

      createDividerBlock(),

      createSectionBlock(
        `*⚠️ RISK SNAPSHOT*\n` +
        `% Long: ${formatPercent(metrics.percentLong)}\n` +
        `Total Borrow: ${formatPercent(metrics.totalBorrowPercent)}\n` +
        `Largest Equity: ${largestEquity ? `${formatPercent(largestPositionWeight)} (${largestEquity.ticker})` : 'N/A'}\n` +
        `Extra BTC Exposure: ${formatNumber(metrics.extraBTCExposure)} BTC\n` +
        `Net Cash: ${formatCurrency(metrics.netCash)}`
      ),

      createDividerBlock(),

      createSectionBlock(
        `*🏆 EQUITY POSITIONS*\n\n` +
        `*Trading at Premium (> NAV):*\n` +
        (equityMovers.gainers.length > 0
          ? equityMovers.gainers
              .map((m) => `${m.mnav.toFixed(2)}x  ${m.ticker} - ${m.name}`)
              .join('\n')
          : '_No positions at premium_') +
        `\n\n*Trading at Discount (< NAV):*\n` +
        (equityMovers.losers.length > 0
          ? equityMovers.losers
              .map((m) => `${m.mnav.toFixed(2)}x  ${m.ticker} - ${m.name}`)
              .join('\n')
          : '_No positions at discount_')
      ),

      createDividerBlock(),

      createSectionBlock(formatQuote(getQuoteOfTheDay())),
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
    await postMessage(testChannelId, '🧪 [TEST] Good Morning — Fund Summary', { blocks });

    console.log('✅ Test morning report posted to #test-daily-reports!');
    console.log('\n💡 If it looks good, the scheduled report will post to #daily-reports at 9:00 AM ET');
  } catch (error) {
    console.error('❌ Error generating test morning report:', error);
    throw error;
  }
}

runTestMorningReport();
