# Daily Quotes System

## Overview

The morning reports now feature rotating daily quotes from legendary investors, fund managers, Austrian economists, and Bitcoin thought leaders who championed sovereignty, sound money, and contrarian thinking.

**🎯 NEW: Claude-Powered Quote Generation** - The system now uses AI to generate endless authentic quotes, ensuring you never see the same quote twice for months!

## Features

- **59 hardcoded seed quotes** - carefully curated foundation
- **Claude-generated quotes** - AI-powered authentic quote generation for endless variety
- **89+ total quotes** (and growing!) - current rotation with Claude-generated additions
- **Automatic daily rotation** - quotes change based on the day of year
- **~3+ month cycle** - expands as you generate more quotes
- **Bitcoin-aligned philosophy** - emphasizes sovereignty, freedom from state-controlled money, and contrarian thinking
- **100% authentic** - Claude only provides real, verifiable quotes from actual sources

## Quote Categories

### Traditional Investing Legends
- George Soros (Quantum Fund)
- Stanley Druckenmiller (Duquesne Capital)
- Paul Tudor Jones (Tudor Investment Corp)
- Ray Dalio (Bridgewater Associates)
- Howard Marks (Oaktree Capital)
- Seth Klarman (Baupost Group)
- Warren Buffett, Peter Lynch, Benjamin Graham, and more

### Austrian Economics & Sound Money
- F.A. Hayek (Nobel Prize Economist)
- Ludwig von Mises (Human Action)
- Murray Rothbard (Austrian School)
- Milton Friedman (Nobel Prize Economist)

### Modern Bitcoin Thought Leaders
- Michael Saylor (MicroStrategy)
- Jeff Booth (The Price of Tomorrow)
- Robert Breedlove (Philosopher)
- Saifedean Ammous (The Bitcoin Standard)
- Lyn Alden (Investment Strategist)
- Jack Mallers (Strike)
- Pierre Rochard (Bitcoin Core)

### Contrarian Thinkers
- Nassim Taleb (The Black Swan)
- Charlie Munger (Berkshire Hathaway)
- Jim Rogers (Quantum Fund co-founder)

## Usage

### Generate New Quotes with Claude

The easiest way to expand your quote library:

```bash
# Generate 50 new authentic quotes
npx ts-node manage-quotes.ts generate 50

# Generate themed quotes (risk-management, contrarian, sovereignty, sound-money, patience, freedom)
npx ts-node manage-quotes.ts generate-theme sovereignty 20

# Test generation without saving (useful to see quality)
npx ts-node manage-quotes.ts test

# View statistics
npx ts-node manage-quotes.ts stats

# Clear all generated quotes (keeps hardcoded ones)
npx ts-node manage-quotes.ts clear --confirm
```

**Best Practice:** Generate 50-100 quotes monthly to maintain fresh variety. Claude ensures all quotes are authentic and properly sourced.

### Preview Upcoming Quotes

```bash
# Preview next 7 days (default)
npx ts-node preview-quotes.ts

# Preview next 30 days to see variety
npx ts-node preview-quotes.ts 30
```

### Manually Adding Hardcoded Quotes

If you want to add permanent seed quotes, edit `/lib/utils/daily-quotes.ts` and add to the `DAILY_QUOTES` array:

```typescript
{
  text: "Your quote here",
  author: "Author Name",
  title: "Their Role/Company"  // Optional
}
```

**Guidelines for all quotes:**
- Keep them **short and punchy** (ideally under 150 characters)
- Focus on themes: **sovereignty, sound money, contrarian thinking, risk management**
- Avoid clichés - prefer wisdom that challenges conventional thinking
- Ensure they resonate with a Bitcoin-only fund philosophy
- **Only use authentic, verifiable quotes** - Claude helps ensure this

### Rotation Logic

The system uses `day of year modulo total quotes` to ensure:
- ✅ Consistent quote each day (everyone sees the same quote)
- ✅ Automatic rotation without manual intervention
- ✅ No repeats within the ~2-month cycle
- ✅ Predictable but varied

## Quote Philosophy

These quotes were selected to:

1. **Inspire contrarian thinking** - challenge the status quo
2. **Emphasize sovereignty** - freedom from state-controlled money
3. **Focus on risk management** - protect capital first
4. **Champion patience** - long-term orientation wins
5. **Question authority** - especially monetary and political
6. **Value sound money** - hard assets over fiat currency

## How Claude Generation Works

The quote generation system uses Claude Sonnet 4 to:

1. **Source authentic quotes** - Claude has been trained on vast financial literature, interviews, memos, and books
2. **Verify authenticity** - Only provides real quotes with proper attribution and source context
3. **Focus on your priorities** - Instructed to emphasize tradfi legends (70%) and pro-freedom thinkers (30%)
4. **Maintain quality** - Ensures quotes align with Bitcoin-only fund philosophy and sovereignty themes
5. **Provide context** - Includes source information (book, interview, memo) for verification

### What Makes This Powerful

- **Endless variety** - Generate 50-100 quotes per month for continuous fresh content
- **Zero fabrication** - Claude explicitly avoids making up quotes
- **Intelligent curation** - Prioritizes the most impactful and relevant wisdom
- **Automatic deduplication** - System removes duplicates across all generated batches
- **Cost-effective** - Uses ~600 input + 2000 output tokens per 30 quotes (~$0.02)

### Quote Generation Philosophy

Claude is instructed to prioritize:

**Traditional Finance Legends (70%):**
- Hedge fund titans: Soros, Druckenmiller, Tudor Jones, Dalio, Robertson
- Value investors: Buffett, Munger, Klarman, Marks, Graham
- Legendary traders: Livermore, Seykota, Dennis, Lipschutz
- Macro investors: Rogers, Steinhardt, Bacon, Kovner

**Pro-Freedom & Sound Money (30%):**
- Austrian economists: Hayek, Mises, Rothbard
- Monetary critics: Ron Paul, James Grant, Jim Rickards
- Bitcoin thinkers: Saylor, Finney, Szabo, Booth, Ammous
- Cypherpunks: Timothy May, Eric Hughes, Adam Back

## Maintenance Schedule

**Recommended:**
- Generate 50 new quotes monthly for ~12-month no-repeat cycle
- Generate 100 quotes quarterly for ~18-month cycle
- Run `npx ts-node manage-quotes.ts stats` weekly to monitor variety

**One-time setup for long-term variety:**
```bash
# Generate 200+ quotes for a 6-month+ cycle
npx ts-node manage-quotes.ts generate 100
npx ts-node manage-quotes.ts generate-theme risk-management 30
npx ts-node manage-quotes.ts generate-theme sovereignty 30
npx ts-node manage-quotes.ts generate-theme contrarian 30
```

## Files Created/Modified

- `/lib/utils/daily-quotes.ts` - Core quote database and rotation logic (updated)
- `/lib/utils/quote-generator.ts` - Claude-powered quote generation (NEW)
- `/manage-quotes.ts` - Quote management CLI (NEW)
- `/run-morning-report.ts` - Updated to use daily quotes
- `/preview-quotes.ts` - Testing and preview utility (updated)
- `/data/generated-quotes.json` - Storage for Claude-generated quotes (NEW)

---

**Note:** The EOD report still uses "See you tomorrow! 🌙" - let us know if you'd like to add evening quotes there too!

