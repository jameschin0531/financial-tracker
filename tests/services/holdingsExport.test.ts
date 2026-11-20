import { describe, expect, test } from 'bun:test';
import type { StockHolding } from '../../src/types/financial';
import type { GroupedHolding } from '../../src/utils/stockGrouping';
import { buildHoldingsExport } from '../../src/services/holdingsExport';
import { sectionsToCSV } from '../../src/services/exportReport';

const rates = { usdToMyr: 4.5, usdToHkd: 7.8 };

const tslaWebull: StockHolding = {
  id: 'h1', code: 'TSLA', quantity: 2, avgPrice: 100, marketPrice: 200, account: 'Webull', stockType: 'Stock', currency: 'USD',
};
const tslaEtoro: StockHolding = {
  id: 'h2', code: 'TSLA', quantity: 1, avgPrice: 250, marketPrice: 200, account: 'Etoro', stockType: 'Stock', currency: 'USD',
};
const tencent: StockHolding = {
  id: 'h3', code: '0700.HK', quantity: 10, avgPrice: 400, marketPrice: 390, account: 'Etoro', stockType: 'Stock', currency: 'HKD',
};

const groups: GroupedHolding[] = [
  {
    code: 'TSLA',
    holdings: [tslaWebull, tslaEtoro],
    totalQuantity: 3,
    totalMVUSD: 600,
    totalMVMYR: 2700,
    totalPandL: { usd: 150, myr: 675, percentage: 33.333 },
    totalPortion: 60,
    accounts: ['Webull', 'Etoro'],
    stockType: 'Stock',
    weightedAvgMarketPrice: 200,
    weightedAvgAvgPrice: 150,
    currency: 'USD',
  },
  {
    code: '0700.HK',
    holdings: [tencent],
    totalQuantity: 10,
    totalMVUSD: 500,
    totalMVMYR: 2250,
    totalPandL: { usd: -12.82, myr: -57.69, percentage: -2.5 },
    totalPortion: 50,
    accounts: ['Etoro'],
    stockType: 'Stock',
    weightedAvgMarketPrice: 50,
    weightedAvgAvgPrice: 400,
    currency: 'HKD',
  },
];

describe('buildHoldingsExport', () => {
  const report = buildHoldingsExport(groups, rates, 4500, new Date('2026-11-20T00:00:00Z'));
  const [holdings, byAccount] = report.sections;

  test('keeps the table order and one row per code', () => {
    expect(holdings?.rows.map((r) => r[0])).toEqual([
      { kind: 'text', value: 'TSLA' },
      { kind: 'text', value: '0700.HK' },
    ]);
  });

  test('shows market price in the holding currency, like the table', () => {
    // 50 USD weighted price for an HKD holding -> 390 HKD
    expect(holdings?.rows[1]?.[4]).toEqual({ kind: 'money', value: 390, currency: 'HKD' });
    expect(holdings?.rows[0]?.[4]).toEqual({ kind: 'money', value: 200, currency: 'USD' });
  });

  test('summarises the exported rows', () => {
    expect(report.summary[0]).toEqual({ label: 'Market Value', value: 4950, currency: 'MYR' });
    expect(report.summary[1]?.value).toBe(1100);
    expect(report.summary[2]?.value).toBeCloseTo(617.31);
  });

  test('breaks holdings down by account', () => {
    expect(byAccount?.rows.map((r) => [r[0], r[1]])).toEqual([
      [{ kind: 'text', value: 'Etoro' }, { kind: 'text', value: '0700.HK' }],
      [{ kind: 'text', value: 'Etoro' }, { kind: 'text', value: 'TSLA' }],
      [{ kind: 'text', value: 'Webull' }, { kind: 'text', value: 'TSLA' }],
    ]);
    // Webull TSLA: 2 * 200 USD = 400 USD = 1800 MYR, 40% of 4500
    const webull = byAccount?.rows[2];
    expect(webull?.[8]).toEqual({ kind: 'money', value: 1800, currency: 'MYR' });
    expect(webull?.[11]).toEqual({ kind: 'number', value: 40 });
  });

  test('has no total rows when nothing matches the filters', () => {
    const empty = buildHoldingsExport([], rates, 4500);
    expect(empty.sections.every((s) => s.rows.length === 0 && s.totalRow === undefined)).toBe(true);
  });
});

describe('holdings CSV', () => {
  const report = buildHoldingsExport(groups, rates, 4500, new Date('2026-11-20T00:00:00Z'));
  const csv = sectionsToCSV('Investment Holdings', report.generatedAt, report.summary, report.sections, ['Filters: account Etoro']);
  const lines = csv.split('\r\n');

  test('writes header, notes and summary', () => {
    expect(lines.slice(0, 6)).toEqual([
      '"Investment Holdings"',
      '"Generated","2026-11-20T00:00:00.000Z"',
      '"Filters: account Etoro"',
      '"Market Value (MYR)",4950.00',
      '"Market Value (USD)",1100.00',
      '"Unrealised P&L (MYR)",617.31',
    ]);
  });

  test('writes holding rows with currency columns and a total row', () => {
    const header = lines[lines.indexOf('"INVESTMENT HOLDINGS"') + 1];
    expect(header).toBe(
      '"Code","Name","Type","Quantity","Market Price","Market Price Currency","Avg Price","Avg Price Currency","MV (USD)","MV (MYR)","P&L (MYR)","P&L %","Portion %","Accounts"',
    );
    expect(lines).toContain('"TSLA","","Stock",3,200.00,"USD",150.00,"USD",600.00,2700.00,675.00,33.33,60,"Webull, Etoro"');
    expect(lines).toContain('"Total","","","","","","","",1100.00,4950.00,617.31,14.25,110,""');
  });
});
