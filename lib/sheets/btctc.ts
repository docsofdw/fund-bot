// Bitcoin Treasury Companies data fetching

import { config } from '../config';
import { SHEET_CONFIG } from '../../config/sheets';
import { getSheetData, parseNumber, parsePercent } from './client';
import { BTCTCCompany, BTCTCSnapshot, BTCTCMover } from '../../types';

export async function getBTCTCSnapshot(): Promise<BTCTCSnapshot> {
  const sheetId = config.sheets.btctcSheetId;
  const data = await getSheetData(sheetId, SHEET_CONFIG.ranges.btctcDashboard);

  const companies: BTCTCCompany[] = [];
  let totalBTCHoldings = 0;

  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) break; // Stop at first empty row

    const btcHoldings = parseNumber(row[3]);
    totalBTCHoldings += btcHoldings;

    companies.push({
      rank: parseNumber(row[0]),
      company: row[1] || '',
      ticker: row[2] || '',
      btcHoldings,
      basicMNAV: parseNumber(row[4]),
      dilutedMNAV: parseNumber(row[5]),
      price: parseNumber(row[6]),
      oneDayChangePercent: parsePercent(row[7]),
      dilutedMNAVPrice: parseNumber(row[8]),
      enterpriseValueUSD: parseNumber(row[9]),
      avgVolumeUSD: parseNumber(row[10]),
      btcNAVUSD: parseNumber(row[11]),
      totalDebt: parseNumber(row[12]),
    });
  }

  return {
    companies,
    timestamp: new Date(),
    totalBTCHoldings,
  };
}

export async function getBTCTCMovers(limit: number = 5): Promise<{
  gainers: BTCTCMover[];
  losers: BTCTCMover[];
}> {
  const snapshot = await getBTCTCSnapshot();

  const sorted = snapshot.companies
    .filter((c) => c.oneDayChangePercent !== 0)
    .sort((a, b) => b.oneDayChangePercent - a.oneDayChangePercent);

  const gainers = sorted.slice(0, limit).map((c) => ({
    company: c.company,
    ticker: c.ticker,
    changePercent: c.oneDayChangePercent,
    price: c.price,
    mNAV: c.dilutedMNAV,
  }));

  const losers = sorted.slice(-limit).reverse().map((c) => ({
    company: c.company,
    ticker: c.ticker,
    changePercent: c.oneDayChangePercent,
    price: c.price,
    mNAV: c.dilutedMNAV,
  }));

  return { gainers, losers };
}

export async function getCompanyByTicker(ticker: string): Promise<BTCTCCompany | null> {
  const snapshot = await getBTCTCSnapshot();
  return snapshot.companies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  ) || null;
}

export async function getTopBTCHolders(limit: number = 10): Promise<BTCTCCompany[]> {
  const snapshot = await getBTCTCSnapshot();
  return snapshot.companies
    .sort((a, b) => b.btcHoldings - a.btcHoldings)
    .slice(0, limit);
}

