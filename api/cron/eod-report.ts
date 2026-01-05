// End of day report cron job (4:30 PM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getAllPositions } from '../../lib/sheets/portfolio';
import { getBTCTCMovers } from '../../lib/sheets/btctc';
import { formatCurrency, formatNumber, formatPercent, formatPercentChange } from '../../lib/utils/formatting';
import { formatDateET, isWeekday } from '../../lib/utils/dates';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from '../../lib/slack/blocks';
import { DailyMover } from '../../types';

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

    // Fetch data
    const [snapshot, metrics, positions, btctcMovers] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getAllPositions(),
      getBTCTCMovers(5),
    ]);

    // Calculate daily change (would need historical data for accurate calculation)
    // For now, we'll show a placeholder
    const dailyChangeUSD = 0; // TODO: Implement historical tracking
    const dailyChangePercent = 0;

    // Get biggest movers from portfolio positions
    // Note: This requires 1-day change data in the sheet
    const portfolioMovers: DailyMover[] = positions
      .filter((p) => p.category === 'BTC Equities')
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        ticker: p.ticker || '',
        changePercent: 0, // TODO: Add 1D change to sheet data
        price: p.price,
        value: p.value,
      }));

    // Build message
    const dateStr = formatDateET(new Date());
    
    const blocks = [
      createHeaderBlock(`🌙 End of Day — Fund Summary`),
      createSectionBlock(`*${dateStr}*`),
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
        `*🏢 BTCTC MARKET MOVERS*\n` +
        `\n*Top Gainers:*\n` +
        btctcMovers.gainers
          .map((m) => `${formatPercentChange(m.changePercent)} ${m.company} (${m.ticker})`)
          .join('\n') +
        `\n\n*Top Losers:*\n` +
        btctcMovers.losers
          .map((m) => `${formatPercentChange(m.changePercent)} ${m.company} (${m.ticker})`)
          .join('\n')
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `BTC Price: ${formatCurrency(snapshot.btcPrice)}\n\n` +
        `See you tomorrow! 🌙`
      ),
    ];

    // Post to Slack
    await postMessage(
      config.channels.dailyReportsId,
      '🌙 End of Day — Fund Summary',
      { blocks }
    );

    return res.status(200).json({ message: 'EOD report posted successfully' });
  } catch (error) {
    console.error('Error generating EOD report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate EOD report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

