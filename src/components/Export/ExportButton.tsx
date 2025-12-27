import React, { useState, useRef, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { exportToCSV, exportToPDF } from './exportUtils';
import styles from './ExportButton.module.css';

const ExportButton: React.FC = () => {
  const { data } = useFinancialData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportCSV = () => {
    exportToCSV(data);
    setIsOpen(false);
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(data);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
    setIsOpen(false);
  };

  const hasData = data.assets.length > 0 || data.liabilities.length > 0 || 
                   data.income.length > 0 || data.expenses.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className={styles.exportContainer} ref={dropdownRef}>
      <button
        className={styles.exportButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Export data"
        aria-expanded={isOpen}
      >
        Export
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.dropdownItem}
            onClick={handleExportCSV}
          >
            Export as CSV
          </button>
          <button
            className={styles.dropdownItem}
            onClick={handleExportPDF}
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

