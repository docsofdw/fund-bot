# Market Indicators Quick Reference 📊

## Quick Test

```bash
npm run test:indicators
```

## Cost: $0/month 🎉

Both indicators are **100% free** and require **no API keys**!

## The 2 Free Indicators

### 😱 Fear & Greed (0-100)
**What it is:** Market sentiment gauge  
**Source:** Alternative.me

| Range | Meaning | Signal |
|-------|---------|--------|
| 0-25 | Extreme Fear 😱 | **BUY** opportunity |
| 25-45 | Fear 😰 | Cautious |
| 45-55 | Neutral 😐 | Balanced |
| 55-75 | Greed 😊 | Cautious |
| 75-100 | Extreme Greed 🤑 | **SELL** signal |

### 📊 DVOL (%)
**What it is:** Bitcoin options implied volatility  
**Source:** Deribit

| Range | Meaning | Action |
|-------|---------|--------|
| < 50% | Low volatility | Calm market |
| 50-80% | Normal | Standard trading |
| > 80% | High volatility | **Reduce risk** |

## Trading Signals

### 🚨 High Risk
- Fear & Greed > 75
- DVOL > 100%
- **Action:** Reduce exposure

### ✅ Opportunity
- Fear & Greed < 25
- DVOL < 40%
- **Action:** Consider buying

## Commands

```bash
# Test indicators
npm run test:indicators

# Run morning report
npm run morning-report

# Deploy
vercel --prod
```

## How It Looks

```
₿ BTC Price: $43,250.00

📊 MARKET INDICATORS
😰 Fear & Greed: 35 (Fear)
📊 DVOL: 65.32% (Normal)
```

## Troubleshooting

**No indicators showing?**
```bash
npm run test:indicators  # See status
```

**Check internet connection** - Both require API access

## Full Documentation

See `MARKET_INDICATORS_SETUP.md` for complete guide.

---

**Pro Tip:** Use Fear & Greed as a contrarian indicator. Buy when others are fearful, sell when they're greedy!
