// Equities data fetching from Google Sheets

import { config } from '../config';
import { getSheetData, parseNumber } from './client';

export interface EquityMover {
  ticker: string;
  name: string;
  mnav: number;
  value: number;
  weight: number;
}

export interface EquityMovers {
  gainers: EquityMover[];
  losers: EquityMover[];
}

export async function getEquityMovers(limit: number = 5): Promise<EquityMovers> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, 'Equities!A1:P50');
  
  // Find header row (should be row 2)
  let headerRow = -1;
  for (let i = 0; i < 10; i++) {
    if (data[i] && data[i][0] && data[i][0].toString().includes('Ticker')) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow < 0) {
    throw new Error('Could not find header row in Equities sheet');
  }
  
  // Parse positions
  const positions: EquityMover[] = [];
  for (let i = headerRow + 1; i < Math.min(data.length, headerRow + 30); i++) {
    const row = data[i];
    
    // Skip if no ticker or name
    if (!row || !row[0] || !row[2]) continue;
    
    const ticker = row[0].toString();
    const name = row[2].toString();
    const mnav = parseNumber(row[5]);
    const value = parseNumber(row[6]);
    const weight = parseNumber(row[10]);
    
    // Skip positions with 0 mNAV (non-trading)
    if (mnav === 0) continue;
    
    // Skip warrants and converts
    const nameLower = name.toLowerCase();
    if (nameLower.includes('warrant') || 
        nameLower.includes('convert') || 
        nameLower.includes('(cost)')) {
      continue;
    }
    
    positions.push({ ticker, name, mnav, value, weight });
  }
  
  // Sort by mNAV descending for gainers
  const sortedPositions = [...positions].sort((a, b) => b.mnav - a.mnav);
  
  return {
    gainers: sortedPositions.slice(0, limit),
    losers: sortedPositions.slice(-limit).reverse(),
  };
}

