// Morning report cron job (9:00 AM CT / 10:00 AM ET)
// Pulls fund data from the terminal /api/morning-brief endpoint.
// On-chain metrics still come from Bitcoin Magazine Pro directly.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../lib/config';
import { postMessage } from '../../lib/slack/client';
import { fetchMorningBrief } from '../../lib/terminal/morning-brief';
import { buildMorningReportBlocks } from '../../lib/slack/blocks';
import { isWeekday } from '../../lib/utils/dates';
import { fetchOnChainMetrics, type OnChainMetrics } from '../../lib/external/bitcoin-magazine-pro';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'development'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!isWeekday()) {
      console.log('Skipping morning report - not a weekday');
      return res.status(200).json({ message: 'Skipped - weekend' });
    }

    const startTime = Date.now();
    console.log('[Morning Report] Fetching morning brief + on-chain metrics...');

    // On-chain fetch must not block the report — if BM Pro is down we still want
    // to post the fund brief section.
    const [brief, onChainMetrics] = await Promise.all([
      fetchMorningBrief(),
      fetchOnChainMetrics().catch((err): OnChainMetrics | null => {
        console.warn('[Morning Report] On-chain metrics fetch failed, skipping section:', err instanceof Error ? err.message : err);
        return null;
      }),
    ]);

    console.log(`[Morning Report] Data fetched in ${Date.now() - startTime}ms (asOf=${brief.asOf}, on-chain=${onChainMetrics ? 'ok' : 'unavailable'})`);

    const blocks = buildMorningReportBlocks(brief, onChainMetrics);

    await postMessage(
      config.channels.dailyReportsId,
      'Good Morning — Fund Summary',
      { blocks }
    );

    console.log('[Morning Report] Successfully posted to Slack');
    return res.status(200).json({ message: 'Morning report posted successfully' });
  } catch (error) {
    console.error('[Morning Report] ERROR:', error);

    try {
      await postMessage(
        config.channels.dailyReportsId,
        `*ERROR: Morning Report Failed*\n${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (slackError) {
      console.error('[Morning Report] Failed to send error notification to Slack:', slackError);
    }

    return res.status(500).json({
      error: 'Failed to generate morning report',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
