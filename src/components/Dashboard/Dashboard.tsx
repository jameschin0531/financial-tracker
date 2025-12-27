import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import {
  calculateTotalAssets,
  calculateCurrentAssets,
  calculateFixedAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCashFlow,
} from '../../services/calculations';
import { calculateTotalPortfolioValue } from '../../services/stockCalculations';
import { calculateTotalCryptoPortfolioValue } from '../../services/cryptoCalculations';
import { formatCurrency } from '../../utils/formatters';
import MetricsCard from './MetricsCard';
import NetWorthChart from './NetWorthChart';
import CashFlowChart from './CashFlowChart';
import AssetAllocationChart from './AssetAllocationChart';
import CurrentAssetAllocationChart from './CurrentAssetAllocationChart';
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
  const fixedAssets = calculateFixedAssets(data.assets);
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);
  const monthlyIncome = calculateMonthlyIncome(data.income);
  const monthlyExpenses = calculateMonthlyExpenses(data.expenses);
  const cashFlow = calculateCashFlow(data.income, data.expenses);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Financial Overview</h1>
      </div>
      
      {/* Section 1: Assets & Net Worth */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Assets & Net Worth</h2>
        <div className={styles.sectionGrid}>
          <MetricsCard
            title="Current Assets"
            value={formatCurrency(currentAssets)}
            subtitle={`Liquid assets`}
            trend="positive"
          />
          <MetricsCard
            title="Fixed Assets"
            value={formatCurrency(fixedAssets)}
            subtitle={`Long-term assets`}
            trend="positive"
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
          <MetricsCard
            title="Net Worth"
            value={formatCurrency(netWorth)}
            trend={netWorth >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>

      {/* Section 2: Investment Portfolios */}
      {(data.stockHoldings.length > 0 || data.cryptoHoldings.length > 0) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Investment Portfolios</h2>
          <div className={styles.sectionGrid}>
            {data.stockHoldings.length > 0 && (
              <MetricsCard
                title="Stock Portfolio"
                value={formatCurrency(stockPortfolioValue)}
                subtitle={`${data.stockHoldings.length} holding${data.stockHoldings.length !== 1 ? 's' : ''}`}
                trend="positive"
              />
            )}
            {data.cryptoHoldings.length > 0 && (
              <MetricsCard
                title="Crypto Portfolio"
                value={formatCurrency(cryptoPortfolioValue)}
                subtitle={`${data.cryptoHoldings.length} holding${data.cryptoHoldings.length !== 1 ? 's' : ''}`}
                trend="positive"
              />
            )}
          </div>
        </div>
      )}

      {/* Section 3: Cash Flow */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Monthly Cash Flow</h2>
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

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Net Worth Over Time</h3>
          <NetWorthChart />
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Monthly Cash Flow</h3>
          <CashFlowChart />
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

