#!/usr/bin/env ts-node

/**
 * Quote management CLI - Generate, view, and manage daily quotes
 * Usage:
 *   npx ts-node manage-quotes.ts generate [count]     - Generate new quotes using Claude
 *   npx ts-node manage-quotes.ts generate-theme [theme] [count]  - Generate themed quotes
 *   npx ts-node manage-quotes.ts stats                - Show quote statistics
 *   npx ts-node manage-quotes.ts clear                - Clear generated quotes
 *   npx ts-node manage-quotes.ts test                 - Test quote generation (no save)
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import * as fs from 'fs';
import * as path from 'path';
import { generateQuotes, generateThematicQuotes, GeneratedQuote } from './lib/utils/quote-generator';
import { getQuoteCount, getAllQuotes } from './lib/utils/daily-quotes';

const QUOTES_FILE = path.join(__dirname, 'data/generated-quotes.json');

function loadGeneratedQuotes(): GeneratedQuote[] {
  try {
    if (fs.existsSync(QUOTES_FILE)) {
      const data = fs.readFileSync(QUOTES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading quotes:', error);
  }
  return [];
}

function saveGeneratedQuotes(quotes: GeneratedQuote[]): void {
  // Ensure data directory exists
  const dataDir = path.dirname(QUOTES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
  console.log(`✅ Saved ${quotes.length} quotes to ${QUOTES_FILE}`);
}

async function generateNewQuotes(count: number): Promise<void> {
  console.log(`\n🤖 Generating ${count} new quotes using Claude...\n`);
  
  try {
    const newQuotes = await generateQuotes(count);
    const existingQuotes = loadGeneratedQuotes();
    
    // Combine and deduplicate
    const allQuotes = [...existingQuotes, ...newQuotes];
    const uniqueQuotes = deduplicateQuotes(allQuotes);
    
    saveGeneratedQuotes(uniqueQuotes);
    
    console.log(`\n✨ Successfully added ${newQuotes.length} new quotes`);
    console.log(`📊 Total generated quotes: ${uniqueQuotes.length}`);
    
    // Show a sample
    console.log(`\n📝 Sample of new quotes:\n`);
    newQuotes.slice(0, 3).forEach((q, i) => {
      console.log(`${i + 1}. "${q.text}"`);
      console.log(`   — ${q.author}${q.title ? `, ${q.title}` : ''}`);
      if (q.context) {
        console.log(`   Source: ${q.context}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error generating quotes:', error);
    process.exit(1);
  }
}

async function generateThemedQuotes(theme: string, count: number): Promise<void> {
  const validThemes = ['risk-management', 'contrarian', 'sovereignty', 'sound-money', 'patience', 'freedom'];
  
  if (!validThemes.includes(theme)) {
    console.error(`❌ Invalid theme. Must be one of: ${validThemes.join(', ')}`);
    process.exit(1);
  }
  
  console.log(`\n🎯 Generating ${count} quotes themed around: ${theme}\n`);
  
  try {
    const newQuotes = await generateThematicQuotes(theme as any, count);
    const existingQuotes = loadGeneratedQuotes();
    
    const allQuotes = [...existingQuotes, ...newQuotes];
    const uniqueQuotes = deduplicateQuotes(allQuotes);
    
    saveGeneratedQuotes(uniqueQuotes);
    
    console.log(`\n✨ Successfully added ${newQuotes.length} themed quotes`);
    console.log(`📊 Total generated quotes: ${uniqueQuotes.length}`);
  } catch (error) {
    console.error('❌ Error generating themed quotes:', error);
    process.exit(1);
  }
}

function deduplicateQuotes(quotes: GeneratedQuote[]): GeneratedQuote[] {
  const seen = new Set<string>();
  return quotes.filter(q => {
    const key = `${q.text.toLowerCase()}-${q.author.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function showStats(): void {
  const counts = getQuoteCount();
  const allQuotes = getAllQuotes();
  const generated = loadGeneratedQuotes();
  
  console.log('\n📊 QUOTE STATISTICS\n');
  console.log('═'.repeat(60));
  console.log(`📚 Hardcoded seed quotes: ${counts.hardcoded}`);
  console.log(`🤖 Claude-generated quotes: ${counts.generated}`);
  console.log(`✨ Total available quotes: ${counts.total}`);
  console.log(`🔄 Rotation cycle: ${counts.total} days (~${(counts.total / 30).toFixed(1)} months)`);
  
  if (generated.length > 0) {
    const dates = generated
      .map(q => q.generated_at ? new Date(q.generated_at) : null)
      .filter(d => d !== null) as Date[];
    
    if (dates.length > 0) {
      const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
      const newest = new Date(Math.max(...dates.map(d => d.getTime())));
      
      console.log(`\n📅 Generation timeline:`);
      console.log(`   First generated: ${oldest.toLocaleDateString()}`);
      console.log(`   Last generated: ${newest.toLocaleDateString()}`);
    }
  }
  
  // Show author breakdown
  const authorCounts = new Map<string, number>();
  allQuotes.forEach(q => {
    const count = authorCounts.get(q.author) || 0;
    authorCounts.set(q.author, count + 1);
  });
  
  const topAuthors = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log(`\n👥 Top 10 most quoted (out of ${authorCounts.size} total):`);
  topAuthors.forEach(([author, count], i) => {
    console.log(`   ${i + 1}. ${author}: ${count} quote${count > 1 ? 's' : ''}`);
  });
  
  console.log('');
}

function clearGeneratedQuotes(): void {
  const confirm = process.argv[3];
  
  if (confirm !== '--confirm') {
    console.log('\n⚠️  This will delete all Claude-generated quotes (hardcoded quotes will remain)');
    console.log('Run with --confirm to proceed: npx ts-node manage-quotes.ts clear --confirm\n');
    process.exit(0);
  }
  
  saveGeneratedQuotes([]);
  console.log('\n✅ Cleared all generated quotes. Hardcoded quotes remain.\n');
}

async function testGeneration(): Promise<void> {
  console.log('\n🧪 Testing quote generation (results will not be saved)...\n');
  
  try {
    const testQuotes = await generateQuotes(5);
    
    console.log(`\n✅ Successfully generated ${testQuotes.length} test quotes:\n`);
    console.log('═'.repeat(80));
    
    testQuotes.forEach((q, i) => {
      console.log(`\n${i + 1}. "${q.text}"`);
      console.log(`   — ${q.author}${q.title ? `, ${q.title}` : ''}`);
      if (q.context) {
        console.log(`   📖 Source: ${q.context}`);
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 Test successful! To save these quotes, run:');
    console.log('   npx ts-node manage-quotes.ts generate 50\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log(`
📜 Quote Management CLI

Usage:
  npx ts-node manage-quotes.ts generate [count]                 Generate new quotes (default: 10)
  npx ts-node manage-quotes.ts generate-theme [theme] [count]   Generate themed quotes
  npx ts-node manage-quotes.ts stats                            Show statistics
  npx ts-node manage-quotes.ts clear [--confirm]                Clear generated quotes
  npx ts-node manage-quotes.ts test                             Test generation without saving

Themes: risk-management, contrarian, sovereignty, sound-money, patience, freedom

Examples:
  npx ts-node manage-quotes.ts generate 50
  npx ts-node manage-quotes.ts generate-theme sovereignty 20
  npx ts-node manage-quotes.ts stats
`);
    process.exit(0);
  }
  
  switch (command) {
    case 'generate': {
      const count = parseInt(process.argv[3] || '10', 10);
      await generateNewQuotes(count);
      break;
    }
    
    case 'generate-theme': {
      const theme = process.argv[3];
      const count = parseInt(process.argv[4] || '10', 10);
      if (!theme) {
        console.error('❌ Please specify a theme');
        process.exit(1);
      }
      await generateThemedQuotes(theme, count);
      break;
    }
    
    case 'stats': {
      showStats();
      break;
    }
    
    case 'clear': {
      clearGeneratedQuotes();
      break;
    }
    
    case 'test': {
      await testGeneration();
      break;
    }
    
    default: {
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
    }
  }
}

main();

