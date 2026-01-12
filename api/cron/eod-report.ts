// End of day report cron job (3:30 PM CT / 4:30 PM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics } from '../../lib/sheets/portfolio';
import { getBTCTCMovers } from '../../lib/sheets/btctc';
import { formatCurrency, formatNumber, formatPercent, formatPercentChange, formatStockPrice } from '../../lib/utils/formatting';
import { formatDateCT, formatTimeCT, isWeekday } from '../../lib/utils/dates';
import { fetchMarketIndicators, formatMarketIndicators } from '../../lib/external/market-indicators';
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
    
    const [snapshot, metrics, btctcMovers, marketIndicators] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getBTCTCMovers(3),
      fetchMarketIndicators(),
    ]);

    const fetchDuration = Date.now() - startTime;
    console.log(`[EOD Report] Data fetch completed in ${fetchDuration}ms`);

    // Build message
    const now = new Date();
    const dateStr = formatDateCT(now);
    const timeStr = formatTimeCT(now);
    
    const blocks = [
      createHeaderBlock(`🌙 End of Day — Fund Summary`),
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

    // Post to Slack
    await postMessage(
      config.channels.dailyReportsId,
      '🌙 End of Day — Fund Summary',
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
        `⚠️ EOD Report Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

