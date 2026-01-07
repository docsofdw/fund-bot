// Morning report cron job (9:00 AM ET)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { getPortfolioSnapshot, getPortfolioMetrics, getCategoryBreakdown } from '../../lib/sheets/portfolio';
import { getEquityMovers, getTopEquityHoldings } from '../../lib/sheets/equities';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils/formatting';
import { formatDateET, formatTimeET, isWeekday } from '../../lib/utils/dates';
import { getQuoteOfTheDay, formatQuote } from '../../lib/utils/daily-quotes';
import { autoManageQuotes } from '../../lib/utils/auto-quote-manager';
import { fetchMarketIndicators, formatMarketIndicators } from '../../lib/external/market-indicators';
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

    // Auto-manage quote inventory (non-blocking - won't fail report if it fails)
    try {
      console.log('[Morning Report] Checking quote inventory...');
      await autoManageQuotes({ minThreshold: 80, targetQuotes: 100, batchSize: 50 });
    } catch (quoteError) {
      console.warn('[Morning Report] Quote auto-generation failed (non-fatal):', quoteError);
    }

    // Fetch data with timeout tracking
    const startTime = Date.now();
    console.log('[Morning Report] Starting data fetch...');
    
    const [snapshot, metrics, categories, equityMovers, topEquities, marketIndicators] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
      getCategoryBreakdown(),
      getEquityMovers(5),
      getTopEquityHoldings(5),
      fetchMarketIndicators(),
    ]);

    const fetchDuration = Date.now() - startTime;
    console.log(`[Morning Report] Data fetch completed in ${fetchDuration}ms`);

    // Calculate top holdings concentration (with safety checks)
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
    const dateStr = formatDateET(now);
    const timeStr = formatTimeET(now);
    
    const blocks = [
      createHeaderBlock(`☀️ Good Morning — Fund Summary`),
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
    await postMessage(
      config.channels.dailyReportsId,
      '☀️ Good Morning — Fund Summary',
      { blocks }
    );

    console.log('[Morning Report] Successfully posted to Slack');
    return res.status(200).json({ message: 'Morning report posted successfully' });
  } catch (error) {
    console.error('[Morning Report] ERROR:', error);
    
    // Try to post error notification to Slack
    try {
      await postMessage(
        config.channels.dailyReportsId,
        `⚠️ Morning Report Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (slackError) {
      console.error('[Morning Report] Failed to send error notification to Slack:', slackError);
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate morning report',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

