import type { VercelRequest, VercelResponse } from "@vercel/node";
import { aggregateStockQuotes, parseSymbolsParam } from "./stockQuoteAggregator";

const applyCorsHeaders = (res: VercelResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const getSymbolsParam = (queryValue: string | string[] | undefined): string | null => {
  if (typeof queryValue === "string") {
    return queryValue;
  }
  if (Array.isArray(queryValue)) {
    return queryValue.join(",");
  }
  return null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbols = parseSymbolsParam(getSymbolsParam(req.query.symbols));
  if (symbols.length === 0) {
    return res.status(400).json({ error: "Missing or invalid symbols query parameter" });
  }

  try {
    const payload = await aggregateStockQuotes(symbols);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Failed to aggregate stock quotes", error);
    return res.status(500).json({ error: "Failed to fetch stock prices" });
  }
}
