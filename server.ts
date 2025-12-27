import { serve, file, build } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Cache for built app
let appCache: { code: string; css?: string; timestamp: number } | null = null;
const CACHE_DURATION = 1000; // 1 second cache for dev

// Data file path
const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'financial-data.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

async function getBuiltApp(): Promise<{ js: string; css: string }> {
  const now = Date.now();
  
  // Use cache if still valid
  if (appCache && (now - appCache.timestamp) < CACHE_DURATION) {
    return { js: appCache.code, css: appCache.css || '' };
  }
  
  console.log('Building application...');
  
  // Build the app
  try {
    const result = await build({
      entrypoints: ['src/index.tsx'],
      target: 'browser',
      format: 'esm',
      minify: false,
      sourcemap: 'inline',
      splitting: false,
      external: [],
    });
    
    if (!result.success) {
      throw new Error('Build failed');
    }
    
    if (result.outputs.length === 0) {
      throw new Error('Build failed: no outputs');
    }
    
    // Separate JS and CSS outputs
    let jsCode = '';
    let cssCode = '';
    
    for (const output of result.outputs) {
      const text = await output.text();
      if (output.path?.endsWith('.css')) {
        cssCode += text + '\n';
      } else {
        jsCode += text;
      }
    }
    
    // If no separate CSS file, try to find JS code
    if (!jsCode && result.outputs[0]) {
      jsCode = await result.outputs[0].text();
    }
    
    if (!jsCode || jsCode.length === 0) {
      throw new Error('Build produced empty output');
    }
    
    console.log(`Build successful: JS ${jsCode.length} bytes, CSS ${cssCode.length} bytes`);
    
    // Update cache
    appCache = { code: jsCode, css: cssCode, timestamp: now };
    
    return { js: jsCode, css: cssCode };
  } catch (error) {
    console.error('Build error details:', error);
    throw error;
  }
}

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    console.log(`Request: ${req.method} ${pathname}`);
    
    // Handle CORS preflight FIRST
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    // API endpoints - check BEFORE other routes
    // API endpoint: GET financial data
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
          // Return default empty data structure
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

    // API endpoint: POST financial data
    if (pathname === '/api/data' && req.method === 'POST') {
      try {
        console.log('Received POST request to /api/data');
        const data = await req.json();
        console.log('Data received, writing to file:', DATA_FILE);
        
        // Ensure directory exists
        if (!existsSync(DATA_DIR)) {
          mkdirSync(DATA_DIR, { recursive: true });
          console.log('Created data directory:', DATA_DIR);
        }
        
        await Bun.write(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Data file written successfully');
        
        // Verify the file was written
        if (existsSync(DATA_FILE)) {
          const fileSize = (await Bun.file(DATA_FILE).text()).length;
          console.log(`File verified: ${fileSize} bytes written`);
        }
        
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
    
    // Serve the bundled app FIRST (before HTML check)
    if (pathname === '/index.js' || pathname.startsWith('/index.js')) {
      try {
        console.log('Building app...');
        const { js } = await getBuiltApp();
        console.log(`Serving bundled app (${js.length} bytes)`);
        return new Response(js, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        console.error('Build error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return new Response(
          `console.error('Build error: ${errorMsg}');`,
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/javascript; charset=utf-8',
            },
          }
        );
      }
    }
    
    // Serve bundled CSS if available
    if (pathname === '/index.css' || pathname.startsWith('/index.css')) {
      try {
        const { css } = await getBuiltApp();
        return new Response(css, {
          headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        return new Response('/* CSS not available */', {
          headers: { 'Content-Type': 'text/css' },
        });
      }
    }
    
    // Handle CSS files (including CSS modules)
    // CSS files might be requested with various paths from the bundle
    if (pathname.endsWith('.css') || pathname.includes('.module.css')) {
      // Try multiple possible paths
      const possiblePaths = [
        pathname.startsWith('/') ? pathname.slice(1) : pathname,
        `src/${pathname.startsWith('/') ? pathname.slice(1) : pathname}`,
        pathname.replace(/^\/src\//, 'src/'),
      ];
      
      for (const filePath of possiblePaths) {
        const cssFile = file(filePath);
        if (await cssFile.exists()) {
          return new Response(cssFile, {
            headers: { 
              'Content-Type': 'text/css',
              'Cache-Control': 'no-cache',
            },
          });
        }
      }
      
      // If file not found, return empty CSS to prevent 404 errors
      return new Response('/* CSS file not found */', {
        headers: { 'Content-Type': 'text/css' },
        status: 404,
      });
    }
    

    // API endpoint: GET config (API keys for client)
    if (pathname === '/api/config' && req.method === 'GET') {
      const config = {
        alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
        coingeckoApiKey: process.env.COINGECKO_API_KEY || '',
        exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY || '',
      };
      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Helper function to inject API config into HTML
    const injectApiConfig = async (htmlFile: ReturnType<typeof file>): Promise<string> => {
      const htmlContent = await htmlFile.text();
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
      return htmlContent.replace(
        '</head>',
        `<script>window.__API_CONFIG__ = { ALPHA_VANTAGE_API_KEY: ${JSON.stringify(apiKey)} };</script></head>`
      );
    };
    
    // Serve the HTML file
    if (pathname === '/' || pathname === '/index.html') {
      const htmlFile = file('public/index.html');
      const injectedHtml = await injectApiConfig(htmlFile);
      return new Response(injectedHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Default: serve index.html for SPA routing
    const htmlFile = file('public/index.html');
    const injectedHtml = await injectApiConfig(htmlFile);
    return new Response(injectedHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

console.log('🚀 Financial Tracker server running at http://localhost:3000');

