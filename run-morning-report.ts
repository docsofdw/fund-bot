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
import { getTopEquityHoldings } from './lib/sheets/equities';
import { formatCurrency, formatNumber, formatPercent, formatStockPrice } from './lib/utils/formatting';
import { formatDateTimeCT } from './lib/utils/dates';
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
    const [snapshot, metrics, categories, topEquities, marketIndicators] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
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
    const dateTimeStr = formatDateTimeCT(now);
    
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
        (() => {
          const nonZeroCategories = categories.filter((cat) => cat.weight > 0.001);
          if (nonZeroCategories.length === 0) return '_No allocation data available_';
          return nonZeroCategories
            .map((cat) => `${cat.category}: ${formatPercent(cat.weight)}`)
            .join('\n');
        })()
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*🎯 TOP 5 EQUITY HOLDINGS (USD)*\n` +
        (topEquities.length > 0
          ? topEquities
              .map((p, i) => `${i + 1}. ${p.name}\n     Price: ${formatStockPrice(p.price)} • Value: ${formatCurrency(p.value)}`)
              .join('\n') +
            `\n\n_Top 5 Concentration: ${formatPercent(topHoldingsConcentration)}_`
          : '_No equity holdings available_')
      ),

      createDividerBlock(),

      createSectionBlock(
        `*⚠️ RISK SNAPSHOT*\n` +
        (() => {
          const lines: string[] = [];
          if (metrics.percentLong > 0.001) lines.push(`% Long: ${formatPercent(metrics.percentLong)}`);
          if (metrics.totalBorrowPercent > 0.001) lines.push(`Total Borrow: ${formatPercent(metrics.totalBorrowPercent)}`);
          if (largestEquity && largestPositionWeight > 0.001) lines.push(`Largest Equity: ${formatPercent(largestPositionWeight)} (${largestEquity.name})`);
          if (Math.abs(metrics.extraBTCExposure) > 0.01) lines.push(`Extra BTC Exposure: ${formatNumber(metrics.extraBTCExposure)} BTC`);
          if (Math.abs(metrics.netCash) > 100) lines.push(`Net Cash: ${formatCurrency(metrics.netCash)}`);
          return lines.length > 0 ? lines.join('\n') : '_No significant risk metrics_';
        })()
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

