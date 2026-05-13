// Slack Block Kit message builders

import type { Brief } from '../terminal/brief';
import { fmtUsd, fmtPct } from '../format';

export function buildEodReportBlocks(brief: Brief) {
  // A change1dPct of exactly 0 from the terminal usually indicates the upstream
  // price sync skipped the ticker (foreign-listing lookup failure) rather than
  // a truly flat day. Mark these with an asterisk and add a footnote so readers
  // don't mistake stale data for real movement.
  const hasZeroChange = brief.topHoldings.some(h => h.change1dPct === 0);

  const holdings = brief.topHoldings
    .map((h, i) => {
      const marker = h.change1dPct === 0 ? '*' : '';
      return `${i + 1}. ${h.name}  ${fmtPct(h.change1dPct)}${marker}`;
    })
    .join('\n');

  const footnote = hasZeroChange
    ? '\n_* live quote pending — likely an international-listing sync gap_'
    : '';

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*BTC:* ${fmtUsd(brief.btc.priceUsd)}` },
    },
    { type: 'header', text: { type: 'plain_text', text: '210K BRIEF' } },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*AUM:*\n${fmtUsd(brief.fund.aumUsd)}` },
        { type: 'mrkdwn', text: `*Fund 1D:*\n${fmtPct(brief.fund.change1dPct)}` },
        { type: 'mrkdwn', text: `*BTC 1D:*\n${fmtPct(brief.btc.change1dPct)}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Top Holdings (1D):*\n${holdings}${footnote}` },
    },
  ];
}

export function createHeaderBlock(text: string) {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

export function createSectionBlock(text: string) {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text,
    },
  };
}

export function createDividerBlock() {
  return {
    type: 'divider',
  };
}

export function createContextBlock(elements: string[]) {
  return {
    type: 'context',
    elements: elements.map((text) => ({
      type: 'mrkdwn',
      text,
    })),
  };
}

export function createFieldsBlock(fields: Array<{ title: string; value: string }>) {
  return {
    type: 'section',
    fields: fields.map(({ title, value }) => ({
      type: 'mrkdwn',
      text: `*${title}*\n${value}`,
    })),
  };
}

