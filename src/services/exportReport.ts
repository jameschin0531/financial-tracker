import type { Currency, FinancialData } from '../types/financial';
import { calculateTotalLiabilities } from './calculations';
import { calculateHoldingMarketValue } from './stockCalculations';
import { calculateCryptoHoldingMarketValue } from './cryptoCalculations';

export type ExportCell =
  | { kind: 'text'; value: string }
  | { kind: 'money'; value: number; currency: Currency }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: string };

export interface ExportColumn {
  header: string;
  /** Relative width used by the PDF renderer. */
  weight: number;
  /** Money column in the entry's own currency; CSV adds a Currency column after it. */
  hasCurrency?: boolean;
}

export interface ExportSection {
  title: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
  emptyMessage: string;
  /** Section total in MYR, when the section has one. */
  totalMYR?: number;
  /** Full total row; when set, it replaces the MYR-only total and is also written to CSV. */
  totalRow?: ExportCell[];
}

export interface ExportReport {
  generatedAt: Date;
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  sections: ExportSection[];
}

export interface ExportRates {
  usdToMyr: number;
  usdToHkd: number;
}

const text = (value: string | undefined): ExportCell => ({ kind: 'text', value: value ?? '' });
const money = (value: number, currency: Currency): ExportCell => ({ kind: 'money', value, currency });
const num = (value: number): ExportCell => ({ kind: 'number', value });
const date = (value: string): ExportCell => ({ kind: 'date', value });

// Mirrors convertToMYR in calculations.ts so exported totals match the dashboard.
const toMYR = (value: number, currency: Currency, exchangeRate?: number): number =>
  currency !== 'MYR' && exchangeRate ? value * exchangeRate : value;

const rateCell = (currency: Currency, exchangeRate?: number): ExportCell =>
  currency !== 'MYR' && exchangeRate ? num(exchangeRate) : text('');

const sum = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);

// Stock prices are quoted in HKD for HKD holdings, otherwise in USD (see calculateHoldingMarketValue).
const stockPriceCurrency = (currency: Currency): Currency => (currency === 'HKD' ? 'HKD' : 'USD');

export const hasExportableData = (data: FinancialData): boolean =>
  data.assets.length > 0 ||
  data.liabilities.length > 0 ||
  data.income.length > 0 ||
  data.expenses.length > 0 ||
  data.stockHoldings.length > 0 ||
  data.cryptoHoldings.length > 0;

export const buildExportReport = (
  data: FinancialData,
  rates: ExportRates,
  generatedAt: Date = new Date(),
): ExportReport => {
  const assetValues = data.assets.map((a) => toMYR(a.value, a.currency, a.exchangeRate));
  const stockValues = data.stockHoldings.map(
    (h) => calculateHoldingMarketValue(h, rates.usdToMyr, rates.usdToHkd).myr,
  );
  const cryptoValues = data.cryptoHoldings.map(
    (h) => calculateCryptoHoldingMarketValue(h, rates.usdToMyr).myr,
  );
  const liabilityValues = data.liabilities.map((l) => toMYR(l.amount, l.currency, l.exchangeRate));
  const incomeValues = data.income.map((i) => toMYR(i.amount, i.currency, i.exchangeRate));
  const expenseValues = data.expenses.map((e) => toMYR(e.amount, e.currency, e.exchangeRate));

  const totalAssets = sum(assetValues) + sum(stockValues) + sum(cryptoValues);
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);

  const sections: ExportSection[] = [
    {
      title: 'Assets',
      columns: [
        { header: 'Name', weight: 3 },
        { header: 'Category', weight: 2 },
        { header: 'Type', weight: 1.2 },
        { header: 'Amount', weight: 2.2, hasCurrency: true },
        { header: 'Rate', weight: 1.2 },
        { header: 'Value (MYR)', weight: 2.2 },
        { header: 'Date', weight: 1.8 },
      ],
      rows: data.assets.map((a, i) => [
        text(a.name),
        text(a.category),
        text(a.assetType),
        money(a.value, a.currency),
        rateCell(a.currency, a.exchangeRate),
        money(assetValues[i] ?? 0, 'MYR'),
        date(a.date),
      ]),
      emptyMessage: 'No assets recorded',
      totalMYR: sum(assetValues),
    },
    {
      title: 'Stock Holdings',
      columns: [
        { header: 'Code', weight: 1.5 },
        { header: 'Account', weight: 1.8 },
        { header: 'Type', weight: 1.2 },
        { header: 'Quantity', weight: 1.5 },
        { header: 'Avg Price', weight: 2, hasCurrency: true },
        { header: 'Market Price', weight: 2, hasCurrency: true },
        { header: 'Value (MYR)', weight: 2.2 },
      ],
      rows: data.stockHoldings.map((h, i) => [
        text(h.code),
        text(h.account),
        text(h.stockType),
        num(h.quantity),
        money(h.avgPrice, stockPriceCurrency(h.currency)),
        h.marketPrice !== undefined ? money(h.marketPrice, stockPriceCurrency(h.currency)) : text(''),
        money(stockValues[i] ?? 0, 'MYR'),
      ]),
      emptyMessage: 'No stock holdings recorded',
      totalMYR: sum(stockValues),
    },
    {
      title: 'Crypto Holdings',
      columns: [
        { header: 'Symbol', weight: 1.5 },
        { header: 'Account', weight: 2 },
        { header: 'Quantity', weight: 1.8 },
        { header: 'Avg Price', weight: 2, hasCurrency: true },
        { header: 'Market Price', weight: 2, hasCurrency: true },
        { header: 'Value (MYR)', weight: 2.2 },
      ],
      rows: data.cryptoHoldings.map((h, i) => [
        text(h.symbol),
        text(h.account),
        num(h.quantity),
        money(h.avgPrice, 'USD'),
        h.marketPrice !== undefined ? money(h.marketPrice, 'USD') : text(''),
        money(cryptoValues[i] ?? 0, 'MYR'),
      ]),
      emptyMessage: 'No crypto holdings recorded',
      totalMYR: sum(cryptoValues),
    },
    {
      title: 'Liabilities',
      columns: [
        { header: 'Name', weight: 3 },
        { header: 'Category', weight: 2 },
        { header: 'Amount', weight: 2.2, hasCurrency: true },
        { header: 'Rate', weight: 1.2 },
        { header: 'Value (MYR)', weight: 2.2 },
        { header: 'Interest %', weight: 1.3 },
        { header: 'Date', weight: 1.8 },
      ],
      rows: data.liabilities.map((l, i) => [
        text(l.name),
        text(l.category),
        money(l.amount, l.currency),
        rateCell(l.currency, l.exchangeRate),
        money(liabilityValues[i] ?? 0, 'MYR'),
        l.interestRate !== undefined ? num(l.interestRate) : text(''),
        date(l.date),
      ]),
      emptyMessage: 'No liabilities recorded',
      totalMYR: totalLiabilities,
    },
    {
      title: 'Income',
      columns: [
        { header: 'Source', weight: 3 },
        { header: 'Frequency', weight: 1.6 },
        { header: 'Amount', weight: 2.2, hasCurrency: true },
        { header: 'Rate', weight: 1.2 },
        { header: 'Value (MYR)', weight: 2.2 },
        { header: 'Date', weight: 1.8 },
      ],
      rows: data.income.map((inc, i) => [
        text(inc.source),
        text(inc.frequency),
        money(inc.amount, inc.currency),
        rateCell(inc.currency, inc.exchangeRate),
        money(incomeValues[i] ?? 0, 'MYR'),
        date(inc.date),
      ]),
      emptyMessage: 'No income recorded',
    },
    {
      title: 'Expenses',
      columns: [
        { header: 'Category', weight: 2 },
        { header: 'Description', weight: 3 },
        { header: 'Amount', weight: 2.2, hasCurrency: true },
        { header: 'Rate', weight: 1.2 },
        { header: 'Value (MYR)', weight: 2.2 },
        { header: 'Date', weight: 1.8 },
      ],
      rows: data.expenses.map((e, i) => [
        text(e.category),
        text(e.description),
        money(e.amount, e.currency),
        rateCell(e.currency, e.exchangeRate),
        money(expenseValues[i] ?? 0, 'MYR'),
        date(e.date),
      ]),
      emptyMessage: 'No expenses recorded',
      totalMYR: sum(expenseValues),
    },
  ];

  return {
    generatedAt,
    summary: {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    },
    sections,
  };
};

