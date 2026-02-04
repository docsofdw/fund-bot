// Google Sheets configuration

export const SHEET_CONFIG = {
  portfolioSheetId: process.env.PORTFOLIO_SHEET_ID || '',
  btctcSheetId: process.env.BTCTC_SHEET_ID || '',
  
  // Portfolio sheet ranges
  ranges: {
    livePortfolio: 'Live Portfolio!A1:K100',
    portfolioMetrics: 'Live Portfolio!A78:H98',
    portfolioStatistics: 'Portfolio Statistics!A1:J50',
    treasuryTracker: 'Treasury Tracker!A1:L20',
    btctcDashboard: 'Dashboard!A1:M100',
    portCos: '210k PortCos!A1:B50', // Company name -> Ticker mapping
  },
  
  // Key cell references for Live Portfolio tab
  cells: {
    liveAUM: 'B1',
    mtmAUM: 'B2',
    btcPrice: 'B3',
    bitcoinAUM: 'B4',
    navAUM: 'E1',
    fundMTD: 'E2',
    btcMTD: 'G2',
    
    // Portfolio Metrics (rows 78-98)
    totalAUMUSD: 'B79',
    totalAUMBTC: 'B80',
    bitcoinDelta: 'B81',
    percentLong: 'B82',
    netCash: 'B83',
    totalBorrowPercent: 'B84',
    extraBTCExposure: 'B85',
  },
  
  // Category starting rows
  categories: {
    btcSpot: 7,
    btcDeFi: 14,
    btcDerivatives: 17,
    btcEquities: 21,
    btcFungibles: 47,
    altTokens: 51,
    fundInvestments: 56,
    cash: 60,
  },
} as const;

export type SheetConfig = typeof SHEET_CONFIG;

