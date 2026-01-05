// Claude system prompts and context builders

import { PortfolioSnapshot, PortfolioMetrics, Position, TreasuryPosition, BTCTCCompany } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatting';

export function buildSystemPrompt(data: {
  snapshot: PortfolioSnapshot;
  metrics: PortfolioMetrics;
  positions?: Position[];
  treasury?: TreasuryPosition[];
  btctc?: BTCTCCompany[];
}): string {
  const { snapshot, metrics, positions, treasury, btctc } = data;

  let prompt = `You are FundBot, an AI assistant for the 210k Capital fund team. You have access to real-time portfolio data from Google Sheets.

CURRENT DATA (as of ${snapshot.timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET):

📊 PORTFOLIO SNAPSHOT:
- Live AUM: ${formatCurrency(snapshot.liveAUM)}
- MTM AUM: ${formatCurrency(snapshot.mtmAUM)}
- BTC Price: ${formatCurrency(snapshot.btcPrice)}
- Bitcoin AUM: ${formatNumber(snapshot.bitcoinAUM)} BTC
- NAV AUM: ${formatCurrency(snapshot.navAUM)}

📈 PERFORMANCE:
- Fund MTD: ${formatPercent(snapshot.fundMTD)}
- BTC MTD: ${formatPercent(snapshot.btcMTD)}
- Alpha: ${formatPercent(snapshot.fundMTD - snapshot.btcMTD)}

💰 PORTFOLIO METRICS:
- Total AUM (USD): ${formatCurrency(metrics.totalAUMUSD)}
- Total AUM (BTC): ${formatNumber(metrics.totalAUMBTC)} BTC
- Bitcoin Delta: ${formatNumber(metrics.bitcoinDelta)} BTC
- % Long: ${formatPercent(metrics.percentLong)}
- Net Cash: ${formatCurrency(metrics.netCash)}
- Total Borrow %: ${formatPercent(metrics.totalBorrowPercent)}
- Extra BTC Exposure: ${formatNumber(metrics.extraBTCExposure)} BTC
`;

  if (positions && positions.length > 0) {
    prompt += `\n📋 TOP POSITIONS:\n`;
    positions.slice(0, 10).forEach((pos) => {
      prompt += `- ${pos.name} (${pos.ticker || 'N/A'}): ${formatCurrency(pos.value)} (${formatPercent(pos.weight)} weight, ${formatNumber(pos.delta)} BTC delta)\n`;
    });
  }

  if (treasury && treasury.length > 0) {
    prompt += `\n🏢 TREASURY TRACKER:\n`;
    treasury.forEach((pos) => {
      prompt += `- ${pos.company} (${pos.ticker}): ${formatCurrency(pos.currentValue)} (${formatPercent(pos.profitLossPercent / 100)} P&L)\n`;
    });
  }

  if (btctc && btctc.length > 0) {
    prompt += `\n🏢 BTCTC MARKET DATA:\n`;
    btctc.slice(0, 10).forEach((company) => {
      prompt += `- ${company.company} (${company.ticker}): ${formatNumber(company.btcHoldings)} BTC, ${company.dilutedMNAV.toFixed(2)}x mNAV, ${formatPercent(company.oneDayChangePercent)} 1D change\n`;
    });
  }

  prompt += `

INSTRUCTIONS:
- Answer questions about the fund's positions, performance, and market context
- Be concise but thorough
- Use specific numbers from the data provided
- Format currency with $ and commas (e.g., $139,569,426)
- Format percentages with % (e.g., +7.50%)
- Format BTC amounts with 2 decimal places
- If asked about something not in the data, say so clearly
- For comparisons over time, note that you only have current snapshot data unless historical data is provided
- Be conversational and friendly - you're talking to the fund team
- Use emojis sparingly and appropriately

CONTEXT:
- The fund focuses on Bitcoin treasury companies and BTC-related investments
- AUM = Assets Under Management
- MTM = Mark to Market
- mNAV = multiple of Net Asset Value (premium/discount to BTC holdings)
- Delta = BTC exposure
- The fund trades BTC equities, derivatives, and holds spot BTC`;

  return prompt;
}

export function buildQuickSystemPrompt(snapshot: PortfolioSnapshot, metrics: PortfolioMetrics): string {
  return buildSystemPrompt({ snapshot, metrics });
}

