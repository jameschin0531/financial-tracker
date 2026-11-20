import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { buildHoldingsExport } from '../../services/holdingsExport';
import { sectionsToCSV, type ExportRates } from '../../services/exportReport';
import { downloadCSV, fileStamp, renderSectionsPDF } from '../Export/exportUtils';
import type { GroupedHolding } from '../../utils/stockGrouping';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

type ExportFormat = 'csv' | 'pdf';

interface HoldingsExportButtonProps {
  /** Rows exactly as the table shows them: filtered and sorted. */
  groups: GroupedHolding[];
  rates: ExportRates;
  portfolioValueMYR: number;
  /** Human-readable description of active filters, empty when none. */
  filterNote: string;
}

const HoldingsExportButton: React.FC<HoldingsExportButtonProps> = ({
  groups,
  rates,
  portfolioValueMYR,
  filterNote,
}) => {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const runExport = (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);
    try {
      const report = buildHoldingsExport(groups, rates, portfolioValueMYR);
      const notes = [
        `Rates: 1 USD = ${rates.usdToMyr.toFixed(4)} MYR, 1 USD = ${rates.usdToHkd.toFixed(4)} HKD`,
        ...(filterNote ? [`Filters: ${filterNote}`] : []),
      ];
      const stamp = fileStamp(report.generatedAt);
      if (format === 'csv') {
        downloadCSV(
          sectionsToCSV('Investment Holdings', report.generatedAt, report.summary, report.sections, notes),
          `investment-holdings-${stamp}.csv`,
        );
      } else {
        renderSectionsPDF({
          title: 'Investment Holdings',
          subtitle: `Generated ${report.generatedAt.toLocaleString('en-US')}`,
          notes,
          summary: report.summary,
          sections: report.sections,
          filename: `investment-holdings-${stamp}.pdf`,
        });
      }
      showToast(`Exported holdings as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error(`Error exporting holdings ${format.toUpperCase()}:`, error);
      showToast(`Could not export holdings. Please try again.`, 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting !== null || groups.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => runExport('csv')}>Export holdings as CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => runExport('pdf')}>Export holdings as PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HoldingsExportButton;
