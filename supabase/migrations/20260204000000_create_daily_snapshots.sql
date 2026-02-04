-- Create daily_snapshots table for tracking fund AUM and BTC price
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
