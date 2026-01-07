# Market Indicators Setup Guide (Free Only)

This guide explains the free market indicators that appear in your morning report, right below the Bitcoin price.

## 📊 Available Indicators (100% Free)

### 1. Fear & Greed Index 😱→🤑
**Source:** Alternative.me (FREE, no auth required)  
**What it measures:** Market sentiment on a scale of 0-100
- 0-25: Extreme Fear 😱 (Potential buy signal)
- 26-45: Fear 😰
- 46-55: Neutral 😐
- 56-75: Greed 😊
- 76-100: Extreme Greed 🤑 (Potential sell signal)

**Setup:** Works out of the box, no API key needed!

**API:** https://api.alternative.me/fng/

**How to interpret:**
- When everyone is fearful (< 25), prices may be oversold
- When everyone is greedy (> 75), prices may be overextended
- Use as a contrarian indicator

---

### 2. DVOL (Deribit Volatility Index) 📊
**Source:** Deribit (FREE, no auth required)  
**What it measures:** Implied volatility of Bitcoin options (annualized percentage)
- Low DVOL (< 50%): Low expected volatility, calm market
- Medium DVOL (50-80%): Normal volatility
- High DVOL (> 80%): High expected volatility, uncertainty

**Setup:** Works out of the box, no API key needed!

**API:** https://docs.deribit.com/

**How to interpret:**
- High DVOL = Options traders expect big price swings (reduce position sizes)
- Low DVOL = Calm market, lower risk of extreme moves
- Spikes often precede major price movements

---

## 💰 Cost Summary

| Indicator | Source | Cost |
|-----------|--------|------|
| Fear & Greed | Alternative.me | **FREE** ✅ |
| DVOL | Deribit | **FREE** ✅ |

**Total cost:** $0/month 🎉

---

## 🔧 Quick Setup Instructions

### Step 1: No Setup Required!

Both indicators work out of the box with no API keys or configuration needed.

### Step 2: Test Locally

Run the morning report locally to test:

```bash
npx ts-node run-morning-report.ts
```

Or use the test script:

```bash
npm run test:indicators
```

You should see:
- ✅ Fear & Greed (always works)
- ✅ DVOL (usually works)

### Step 3: Deploy to Production

If using Vercel, just deploy normally:

```bash
vercel --prod
```

No additional environment variables needed!

---

## 🎯 How It Appears in Morning Report

The indicators appear right below the Bitcoin price like this:

```
₿ BTC Price: $43,250.00

📊 MARKET INDICATORS
😰 Fear & Greed: 35 (Fear)
📊 DVOL: 65.32% (Normal)

_Data from 210k Portfolio Stats_
```

If an indicator is unavailable (API error), it will simply be skipped and the report continues normally.

---

## 🚨 Troubleshooting

### "Market indicators unavailable"
- Both APIs failed to fetch data
- Check your internet connection
- Try again in a few minutes

### DVOL missing but Fear & Greed working
- Deribit API may be temporarily rate-limited
- This is normal and non-critical
- The indicator will return when the API is available

### Check logs
Run locally with:
```bash
npx ts-node run-morning-report.ts
```

Look for console messages like:
- `[Market Indicators] Fetching data...`
- `[Market Indicators] Fetch completed in XXXms`

---

## 📚 Understanding the Indicators

### Trading Signals

**🚨 High Risk Signals:**
- Fear & Greed > 75 (Extreme Greed) + DVOL rising = Potential local top
- DVOL > 100% = Expect large price swings, reduce position sizes

**✅ Low Risk Signals:**
- Fear & Greed < 25 (Extreme Fear) = Potential buying opportunity
- DVOL < 40% = Low volatility, potentially range-bound market

**📊 Market Context:**
- Fear & Greed shows *what* people are feeling
- DVOL shows *how much* movement they expect
- Combined: Low fear + Low volatility = Calm market
- Combined: High fear + High volatility = Panic/opportunity

---

## 🔗 Useful Resources

- **Alternative.me Chart:** https://alternative.me/crypto/fear-and-greed-index/
- **Deribit Metrics:** https://metrics.deribit.com/
- **About DVOL:** https://insights.deribit.com/market-research/the-deribit-volatility-index/

---

## 📝 Notes

1. **Graceful Degradation:** The morning report works even if both indicators fail. Missing indicators are simply skipped.

2. **No Rate Limits:** Both free APIs have generous limits for normal use.

3. **Data Freshness:**
   - Fear & Greed: Updated every 24 hours
   - DVOL: Real-time

4. **Reliability:** 
   - Fear & Greed: ~99% uptime (very reliable)
   - DVOL: ~95% uptime (occasionally rate-limited)

---

## 🎓 Pro Tips

1. **Contrarian Indicator:** Fear & Greed works best as a contrarian signal. When everyone is fearful, it may be time to buy. When everyone is greedy, it may be time to sell.

2. **Volatility Timing:** High DVOL is great for options traders but risky for spot positions. Consider reducing exposure when DVOL spikes above 100%.

3. **Combine with Price:** 
   - Price up + Fear high = Sustainable rally
   - Price up + Greed high = Top approaching
   - Price down + Greed high = Bull trap
   - Price down + Fear high = Capitulation/bottom

4. **Historical Context:** Fear & Greed readings below 10 have historically marked major bottoms (March 2020, November 2022).

---

Need help? Run `npm run test:indicators` to check status!
