import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import {
  calculateTotalAssets,
  calculateCashPosition,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateMonthlyIncome,
} from '../../services/calculations';
import { calculateTotalPortfolioValue, excludeCashHoldings } from '../../services/stockCalculations';
import { calculateTotalCryptoPortfolioValue } from '../../services/cryptoCalculations';
import { formatCurrency } from '../../utils/formatters';
import MetricsCard from './MetricsCard';
import NetWorthChart from './NetWorthChart';
import AssetAllocationChart from './AssetAllocationChart';
import CurrentAssetAllocationChart from './CurrentAssetAllocationChart';
import { DASHBOARD_SECTION_ORDER, type DashboardSectionKey } from './dashboardSections';
import styles from './Dashboard.module.css';

// Inline SVG icon components for metric cards
const IconCurrentAssets = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" fill="currentColor" /></svg>
);
const IconCash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 4v1.1a3 3 0 012.4 2.2.8.8 0 11-1.55.37c-.2-.86-.9-1.37-1.85-1.37-.98 0-1.73.52-1.73 1.22 0 .65.38.97 1.9 1.36 1.8.47 3.46 1.03 3.46 3.14 0 1.59-1.1 2.74-2.63 3.06V18a.8.8 0 11-1.6 0v-1.04a3.33 3.33 0 01-2.96-2.74.8.8 0 111.58-.3c.22 1.12 1.14 1.73 2.34 1.73 1.03 0 1.9-.54 1.9-1.37 0-.8-.62-1.15-2.26-1.58-1.64-.43-3.1-1.01-3.1-2.95 0-1.48 1.07-2.57 2.55-2.9V7a.8.8 0 111.6 0z" fill="currentColor" /></svg>
);
const IconStock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.8a.8.8 0 011.6 0v12.3h13.1a.8.8 0 010 1.6H4V4.8zm13.52 2.18a.8.8 0 011.13 1.13l-3.3 3.3 1.68 1.67a.8.8 0 010 1.13l-2.58 2.59a.8.8 0 01-1.13 0l-1.84-1.84-2.03 2.03a.8.8 0 01-1.13-1.13l2.59-2.59a.8.8 0 011.13 0l1.84 1.85 1.45-1.45-1.68-1.68a.8.8 0 010-1.13l3.87-3.88z" fill="currentColor" /></svg>
);
const IconCrypto = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.03 2.8a.8.8 0 01.8.8v1.02a4.54 4.54 0 013.83 3.5.8.8 0 11-1.56.36 2.96 2.96 0 00-2.96-2.3 2.56 2.56 0 00-2.74 2.25c0 1.34 1.1 1.88 3.03 2.34 2.33.56 4.27 1.37 4.27 4.08a4.1 4.1 0 01-3.87 3.98v1.02a.8.8 0 11-1.6 0v-1.05a4.55 4.55 0 01-4.14-3.75.8.8 0 111.58-.31 3.1 3.1 0 003.2 2.45 2.76 2.76 0 002.99-2.46c0-1.45-1.3-2.01-3.34-2.5-2.26-.55-3.95-1.46-3.95-3.93A4.13 4.13 0 0111.23 4.6V3.6a.8.8 0 01.8-.8z" fill="currentColor" /></svg>
);
const IconIncome = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l7 7h-4v6h-6V9H5l7-7zm-8 16h16v2H4v-2z" fill="currentColor" /></svg>
);
const IconExpense = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22l-7-7h4V9h6v6h4l-7 7zM4 2h16v2H4V2z" fill="currentColor" /></svg>
);
const IconCashFlow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5h16a.8.8 0 010 1.6H3.2V4a.8.8 0 011.6 0v14.5zm3.2-2.8l4.1-4.1 2.8 2.8 4.7-5a.8.8 0 111.16 1.1l-5.26 5.6a.8.8 0 01-1.16.02l-2.82-2.82-3.53 3.53a.8.8 0 11-1.13-1.13z" fill="currentColor" /></svg>
);
const IconNetWorth = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconLiabilities = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zm2 2v5h14v-5H5zm9 1.5a1 1 0 100 2h3a1 1 0 100-2h-3z" fill="currentColor" /></svg>
);

