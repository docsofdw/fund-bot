// Slack Block Kit message builders

import type { Brief } from '../terminal/brief';
import { fmtUsd, fmtPct } from '../format';

export function buildEodReportBlocks(brief: Brief) {
  // The terminal API distinguishes:
  //   change1dPct === null → upstream feed stale (>3d) — fmtPct renders "N/A"
  //   change1dPct === 0    → upstream returned a quote with no movement (honest flat
  //                          day OR thin-trading sub-tick noise on penny names).
  //                          Asterisk + footnote so readers don't misread the signal.
  //   anything else        → normal +X.XX% / -X.XX%
  const hasZeroChange = brief.topHoldings.some(h => h.change1dPct === 0);

  const holdings = brief.topHoldings
    .map((h, i) => {
      const marker = h.change1dPct === 0 ? '*' : '';
      return `${i + 1}. ${h.name}  ${fmtPct(h.change1dPct)}${marker}`;
    })
    .join('\n');

  const footnote = hasZeroChange
    ? '\n_* upstream reports no movement — possible flat day or thin trading_'
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

