// Supabase client for daily snapshots

import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';

const CT_TIMEZONE = 'America/Chicago';

/**
 * Get today's date in CT timezone (YYYY-MM-DD format)
 */
function getTodayDateCT(): string {
  return formatInTimeZone(new Date(), CT_TIMEZONE, 'yyyy-MM-dd');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

export interface DailySnapshot {
  date: string; // YYYY-MM-DD format
  morning_aum: number;
  morning_btc_price: number;
  created_at?: string;
}

/**
 * Save a morning snapshot
 */
export async function saveMorningSnapshot(aum: number, btcPrice: number): Promise<void> {
  const today = getTodayDateCT();

  const { error } = await supabase
    .from('daily_snapshots')
    .upsert({
      date: today,
      morning_aum: aum,
      morning_btc_price: btcPrice,
    }, {
      onConflict: 'date'
    });

  if (error) {
    console.error('[Supabase] Error saving morning snapshot:', error);
    throw error;
  }

  console.log(`[Supabase] Morning snapshot saved for ${today}: AUM=${aum}, BTC=${btcPrice}`);
}

/**
 * Get today's morning snapshot
 */
export async function getTodaySnapshot(): Promise<DailySnapshot | null> {
  const today = getTodayDateCT();

  const { data, error } = await supabase
    .from('daily_snapshots')
    .select('*')
    .eq('date', today)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      console.log(`[Supabase] No snapshot found for ${today}`);
      return null;
    }
    console.error('[Supabase] Error fetching today snapshot:', error);
    return null;
  }

  return data as DailySnapshot;
}

/**
 * Calculate 1-day change percentage
 */
export function calculate1DChange(currentValue: number, morningValue: number): number {
  if (morningValue === 0) return 0;
  return (currentValue - morningValue) / morningValue;
}
