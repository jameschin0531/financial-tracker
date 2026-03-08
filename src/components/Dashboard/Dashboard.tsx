import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import {
  calculateTotalAssets,
  calculateCurrentAssets,
  calculateCashPosition,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateMonthlyIncome,
} from '../../services/calculations';
import { calculateTotalPortfolioValue } from '../../services/stockCalculations';
import { calculateTotalCryptoPortfolioValue } from '../../services/cryptoCalculations';
import { formatCurrency } from '../../utils/formatters';
import MetricsCard from './MetricsCard';
import NetWorthChart from './NetWorthChart';
import AssetAllocationChart from './AssetAllocationChart';
import CurrentAssetAllocationChart from './CurrentAssetAllocationChart';
import { DASHBOARD_SECTION_ORDER, type DashboardSectionKey } from './dashboardSections';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { data } = useFinancialData();
  const [totalAssets, setTotalAssets] = useState(0);
  const [stockPortfolioValue, setStockPortfolioValue] = useState(0);
  const [cryptoPortfolioValue, setCryptoPortfolioValue] = useState(0);
  const [netWorth, setNetWorth] = useState(0);

  useEffect(() => {
    const calculateValues = async () => {
      const assets = await calculateTotalAssets(data.assets, data.stockHoldings, data.cryptoHoldings);
      const stockValue = await calculateTotalPortfolioValue(data.stockHoldings);
      const cryptoValue = await calculateTotalCryptoPortfolioValue(data.cryptoHoldings);
      const netWorthValue = await calculateNetWorth(data.assets, data.liabilities, data.stockHoldings, data.cryptoHoldings);
      
      setTotalAssets(assets);
      setStockPortfolioValue(stockValue.myr);
      setCryptoPortfolioValue(cryptoValue.myr);
      setNetWorth(netWorthValue);
    };
    
    calculateValues();
  }, [data.assets, data.liabilities, data.stockHoldings, data.cryptoHoldings]);

  const currentAssets = calculateCurrentAssets(data.assets);
  const cashPosition = calculateCashPosition(data.assets);
  const totalCurrentAssets = currentAssets + stockPortfolioValue + cryptoPortfolioValue;
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);
  const monthlyIncome = calculateMonthlyIncome(data.income);
  // Calculate total expenses (sum of all expenses, not filtered by current month)
  // Same calculation as CashFlowPage
  const monthlyExpenses = data.expenses.reduce((sum, expense) => {
    let amount = expense.amount;
    // Convert to MYR if needed
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
          />
          <MetricsCard
            title="Cash Position"
            value={formatCurrency(cashPosition)}
            subtitle={''}
            trend={cashPosition > 0 ? 'positive' : 'neutral'}
          />
          <MetricsCard
            title="Stock"
            value={formatCurrency(stockPortfolioValue)}
            subtitle={data.stockHoldings.length > 0 ? `${data.stockHoldings.length} holding${data.stockHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={stockPortfolioValue > 0 ? 'positive' : 'neutral'}
          />
          <MetricsCard
            title="Crypto"
            value={formatCurrency(cryptoPortfolioValue)}
            subtitle={data.cryptoHoldings.length > 0 ? `${data.cryptoHoldings.length} holding${data.cryptoHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={cryptoPortfolioValue > 0 ? 'positive' : 'neutral'}
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
          />
          <MetricsCard
            title="Monthly Expenses"
            value={formatCurrency(monthlyExpenses)}
            subtitle={`${data.expenses.length} expense${data.expenses.length !== 1 ? 's' : ''}`}
            trend="negative"
          />
          <MetricsCard
            title="Cash Flow"
            value={formatCurrency(cashFlow)}
            subtitle={cashFlow >= 0 ? 'Surplus' : 'Deficit'}
            trend={cashFlow >= 0 ? 'positive' : 'negative'}
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
          />
          <MetricsCard
            title="Total Assets"
            value={formatCurrency(totalAssets)}
            subtitle={`${data.assets.length} asset${data.assets.length !== 1 ? 's' : ''}${data.stockHoldings.length > 0 ? ` + ${data.stockHoldings.length} stock${data.stockHoldings.length !== 1 ? 's' : ''}` : ''}${data.cryptoHoldings.length > 0 ? ` + ${data.cryptoHoldings.length} crypto${data.cryptoHoldings.length !== 1 ? 's' : ''}` : ''}`}
            trend="positive"
          />
          <MetricsCard
            title="Total Liabilities"
            value={formatCurrency(totalLiabilities)}
            subtitle={`${data.liabilities.length} liability${data.liabilities.length !== 1 ? 'ies' : ''}`}
            trend="negative"
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
      {DASHBOARD_SECTION_ORDER.map((sectionKey) => (
        <React.Fragment key={sectionKey}>{sections[sectionKey]}</React.Fragment>
      ))}

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Net Worth Over Time</h3>
          <NetWorthChart />
        </div>
        {data.assets.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Asset Allocation</h3>
            <AssetAllocationChart />
          </div>
        )}
        {(data.assets.filter(a => a.assetType === 'current').length > 0 || data.stockHoldings.length > 0 || data.cryptoHoldings.length > 0) && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Current Asset Allocation</h3>
            <CurrentAssetAllocationChart />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

