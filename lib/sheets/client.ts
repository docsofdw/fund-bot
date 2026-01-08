// Google Sheets API client

import { google, sheets_v4 } from 'googleapis';
import { config } from '../config';

let sheetsClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) {
    return sheetsClient;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.google.serviceAccountEmail,
      private_key: config.google.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// Problematic values that indicate data isn't ready
const PROBLEMATIC_VALUES = [
  'Loading...',
  '#N/A',
  '#REF!',
  '#ERROR!',
  '#VALUE!',
  '#NAME?',
  '#DIV/0!',
];

// Helper to check if a cell value is problematic
function isProblematicValue(cell: any): boolean {
  if (typeof cell !== 'string') return false;
  return PROBLEMATIC_VALUES.some(pv => cell.includes(pv));
}

// Helper to check if data contains problematic values
function hasLoadingValues(data: string[][]): boolean {
  return data.some(row => row.some(cell => isProblematicValue(cell)));
}

// Helper to find and log problematic cells for debugging
function logProblematicCells(data: string[][], range: string): void {
  const issues: string[] = [];
  data.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      if (isProblematicValue(cell)) {
        issues.push(`[${rowIdx},${colIdx}]="${cell}"`);
      }
    });
  });
  if (issues.length > 0) {
    console.warn(`[Sheets] Problematic cells in ${range}: ${issues.slice(0, 10).join(', ')}${issues.length > 10 ? ` (+${issues.length - 10} more)` : ''}`);
  }
}

// Helper to wait/sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getSheetData(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const client = getSheetsClient();
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const data = response.data.values || [];

      // Check if data contains problematic values (Loading..., #N/A, etc.)
      if (hasLoadingValues(data)) {
        logProblematicCells(data, range);
        if (attempt < maxRetries) {
          console.log(`[Sheets] Data contains problematic values. Retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`);
          await sleep(retryDelay);
          continue;
        } else {
          console.warn(`[Sheets] Data still contains problematic values after ${maxRetries} attempts. Proceeding with available data.`);
          logProblematicCells(data, range);
        }
      }

      return data;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Error fetching sheet data for range ${range}:`, error);
        throw new Error(`Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log(`Error on attempt ${attempt}, retrying...`);
      await sleep(retryDelay);
    }
  }

  // Should never reach here, but TypeScript needs this
  return [];
}

export async function getBatchSheetData(
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, string[][]>> {
  const client = getSheetsClient();

  try {
    const response = await client.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const result: Record<string, string[][]> = {};
    
    response.data.valueRanges?.forEach((valueRange, index) => {
      result[ranges[index]] = valueRange.values || [];
    });

    return result;
  } catch (error) {
    console.error('Error fetching batch sheet data:', error);
    throw new Error(`Failed to fetch batch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper to parse numeric values from sheets
export function parseNumber(value: string | undefined, fieldName?: string): number {
  if (!value) {
    if (fieldName) console.warn(`[Sheets] Empty value for field: ${fieldName}`);
    return 0;
  }

  // Check for problematic values
  if (isProblematicValue(value)) {
    console.warn(`[Sheets] Problematic value "${value}" for field: ${fieldName || 'unknown'}`);
    return 0;
  }

  const cleaned = value.replace(/[$,\s%]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    if (fieldName) console.warn(`[Sheets] NaN parsed for field "${fieldName}": "${value}"`);
    return 0;
  }

  return parsed;
}

// Helper to parse percentage values
export function parsePercent(value: string | undefined, fieldName?: string): number {
  if (!value) {
    if (fieldName) console.warn(`[Sheets] Empty value for field: ${fieldName}`);
    return 0;
  }

  // Check for problematic values
  if (isProblematicValue(value)) {
    console.warn(`[Sheets] Problematic value "${value}" for field: ${fieldName || 'unknown'}`);
    return 0;
  }

  const cleaned = value.replace(/[%\s]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    if (fieldName) console.warn(`[Sheets] NaN parsed for field "${fieldName}": "${value}"`);
    return 0;
  }

  return parsed / 100;
}

