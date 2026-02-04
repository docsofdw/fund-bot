// CoinMarketCap API client for BTC price data

const CMC_API_BASE = 'https://pro-api.coinmarketcap.com/v1';

interface CMCQuoteResponse {
  data: {
    BTC: {
      quote: {
        USD: {
          price: number;
          percent_change_24h: number;
          percent_change_7d: number;
        };
      };
    };
  };
}

export interface BTCPriceData {
  price: number;
  change24h: number; // percentage
  change7d: number;  // percentage
}

/**
 * Get BTC price and 24h change from CoinMarketCap
 */
export async function getBTCPriceData(): Promise<BTCPriceData | null> {
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  if (!apiKey) {
    console.warn('[CMC] COINMARKETCAP_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${CMC_API_BASE}/cryptocurrency/quotes/latest?symbol=BTC&convert=USD`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[CMC] API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as CMCQuoteResponse;
    const btcData = data.data.BTC.quote.USD;

    return {
      price: btcData.price,
      change24h: btcData.percent_change_24h / 100, // Convert to decimal
      change7d: btcData.percent_change_7d / 100,
    };
  } catch (error) {
    console.error('[CMC] Error fetching BTC data:', error);
    return null;
  }
}
