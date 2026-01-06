// Data formatting utilities

export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatStockPrice(value: number): string {
  // Show full precision - no rounding
  // Remove trailing zeros but keep at least 2 decimals
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 10, // Allow up to 10 decimals for precision
  });
  return formatted;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

export function formatBTC(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} BTC`;
}

export function formatChange(value: number): string {
  const emoji = value >= 0 ? '📈' : '📉';
  return `${emoji} ${formatCurrency(value)}`;
}

export function formatPercentChange(value: number): string {
  const emoji = value >= 0 ? '📈' : '📉';
  return `${emoji} ${formatPercent(value)}`;
}