// Prefix cells that spreadsheet apps would otherwise run as formulas.
const neutraliseFormula = (value: string): string => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

const csvQuote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const csvCell = (cell: ExportCell): string => {
  switch (cell.kind) {
    case 'text':
      return csvQuote(neutraliseFormula(cell.value));
    case 'date':
      return csvQuote(cell.value);
    case 'money':
      return cell.value.toFixed(2);
    case 'number':
      return String(cell.value);
  }
};

export interface SummaryLine {
  label: string;
  value: number;
  currency: Currency;
}

/** Builds CSV text for any set of sections. Money cells are raw numbers; headers carry the currency. */
export const sectionsToCSV = (
  title: string,
  generatedAt: Date,
  summary: SummaryLine[],
  sections: ExportSection[],
  notes: string[] = [],
): string => {
  const lines: string[] = [];
  lines.push(csvQuote(title));
  lines.push(`${csvQuote('Generated')},${csvQuote(generatedAt.toISOString())}`);
  notes.forEach((note) => lines.push(csvQuote(neutraliseFormula(note))));
  summary.forEach((line) => {
    lines.push(`${csvQuote(`${line.label} (${line.currency})`)},${line.value.toFixed(2)}`);
  });

  sections.forEach((section) => {
    lines.push('');
    lines.push(csvQuote(section.title.toUpperCase()));
    const headers = section.columns.flatMap((col) =>
      col.hasCurrency ? [col.header, `${col.header} Currency`] : [col.header],
    );
    lines.push(headers.map(csvQuote).join(','));
    section.rows.forEach((row) => {
      const cells = row.flatMap((cell, i) => {
        if (!section.columns[i]?.hasCurrency) return [csvCell(cell)];
        return [csvCell(cell), csvQuote(cell.kind === 'money' ? cell.currency : '')];
      });
      lines.push(cells.join(','));
    });
    if (section.totalRow) {
      const cells = section.totalRow.flatMap((cell, i) => {
        if (!section.columns[i]?.hasCurrency) return [csvCell(cell)];
        return [csvCell(cell), csvQuote(cell.kind === 'money' ? cell.currency : '')];
      });
      lines.push(cells.join(','));
    }
  });

  return lines.join('\r\n');
};

export const reportSummaryLines = (report: ExportReport): SummaryLine[] => [
  { label: 'Total Assets', value: report.summary.totalAssets, currency: 'MYR' },
  { label: 'Total Liabilities', value: report.summary.totalLiabilities, currency: 'MYR' },
  { label: 'Net Worth', value: report.summary.netWorth, currency: 'MYR' },
];

/** Builds CSV text. Money cells are raw numbers; the column header carries the currency. */
export const reportToCSV = (report: ExportReport): string =>
  sectionsToCSV('Financial Report', report.generatedAt, reportSummaryLines(report), report.sections);
