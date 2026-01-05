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

export async function getSheetData(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const client = getSheetsClient();

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`Error fetching sheet data for range ${range}:`, error);
    throw new Error(`Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

