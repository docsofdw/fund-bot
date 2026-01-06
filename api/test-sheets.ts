import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPortfolioSnapshot, getPortfolioMetrics } from '../lib/sheets/portfolio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Testing Google Sheets connection...');
    
    const [snapshot, metrics] = await Promise.all([
      getPortfolioSnapshot(),
      getPortfolioMetrics(),
    ]);
    
    console.log('Snapshot:', snapshot);
    console.log('Metrics:', metrics);
    
    return res.status(200).json({ 
      success: true, 
      snapshot, 
      metrics 
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
