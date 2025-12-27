import { FinancialData } from '../../types/financial';
import { formatCurrency, formatDate } from '../../utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToCSV = (data: FinancialData): void => {
  const csvRows: string[] = [];

  // Assets
  csvRows.push('ASSETS');
  csvRows.push('Name,Category,Value,Date');
  data.assets.forEach(asset => {
    csvRows.push(`"${asset.name}","${asset.category}",${asset.value},"${asset.date}"`);
  });
  csvRows.push('');

  // Liabilities
  csvRows.push('LIABILITIES');
  csvRows.push('Name,Category,Amount,Interest Rate,Date');
  data.liabilities.forEach(liability => {
    csvRows.push(`"${liability.name}","${liability.category}",${liability.amount},${liability.interestRate || ''},"${liability.date}"`);
  });
  csvRows.push('');

  // Income
  csvRows.push('INCOME');
  csvRows.push('Source,Amount,Frequency,Date');
  data.income.forEach(income => {
    csvRows.push(`"${income.source}",${income.amount},"${income.frequency}","${income.date}"`);
  });
  csvRows.push('');

  // Expenses
  csvRows.push('EXPENSES');
  csvRows.push('Category,Amount,Date,Description');
  data.expenses.forEach(expense => {
    csvRows.push(`"${expense.category}",${expense.amount},"${expense.date}","${expense.description || ''}"`);
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `financial-data-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (data: FinancialData): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(74, 158, 255);
  pdf.text('Financial Report', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 15;

  // Summary Section
  pdf.setFontSize(14);
  pdf.text('Summary', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  pdf.text(`Total Assets: ${formatCurrency(totalAssets)}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Total Liabilities: ${formatCurrency(totalLiabilities)}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Net Worth: ${formatCurrency(netWorth)}`, margin, yPosition);
  yPosition += 10;

  // Assets Section
  checkNewPage(20);
  pdf.setFontSize(14);
  pdf.text('Assets', margin, yPosition);
  yPosition += 8;

  if (data.assets.length > 0) {
    pdf.setFontSize(9);
    pdf.text('Name', margin, yPosition);
    pdf.text('Category', margin + 50, yPosition);
    pdf.text('Value', margin + 100, yPosition);
    pdf.text('Date', margin + 140, yPosition);
    yPosition += 5;

    data.assets.forEach(asset => {
      checkNewPage(8);
      pdf.text(asset.name.substring(0, 20), margin, yPosition);
      pdf.text(asset.category.substring(0, 15), margin + 50, yPosition);
      pdf.text(formatCurrency(asset.value), margin + 100, yPosition);
      pdf.text(formatDate(asset.date), margin + 140, yPosition);
      yPosition += 6;
    });
  } else {
    pdf.text('No assets recorded', margin, yPosition);
    yPosition += 6;
  }
  yPosition += 5;

  // Liabilities Section
  checkNewPage(20);
  pdf.setFontSize(14);
  pdf.text('Liabilities', margin, yPosition);
  yPosition += 8;

  if (data.liabilities.length > 0) {
    pdf.setFontSize(9);
    pdf.text('Name', margin, yPosition);
    pdf.text('Category', margin + 50, yPosition);
    pdf.text('Amount', margin + 100, yPosition);
    pdf.text('Date', margin + 140, yPosition);
    yPosition += 5;

    data.liabilities.forEach(liability => {
      checkNewPage(8);
      pdf.text(liability.name.substring(0, 20), margin, yPosition);
      pdf.text(liability.category.substring(0, 15), margin + 50, yPosition);
      pdf.text(formatCurrency(liability.amount), margin + 100, yPosition);
      pdf.text(formatDate(liability.date), margin + 140, yPosition);
      yPosition += 6;
    });
  } else {
    pdf.text('No liabilities recorded', margin, yPosition);
    yPosition += 6;
  }
  yPosition += 5;

  // Income Section
  checkNewPage(20);
  pdf.setFontSize(14);
  pdf.text('Income', margin, yPosition);
  yPosition += 8;

  if (data.income.length > 0) {
    pdf.setFontSize(9);
    pdf.text('Source', margin, yPosition);
    pdf.text('Amount', margin + 60, yPosition);
    pdf.text('Frequency', margin + 100, yPosition);
    pdf.text('Date', margin + 140, yPosition);
    yPosition += 5;

    data.income.forEach(income => {
      checkNewPage(8);
      pdf.text(income.source.substring(0, 20), margin, yPosition);
      pdf.text(formatCurrency(income.amount), margin + 60, yPosition);
      pdf.text(income.frequency, margin + 100, yPosition);
      pdf.text(formatDate(income.date), margin + 140, yPosition);
      yPosition += 6;
    });
  } else {
    pdf.text('No income recorded', margin, yPosition);
    yPosition += 6;
  }
  yPosition += 5;

  // Expenses Section
  checkNewPage(20);
  pdf.setFontSize(14);
  pdf.text('Expenses', margin, yPosition);
  yPosition += 8;

  if (data.expenses.length > 0) {
    pdf.setFontSize(9);
    pdf.text('Category', margin, yPosition);
    pdf.text('Amount', margin + 60, yPosition);
    pdf.text('Date', margin + 100, yPosition);
    pdf.text('Description', margin + 140, yPosition);
    yPosition += 5;

    data.expenses.forEach(expense => {
      checkNewPage(8);
      pdf.text(expense.category.substring(0, 15), margin, yPosition);
      pdf.text(formatCurrency(expense.amount), margin + 60, yPosition);
      pdf.text(formatDate(expense.date), margin + 100, yPosition);
      pdf.text((expense.description || '').substring(0, 15), margin + 140, yPosition);
      yPosition += 6;
    });
  } else {
    pdf.text('No expenses recorded', margin, yPosition);
    yPosition += 6;
  }

  // Try to capture charts if they exist
  try {
    const chartElements = document.querySelectorAll('[data-chart="true"]');
    if (chartElements.length > 0) {
      pdf.addPage();
      yPosition = margin;
      pdf.setFontSize(14);
      pdf.text('Charts', margin, yPosition);
      yPosition += 10;

      for (let i = 0; i < chartElements.length; i++) {
        const element = chartElements[i] as HTMLElement;
        checkNewPage(80);
        
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }
    }
  } catch (error) {
    console.error('Error capturing charts:', error);
  }

  pdf.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

