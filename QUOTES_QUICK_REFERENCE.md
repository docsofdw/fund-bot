# Daily Quotes - Quick Reference

## 🎯 Current Status

- **89 total quotes** (59 hardcoded + 30 Claude-generated)
- **~3-month rotation cycle** (expands as you generate more)
- **43 different authors** quoted
- **Top contributors:** Warren Buffett (10), Soros (4), Druckenmiller (4), Graham (4)

## 🚀 Quick Commands

```bash
# Generate 50 new quotes (recommended monthly)
npx ts-node manage-quotes.ts generate 50

# Preview next 30 days
npx ts-node preview-quotes.ts 30

# Check stats
npx ts-node manage-quotes.ts stats

# Test generation (no save)
npx ts-node manage-quotes.ts test
```

## 💡 One-Time Setup for Long-Term Variety

Get a 6+ month rotation cycle with one setup:

```bash
npx ts-node manage-quotes.ts generate 100
npx ts-node manage-quotes.ts generate-theme risk-management 30
npx ts-node manage-quotes.ts generate-theme sovereignty 30
npx ts-node manage-quotes.ts generate-theme contrarian 30
```

This gives you **~200 quotes = 6-7 months** before any repeat!

## 🎨 Themed Generation

Available themes:
- `risk-management` - Capital preservation, position sizing, cutting losses
- `contrarian` - Going against the crowd, independent thinking
- `sovereignty` - Individual freedom, property rights, self-custody
- `sound-money` - Hard assets, inflation critique, store of value
- `patience` - Long-term orientation, compounding, time in market
- `freedom` - Liberty, limited government, free markets

```bash
npx ts-node manage-quotes.ts generate-theme [theme] 20
```

## 📊 Cost

Extremely cheap - ~$0.02 per 30 quotes generated

## 🔄 Maintenance

**Recommended schedule:**
- **Monthly:** Generate 50 new quotes
- **Quarterly:** Generate 100+ quotes to maintain long rotation
- **Weekly:** Check stats to monitor variety

## ⚡ Pro Tips

1. **Start big** - Generate 100-200 quotes upfront for long-term variety
2. **Mix themes** - Use themed generation to balance quote types
3. **Test first** - Use `test` command to preview quality before saving
4. **Monitor stats** - Watch author distribution to ensure variety
5. **No limits** - Generate as many as you want, they're cheap and authentic

## 🎯 Philosophy

Focus: **70% tradfi legends** + **30% pro-freedom/sound money**

The system prioritizes:
- Risk management & capital preservation
- Contrarian thinking & patience  
- Sovereignty & freedom from state-controlled money
- Sound money principles
- Real, authentic quotes only (no fabrication)

---

**Generated quotes are stored in:** `/data/generated-quotes.json`
**View full guide:** `QUOTES_GUIDE.md`

