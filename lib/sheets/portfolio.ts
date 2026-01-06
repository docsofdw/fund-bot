// Portfolio data fetching from Google Sheets

import { config } from '../config';
import { SHEET_CONFIG } from '../../config/sheets';
import { getSheetData, parseNumber, parsePercent } from './client';
import {
  PortfolioSnapshot,
  PortfolioMetrics,
  Position,
  CategoryBreakdown,
  PositionCategory,
} from '../../types';

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.livePortfolio);

  return {
    liveAUM: parseNumber(data[0]?.[1]),
    mtmAUM: parseNumber(data[1]?.[1]),
    btcPrice: parseNumber(data[2]?.[1]),
    bitcoinAUM: parseNumber(data[3]?.[1]),
    navAUM: parseNumber(data[0]?.[4]),
    fundMTD: parsePercent(data[0]?.[5]),  // Row 1, Col F
    btcMTD: parsePercent(data[2]?.[5]),   // Row 3, Col F
    timestamp: new Date(),
  };
}

export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.portfolioMetrics);

  // Metrics start at row 78, so we need row 1 of the returned range (0-indexed)
  return {
    totalAUMUSD: parseNumber(data[1]?.[1]),
    totalAUMBTC: parseNumber(data[2]?.[1]),
    bitcoinDelta: parseNumber(data[3]?.[1]),
    percentLong: parsePercent(data[4]?.[1]),
    netCash: parseNumber(data[5]?.[1]),
    totalBorrowPercent: parsePercent(data[6]?.[1]),
    extraBTCExposure: parseNumber(data[7]?.[1]),
  };
}

export async function getAllPositions(): Promise<Position[]> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.livePortfolio);

  const positions: Position[] = [];

  // Parse positions from different category sections
  const categories: Array<{ start: number; category: PositionCategory }> = [
    { start: SHEET_CONFIG.categories.btcSpot, category: 'BTC Spot' },
    { start: SHEET_CONFIG.categories.btcDeFi, category: 'BTC DeFi' },
    { start: SHEET_CONFIG.categories.btcDerivatives, category: 'BTC Derivatives' },
    { start: SHEET_CONFIG.categories.btcEquities, category: 'BTC Equities' },
    { start: SHEET_CONFIG.categories.btcFungibles, category: 'BTC Fungibles' },
    { start: SHEET_CONFIG.categories.altTokens, category: 'Alt Tokens' },
    { start: SHEET_CONFIG.categories.fundInvestments, category: 'Fund Investments' },
    { start: SHEET_CONFIG.categories.cash, category: 'Cash' },
  ];

  for (const { start, category } of categories) {
    // Adjust for 0-indexed array (subtract 1 from row number)
    let row = start - 1;
    
    while (row < data.length && data[row]?.[0]) {
      const name = data[row][0];
      
      // Stop if we hit another category header or empty row
      if (!name || name.includes('TOTAL') || name.includes('Category')) {
        break;
      }

      positions.push({
        name,
        ticker: data[row][1] || undefined,
        quantity: parseNumber(data[row][3]),
        price: parseNumber(data[row][5]),
        value: parseNumber(data[row][6]),
        weight: parsePercent(data[row][9]),
        delta: parsePercent(data[row][10]),
        category,
      });

      row++;
    }
  }

  return positions;
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const sheetId = config.sheets.portfolioSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.portfolioMetrics);
  
  // Sub-Categories section starts at row 89 (index 11 in the portfolioMetrics range which starts at row 78)
  // Row 88 (index 10) is the header: ['Sub-Categories', 'USD', 'BTC', '%', '', 'Delta', 'Target']
  // Data starts at row 89 (index 11)
  
  const breakdown: CategoryBreakdown[] = [];
  const startRow = 11; // Row 89 in sheet = index 11 in this range
  
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    const categoryName = row[0];
    
    // Stop at Total row or empty row
    if (!categoryName || categoryName === 'Total') {
      break;
    }
    
    const value = parseNumber(row[1]);
    const weight = parsePercent(row[3]);
    
    // Map sheet category names to our PositionCategory type
    // Skip categories we don't want to display
    if (categoryName === 'Debt' || 
        categoryName === 'Alt Tokens' || 
        categoryName === 'BTC Fungibles' || 
        categoryName === 'BTC DeFi') {
      continue;
    }
    
    let category: PositionCategory;
    if (categoryName === 'BTC') {
      category = 'BTC Spot';
    } else {
      category = categoryName as PositionCategory;
    }
    
    breakdown.push({
      category,
      totalValue: value,
      weight,
      positions: [], // We're not fetching individual positions here
    });
  }
  
  return breakdown;
}

export async function getTopPositions(limit: number = 5): Promise<Position[]> {
  const positions = await getAllPositions();
  return positions
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

