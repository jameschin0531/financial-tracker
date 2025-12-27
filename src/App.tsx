import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { FinancialDataProvider } from './context/FinancialDataContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import AssetsPage from './pages/AssetsPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import CashFlowPage from './pages/CashFlowPage';
import StockTrackerPage from './pages/StockTrackerPage';
import CryptoTrackerPage from './pages/CryptoTrackerPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'assets':
        return <AssetsPage />;
      case 'liabilities':
        return <LiabilitiesPage />;
      case 'cashflow':
        return <CashFlowPage />;
      case 'stocks':
        return <StockTrackerPage />;
      case 'crypto':
        return <CryptoTrackerPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <FinancialDataProvider>
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          {renderPage()}
        </Layout>
      </FinancialDataProvider>
    </ThemeProvider>
  );
}

export default App;
