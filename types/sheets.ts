// Google Sheets API types

export interface SheetRange {
  sheetId: string;
  range: string;
}

export interface SheetData {
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: string[][];
}

export interface BatchSheetData {
  spreadsheetId: string;
  valueRanges: SheetData[];
}

export interface SheetConfig {
  portfolioSheetId: string;
  btctcSheetId: string;
  ranges: {
    livePortfolio: string;
    portfolioMetrics: string;
    portfolioStatistics: string;
    treasuryTracker: string;
    btctcDashboard: string;
  };
}

