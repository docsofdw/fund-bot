// Twelve Data API client for stock quotes

const TWELVEDATA_API_BASE = 'https://api.twelvedata.com';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
}

interface TwelveDataQuote {
  symbol?: string;
  name?: string;
  close?: string;
  change?: string;
  percent_change?: string;
  code?: number; // Error code if present
}

/**
 * Get stock quotes with 1D % change for multiple symbols
 */
export async function getStockQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  const results = new Map<string, StockQuote>();

  if (!apiKey) {
    console.warn('[TwelveData] TWELVEDATA_API_KEY not configured');
    return results;
  }

  if (symbols.length === 0) {
    return results;
  }

  try {
    // Twelve Data supports batch quotes with comma-separated symbols
    const symbolList = symbols.join(',');
    const response = await fetch(
      `${TWELVEDATA_API_BASE}/quote?symbol=${symbolList}&apikey=${apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[TwelveData] API returned ${response.status}`);
      return results;
    }

    const data = await response.json() as TwelveDataQuote | Record<string, TwelveDataQuote>;

    // Handle single symbol response (object) vs multiple (object with symbol keys)
    if (symbols.length === 1) {
      const quote = data as TwelveDataQuote;
      if (quote && quote.symbol && !quote.code) {
        results.set(quote.symbol.toUpperCase(), {
          symbol: quote.symbol,
          name: quote.name || quote.symbol,
          price: parseFloat(quote.close || '0') || 0,
          change: parseFloat(quote.change || '0') || 0,
          percentChange: parseFloat(quote.percent_change || '0') / 100 || 0, // Convert to decimal
        });
      }
    } else {
      // Multiple symbols - data is an object with symbol keys
      const multiData = data as Record<string, TwelveDataQuote>;
      for (const symbol of symbols) {
        const quote = multiData[symbol];
        if (quote && quote.symbol && !quote.code) {
          results.set(quote.symbol.toUpperCase(), {
            symbol: quote.symbol,
            name: quote.name || quote.symbol,
            price: parseFloat(quote.close || '0') || 0,
            change: parseFloat(quote.change || '0') || 0,
            percentChange: parseFloat(quote.percent_change || '0') / 100 || 0,
          });
        }
      }
    }

    console.log(`[TwelveData] Fetched quotes for ${results.size}/${symbols.length} symbols`);
    return results;
  } catch (error) {
    console.error('[TwelveData] Error fetching quotes:', error);
    return results;
  }
}

/**
 * Get a single stock quote
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const quotes = await getStockQuotes([symbol]);
  return quotes.get(symbol.toUpperCase()) || null;
}
