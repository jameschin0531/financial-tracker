import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinancialDataProvider } from './context/FinancialDataContext';
import { AmountVisibilityProvider, useAmountVisibility } from './context/AmountVisibilityContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import AssetsPage from './pages/AssetsPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import CashFlowPage from './pages/CashFlowPage';
import StockTrackerPage from './pages/StockTrackerPage';
import CryptoTrackerPage from './pages/CryptoTrackerPage';
import AuthPage from './pages/AuthPage';
import './App.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { session, loading } = useAuth();
  const { hideAmounts } = useAmountVisibility();

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

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="appLoading">
        <div className="appLoadingPulse" aria-hidden="true"></div>
        <span>Syncing dashboard...</span>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!session) {
    return <AuthPage />;
  }

  // Show main app if logged in
  return (
    <FinancialDataProvider>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage} amountVisibility={hideAmounts ? 'hidden' : 'visible'}>
        {renderPage()}
      </Layout>
    </FinancialDataProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AmountVisibilityProvider>
          <AppContent />
        </AmountVisibilityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
