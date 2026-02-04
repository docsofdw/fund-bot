/**
 * Manual trigger script for EOD report
 * Usage: npx tsx run-eod-report.ts [--test]
 *
 * Options:
 *   --test    Post to test channel instead of production
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { getPortfolioSnapshot } from './lib/sheets/portfolio';
import { getTopEquityHoldings } from './lib/sheets/equities';
import { formatCurrency, formatPercent } from './lib/utils/formatting';
import { formatDateCT, formatTimeCT } from './lib/utils/dates';
import { fetchOnChainMetrics, formatOnChainBrief } from './lib/external/bitcoin-magazine-pro';
import { getTodaySnapshot, calculate1DChange } from './lib/supabase/client';
import { getBTCPriceData } from './lib/external/coinmarketcap';
import { getStockQuotes } from './lib/external/twelvedata';
import { getYahooQuotes } from './lib/external/yahoo-finance';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from './lib/slack/blocks';

// Check for --test flag
const useTestChannel = process.argv.includes('--test');

async function runEODReport() {
  try {
    console.log('Generating EOD report...\n');

    // Fetch data
    const [snapshot, topHoldings, onChainMetrics, morningSnapshot, btcData] = await Promise.all([
      getPortfolioSnapshot(),
      getTopEquityHoldings(3),
      fetchOnChainMetrics(),
      getTodaySnapshot(),
      getBTCPriceData(),
    ]);

    // Fetch real-time stock quotes for holdings
    const holdingTickers = topHoldings
      .map(h => h.ticker)
      .filter(t => t && t.length > 0);
    console.log(`Fetching quotes for tickers: ${holdingTickers.join(', ') || 'none'}`);

    // Try Twelve Data first, then Yahoo Finance for missing tickers
    const stockQuotes = await getStockQuotes(holdingTickers);
    const missingTickers = holdingTickers.filter(t => !stockQuotes.has(t.toUpperCase()));

    if (missingTickers.length > 0) {
      console.log(`Trying Yahoo Finance for: ${missingTickers.join(', ')}`);
      const yahooQuotes = await getYahooQuotes(missingTickers);
      for (const [symbol, quote] of yahooQuotes) {
        stockQuotes.set(symbol, {
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          percentChange: quote.percentChange,
        });
      }
    }

    // Calculate 1D changes
    let fund1D: number | null = null;
    let btc1D: number | null = null;

    if (morningSnapshot) {
      fund1D = calculate1DChange(snapshot.liveAUM, morningSnapshot.morning_aum);
      console.log(`Fund 1D: ${(fund1D * 100).toFixed(2)}% (Current: ${snapshot.liveAUM}, Morning: ${morningSnapshot.morning_aum})`);
    } else {
      console.warn('No morning snapshot found - cannot calculate Fund 1D');
    }

    if (btcData) {
      btc1D = btcData.change24h;
      console.log(`BTC 24h: ${(btc1D * 100).toFixed(2)}%`);
    } else {
      console.warn('Could not fetch BTC 24h change from CoinMarketCap');
    }

    // Merge stock quotes with holdings
    const holdingsWithQuotes = topHoldings.map(h => {
      const quote = stockQuotes.get(h.ticker.toUpperCase());
      if (quote) {
        console.log(`${h.ticker}: ${(quote.percentChange * 100).toFixed(2)}%`);
        return {
          ...h,
          delta: quote.percentChange,
        };
      } else {
        console.warn(`No quote found for ${h.ticker} - showing N/A`);
        return {
          ...h,
          delta: null as unknown as number, // Will display N/A
        };
      }
    });

    // Build message
    const now = new Date();
    const dateStr = formatDateCT(now);
    const timeStr = formatTimeCT(now);

    // Format 1D changes (with fallback to N/A if not available)
    const fund1DStr = fund1D !== null ? formatPercent(fund1D) : '_N/A_';
    const btc1DStr = btc1D !== null ? formatPercent(btc1D) : '_N/A_';

    const blocks = [
      createHeaderBlock(`END OF DAY`),
      createSectionBlock(`*${dateStr}* | ${timeStr} CT`),

      createDividerBlock(),

      // BTC PRICE
      createSectionBlock(
        `*BTC:* $${snapshot.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      ),

      createDividerBlock(),

      // 210K BRIEF
      createSectionBlock(
        `*210K BRIEF*\n\n` +
        `AUM: ${formatCurrency(snapshot.liveAUM)}\n` +
        `Fund 1D: ${fund1DStr}\n` +
        `BTC 1D: ${btc1DStr}\n\n` +
        `*Top Holdings (1D):*\n` +
        (holdingsWithQuotes.length > 0
          ? holdingsWithQuotes
              .map((h, i) => `${i + 1}. ${h.name}  ${h.delta !== null ? formatPercent(h.delta) : '_N/A_'}`)
              .join('\n')
          : '_No holdings data_')
      ),

      createDividerBlock(),

      // ON-CHAIN BRIEF
      createSectionBlock(
        `*ON-CHAIN BRIEF*\n\n` +
        formatOnChainBrief(onChainMetrics, snapshot.btcPrice)
      ),

      createDividerBlock(),

      createSectionBlock(`_See you tomorrow_`),
    ];

    // Determine which channel to post to
    const channelId = useTestChannel
      ? config.channels.testDailyReportsId
      : config.channels.dailyReportsId;

    if (!channelId) {
      throw new Error('Channel ID not configured');
    }

    console.log(`\nPosting to ${useTestChannel ? 'TEST' : 'PRODUCTION'} channel...\n`);

    // Post to Slack
    await postMessage(channelId, 'End of Day — Fund Summary', { blocks });

    console.log('EOD report posted successfully!');
  } catch (error) {
    console.error('Error generating EOD report:', error);
    throw error;
  }
}

runEODReport();
