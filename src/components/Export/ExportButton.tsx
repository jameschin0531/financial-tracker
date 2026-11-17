import React, { useState } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { useToast } from '../../context/ToastContext';
import { hasExportableData } from '../../services/exportReport';
import { exportToCSV, exportToPDF } from './exportUtils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

type ExportFormat = 'csv' | 'pdf';

const ExportButton: React.FC = () => {
  const { data } = useFinancialData();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const runExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);
    try {
      await (format === 'csv' ? exportToCSV(data) : exportToPDF(data));
      showToast(`Exported ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error(`Error exporting ${format.toUpperCase()}:`, error);
      showToast(`Could not export ${format.toUpperCase()}. Please try again.`, 'error');
    } finally {
      setExporting(null);
    }
  };

  if (!hasExportableData(data)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Export data" disabled={exporting !== null}>
          <Download className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void runExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void runExport('pdf')}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
