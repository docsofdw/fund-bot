/**
 * Setup script to create the daily_snapshots table in Supabase
 * Usage: npx tsx scripts/setup-supabase.ts
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('Setting up Supabase database...\n');

  // Create the daily_snapshots table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS daily_snapshots (
      date DATE PRIMARY KEY,
      morning_aum DECIMAL(18, 2) NOT NULL,
      morning_btc_price DECIMAL(18, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for faster date lookups
    CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(date);

    -- Add comment to table
    COMMENT ON TABLE daily_snapshots IS 'Daily fund snapshots for calculating 1-day changes';
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (error) {
    // If rpc doesn't work, try direct query (this might not work depending on permissions)
    console.log('RPC method not available, attempting direct SQL...');

    // Try using the REST API to check if table exists
    const { data: existingData, error: selectError } = await supabase
      .from('daily_snapshots')
      .select('date')
      .limit(1);

    if (selectError && selectError.code === '42P01') {
      console.error('\nTable does not exist. Please create it manually in Supabase Dashboard:');
      console.log('\n--- SQL to run in Supabase SQL Editor ---\n');
      console.log(`CREATE TABLE daily_snapshots (
  date DATE PRIMARY KEY,
  morning_aum DECIMAL(18, 2) NOT NULL,
  morning_btc_price DECIMAL(18, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_snapshots_date ON daily_snapshots(date);

COMMENT ON TABLE daily_snapshots IS 'Daily fund snapshots for calculating 1-day changes';`);
      console.log('\n--- End SQL ---\n');
      return;
    } else if (selectError) {
      console.error('Error checking table:', selectError);
      return;
    } else {
      console.log('Table already exists!');
    }
  } else {
    console.log('Table created successfully!');
  }

  // Test the connection
  console.log('\nTesting connection...');
  const { data, error: testError } = await supabase
    .from('daily_snapshots')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('Connection test failed:', testError);
  } else {
    console.log('Connection successful!');
  }
}

setupDatabase().catch(console.error);
