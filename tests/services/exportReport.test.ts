import { describe, expect, test } from 'bun:test';
import type { FinancialData } from '../../src/types/financial';
import { buildExportReport, hasExportableData, reportToCSV } from '../../src/services/exportReport';

const emptyData: FinancialData = {
  assets: [],
  liabilities: [],
  income: [],
  expenses: [],
  assetCategories: [],
  liabilityCategories: [],
  expenseCategories: [],
  stockHoldings: [],
  cryptoHoldings: [],
  tradingAccounts: [],
  cryptoAccounts: [],
  deposits: [],
};

const rates = { usdToMyr: 4.5, usdToHkd: 7.8 };

const sampleData: FinancialData = {
  ...emptyData,
  assets: [
    { id: 'a1', name: 'Maybank', category: 'Cash', assetType: 'current', value: 1000, currency: 'MYR', date: '2026-01-01' },
    { id: 'a2', name: 'US "Savings", main', category: 'Cash', assetType: 'current', value: 200, currency: 'USD', exchangeRate: 4.4, date: '2026-01-02' },
  ],
  liabilities: [
    { id: 'l1', name: 'Card', category: 'Credit', amount: 100, currency: 'USD', exchangeRate: 4.0, date: '2026-01-03' },
  ],
  expenses: [
    { id: 'e1', category: 'Food', amount: 50, currency: 'MYR', date: '2026-01-04', description: '=HYPERLINK("x")' },
  ],
  stockHoldings: [
    { id: 's1', code: 'AAPL', quantity: 2, avgPrice: 100, marketPrice: 150, account: 'tiger', stockType: 'Stock', currency: 'USD' },
  ],
  cryptoHoldings: [
    { id: 'c1', symbol: 'BTC', quantity: 0.1, avgPrice: 50000, marketPrice: 60000, account: 'binance', currency: 'USD' },
  ],
};

describe('buildExportReport', () => {
  test('converts foreign-currency entries to MYR using their captured exchange rate', () => {
    const report = buildExportReport(sampleData, rates);
    const assets = report.sections.find((s) => s.title === 'Assets');
    // 1000 MYR + 200 USD * 4.4
    expect(assets?.totalMYR).toBeCloseTo(1880);
  });

  test('summary includes stock and crypto holdings at current rates', () => {
    const { summary } = buildExportReport(sampleData, rates);
    const stocks = 2 * 150 * 4.5;
    const crypto = 0.1 * 60000 * 4.5;
    expect(summary.totalAssets).toBeCloseTo(1880 + stocks + crypto);
    expect(summary.totalLiabilities).toBeCloseTo(400);
    expect(summary.netWorth).toBeCloseTo(1880 + stocks + crypto - 400);
  });

  test('keeps sections present with empty messages when there is no data', () => {
    const report = buildExportReport(emptyData, rates);
    expect(report.sections.map((s) => s.title)).toEqual([
      'Assets', 'Stock Holdings', 'Crypto Holdings', 'Liabilities', 'Income', 'Expenses',
    ]);
    expect(report.sections.every((s) => s.rows.length === 0)).toBe(true);
    expect(report.summary.netWorth).toBe(0);
  });
});

describe('reportToCSV', () => {
  const csv = reportToCSV(buildExportReport(sampleData, rates, new Date('2026-11-17T00:00:00Z')));
  const lines = csv.split('\r\n');

  test('outputs real amounts, never the masked placeholder', () => {
    expect(csv).not.toContain('****');
    expect(csv).toContain('"Net Worth (MYR)",');
  });

  test('escapes quotes and commas in text fields', () => {
    expect(csv).toContain('"US ""Savings"", main"');
  });

  test('neutralises spreadsheet formulas in text fields', () => {
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  test('adds a currency column after original-currency amounts', () => {
    const header = lines[lines.indexOf('"ASSETS"') + 1];
    expect(header).toBe('"Name","Category","Type","Amount","Amount Currency","Rate","Value (MYR)","Date"');
    const usdRow = lines.find((l) => l.startsWith('"US '));
    expect(usdRow).toBe('"US ""Savings"", main","Cash","current",200.00,"USD",4.4,880.00,"2026-01-02"');
  });
});

describe('hasExportableData', () => {
  test('is true when only holdings exist', () => {
    expect(hasExportableData(emptyData)).toBe(false);
    expect(hasExportableData({ ...emptyData, stockHoldings: sampleData.stockHoldings })).toBe(true);
  });
});
