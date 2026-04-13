import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinancialDataProvider } from './context/FinancialDataContext';
import { AmountVisibilityProvider, useAmountVisibility } from './context/AmountVisibilityContext';
import { ToastProvider } from './context/ToastContext';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import AssetsPage from './pages/AssetsPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import CashFlowPage from './pages/CashFlowPage';
import StockTrackerPage from './pages/StockTrackerPage';
import CryptoTrackerPage from './pages/CryptoTrackerPage';
import AuthPage from './pages/AuthPage';

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="border-b border-border h-14 px-4 flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

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
      <TooltipProvider>
        <ToastProvider>
          <AuthProvider>
            <AmountVisibilityProvider>
              <AppContent />
            </AmountVisibilityProvider>
          </AuthProvider>
        </ToastProvider>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
