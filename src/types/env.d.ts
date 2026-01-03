// Environment configuration
declare global {
  interface Window {
    // Legacy config (still used by stockPriceService for fallback)
    __API_CONFIG__?: {
      ALPHA_VANTAGE_API_KEY?: string;
      COINGECKO_API_KEY?: string;
      EXCHANGE_RATE_API_KEY?: string;
    };
  }
}

export {};

