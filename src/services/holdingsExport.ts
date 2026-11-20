import type { Currency, StockHolding } from '../types/financial';
import type { GroupedHolding } from '../utils/stockGrouping';
import type { ExportCell, ExportRates, ExportSection, SummaryLine } from './exportReport';
import { calculateHoldingMarketValue, calculateHoldingPandL } from './stockCalculations';

export interface HoldingsExport {
  generatedAt: Date;
  summary: SummaryLine[];
  sections: ExportSection[];
}

const text = (value: string | undefined): ExportCell => ({ kind: 'text', value: value ?? '' });
const money = (value: number, currency: Currency): ExportCell => ({ kind: 'money', value, currency });
const num = (value: number): ExportCell => ({ kind: 'number', value });
const pct = (value: number): ExportCell => num(Number(value.toFixed(2)));

/**
 * Converts a USD price into the holding's display currency, the same way the
 * Investment Holdings table shows it.
 */
const displayPrice = (usdPrice: number, currency: Currency, rates: ExportRates): ExportCell => {
  if (currency === 'HKD') return money(usdPrice * rates.usdToHkd, 'HKD');
  if (currency === 'MYR') return money(usdPrice * rates.usdToMyr, 'MYR');
  return money(usdPrice, 'USD');
};

// Stored market prices are in HKD for HKD holdings, otherwise USD.
const marketPriceUSD = (holding: StockHolding, rates: ExportRates): number | undefined => {
  if (holding.marketPrice === undefined) return undefined;
  return holding.currency === 'HKD' ? holding.marketPrice / rates.usdToHkd : holding.marketPrice;
};

const COLUMNS = {
  code: { header: 'Code', weight: 1.4 },
  name: { header: 'Name', weight: 2 },
  type: { header: 'Type', weight: 0.9 },
  quantity: { header: 'Quantity', weight: 1.3 },
  marketPrice: { header: 'Market Price', weight: 1.7, hasCurrency: true },
  avgPrice: { header: 'Avg Price', weight: 1.7, hasCurrency: true },
  mvUSD: { header: 'MV (USD)', weight: 1.8 },
  mvMYR: { header: 'MV (MYR)', weight: 1.9 },
  pnlMYR: { header: 'P&L (MYR)', weight: 1.9 },
  pnlPct: { header: 'P&L %', weight: 1.1 },
  portion: { header: 'Portion %', weight: 1.4 },
} as const;

const blanks = (count: number): ExportCell[] => Array.from({ length: count }, () => text(''));

/**
 * Builds the Investment Holdings export from the rows the table currently shows
 * (already filtered and sorted), plus a per-account breakdown of the same rows.
 */
export const buildHoldingsExport = (
  groups: GroupedHolding[],
  rates: ExportRates,
  portfolioValueMYR: number,
  generatedAt: Date = new Date(),
): HoldingsExport => {
  const totalMVUSD = groups.reduce((acc, g) => acc + g.totalMVUSD, 0);
  const totalMVMYR = groups.reduce((acc, g) => acc + g.totalMVMYR, 0);
  const totalPnLMYR = groups.reduce((acc, g) => acc + g.totalPandL.myr, 0);
  const costBasisMYR = totalMVMYR - totalPnLMYR;
  const totalPnLPct = costBasisMYR > 0 ? (totalPnLMYR / costBasisMYR) * 100 : 0;
  const totalPortion = portfolioValueMYR > 0 ? (totalMVMYR / portfolioValueMYR) * 100 : 0;

  const totalCells = (leading: number): ExportCell[] => [
    text('Total'),
    ...blanks(leading - 1),
    money(totalMVUSD, 'USD'),
    money(totalMVMYR, 'MYR'),
    money(totalPnLMYR, 'MYR'),
    pct(totalPnLPct),
    pct(totalPortion),
  ];

  const holdingsSection: ExportSection = {
    title: 'Investment Holdings',
    columns: [
      COLUMNS.code,
      COLUMNS.name,
      COLUMNS.type,
      COLUMNS.quantity,
      COLUMNS.marketPrice,
      COLUMNS.avgPrice,
      COLUMNS.mvUSD,
      COLUMNS.mvMYR,
      COLUMNS.pnlMYR,
      COLUMNS.pnlPct,
      COLUMNS.portion,
      { header: 'Accounts', weight: 2 },
    ],
    rows: groups.map((g) => [
      text(g.code),
      text(g.name),
      text(g.stockType),
      num(g.totalQuantity),
      g.weightedAvgMarketPrice !== undefined
        ? displayPrice(g.weightedAvgMarketPrice, g.currency as Currency, rates)
        : text(''),
      g.weightedAvgAvgPrice !== undefined
        ? money(g.weightedAvgAvgPrice, g.currency as Currency)
        : text(''),
      money(g.totalMVUSD, 'USD'),
      money(g.totalMVMYR, 'MYR'),
      money(g.totalPandL.myr, 'MYR'),
      pct(g.totalPandL.percentage),
      pct(g.totalPortion),
      text(g.accounts.join(', ')),
    ]),
    emptyMessage: 'No holdings match the current filters',
    totalRow: groups.length > 0 ? [...totalCells(6), text('')] : undefined,
  };

  const byAccount = groups
    .flatMap((g) => g.holdings)
    .slice()
    .sort((a, b) => a.account.localeCompare(b.account) || a.code.localeCompare(b.code));

  const accountSection: ExportSection = {
    title: 'Holdings by Account',
    columns: [
      { header: 'Account', weight: 1.5 },
      COLUMNS.code,
      COLUMNS.name,
      COLUMNS.type,
      COLUMNS.quantity,
      COLUMNS.marketPrice,
      COLUMNS.avgPrice,
      COLUMNS.mvUSD,
      COLUMNS.mvMYR,
      COLUMNS.pnlMYR,
      COLUMNS.pnlPct,
      COLUMNS.portion,
    ],
    rows: byAccount.map((h) => {
      const mv = calculateHoldingMarketValue(h, rates.usdToMyr, rates.usdToHkd);
      const pnl = calculateHoldingPandL(h, rates.usdToMyr, rates.usdToHkd);
      const priceUSD = marketPriceUSD(h, rates);
      return [
        text(h.account),
        text(h.code.toUpperCase()),
        text(h.name),
        text(h.stockType),
        num(h.quantity),
        priceUSD !== undefined ? displayPrice(priceUSD, h.currency, rates) : text(''),
        money(h.avgPrice, h.currency),
        money(mv.usd, 'USD'),
        money(mv.myr, 'MYR'),
        money(pnl.myr, 'MYR'),
        pct(pnl.percentage),
        pct(portfolioValueMYR > 0 ? (mv.myr / portfolioValueMYR) * 100 : 0),
      ];
    }),
    emptyMessage: 'No holdings match the current filters',
    totalRow: byAccount.length > 0 ? totalCells(7) : undefined,
  };

  return {
    generatedAt,
    summary: [
      { label: 'Market Value', value: totalMVMYR, currency: 'MYR' },
      { label: 'Market Value', value: totalMVUSD, currency: 'USD' },
      { label: 'Unrealised P&L', value: totalPnLMYR, currency: 'MYR' },
    ],
    sections: [holdingsSection, accountSection],
  };
};
