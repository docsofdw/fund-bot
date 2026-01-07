#!/usr/bin/env ts-node

/**
 * Test script for market indicators (free sources only)
 * Usage: npx ts-node test-market-indicators.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { fetchMarketIndicators, formatMarketIndicators } from './lib/external/market-indicators';

async function testMarketIndicators() {
  console.log('🧪 Testing Market Indicators (Free Sources Only)...\n');
  console.log('=' .repeat(60));
  
  console.log('\n📊 Fetching Market Indicators...\n');
  
  const startTime = Date.now();
  const indicators = await fetchMarketIndicators();
  const duration = Date.now() - startTime;
  
  console.log('='.repeat(60));
  console.log('\n✅ Results:\n');
  
  // Fear & Greed
  if (indicators.fearGreed) {
    console.log('😱→🤑 FEAR & GREED INDEX');
    console.log(`  Value: ${indicators.fearGreed.value}`);
    console.log(`  Classification: ${indicators.fearGreed.valueClassification}`);
    console.log(`  Updated: ${new Date(indicators.fearGreed.timestamp).toLocaleString()}`);
    console.log(`  Source: Alternative.me (FREE) ✅`);
  } else {
    console.log('😱→🤑 FEAR & GREED INDEX');
    console.log('  Status: ❌ Failed to fetch');
    console.log('  Note: This should always work (no API key required)');
    console.log('  Action: Check your internet connection');
  }
  
  console.log();
  
  // Funding Rate
  if (indicators.fundingRate) {
    let sentiment = 'Neutral';
    if (indicators.fundingRate.rate > 0.05) sentiment = 'Overleveraged Longs (High Risk)';
    else if (indicators.fundingRate.rate > 0.01) sentiment = 'Bullish (Positive)';
    else if (indicators.fundingRate.rate < -0.05) sentiment = 'Cheap Longs (Opportunity)';
    else if (indicators.fundingRate.rate < -0.01) sentiment = 'Bearish (Negative)';
    
    console.log('💰 FUNDING RATE');
    console.log(`  Rate: ${indicators.fundingRate.rate.toFixed(4)}% (8-hour)`);
    console.log(`  Annual: ${(indicators.fundingRate.rate * 1095).toFixed(2)}%`);
    console.log(`  Sentiment: ${sentiment}`);
    console.log(`  Exchange: ${indicators.fundingRate.exchange}`);
    console.log(`  Source: Binance Public API (FREE) ✅`);
  } else {
    console.log('💰 FUNDING RATE');
    console.log('  Status: ❌ Failed to fetch');
    console.log('  Note: This should work (no API key required)');
    console.log('  Reason: Binance API may be temporarily unavailable');
  }
  
  console.log();
  
  // DVOL
  if (indicators.dvol) {
    let level = 'Normal';
    if (indicators.dvol.value < 50) level = 'Low';
    else if (indicators.dvol.value > 80) level = 'High';
    
    console.log('📊 DVOL (Deribit Volatility Index)');
    console.log(`  Value: ${indicators.dvol.value.toFixed(2)}%`);
    console.log(`  Level: ${level}`);
    console.log(`  Updated: ${new Date(indicators.dvol.timestamp).toLocaleString()}`);
    console.log(`  Source: Deribit (FREE) ✅`);
  } else {
    console.log('📊 DVOL (Deribit Volatility Index)');
    console.log('  Status: ❌ Failed to fetch');
    console.log('  Note: This should work (no API key required)');
    console.log('  Reason: Deribit API may be temporarily unavailable or rate-limited');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📱 Slack Format Preview:\n');
  console.log(formatMarketIndicators(indicators));
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n⏱️  Total fetch time: ${duration}ms\n`);
  
  // Summary
  const available = [
    indicators.fearGreed,
    indicators.fundingRate,
    indicators.dvol,
  ].filter(Boolean).length;
  
  console.log('📊 Summary:');
  console.log(`  Available indicators: ${available}/3`);
  
  if (available === 0) {
    console.log('\n⚠️  WARNING: No indicators are available!');
    console.log('   Check your internet connection.');
  } else if (available < 2) {
    console.log('\n⚠️  Only ' + available + ' indicator available.');
    console.log('   APIs may be temporarily down (try again later).');
  } else if (available < 3) {
    console.log('\n✅ Most indicators working! ' + (3 - available) + ' unavailable.');
    console.log('   This is normal - some APIs are occasionally rate-limited.');
  } else {
    console.log('\n🎉 All indicators working perfectly!');
  }
  
  console.log('\n💡 What These Indicators Mean:');
  console.log('\n  😱 Fear & Greed (0-100):');
  console.log('     < 25  = Extreme Fear (potential buy signal)');
  console.log('     25-45 = Fear');
  console.log('     45-55 = Neutral');
  console.log('     55-75 = Greed');
  console.log('     > 75  = Extreme Greed (potential sell signal)');
  
  console.log('\n  💰 Funding Rate (%):');
  console.log('     Positive = Longs pay shorts (bullish sentiment)');
  console.log('     Negative = Shorts pay longs (bearish sentiment)');
  console.log('     > 0.05%  = Overleveraged longs (high risk)');
  console.log('     < -0.05% = Cheap longs (opportunity)');
  
  console.log('\n  📊 DVOL (Volatility %):');
  console.log('     < 50% = Low volatility (calm market)');
  console.log('     50-80% = Normal volatility');
  console.log('     > 80% = High volatility (expect big moves)');
  
  console.log('\n📚 For more information:');
  console.log('   - Run: npm run morning-report');
  console.log('   - Docs: MARKET_INDICATORS_SETUP.md');
  console.log();
}

testMarketIndicators().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
