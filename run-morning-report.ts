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
import { getEquityMovers } from './lib/sheets/equities';
import { formatCurrency, formatNumber, formatPercent } from './lib/utils/formatting';
import { formatDateTimeET } from './lib/utils/dates';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from './lib/slack/blocks';

async function runMorningReport() {
  try {
    console.log('📊 Generating morning report...\n');

    // Fetch data
    const [snapshot, metrics, categories, equityMovers] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
      getEquityMovers(5),
    ]);

    // Build message
    const now = new Date();
    const dateTimeStr = formatDateTimeET(now);
    
    const blocks = [
      createHeaderBlock(`☀️ Good Morning — Fund Summary`),
      createSectionBlock(`*${dateTimeStr}*`),
      createSectionBlock(
        `₿ BTC Price: ${formatCurrency(snapshot.btcPrice)}\n` +
        `_Data from <https://docs.google.com/spreadsheets/d/1R5ZXjN3gDb7CVTrbUdqQU_HDLM2cFVUGS5CNynslAzE/edit?gid=777144457#gid=777144457|210k Portfolio Stats>_`
      ),
      createDividerBlock(),
      
      createSectionBlock(
        `*💰 AUM SNAPSHOT*\n` +
        `Live AUM:      ${formatCurrency(snapshot.liveAUM)}\n` +
        `MTM AUM:       ${formatCurrency(snapshot.mtmAUM)}\n` +
        `BTC Delta:     ${formatNumber(metrics.bitcoinDelta)} BTC`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*📊 MONTH-TO-DATE*\n` +
        `Fund MTD:      ${formatPercent(snapshot.fundMTD)}\n` +
        `BTC MTD:       ${formatPercent(snapshot.btcMTD)}\n` +
        `Alpha:         ${formatPercent(snapshot.fundMTD - snapshot.btcMTD)}`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*📈 PORTFOLIO ALLOCATION*\n` +
        categories
          .map((cat) => `${cat.category}: ${formatPercent(cat.weight)}`)
          .join('\n') +
        `\n% Long: ${formatPercent(metrics.percentLong)}`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*🏆 EQUITY POSITIONS*\n\n` +
        `*Trading at Premium (> NAV):*\n` +
        equityMovers.gainers
          .map((m) => `${m.mnav.toFixed(2)}x  ${m.ticker} - ${m.name}`)
          .join('\n') +
        `\n\n*Trading at Discount (< NAV):*\n` +
        equityMovers.losers
          .map((m) => `${m.mnav.toFixed(2)}x  ${m.ticker} - ${m.name}`)
          .join('\n')
      ),
      
      createDividerBlock(),
      
      createSectionBlock(`💵 Net Cash: ${formatCurrency(metrics.netCash)}`),
      
      createSectionBlock(`\nHave a great trading day! ☕`),
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

