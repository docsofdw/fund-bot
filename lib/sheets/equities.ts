// Equities data fetching from Google Sheets

import { config } from '../config';
import { SHEET_CONFIG } from '../../config/sheets';
import { getSheetData, parseNumber, parsePercent } from './client';

export interface EquityMover {
  ticker: string;
  name: string;
  mnav: number;
  price: number;
  value: number;
  weight: number;
  delta: number; // 1D % change
}

export interface EquityMovers {
  gainers: EquityMover[];
  losers: EquityMover[];
}

// Cache for ticker mapping
let tickerMapCache: Map<string, string> | null = null;
let tickerMapCacheTime: number = 0;
const TICKER_MAP_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get ticker mapping from 210k PortCos sheet
 * Maps company names (lowercase) to tickers
 */
async function getTickerMapping(): Promise<Map<string, string>> {
  // Check cache
  if (tickerMapCache && Date.now() - tickerMapCacheTime < TICKER_MAP_CACHE_TTL) {
    return tickerMapCache;
  }

  const sheetId = config.sheets.btctcSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.portCos);

  const tickerMap = new Map<string, string>();

  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0] || !row[1]) continue;

    const companyName = row[0].toString().toLowerCase().trim();
    const ticker = row[1].toString().trim();

    if (companyName && ticker) {
      tickerMap.set(companyName, ticker);

      // Also add without common suffixes for fuzzy matching
      const simplified = companyName
        .replace(/\s*(inc\.?|corp\.?|ltd\.?|plc|limited|corporation|company)$/i, '')
        .trim();
      if (simplified !== companyName) {
        tickerMap.set(simplified, ticker);
      }
    }
  }

  console.log(`[Equities] Loaded ${tickerMap.size} ticker mappings from 210k PortCos`);
  tickerMapCache = tickerMap;
  tickerMapCacheTime = Date.now();

  return tickerMap;
}

/**
 * Find ticker for a company name using fuzzy matching
 */
function findTicker(name: string, tickerMap: Map<string, string>): string | null {
  const nameLower = name.toLowerCase().trim();

  // Direct match
  if (tickerMap.has(nameLower)) {
    return tickerMap.get(nameLower)!;
  }

  // Try without common suffixes
  const simplified = nameLower
    .replace(/\s*(inc\.?|corp\.?|ltd\.?|plc|limited|corporation|company)$/i, '')
    .trim();
  if (tickerMap.has(simplified)) {
    return tickerMap.get(simplified)!;
  }

  // Try partial match (company name contains or is contained in key)
  for (const [key, ticker] of tickerMap) {
    if (key.includes(simplified) || simplified.includes(key)) {
      return ticker;
    }
  }

  return null;
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

    positions.push({ ticker, name, mnav, price: 0, value, weight, delta: 0 });
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

  // Fetch both Live Portfolio data and ticker mapping in parallel
  const [portfolioData, tickerMap] = await Promise.all([
    getSheetData(sheetId, 'Live Portfolio!A1:K100'),
    getTickerMapping(),
  ]);

  // BTC Equities section starts at row 21 (0-indexed: row 20)
  // Live Portfolio columns:
  // A(0): Exchange/Custody, B(1): Category, C(2): Position, D(3): Quantity,
  // E(4): Price (Local), F(5): Price (USD), G(6): Value (USD), H(7): Value (USD MTM),
  // I(8): Value (BTC), J(9): % Weight, K(10): Delta %

  const positions: EquityMover[] = [];
  // Use config for BTC Equities starting row (subtract 1 for 0-indexed array)
  const BTC_EQUITIES_START = SHEET_CONFIG.categories.btcEquities - 1;

  for (let i = BTC_EQUITIES_START; i < Math.min(portfolioData.length, BTC_EQUITIES_START + 35); i++) {
    const row = portfolioData[i];
    if (!row) continue;

    // Only process rows where column B (category) is "Equities"
    const category = row[1]?.toString() || '';
    if (category !== 'Equities') continue;

    const name = row[2]?.toString() || '';
    if (!name) continue;

    const value = parseNumber(row[6]); // Value (USD) column
    const price = parseNumber(row[5]); // Price (USD) column
    const weight = parseNumber(row[9]); // % Weight column
    const delta = parsePercent(row[10]); // Delta % column

    // Skip positions with 0 value
    if (value === 0) continue;

    // Skip warrants and converts
    const nameLower = name.toLowerCase();
    if (nameLower.includes('warrant') ||
        nameLower.includes('convert') ||
        nameLower.includes('(cost)')) {
      continue;
    }

    // Get ticker from 210k PortCos mapping
    const ticker = findTicker(name, tickerMap) || '';

    // Clean up display name (remove ticker suffix if present)
    const displayName = name.replace(/\s*\([A-Z0-9.]+\)$/, '');

    positions.push({
      ticker,
      name: displayName,
      mnav: 0,
      price,
      value,
      weight,
      delta
    });

    if (ticker) {
      console.log(`[Equities] Mapped "${displayName}" -> ${ticker}`);
    } else {
      console.log(`[Equities] No ticker found for "${displayName}"`);
    }
  }

  // Sort by value descending
  return positions.sort((a, b) => b.value - a.value).slice(0, limit);
}
