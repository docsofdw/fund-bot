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

// Helper to check if data contains "Loading..." values
function hasLoadingValues(data: string[][]): boolean {
  return data.some(row => row.some(cell => 
    typeof cell === 'string' && cell.includes('Loading...')
  ));
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

      // Check if data contains "Loading..." values
      if (hasLoadingValues(data)) {
        if (attempt < maxRetries) {
          console.log(`Sheet data contains "Loading..." values. Retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`);
          await sleep(retryDelay);
          continue;
        } else {
          console.warn(`Sheet data still contains "Loading..." after ${maxRetries} attempts. Proceeding with available data.`);
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
export function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,\s%]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper to parse percentage values
export function parsePercent(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[%\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed / 100;
}

