// Treasury Tracker data fetching

import { config } from '../config';
import { SHEET_CONFIG } from '../../config/sheets';
import { getSheetData, parseNumber } from './client';
import { TreasuryPosition } from '../../types';

export async function getTreasuryPositions(): Promise<TreasuryPosition[]> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.treasuryTracker);

  const positions: TreasuryPosition[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) break; // Stop at first empty row

    const costBasis = parseNumber(row[3]);
    const currentValue = parseNumber(row[5]);
    const profitLoss = currentValue - costBasis;

    positions.push({
      company: row[0],
      ticker: row[1] || '',
      entryDate: row[2] ? new Date(row[2]) : new Date(),
      costBasis,
      currentPrice: parseNumber(row[4]),
      currentValue,
      profitLoss,
      profitLossPercent: costBasis > 0 ? (profitLoss / costBasis) * 100 : 0,
    });
  }

  return positions;
}

export async function getTopGainers(limit: number = 5): Promise<TreasuryPosition[]> {
  const positions = await getTreasuryPositions();
  return positions
    .sort((a, b) => b.profitLossPercent - a.profitLossPercent)
    .slice(0, limit);
}

export async function getTopLosers(limit: number = 5): Promise<TreasuryPosition[]> {
  const positions = await getTreasuryPositions();
  return positions
    .sort((a, b) => a.profitLossPercent - b.profitLossPercent)
    .slice(0, limit);
}

