// Environment configuration injected by server
declare global {
  interface Window {
    __API_CONFIG__?: {
      ALPHA_VANTAGE_API_KEY?: string;
      COINGECKO_API_KEY?: string;
      EXCHANGE_RATE_API_KEY?: string;
    };
  }
}

export {};

