#!/usr/bin/env ts-node

/**
 * Manual trigger script for morning report
 * Usage: npx ts-node run-morning-report.ts
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
import { autoManageQuotes } from './lib/utils/auto-quote-manager';
import { fetchMarketIndicators, formatMarketIndicators } from './lib/external/market-indicators';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from './lib/slack/blocks';

async function runMorningReport() {
  try {
    // Auto-manage quote inventory before generating report
    console.log('📜 Checking quote inventory...\n');
    await autoManageQuotes({
      minThreshold: 80,  // Generate more when below 80 total quotes
      targetQuotes: 100, // Try to maintain 100 generated quotes
      batchSize: 50      // Generate 50 at a time
    });
    
    console.log('📊 Generating morning report...\n');

    // Fetch data
    const [snapshot, metrics, categories, equityMovers, topEquities, marketIndicators] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
      getEquityMovers(5),
      getTopEquityHoldings(5),
      fetchMarketIndicators(),
    ]);

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
      createHeaderBlock(`☀️ Good Morning — Fund Summary`),
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

    // Post to Slack
    await postMessage(config.channels.dailyReportsId, '☀️ Good Morning — Fund Summary', { blocks });

    console.log('✅ Morning report posted successfully!');
  } catch (error) {
    console.error('❌ Error generating morning report:', error);
    throw error;
  }
}

runMorningReport();