const Dashboard: React.FC = () => {
  const { data } = useFinancialData();
  const [totalAssets, setTotalAssets] = useState(0);
  const [stockPortfolioValue, setStockPortfolioValue] = useState(0);
  const [cryptoPortfolioValue, setCryptoPortfolioValue] = useState(0);
  const [netWorth, setNetWorth] = useState(0);

  useEffect(() => {
    const calculateValues = async () => {
      const assets = await calculateTotalAssets(data.assets, data.stockHoldings, data.cryptoHoldings);
      const stockValue = await calculateTotalPortfolioValue(excludeCashHoldings(data.stockHoldings));
      const cryptoValue = await calculateTotalCryptoPortfolioValue(data.cryptoHoldings);
      const netWorthValue = await calculateNetWorth(data.assets, data.liabilities, data.stockHoldings, data.cryptoHoldings);
      
      setTotalAssets(assets);
      setStockPortfolioValue(stockValue.myr);
      setCryptoPortfolioValue(cryptoValue.myr);
      setNetWorth(netWorthValue);
    };
    
    calculateValues();
  }, [data.assets, data.liabilities, data.stockHoldings, data.cryptoHoldings]);

  const cashPosition = calculateCashPosition(data.assets, data.stockHoldings);
  const totalCurrentAssets = cashPosition + stockPortfolioValue + cryptoPortfolioValue;
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);
  const monthlyIncome = calculateMonthlyIncome(data.income);
  const monthlyExpenses = data.expenses.reduce((sum, expense) => {
    let amount = expense.amount;
    if (expense.currency === 'USD' && expense.exchangeRate) {
      amount = amount * expense.exchangeRate;
    } else if (expense.currency === 'HKD' && expense.exchangeRate) {
      amount = amount * expense.exchangeRate;
    }
    return sum + amount;
  }, 0);
  const cashFlow = monthlyIncome - monthlyExpenses;

  const sections: Record<DashboardSectionKey, React.ReactNode> = {
    assets: (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Assets</h2>
        <div className={styles.sectionGrid}>
          <MetricsCard
            title="Current Assets"
            value={formatCurrency(totalCurrentAssets)}
            subtitle={''}
            trend="positive"
            icon={<IconCurrentAssets />}
          />
          <MetricsCard
            title="Cash Position"
            value={formatCurrency(cashPosition)}
            subtitle={data.stockHoldings.some((holding) => holding.stockType === 'Cash') ? 'Includes broker cash' : ''}
            trend={cashPosition > 0 ? 'positive' : 'neutral'}
            icon={<IconCash />}
          />
          <MetricsCard
            title="Stock"
            value={formatCurrency(stockPortfolioValue)}
            subtitle={data.stockHoldings.length > 0 ? `${data.stockHoldings.length} holding${data.stockHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={stockPortfolioValue > 0 ? 'positive' : 'neutral'}
            icon={<IconStock />}
          />
          <MetricsCard
            title="Crypto"
            value={formatCurrency(cryptoPortfolioValue)}
            subtitle={data.cryptoHoldings.length > 0 ? `${data.cryptoHoldings.length} holding${data.cryptoHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={cryptoPortfolioValue > 0 ? 'positive' : 'neutral'}
            icon={<IconCrypto />}
          />
        </div>
      </div>
    ),
    cashFlow: (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Cash Flow</h2>
        <div className={styles.sectionGrid}>
          <MetricsCard
            title="Monthly Income"
            value={formatCurrency(monthlyIncome)}
            subtitle={`${data.income.length} source${data.income.length !== 1 ? 's' : ''}`}
            trend="positive"
            icon={<IconIncome />}
          />
          <MetricsCard
            title="Monthly Expenses"
            value={formatCurrency(monthlyExpenses)}
            subtitle={`${data.expenses.length} expense${data.expenses.length !== 1 ? 's' : ''}`}
            trend="negative"
            icon={<IconExpense />}
          />
          <MetricsCard
            title="Cash Flow"
            value={formatCurrency(cashFlow)}
            subtitle={cashFlow >= 0 ? 'Surplus' : 'Deficit'}
            trend={cashFlow >= 0 ? 'positive' : 'negative'}
            icon={<IconCashFlow />}
          />
        </div>
      </div>
    ),
    financialSummary: (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Financial Summary</h2>
        <div className={styles.sectionGrid}>
          <MetricsCard
            title="Net Worth"
            value={formatCurrency(netWorth)}
            trend={netWorth >= 0 ? 'positive' : 'negative'}
            icon={<IconNetWorth />}
          />
          <MetricsCard
            title="Total Assets"
            value={formatCurrency(totalAssets)}
            subtitle={`${data.assets.length} asset${data.assets.length !== 1 ? 's' : ''}${data.stockHoldings.length > 0 ? ` + ${data.stockHoldings.length} stock${data.stockHoldings.length !== 1 ? 's' : ''}` : ''}${data.cryptoHoldings.length > 0 ? ` + ${data.cryptoHoldings.length} crypto${data.cryptoHoldings.length !== 1 ? 's' : ''}` : ''}`}
            trend="positive"
            icon={<IconCurrentAssets />}
          />
          <MetricsCard
            title="Total Liabilities"
            value={formatCurrency(totalLiabilities)}
            subtitle={`${data.liabilities.length} liability${data.liabilities.length !== 1 ? 'ies' : ''}`}
            trend="negative"
            icon={<IconLiabilities />}
          />
        </div>
      </div>
    ),
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Financial Overview</h1>
      </div>

      <div className={styles.chartsGrid}>
        {(cashPosition > 0 || stockPortfolioValue > 0 || cryptoPortfolioValue > 0) && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Current Asset Allocation</h3>
            <CurrentAssetAllocationChart />
          </div>
        )}
        {data.assets.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Asset Allocation</h3>
            <AssetAllocationChart />
          </div>
        )}
        <div className={`${styles.chartCard} ${styles.chartCardFeatured}`}>
          <h3 className={styles.chartTitle}>Net Worth Over Time</h3>
          <NetWorthChart />
        </div>
      </div>

      {DASHBOARD_SECTION_ORDER.map((sectionKey) => (
        <React.Fragment key={sectionKey}>{sections[sectionKey]}</React.Fragment>
      ))}
    </div>
  );
};

export default Dashboard;
