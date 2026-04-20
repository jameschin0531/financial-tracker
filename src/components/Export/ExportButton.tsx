import React from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { exportToCSV, exportToPDF } from './exportUtils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

const ExportButton: React.FC = () => {
  const { data } = useFinancialData();

  const handleExportCSV = () => {
    exportToCSV(data);
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(data);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const hasData = data.assets.length > 0 || data.liabilities.length > 0 ||
                   data.income.length > 0 || data.expenses.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Export data">
          <Download className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
