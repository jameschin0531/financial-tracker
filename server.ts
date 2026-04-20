import { serve, file } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { handleStockQuoteAggregatorRequest } from './api/stockQuoteAggregator';

// Data file path
const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'financial-data.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // API: stock prices
    if (pathname === '/api/stock-prices') {
      if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      return await handleStockQuoteAggregatorRequest(url.searchParams.get('symbols'));
    }

    // API: GET financial data
    if (pathname === '/api/data' && req.method === 'GET') {
      try {
        if (existsSync(DATA_FILE)) {
          const data = await Bun.file(DATA_FILE).text();
          return new Response(data, {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else {
          const defaultData = {
            assets: [],
            liabilities: [],
            income: [],
            expenses: [],
            assetCategories: ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'],
            liabilityCategories: ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'],
            stockHoldings: [],
            cryptoHoldings: [],
            tradingAccounts: [],
            cryptoAccounts: [],
            deposits: [],
          };
          return new Response(JSON.stringify(defaultData), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (error) {
        console.error('Error reading data file:', error);
        return new Response(JSON.stringify({ error: 'Failed to read data' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // API: POST financial data
    if (pathname === '/api/data' && req.method === 'POST') {
      try {
        const data = await req.json();
        if (!existsSync(DATA_DIR)) {
          mkdirSync(DATA_DIR, { recursive: true });
        }
        await Bun.write(DATA_FILE, JSON.stringify(data, null, 2));
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        console.error('Error writing data file:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: 'Failed to save data', details: errorMsg }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // API: GET config
    if (pathname === '/api/config' && req.method === 'GET') {
      const config = {
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      };
      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});

console.log('API server running at http://localhost:3001');
