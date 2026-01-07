// Market indicators from free data sources (no API keys required)

interface FearGreedData {
  value: number;
  valueClassification: string;
  timestamp: number;
}

interface FundingRateData {
  rate: number; // Percentage (8-hour rate)
  timestamp: number;
  exchange: string;
}

interface DVOLData {
  value: number;
  timestamp: number;
}

export interface MarketIndicators {
  fearGreed: FearGreedData | null;
  fundingRate: FundingRateData | null;
  dvol: DVOLData | null;
}

/**
 * Fetch Fear & Greed Index from Alternative.me (FREE)
 * https://api.alternative.me/fng/
 */
async function fetchFearGreed(): Promise<FearGreedData | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    
    if (!response.ok) {
      console.warn(`Fear & Greed API returned ${response.status}`);
      return null;
    }
    
    const data: any = await response.json();
    const latest = data?.data?.[0];
    
    if (!latest) {
      return null;
    }
    
    return {
      value: parseInt(latest.value, 10),
      valueClassification: latest.value_classification,
      timestamp: parseInt(latest.timestamp, 10) * 1000,
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
    return null;
  }
}


/**
 * Fetch BTC Funding Rate from Bybit (FREE, no API key required)
 * https://bybit-exchange.github.io/docs/v5/market/tickers
 * Falls back to Binance if Bybit fails
 */
async function fetchFundingRate(): Promise<FundingRateData | null> {
  // Try Bybit first (more reliable, no regional restrictions)
  try {
    const response = await fetch(
      'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (response.ok) {
      const data: any = await response.json();
      const ticker = data?.result?.list?.[0];
      
      if (ticker?.fundingRate) {
        // Convert to percentage (Bybit returns as decimal, e.g., 0.0001 = 0.01%)
        const ratePercent = parseFloat(ticker.fundingRate) * 100;
        
        return {
          rate: ratePercent,
          timestamp: Date.now(),
          exchange: 'Bybit',
        };
      }
    }
  } catch (error) {
    console.warn('Bybit funding rate failed, trying Binance...');
  }
  
  // Fallback to Binance
  try {
    const response = await fetch(
      'https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.warn(`Binance API returned ${response.status}`);
      return null;
    }
    
    const data: any = await response.json();
    
    if (!data?.lastFundingRate) {
      return null;
    }
    
    // Convert to percentage
    const ratePercent = parseFloat(data.lastFundingRate) * 100;
    
    return {
      rate: ratePercent,
      timestamp: data.time || Date.now(),
      exchange: 'Binance',
    };
  } catch (error) {
    console.error('Error fetching funding rate from both exchanges:', error);
    return null;
  }
}

/**
 * Fetch DVOL (Deribit Volatility Index) from Deribit (FREE)
 * https://docs.deribit.com/
 */
async function fetchDVOL(): Promise<DVOLData | null> {
  try {
    const response = await fetch(
      'https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=1',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.warn(`Deribit API returned ${response.status}`);
      return null;
    }
    
    const data: any = await response.json();
    
    if (!data?.result?.data?.length) {
      return null;
    }
    
    // Get the latest volatility index value
    const latest = data.result.data[data.result.data.length - 1];
    
    return {
      value: latest[4], // Close value
      timestamp: latest[0], // Timestamp in ms
    };
  } catch (error) {
    console.error('Error fetching DVOL:', error);
    return null;
  }
}

/**
 * Fetch all market indicators in parallel (free sources only)
 */
export async function fetchMarketIndicators(): Promise<MarketIndicators> {
  console.log('[Market Indicators] Fetching data...');
  
  const startTime = Date.now();
  
  const [fearGreed, fundingRate, dvol] = await Promise.all([
    fetchFearGreed(),
    fetchFundingRate(),
    fetchDVOL(),
  ]);
  
  const duration = Date.now() - startTime;
  console.log(`[Market Indicators] Fetch completed in ${duration}ms`);
  
  return {
    fearGreed,
    fundingRate,
    dvol,
  };
}

/**
 * Format market indicators for display in Slack
 */
export function formatMarketIndicators(indicators: MarketIndicators): string {
  const lines: string[] = [];
  
  // Fear & Greed
  if (indicators.fearGreed) {
    const emoji = getFearGreedEmoji(indicators.fearGreed.value);
    lines.push(
      `${emoji} Fear & Greed: ${indicators.fearGreed.value} (${indicators.fearGreed.valueClassification})`
    );
  }
  
  // Funding Rate
  if (indicators.fundingRate) {
    const emoji = getFundingRateEmoji(indicators.fundingRate.rate);
    lines.push(
      `${emoji} Funding Rate: ${indicators.fundingRate.rate.toFixed(4)}% (${indicators.fundingRate.exchange})`
    );
  }
  
  // DVOL
  if (indicators.dvol) {
    const level = getDVOLLevel(indicators.dvol.value);
    lines.push(`📊 DVOL: ${indicators.dvol.value.toFixed(2)}% (${level})`);
  }
  
  if (lines.length === 0) {
    return '_Market indicators unavailable_';
  }
  
  return lines.join('\n');
}

/**
 * Helper functions for emojis and labels based on indicator values
 */
function getFearGreedEmoji(value: number): string {
  if (value <= 25) return '😱'; // Extreme Fear
  if (value <= 45) return '😰'; // Fear
  if (value <= 55) return '😐'; // Neutral
  if (value <= 75) return '😊'; // Greed
  return '🤑'; // Extreme Greed
}

function getFundingRateEmoji(rate: number): string {
  if (rate > 0.05) return '🔴'; // Very positive (expensive longs)
  if (rate > 0.01) return '🟠'; // Positive
  if (rate > -0.01) return '🟡'; // Neutral
  if (rate > -0.05) return '🟢'; // Negative (cheap longs)
  return '🟢🟢'; // Very negative
}

function getDVOLLevel(value: number): string {
  if (value < 50) return 'Low';
  if (value < 80) return 'Normal';
  return 'High';
}

