// Morning report cron job (9:00 AM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getCategoryBreakdown } from '../../lib/sheets/portfolio';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils/formatting';
import { formatDateET, isWeekday } from '../../lib/utils/dates';
import {
  createHeaderBlock,
  createSectionBlock,
  createDividerBlock,
} from '../../lib/slack/blocks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'development'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Only run on weekdays
    if (!isWeekday()) {
      console.log('Skipping morning report - not a weekday');
      return res.status(200).json({ message: 'Skipped - weekend' });
    }

    // Fetch data
    const [snapshot, metrics, categories] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
    ]);

    // Build message
    const dateStr = formatDateET(new Date());
    
    const blocks = [
      createHeaderBlock(`☀️ Good Morning — Fund Summary`),
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
        `BTC MTD:       ${formatPercent(snapshot.btcMTD)}\n` +
        `Alpha:         ${formatPercent(snapshot.fundMTD - snapshot.btcMTD)}`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(
        `*📈 PORTFOLIO ALLOCATION*\n` +
        categories
          .map((cat) => `${cat.category}: ${formatPercent(cat.weight)}`)
          .join('\n') +
        `\n% Long:        ${formatPercent(metrics.percentLong)}`
      ),
      
      createDividerBlock(),
      
      createSectionBlock(`💵 Cash: ${formatCurrency(metrics.netCash)}`),
      
      createSectionBlock(`\nHave a great trading day! ☕`),
    ];

    // Post to Slack
    await postMessage(
      config.channels.dailyReportsId,
      '☀️ Good Morning — Fund Summary',
      { blocks }
    );

    return res.status(200).json({ message: 'Morning report posted successfully' });
  } catch (error) {
    console.error('Error generating morning report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate morning report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

