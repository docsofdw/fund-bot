/**
 * Manual trigger script for morning report
 * Usage: npx tsx run-morning-report.ts [--test]
 *
 * Options:
 *   --test    Post to test channel instead of production
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });

import { config } from './lib/config';
import { postMessage } from './lib/slack/client';
import { fetchMorningBrief } from './lib/terminal/morning-brief';
import { buildMorningReportBlocks } from './lib/slack/blocks';
import { fetchOnChainMetrics, type OnChainMetrics } from './lib/external/bitcoin-magazine-pro';

const useTestChannel = process.argv.includes('--test');

async function runMorningReport() {
  try {
    console.log('Generating morning report...\n');

    const [brief, onChainMetrics] = await Promise.all([
      fetchMorningBrief(),
      fetchOnChainMetrics().catch((err): OnChainMetrics | null => {
        console.warn('On-chain metrics fetch failed, skipping section:', err instanceof Error ? err.message : err);
        return null;
      }),
    ]);
    console.log(`Brief fetched (asOf=${brief.asOf}); on-chain=${onChainMetrics ? 'ok' : 'unavailable'}`);

    const blocks = buildMorningReportBlocks(brief, onChainMetrics);

    const channelId = useTestChannel
      ? config.channels.testDailyReportsId
      : config.channels.dailyReportsId;

    if (!channelId) {
      throw new Error('Channel ID not configured');
    }

    console.log(`\nPosting to ${useTestChannel ? 'TEST' : 'PRODUCTION'} channel...\n`);

    await postMessage(channelId, 'Good Morning — Fund Summary', { blocks });

    console.log('Morning report posted successfully!');
  } catch (error) {
    console.error('Error generating morning report:', error);
    throw error;
  }
}

runMorningReport();
