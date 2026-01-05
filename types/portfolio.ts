// Portfolio data types

export interface PortfolioSnapshot {
  liveAUM: number;
  mtmAUM: number;
  btcPrice: number;
  bitcoinAUM: number;
  navAUM: number;
  fundMTD: number;
  btcMTD: number;
  timestamp: Date;
}

export interface PortfolioMetrics {
  totalAUMUSD: number;
  totalAUMBTC: number;
  bitcoinDelta: number;
  percentLong: number;
  netCash: number;
  totalBorrowPercent: number;
  extraBTCExposure: number;
}

export interface Position {
  name: string;
  ticker?: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  delta: number;
  category: PositionCategory;
}

export type PositionCategory =
  | 'BTC Spot'
  | 'BTC DeFi'
  | 'BTC Derivatives'
  | 'BTC Equities'
  | 'BTC Fungibles'
  | 'Alt Tokens'
  | 'Fund Investments'
  | 'Cash';

export interface CategoryBreakdown {
  category: PositionCategory;
  totalValue: number;
  weight: number;
  positions: Position[];
}

export interface PerformanceMetrics {
  cumulativeReturn: number;
  monthlyReturns: MonthlyReturn[];
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  alpha: number;
  beta: number;
  correlation: number;
}

export interface MonthlyReturn {
  month: string;
  fundReturn: number;
  btcReturn: number;
  alpha: number;
}

export interface TreasuryPosition {
  company: string;
  ticker: string;
  entryDate: Date;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface DailyMover {
  name: string;
  ticker: string;
  changePercent: number;
  price: number;
  value?: number;
}

