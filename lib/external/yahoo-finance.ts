// Yahoo Finance API client for international stock quotes

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: number[];
        }>;
      };
    }>;
  };
}

/**
 * Get stock quotes from Yahoo Finance (supports international exchanges)
 * Uses the chart endpoint which is more reliable
 */
export async function getYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const results = new Map<string, YahooQuote>();

  if (symbols.length === 0) {
    return results;
  }

  // Fetch quotes in parallel
  const quotePromises = symbols.map(symbol => getYahooQuoteSingle(symbol));
  const quotes = await Promise.all(quotePromises);

  for (const quote of quotes) {
    if (quote) {
      results.set(quote.symbol.toUpperCase(), quote);
    }
  }

  console.log(`[YahooFinance] Fetched quotes for ${results.size}/${symbols.length} symbols`);
  return results;
}

/**
 * Get a single quote using the chart endpoint
 */
async function getYahooQuoteSingle(symbol: string): Promise<YahooQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[YahooFinance] ${symbol}: API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as YahooChartResponse;
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.warn(`[YahooFinance] ${symbol}: No data in response`);
      return null;
    }

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close || [];

    if (!meta) {
      console.warn(`[YahooFinance] ${symbol}: No meta data in response`);
      return null;
    }

    // Get previous close and current price
    const previousClose = meta.chartPreviousClose || meta.previousClose || closes[0];
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];

    if (!previousClose || !currentPrice) {
      console.warn(`[YahooFinance] ${symbol}: Missing price data`);
      return null;
    }

    const change = currentPrice - previousClose;
    const percentChange = (change / previousClose);

    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price: currentPrice,
      change,
      percentChange,
    };
  } catch (error) {
    console.warn(`[YahooFinance] ${symbol}: Error -`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Get a single stock quote from Yahoo Finance
 */
export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const quotes = await getYahooQuotes([symbol]);
  return quotes.get(symbol.toUpperCase()) || null;
}
