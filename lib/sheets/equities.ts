// Equities data fetching from Google Sheets

import { config } from '../config';
import { SHEET_CONFIG } from '../../config/sheets';
import { getSheetData, parseNumber } from './client';

export interface EquityMover {
  ticker: string;
  name: string;
  mnav: number;
  price: number;
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
    
    positions.push({ ticker, name, mnav, price: 0, value, weight });
  }
  
  // Sort by mNAV descending for gainers
  const sortedPositions = [...positions].sort((a, b) => b.mnav - a.mnav);
  
  return {
    gainers: sortedPositions.slice(0, limit),
    losers: sortedPositions.slice(-limit).reverse(),
  };
}

export async function getTopEquityHoldings(limit: number = 5): Promise<EquityMover[]> {
  const sheetId = config.sheets.portfolioSheetId;
  // Read from Live Portfolio sheet instead of stale Equities tab
  const data = await getSheetData(sheetId, 'Live Portfolio!A1:K100');

  // BTC Equities section starts at row 21 (0-indexed: row 20)
  // Live Portfolio columns:
  // A(0): Exchange/Custody, B(1): Category, C(2): Position, D(3): Quantity,
  // E(4): Price (Local), F(5): Price (USD), G(6): Value (USD), H(7): Value (USD MTM),
  // I(8): Value (BTC), J(9): % Weight, K(10): Delta %

  const positions: EquityMover[] = [];
  // Use config for BTC Equities starting row (subtract 1 for 0-indexed array)
  const BTC_EQUITIES_START = SHEET_CONFIG.categories.btcEquities - 1;

  for (let i = BTC_EQUITIES_START; i < Math.min(data.length, BTC_EQUITIES_START + 35); i++) {
    const row = data[i];
    if (!row) continue;

    // Only process rows where column B (category) is "Equities"
    const category = row[1]?.toString() || '';
    if (category !== 'Equities') continue;

    const name = row[2]?.toString() || '';
    if (!name) continue;

    const value = parseNumber(row[6]); // Value (USD) column
    const price = parseNumber(row[5]); // Price (USD) column
    const weight = parseNumber(row[9]); // % Weight column

    // Skip positions with 0 value
    if (value === 0) continue;

    // Skip warrants and converts
    const nameLower = name.toLowerCase();
    if (nameLower.includes('warrant') ||
        nameLower.includes('convert') ||
        nameLower.includes('(cost)')) {
      continue;
    }

    // Use exchange/custody as ticker identifier
    const ticker = row[0]?.toString() || '';

    positions.push({
      ticker,
      name,
      mnav: 0,
      price,
      value,
      weight
    });
  }

  // Sort by value descending
  return positions.sort((a, b) => b.value - a.value).slice(0, limit);
}

