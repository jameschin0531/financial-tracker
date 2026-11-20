import jsPDF from 'jspdf';
import type { FinancialData } from '../../types/financial';
import { formatCurrencyUnmasked, formatDate } from '../../utils/formatters';
import { getUSDToHKDRate, getUSDToMYRRate } from '../../services/exchangeRateService';
import {
  buildExportReport,
  reportSummaryLines,
  reportToCSV,
  type ExportCell,
  type ExportReport,
  type ExportSection,
  type SummaryLine,
} from '../../services/exportReport';

export const fileStamp = (date: Date): string => date.toISOString().slice(0, 10);

const loadReport = async (data: FinancialData): Promise<ExportReport> => {
  const [usdToMyr, usdToHkd] = await Promise.all([getUSDToMYRRate(), getUSDToHKDRate()]);
  return buildExportReport(data, { usdToMyr, usdToHkd });
};

export const downloadCSV = (csv: string, filename: string): void => {
  // BOM so Excel opens the file as UTF-8.
  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }), filename);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after the click has been handled so the download is not cancelled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const exportToCSV = async (data: FinancialData): Promise<void> => {
  const report = await loadReport(data);
  downloadCSV(reportToCSV(report), `financial-data-${fileStamp(report.generatedAt)}.csv`);
};

const formatCell = (cell: ExportCell): string => {
  switch (cell.kind) {
    case 'text':
      return cell.value;
    case 'money':
      return formatCurrencyUnmasked(cell.value, cell.currency);
    case 'number':
      return cell.value.toLocaleString('en-US', { maximumFractionDigits: 8 });
    case 'date':
      return cell.value ? formatDate(cell.value) : '';
  }
};

const isNumeric = (cell: ExportCell | undefined): boolean =>
  cell?.kind === 'money' || cell?.kind === 'number';

export interface PDFDocumentSpec {
  title: string;
  subtitle: string;
  notes?: string[];
  summary: SummaryLine[];
  sections: ExportSection[];
  filename: string;
}

export const exportToPDF = async (data: FinancialData): Promise<void> => {
  const report = await loadReport(data);
  renderSectionsPDF({
    title: 'Financial Report',
    subtitle: `Generated ${report.generatedAt.toLocaleString('en-US')} - all totals in MYR`,
    summary: reportSummaryLines(report),
    sections: report.sections,
    filename: `financial-report-${fileStamp(report.generatedAt)}.pdf`,
  });
};

export const renderSectionsPDF = (spec: PDFDocumentSpec): void => {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const cellPadding = 1.5;
  const rowHeight = 6;
  let y = margin;

  const ensureSpace = (height: number): boolean => {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const fit = (value: string, width: number): string => {
    const max = width - 2 * cellPadding;
    if (pdf.getTextWidth(value) <= max) return value;
    let truncated = value;
    while (truncated.length > 0 && pdf.getTextWidth(`${truncated}...`) > max) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
  };

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(74, 158, 255);
  pdf.text(spec.title, margin, y + 4);
  y += 11;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);
  pdf.text(spec.subtitle, margin, y);
  y += 6;
  (spec.notes ?? []).forEach((note) => {
    pdf.text(fit(note, contentWidth), margin, y);
    y += 5;
  });
  y += 4;

  // Summary
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Summary', margin, y);
  y += 7;
  pdf.setFontSize(10);
  spec.summary.forEach(({ label, value, currency }) => {
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrencyUnmasked(value, currency), margin + 95, y, { align: 'right' });
    y += 6;
  });
  y += 6;

  spec.sections.forEach((section) => {
    const totalWeight = section.columns.reduce((acc, c) => acc + c.weight, 0);
    const layout = section.columns.map((col, i) => ({
      header: col.header,
      width: (col.weight / totalWeight) * contentWidth,
      numeric: section.rows.some((row) => isNumeric(row[i])),
    }));

    const drawCells = (values: string[]) => {
      let x = margin;
      layout.forEach((col, i) => {
        const value = fit(values[i] ?? '', col.width);
        if (col.numeric) {
          pdf.text(value, x + col.width - cellPadding, y, { align: 'right' });
        } else {
          pdf.text(value, x + cellPadding, y);
        }
        x += col.width;
      });
      y += rowHeight;
    };

    const drawHeader = () => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setFillColor(235, 240, 248);
      pdf.rect(margin, y - 4.2, contentWidth, rowHeight, 'F');
      drawCells(layout.map((col) => col.header));
      pdf.setFont('helvetica', 'normal');
    };

    // Keep the section title with its header and first row.
    ensureSpace(8 + rowHeight * 2);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(section.title, margin, y);
    y += 7;

    if (section.rows.length === 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(section.emptyMessage, margin, y);
      pdf.setTextColor(0, 0, 0);
      y += 10;
      return;
    }

    drawHeader();
    section.rows.forEach((row) => {
      if (ensureSpace(rowHeight)) drawHeader();
      drawCells(row.map(formatCell));
    });

    if (section.totalRow || section.totalMYR !== undefined) {
      ensureSpace(rowHeight);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y - 4.5, margin + contentWidth, y - 4.5);
      pdf.setFont('helvetica', 'bold');
      if (section.totalRow) {
        drawCells(section.totalRow.map(formatCell));
      } else if (section.totalMYR !== undefined) {
        const total = formatCurrencyUnmasked(section.totalMYR, 'MYR');
        drawCells(layout.map((col, i) => (i === 0 ? 'Total' : col.header === 'Value (MYR)' ? total : '')));
      }
      pdf.setFont('helvetica', 'normal');
    }
    y += 6;
  });

  pdf.save(spec.filename);
};
