// End of day report cron job (6:00 PM CT / 7:00 PM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot } from '../../lib/sheets/portfolio';
import { getTopEquityHoldings } from '../../lib/sheets/equities';
import { formatCurrency, formatPercent } from '../../lib/utils/formatting';
import { formatDateCT, formatTimeCT, isWeekday } from '../../lib/utils/dates';
import { fetchOnChainMetrics, formatOnChainBrief } from '../../lib/external/bitcoin-magazine-pro';
import { getTodaySnapshot, calculate1DChange } from '../../lib/supabase/client';
import { getBTCPriceData } from '../../lib/external/coinmarketcap';
import { getStockQuotes } from '../../lib/external/twelvedata';
import { getYahooQuotes } from '../../lib/external/yahoo-finance';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from '../../lib/slack/blocks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'development'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Only run on weekdays
    if (!isWeekday()) {
      console.log('Skipping EOD report - not a weekday');
      return res.status(200).json({ message: 'Skipped - weekend' });
    }

    // Fetch data with timeout tracking
    const startTime = Date.now();
    console.log('[EOD Report] Starting data fetch...');

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

    // Try Twelve Data first, then Yahoo Finance for missing tickers
    const stockQuotes = await getStockQuotes(holdingTickers);
    const missingTickers = holdingTickers.filter(t => !stockQuotes.has(t.toUpperCase()));

    if (missingTickers.length > 0) {
      console.log(`[EOD Report] Trying Yahoo Finance for: ${missingTickers.join(', ')}`);
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

    const fetchDuration = Date.now() - startTime;
    console.log(`[EOD Report] Data fetch completed in ${fetchDuration}ms`);

    // Calculate 1D changes
    let fund1D: number | null = null;
    let btc1D: number | null = null;

    if (morningSnapshot) {
      fund1D = calculate1DChange(snapshot.liveAUM, morningSnapshot.morning_aum);
      console.log(`[EOD Report] Fund 1D: ${(fund1D * 100).toFixed(2)}% (Current: ${snapshot.liveAUM}, Morning: ${morningSnapshot.morning_aum})`);
    } else {
      console.warn('[EOD Report] No morning snapshot found - cannot calculate Fund 1D');
    }

    if (btcData) {
      btc1D = btcData.change24h;
      console.log(`[EOD Report] BTC 24h: ${(btc1D * 100).toFixed(2)}%`);
    } else {
      console.warn('[EOD Report] Could not fetch BTC 24h change from CoinMarketCap');
    }

    // Merge stock quotes with holdings
    const holdingsWithQuotes = topHoldings.map(h => {
      const quote = stockQuotes.get(h.ticker.toUpperCase());
      if (quote) {
        console.log(`[EOD Report] ${h.ticker}: ${(quote.percentChange * 100).toFixed(2)}%`);
        return {
          ...h,
          delta: quote.percentChange,
        };
      } else {
        console.warn(`[EOD Report] No quote found for ${h.ticker}`);
        return {
          ...h,
          delta: null as unknown as number,
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

    // Post to Slack
    await postMessage(
      config.channels.dailyReportsId,
      'End of Day — Fund Summary',
      { blocks }
    );

    console.log('[EOD Report] Successfully posted to Slack');
    return res.status(200).json({ message: 'EOD report posted successfully' });
  } catch (error) {
    console.error('[EOD Report] ERROR:', error);

    // Try to post error notification to Slack
    try {
      await postMessage(
        config.channels.dailyReportsId,
        `*ERROR: EOD Report Failed*\n${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (slackError) {
      console.error('[EOD Report] Failed to send error notification to Slack:', slackError);
    }

    return res.status(500).json({
      error: 'Failed to generate EOD report',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
