#!/usr/bin/env ts-node

/**
 * Manual trigger script for end-of-day report
 * Usage: npx ts-node run-eod-report.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics } from './lib/sheets/portfolio';
import { getBTCTCMovers } from './lib/sheets/btctc';
import { formatCurrency, formatNumber, formatPercent, formatPercentChange, formatStockPrice } from './lib/utils/formatting';
import { formatDateTimeET } from './lib/utils/dates';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from './lib/slack/blocks';

async function runEODReport() {
  try {
    console.log('📊 Generating end-of-day report...\n');

    // Fetch data
    const [snapshot, metrics, btctcMovers] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getBTCTCMovers(3),
    ]);

    // Build message
    const now = new Date();
    const dateTimeStr = formatDateTimeET(now);
    
    const blocks = [
      createHeaderBlock(`🌙 End of Day — Fund Summary`),
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
        `BTC MTD:       ${formatPercent(snapshot.btcMTD)}`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*📊 BTCTC MOVERS*\n\n` +
        `*Top Gainers:*\n` +
        btctcMovers.gainers
          .map((m) => `${formatPercentChange(m.changePercent)}  ${m.ticker} (${formatStockPrice(m.price)}) - ${m.company}`)
          .join('\n') +
        `\n\n*Top Losers:*\n` +
        btctcMovers.losers
          .map((m) => `${formatPercentChange(m.changePercent)}  ${m.ticker} (${formatStockPrice(m.price)}) - ${m.company}`)
          .join('\n') +
        `\n\n_Data from <https://docs.google.com/spreadsheets/d/1_whntepzncCFsn-K1oyL5Epqh5D6mauAOnb_Zs7svkk/edit?gid=0#gid=0|BTCTCs Master Sheet>_`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(`See you tomorrow! 🌙`),
    ];

    // Post to Slack
    await postMessage(config.channels.dailyReportsId, '🌙 End of Day — Fund Summary', { blocks });

    console.log('✅ End-of-day report posted successfully!');
  } catch (error) {
    console.error('❌ Error generating end-of-day report:', error);
    throw error;
  }
}

runEODReport();

