# Daily Reports

The fund-bot sends two automated daily reports to the `#daily-reports` Slack channel on weekdays.

---

## Morning Report

**Schedule:** 9:00 AM CT (Monday - Friday)
**Cron:** `0 15 * * 1-5` (3 PM UTC)

### Purpose

The morning report provides market context and on-chain metrics to start the trading day. It helps the team understand current market sentiment, Bitcoin fundamentals, and key technical levels.

### Content

```
GOOD MORNING
Monday, February 3, 2025 | 9:00 AM CT
────────────────────────────────────
BTC: $97,234

────────────────────────────────────
ON-CHAIN BRIEF

Fear & Greed:  72 (Greed)
MVRV Z-Score:  2.34
NUPL:          58% (Belief)
Funding Rate:  +0.0089%
1Y MA:         $67.5K
200W MA:       $45.7K

────────────────────────────────────
FUND BRIEF

AUM: $132,456,789
Fund MTD: -2.45%
BTC MTD: -5.12%
Cash: $10,500,000
```

### Data Sources

| Metric | Source | API |
|--------|--------|-----|
| BTC Price | Google Sheets | Portfolio Sheet |
| Fear & Greed | Bitcoin Magazine Pro | Requires API key |
| MVRV Z-Score | Bitcoin Magazine Pro | Requires API key |
| NUPL | Bitcoin Magazine Pro | Requires API key |
| Funding Rate | Bitcoin Magazine Pro | Requires API key |
| 1Y MA | CoinGecko | Free, calculated from 365D prices |
| 200W MA | Bitcoin Magazine Pro | Requires API key |
| AUM | Google Sheets | Live Portfolio tab |
| Fund MTD | Google Sheets | Portfolio Sheet |
| BTC MTD | Google Sheets | Portfolio Sheet |
| Cash | Google Sheets | Category breakdown (totalValue) |

### Metric Descriptions

- **Fear & Greed Index (0-100):** Market sentiment indicator. 0-25 = Extreme Fear, 25-45 = Fear, 45-55 = Neutral, 55-75 = Greed, 75-100 = Extreme Greed
- **MVRV Z-Score:** Market Value to Realized Value ratio. Values > 7 historically indicate market tops, < 0 indicate bottoms
- **NUPL (Net Unrealized Profit/Loss):** Shows aggregate profit/loss of all BTC holders. Phases: Capitulation (<0), Hope (0-0.25), Optimism (0.25-0.5), Belief (0.5-0.75), Euphoria (>0.75)
- **Funding Rate:** Perpetual futures funding rate. Positive = longs pay shorts (bullish sentiment), Negative = shorts pay longs (bearish sentiment)
- **1 Year Moving Average:** 365-day simple moving average, calculated from CoinGecko historical prices. Key intermediate support/resistance level
- **200 Week Moving Average:** Long-term support level. BTC rarely trades below this level

### Manual Testing

```bash
# Post to test channel
npx tsx -r dotenv/config run-morning-report.ts --test

# Post to production channel
npx tsx -r dotenv/config run-morning-report.ts
```

### Files

- Cron handler: `api/cron/morning-report.ts`
- Manual script: `run-morning-report.ts`
- Bitcoin Magazine Pro client: `lib/external/bitcoin-magazine-pro.ts`

---

## End of Day (EOD) Report

**Schedule:** 6:00 PM CT (Monday - Friday)
**Cron:** `0 0 * * 2-6` (Midnight UTC, which is 6 PM CT the previous day)

### Purpose

The EOD report summarizes fund performance and market activity for the trading day. It shows AUM changes, BTC performance, and top equity holdings performance.

### Content

```
END OF DAY
Monday, February 3, 2025 | 6:00 PM CT
────────────────────────────────────
BTC: $97,234

────────────────────────────────────
210K BRIEF

AUM: $132,456,789
Fund 1D: +0.45%
BTC 1D: -2.31%

Top Holdings (1D):
1. Metaplanet Inc.  +3.45%
2. Strategy  -1.23%
3. Semler Scientific  +0.89%

────────────────────────────────────
ON-CHAIN BRIEF

Fear & Greed:  68 (Greed)
MVRV Z-Score:  2.31
NUPL:          57% (Belief)
Funding Rate:  +0.0076%
1Y MA:         $67.5K
200W MA:       $45.7K

────────────────────────────────────
See you tomorrow
```

