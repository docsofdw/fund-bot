// Data validation utilities for report generation

import { PortfolioSnapshot, PortfolioMetrics } from '../../types';
import { MarketIndicators } from '../external/market-indicators';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataQualityReport {
  snapshot: ValidationResult;
  metrics: ValidationResult;
  marketIndicators: ValidationResult;
  overallValid: boolean;
  criticalErrors: string[];
}

// Minimum expected values for sanity checks
const SANITY_THRESHOLDS = {
  minBtcPrice: 10000,      // BTC should be > $10k
  minLiveAUM: 100000,      // AUM should be > $100k
  maxLiveAUM: 10000000000, // AUM should be < $10B (sanity check)
};

export function validatePortfolioSnapshot(snapshot: PortfolioSnapshot): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical checks - data that MUST be valid
  if (snapshot.btcPrice === 0) {
    errors.push('BTC price is 0 - likely data loading issue');
  } else if (snapshot.btcPrice < SANITY_THRESHOLDS.minBtcPrice) {
    errors.push(`BTC price ${snapshot.btcPrice} below sanity threshold ${SANITY_THRESHOLDS.minBtcPrice}`);
  }

  if (snapshot.liveAUM === 0) {
    errors.push('Live AUM is 0 - likely data loading issue');
  } else if (snapshot.liveAUM < SANITY_THRESHOLDS.minLiveAUM) {
    warnings.push(`Live AUM ${snapshot.liveAUM} is unusually low`);
  } else if (snapshot.liveAUM > SANITY_THRESHOLDS.maxLiveAUM) {
    errors.push(`Live AUM ${snapshot.liveAUM} exceeds sanity threshold - data error`);
  }

  // Warning checks - data that should be present but isn't critical
  if (snapshot.mtmAUM === 0) {
    warnings.push('MTM AUM is 0');
  }

  if (snapshot.navAUM === 0) {
    warnings.push('NAV AUM is 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePortfolioMetrics(metrics: PortfolioMetrics): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Metrics can legitimately be 0 in some cases, so we're more lenient
  if (metrics.totalAUMUSD === 0) {
    warnings.push('Total AUM USD is 0');
  }

  // Percent long should be between 0 and 200% typically
  if (metrics.percentLong < 0 || metrics.percentLong > 2) {
    warnings.push(`Percent long ${metrics.percentLong * 100}% is outside expected range`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateMarketIndicators(indicators: MarketIndicators): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!indicators.fearGreed) {
    warnings.push('Fear & Greed index unavailable');
  }

  if (!indicators.fundingRate) {
    warnings.push('Funding rate unavailable');
  }

  if (!indicators.dvol) {
    warnings.push('DVOL unavailable');
  }

  // Market indicators are nice-to-have, not critical
  return {
    isValid: true,
    errors,
    warnings,
  };
}

export function generateDataQualityReport(
  snapshot: PortfolioSnapshot,
  metrics: PortfolioMetrics,
  marketIndicators: MarketIndicators
): DataQualityReport {
  const snapshotValidation = validatePortfolioSnapshot(snapshot);
  const metricsValidation = validatePortfolioMetrics(metrics);
  const indicatorsValidation = validateMarketIndicators(marketIndicators);

  const criticalErrors = [
    ...snapshotValidation.errors,
    ...metricsValidation.errors,
    ...indicatorsValidation.errors,
  ];

  const allWarnings = [
    ...snapshotValidation.warnings,
    ...metricsValidation.warnings,
    ...indicatorsValidation.warnings,
  ];

  // Log the full report
  if (criticalErrors.length > 0) {
    console.error('[DataValidation] Critical errors:', criticalErrors);
  }
  if (allWarnings.length > 0) {
    console.warn('[DataValidation] Warnings:', allWarnings);
  }

  return {
    snapshot: snapshotValidation,
    metrics: metricsValidation,
    marketIndicators: indicatorsValidation,
    overallValid: criticalErrors.length === 0,
    criticalErrors,
  };
}

// Helper to determine if we should retry data fetch
export function shouldRetryDataFetch(report: DataQualityReport): boolean {
  // Retry if there are critical errors that might resolve with a fresh fetch
  return report.criticalErrors.some(err =>
    err.includes('data loading issue') ||
    err.includes('is 0')
  );
}
