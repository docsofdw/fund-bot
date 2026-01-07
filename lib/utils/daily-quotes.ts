/**
 * Daily quotes from legendary investors, fund managers, and monetary thinkers
 * Focused on sovereignty, freedom, contrarian thinking, and sound money principles
 * 
 * Combines hardcoded seed quotes with Claude-generated quotes for endless variety
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Quote {
  text: string;
  author: string;
  title?: string; // Optional context about who they are
  context?: string; // Optional source/context
  generated_at?: string; // Timestamp if Claude-generated
}

/**
 * Load generated quotes from JSON file
 */
function loadGeneratedQuotes(): Quote[] {
  try {
    const quotesPath = path.join(__dirname, '../../data/generated-quotes.json');
    if (fs.existsSync(quotesPath)) {
      const data = fs.readFileSync(quotesPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('[Quotes] Could not load generated quotes:', error);
  }
  return [];
}

/**
 * Curated collection of quotes from investors who understood
 * sovereignty, sound money, and contrarian thinking
 */
export const DAILY_QUOTES: Quote[] = [
  // George Soros - Quantum Fund
  {
    text: "It's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.",
    author: "George Soros",
    title: "Quantum Fund"
  },
  {
    text: "I'm only rich because I know when I'm wrong.",
    author: "George Soros",
    title: "Quantum Fund"
  },

  // Stanley Druckenmiller - Duquesne Capital
  {
    text: "Play the game for more than you can afford to lose... only then will you learn the game.",
    author: "Stanley Druckenmiller",
    title: "Duquesne Capital"
  },
  {
    text: "The way to build long-term returns is through preservation of capital and home runs.",
    author: "Stanley Druckenmiller",
    title: "Duquesne Capital"
  },

  // Paul Tudor Jones - Tudor Investment Corp
  {
    text: "Don't be a hero. Don't have an ego. Always question yourself and your ability. Don't ever feel that you are very good.",
    author: "Paul Tudor Jones",
    title: "Tudor Investment Corp"
  },
  {
    text: "Where you want to be is always in control, never wishing, always trading, and always first and foremost protecting your ass.",
    author: "Paul Tudor Jones",
    title: "Tudor Investment Corp"
  },

  // Ray Dalio - Bridgewater Associates
  {
    text: "The biggest mistake investors make is to believe that what happened in the recent past is likely to persist.",
    author: "Ray Dalio",
    title: "Bridgewater Associates"
  },
  {
    text: "He who lives by the crystal ball will eat shattered glass.",
    author: "Ray Dalio",
    title: "Bridgewater Associates"
  },

  // Howard Marks - Oaktree Capital
  {
    text: "Risk means more things can happen than will happen.",
    author: "Howard Marks",
    title: "Oaktree Capital"
  },
  {
    text: "Experience is what you got when you didn't get what you wanted.",
    author: "Howard Marks",
    title: "Oaktree Capital"
  },
  {
    text: "The road to long-term investment success runs through risk control more than through aggressiveness.",
    author: "Howard Marks",
    title: "Oaktree Capital"
  },

  // Seth Klarman - Baupost Group
  {
    text: "The single greatest edge an investor can have is a long-term orientation.",
    author: "Seth Klarman",
    title: "Baupost Group"
  },
  {
    text: "Risk is not inherent in an investment; it is always relative to the price paid.",
    author: "Seth Klarman",
    title: "Baupost Group"
  },

  // David Tepper - Appaloosa Management
  {
    text: "Markets are never wrong—opinions often are.",
    author: "David Tepper",
    title: "Appaloosa Management"
  },

  // Jim Rogers - Quantum Fund co-founder
  {
    text: "Beware of all politicians everywhere and always.",
    author: "Jim Rogers",
    title: "Quantum Fund"
  },
  {
    text: "The most sensible thing to do is to own hard assets and try to preserve your wealth.",
    author: "Jim Rogers",
    title: "Investor & Author"
  },

  // Carl Icahn - Icahn Enterprises
  {
    text: "In life and business, there are two cardinal sins. The first is to act precipitously without thought, and the second is to not act at all.",
    author: "Carl Icahn",
    title: "Icahn Enterprises"
  },

  // Michael Steinhardt - Steinhardt Partners
  {
    text: "The hardest thing over the years has been having the courage to go against the dominant wisdom of the time.",
    author: "Michael Steinhardt",
    title: "Steinhardt Partners"
  },

  // Jesse Livermore - Legendary trader
  {
    text: "The market is never wrong—opinions often are.",
    author: "Jesse Livermore",
    title: "Legendary Trader"
  },
  {
    text: "There is nothing new in Wall Street. There can't be because speculation is as old as the hills.",
    author: "Jesse Livermore",
    title: "Legendary Trader"
  },

  // Warren Buffett - Berkshire Hathaway
  {
    text: "The market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
    title: "Berkshire Hathaway"
  },
  {
    text: "Be fearful when others are greedy, and greedy when others are fearful.",
    author: "Warren Buffett",
    title: "Berkshire Hathaway"
  },

  // Benjamin Graham - Father of Value Investing
  {
    text: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.",
    author: "Benjamin Graham",
    title: "The Intelligent Investor"
  },
  {
    text: "The investor's chief problem—and his worst enemy—is likely to be himself.",
    author: "Benjamin Graham",
    title: "The Intelligent Investor"
  },

  // John Templeton - Templeton Funds
  {
    text: "The four most dangerous words in investing are: 'This time it's different.'",
    author: "John Templeton",
    title: "Templeton Funds"
  },
  {
    text: "Bull markets are born on pessimism, grow on skepticism, mature on optimism, and die on euphoria.",
    author: "John Templeton",
    title: "Templeton Funds"
  },

  // Peter Lynch - Fidelity Magellan Fund
  {
    text: "Know what you own, and know why you own it.",
    author: "Peter Lynch",
    title: "Fidelity Magellan Fund"
  },
  {
    text: "The real key to making money in stocks is not to get scared out of them.",
    author: "Peter Lynch",
    title: "Fidelity Magellan Fund"
  },

  // Austrian Economics & Sound Money Thinkers
  
  // F.A. Hayek - Austrian School
  {
    text: "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.",
    author: "F.A. Hayek",
    title: "Nobel Prize Economist"
  },
  {
    text: "I don't believe we shall ever have a good money again before we take the thing out of the hands of government.",
    author: "F.A. Hayek",
    title: "The Denationalization of Money"
  },

  // Ludwig von Mises - Austrian School
  {
    text: "Government is the only institution that can take a valuable commodity like paper and make it worthless by applying ink.",
    author: "Ludwig von Mises",
    title: "Austrian Economist"
  },
  {
    text: "The gold standard did not collapse. Governments abolished it in order to pave the way for inflation.",
    author: "Ludwig von Mises",
    title: "Human Action"
  },

  // Murray Rothbard - Austrian School
  {
    text: "It is no crime to be ignorant of economics, but it is totally irresponsible to have a loud and vociferous opinion on economic subjects.",
    author: "Murray Rothbard",
    title: "Austrian Economist"
  },
  {
    text: "Inflation is not an act of God. Inflation is a policy.",
    author: "Murray Rothbard",
    title: "What Has Government Done to Our Money?"
  },

  // Milton Friedman - Monetary economist
  {
    text: "Inflation is always and everywhere a monetary phenomenon.",
    author: "Milton Friedman",
    title: "Nobel Prize Economist"
  },
  {
    text: "One of the great mistakes is to judge policies and programs by their intentions rather than their results.",
    author: "Milton Friedman",
    title: "Nobel Prize Economist"
  },

  // Modern Bitcoin & Monetary Thinkers

  // Michael Saylor - MicroStrategy
  {
    text: "Bitcoin is a bank in cyberspace, run by incorruptible software, offering a global, affordable, simple, & secure savings account.",
    author: "Michael Saylor",
    title: "MicroStrategy"
  },
  {
    text: "The mandate of Bitcoin is to provide property rights to 8 billion people.",
    author: "Michael Saylor",
    title: "MicroStrategy"
  },

  // Jeff Booth - Author & Entrepreneur
  {
    text: "You can't have freedom without freedom of money.",
    author: "Jeff Booth",
    title: "The Price of Tomorrow"
  },
  {
    text: "Technology is deflationary. Fiat currency is inflationary. That's the problem.",
    author: "Jeff Booth",
    title: "The Price of Tomorrow"
  },

  // Robert Breedlove - Philosopher & Bitcoin thinker
  {
    text: "Money is the language of value. Bitcoin speaks truth.",
    author: "Robert Breedlove",
    title: "The Number Zero and Bitcoin"
  },
  {
    text: "Sound money is the root technology from which all human cooperation scales.",
    author: "Robert Breedlove",
    title: "Philosopher"
  },

  // Saifedean Ammous - The Bitcoin Standard
  {
    text: "Bitcoin is the first example of a new form of life that lives and breathes on the internet.",
    author: "Saifedean Ammous",
    title: "The Bitcoin Standard"
  },
  {
    text: "Sound money is money that gains in purchasing power over time.",
    author: "Saifedean Ammous",
    title: "The Bitcoin Standard"
  },

  // Jack Mallers - Strike
  {
    text: "Bitcoin is the separation of money and state.",
    author: "Jack Mallers",
    title: "Strike"
  },

  // Lyn Alden - Investment strategist
  {
    text: "The key to understanding Bitcoin is understanding that it's a monetary network, not just a technology.",
    author: "Lyn Alden",
    title: "Investment Strategist"
  },
  {
    text: "Hard money protects savers. Easy money subsidizes debtors.",
    author: "Lyn Alden",
    title: "Investment Strategist"
  },

  // Pierre Rochard - Bitcoin Core contributor
  {
    text: "Bitcoin is insurance against an Orwellian future.",
    author: "Pierre Rochard",
    title: "Bitcoin Researcher"
  },

  // Contrarian & Freedom-focused

  // Nassim Taleb - Author & trader
  {
    text: "The three most harmful addictions are heroin, carbohydrates, and a monthly salary.",
    author: "Nassim Taleb",
    title: "The Black Swan"
  },
  {
    text: "Don't tell me what you think. Tell me what you have in your portfolio.",
    author: "Nassim Taleb",
    title: "Skin in the Game"
  },

  // Charlie Munger - Berkshire Hathaway (pre-Bitcoin skepticism era)
  {
    text: "The big money is not in the buying and selling, but in the waiting.",
    author: "Charlie Munger",
    title: "Berkshire Hathaway"
  },
  {
    text: "Invert, always invert.",
    author: "Charlie Munger",
    title: "Berkshire Hathaway"
  },

  // Mark Twain
  {
    text: "It ain't what you don't know that gets you into trouble. It's what you know for sure that just ain't so.",
    author: "Mark Twain",
    title: "Author"
  },

  // Additional contrarian wisdom
  {
    text: "The stock market is designed to transfer money from the Active to the Patient.",
    author: "Warren Buffett",
    title: "Berkshire Hathaway"
  },
  {
    text: "Time is the friend of the wonderful business, the enemy of the mediocre.",
    author: "Warren Buffett",
    title: "Berkshire Hathaway"
  },
  {
    text: "Compound interest is the eighth wonder of the world.",
    author: "Albert Einstein",
    title: "Physicist"
  },
  {
    text: "The goal isn't more money. The goal is living life on your own terms.",
    author: "Chris Brogan",
    title: "Author"
  },
  {
    text: "Freedom is the recognition that no single person, no single authority or government has a monopoly on the truth.",
    author: "Ron Paul",
    title: "Former Congressman"
  },
  {
    text: "Fix the money, fix the world.",
    author: "Bitcoin Maxim",
    title: "Community Wisdom"
  }
];

/**
 * Get all available quotes (hardcoded + generated)
 */
export function getAllQuotes(): Quote[] {
  const generatedQuotes = loadGeneratedQuotes();
  return [...DAILY_QUOTES, ...generatedQuotes];
}

/**
 * Get count of total quotes available
 */
export function getQuoteCount(): { hardcoded: number; generated: number; total: number } {
  const generatedQuotes = loadGeneratedQuotes();
  return {
    hardcoded: DAILY_QUOTES.length,
    generated: generatedQuotes.length,
    total: DAILY_QUOTES.length + generatedQuotes.length
  };
}

/**
 * Get the quote of the day based on the current date
 * Uses day of year to ensure consistent rotation
 * Combines hardcoded seed quotes with Claude-generated quotes
 */
export function getQuoteOfTheDay(date: Date = new Date()): Quote {
  const allQuotes = getAllQuotes();
  
  // Calculate day of year (0-365)
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Use modulo to cycle through all available quotes
  const index = dayOfYear % allQuotes.length;
  
  return allQuotes[index];
}

/**
 * Format a quote for display
 */
export function formatQuote(quote: Quote): string {
  const attribution = quote.title 
    ? `— ${quote.author}, ${quote.title}`
    : `— ${quote.author}`;
  
  return `_"${quote.text}"_\n\n${attribution}`;
}