### Data Sources

| Metric | Source | API |
|--------|--------|-----|
| BTC Price | Google Sheets | Portfolio Sheet |
| AUM | Google Sheets | Live Portfolio tab |
| Fund 1D | Supabase | Morning snapshot comparison |
| BTC 1D | CoinMarketCap | 24h change |
| Top Holdings | Google Sheets | Live Portfolio tab |
| Stock 1D % | Yahoo Finance / Twelve Data | Real-time quotes |
| On-Chain Metrics | Bitcoin Magazine Pro | Fear & Greed, MVRV, NUPL, FR, 200W MA |
| 1Y MA | CoinGecko | Free, calculated from 365D prices |

### How Fund 1D is Calculated

1. **Morning Snapshot:** At 9 AM CT, the morning report saves the current AUM to Supabase
2. **EOD Comparison:** At 6 PM CT, the EOD report fetches the morning snapshot and calculates:
   ```
   Fund 1D = (Current AUM - Morning AUM) / Morning AUM
   ```

### How Top Holdings Work

1. **Holdings Source:** Fetched from the "Live Portfolio" sheet, filtering for "Equities" category
2. **Ticker Mapping:** Company names are mapped to tickers using the "210k PortCos" sheet in the BTCTCs Master Sheet
3. **Real-time Quotes:**
   - First tries Twelve Data (works for US stocks)
   - Falls back to Yahoo Finance (works for international: .HK, .BK, .V, .AX, etc.)
4. **Display:** Top 3 holdings by value, showing company name and 1D % change

### Manual Testing

```bash
# Post to test channel
npx tsx -r dotenv/config run-eod-report.ts --test

# Post to production channel
npx tsx -r dotenv/config run-eod-report.ts
```

### Files

- Cron handler: `api/cron/eod-report.ts`
- Manual script: `run-eod-report.ts`
- Equities data: `lib/sheets/equities.ts`
- Portfolio data: `lib/sheets/portfolio.ts`
- Supabase client: `lib/supabase/client.ts`
- CoinMarketCap client: `lib/external/coinmarketcap.ts`
- Twelve Data client: `lib/external/twelvedata.ts`
- Yahoo Finance client: `lib/external/yahoo-finance.ts`
- On-chain metrics (incl. 1Y MA): `lib/external/bitcoin-magazine-pro.ts`

---

## Environment Variables Required

Both reports require these environment variables:

```env
# Core
SLACK_BOT_TOKEN=xoxb-...
DAILY_REPORTS_CHANNEL_ID=C...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
PORTFOLIO_SHEET_ID=...
BTCTC_SHEET_ID=...

# Morning Report
BM_PRO_API_KEY=...  # Bitcoin Magazine Pro

# EOD Report
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
COINMARKETCAP_API_KEY=...
TWELVEDATA_API_KEY=...

# Cron Authentication
CRON_SECRET=...
```

---

## Troubleshooting

### Report not posting

1. Check Vercel cron logs for errors
2. Verify `CRON_SECRET` matches in Vercel and cron handler
3. Confirm `DAILY_REPORTS_CHANNEL_ID` is correct
4. Ensure bot is invited to the channel

### Fund 1D showing N/A

- Morning snapshot may not exist for today
- Check Supabase `daily_snapshots` table
- Run morning report first to create snapshot

### Holdings showing N/A

- Ticker not found in mapping (check "210k PortCos" sheet)
- Stock exchange not supported by Yahoo Finance
- API rate limit reached

### On-chain metrics showing N/A

- Bitcoin Magazine Pro API key invalid or expired
- API temporarily unavailable
- Check `BM_PRO_API_KEY` environment variable

---

## Cron Schedule Reference

| Report | Time (CT) | Cron (UTC) | Days |
|--------|-----------|------------|------|
| Morning | 9:00 AM | `0 15 * * 1-5` | Mon-Fri |
| EOD | 6:00 PM | `0 0 * * 2-6` | Mon-Fri (next day UTC) |

Note: CT = Central Time. During Central Daylight Time (CDT), times shift by 1 hour.
