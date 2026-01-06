// Stock price fetching from external APIs as fallback

/**
 * Map exchange suffixes to Yahoo Finance format
 */
function mapTickerForYahoo(ticker: string): string[] {
  const variations: string[] = [];
  
  // ALWAYS try the original ticker first
  variations.push(ticker);
  
  // Then try variations based on exchange
  // TSX Venture Exchange (.V)
  if (ticker.endsWith('.V')) {
    variations.push(ticker.replace('.V', '.VN')); // Try .VN
  }
  // Canadian Stock Exchange (.CN)
  else if (ticker.endsWith('.CN')) {
    variations.push(ticker.replace('.CN', '.CNQ')); // Try .CNQ
  }
  // Aquis Exchange (.AQ) - UK
  else if (ticker.endsWith('.AQ')) {
    variations.push(ticker.replace('.AQ', '.L')); // Try London
    variations.push(ticker.replace('.AQ', '')); // Try without suffix
  }
  // For other exchanges, try without suffix as fallback
  else {
    const cleanTicker = ticker.replace(/\.[A-Z]+$/, '');
    if (cleanTicker !== ticker) {
      variations.push(cleanTicker);
    }
  }
  
  return variations;
}

/**
 * Fetch stock price from Yahoo Finance (no API key required)
 */
export async function fetchStockPrice(ticker: string): Promise<number | null> {
  const tickerVariations = mapTickerForYahoo(ticker);
  
  // Try each variation
  for (const variation of tickerVariations) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${variation}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      
      if (!response.ok) {
        continue; // Try next variation
      }
      
      const data: any = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      
      if (price && typeof price === 'number' && price > 0) {
        console.log(`✓ Found price for ${ticker} using ${variation}: $${price}`);
        return price;
      }
    } catch (error) {
      // Continue to next variation
      continue;
    }
  }
  
  console.warn(`⚠ Could not fetch price for ${ticker} (tried: ${tickerVariations.join(', ')})`);
  return null;
}

/**
 * Fetch stock price with retry and fallback
 */
export async function getStockPriceWithFallback(
  ticker: string,
  sheetPrice: number
): Promise<number> {
  // If sheet has valid price (> $0.01), use it
  if (sheetPrice > 0.01) {
    return sheetPrice;
  }
  
  console.log(`Sheet price for ${ticker} is $${sheetPrice}, fetching from API...`);
  
  // Try to fetch from API
  const apiPrice = await fetchStockPrice(ticker);
  
  if (apiPrice && apiPrice > 0) {
    console.log(`✓ Fetched price for ${ticker}: $${apiPrice}`);
    return apiPrice;
  }
  
  // If API fails, return original (even if 0)
  console.warn(`⚠ Could not fetch price for ${ticker}, using sheet value: $${sheetPrice}`);
  return sheetPrice;
}

