// Bitcoin Treasury Company types

export interface BTCTCCompany {
  rank: number;
  company: string;
  ticker: string;
  btcHoldings: number;
  basicMNAV: number;
  dilutedMNAV: number;
  price: number;
  oneDayChangePercent: number;
  dilutedMNAVPrice: number;
  enterpriseValueUSD: number;
  avgVolumeUSD: number;
  btcNAVUSD: number;
  totalDebt: number;
}

export interface BTCTCSnapshot {
  companies: BTCTCCompany[];
  timestamp: Date;
  totalBTCHoldings: number;
}

export interface BTCTCMover {
  company: string;
  ticker: string;
  changePercent: number;
  price: number;
  mNAV: number;
}

