import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return config with environment variables
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    coingeckoApiKey: process.env.COINGECKO_API_KEY || '',
    exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY || '',
  };

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Return config as JSON
  res.status(200).json(config);
}

