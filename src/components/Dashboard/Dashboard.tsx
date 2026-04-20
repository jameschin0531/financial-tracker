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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Bitcoin,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  CreditCard,
} from 'lucide-react';
import MetricsCard from './MetricsCard';
import NetWorthChart from './NetWorthChart';
import AssetAllocationChart from './AssetAllocationChart';
import CurrentAssetAllocationChart from './CurrentAssetAllocationChart';
import { DASHBOARD_SECTION_ORDER } from './dashboardSections';
import type { DashboardSectionKey } from './dashboardSections';

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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Assets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Current Assets"
            value={formatCurrency(totalCurrentAssets)}
            subtitle={''}
            trend="positive"
            icon={<LayoutGrid className="size-4" />}
          />
          <MetricsCard
            title="Cash Position"
            value={formatCurrency(cashPosition)}
            subtitle={data.stockHoldings.some((holding) => holding.stockType === 'Cash') ? 'Includes broker cash' : ''}
            trend={cashPosition > 0 ? 'positive' : 'neutral'}
            icon={<DollarSign className="size-4" />}
          />
          <MetricsCard
            title="Stock"
            value={formatCurrency(stockPortfolioValue)}
            subtitle={data.stockHoldings.length > 0 ? `${data.stockHoldings.length} holding${data.stockHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={stockPortfolioValue > 0 ? 'positive' : 'neutral'}
            icon={<TrendingUp className="size-4" />}
          />
          <MetricsCard
            title="Crypto"
            value={formatCurrency(cryptoPortfolioValue)}
            subtitle={data.cryptoHoldings.length > 0 ? `${data.cryptoHoldings.length} holding${data.cryptoHoldings.length !== 1 ? 's' : ''}` : 'No holdings'}
            trend={cryptoPortfolioValue > 0 ? 'positive' : 'neutral'}
            icon={<Bitcoin className="size-4" />}
          />
        </div>
      </section>
    ),
    cashFlow: (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Cash Flow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricsCard
            title="Monthly Income"
            value={formatCurrency(monthlyIncome)}
            subtitle={`${data.income.length} source${data.income.length !== 1 ? 's' : ''}`}
            trend="positive"
            icon={<ArrowUpRight className="size-4" />}
          />
          <MetricsCard
            title="Monthly Expenses"
            value={formatCurrency(monthlyExpenses)}
            subtitle={`${data.expenses.length} expense${data.expenses.length !== 1 ? 's' : ''}`}
            trend="negative"
            icon={<ArrowDownRight className="size-4" />}
          />
          <MetricsCard
            title="Cash Flow"
            value={formatCurrency(cashFlow)}
            subtitle={cashFlow >= 0 ? 'Surplus' : 'Deficit'}
            trend={cashFlow >= 0 ? 'positive' : 'negative'}
            icon={<BarChart3 className="size-4" />}
          />
        </div>
      </section>
    ),
    financialSummary: (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricsCard
            title="Net Worth"
            value={formatCurrency(netWorth)}
            trend={netWorth >= 0 ? 'positive' : 'negative'}
            icon={<Layers className="size-4" />}
          />
          <MetricsCard
            title="Total Assets"
            value={formatCurrency(totalAssets)}
            subtitle={`${data.assets.length} asset${data.assets.length !== 1 ? 's' : ''}${data.stockHoldings.length > 0 ? ` + ${data.stockHoldings.length} stock${data.stockHoldings.length !== 1 ? 's' : ''}` : ''}${data.cryptoHoldings.length > 0 ? ` + ${data.cryptoHoldings.length} crypto${data.cryptoHoldings.length !== 1 ? 's' : ''}` : ''}`}
            trend="positive"
            icon={<LayoutGrid className="size-4" />}
          />
          <MetricsCard
            title="Total Liabilities"
            value={formatCurrency(totalLiabilities)}
            subtitle={`${data.liabilities.length} liability${data.liabilities.length !== 1 ? 'ies' : ''}`}
            trend="negative"
            icon={<CreditCard className="size-4" />}
          />
        </div>
      </section>
    ),
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Financial Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(cashPosition > 0 || stockPortfolioValue > 0 || cryptoPortfolioValue > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Current Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrentAssetAllocationChart />
            </CardContent>
          </Card>
        )}
        {data.assets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetAllocationChart />
            </CardContent>
          </Card>
        )}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Net Worth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthChart />
          </CardContent>
        </Card>
      </div>

      {DASHBOARD_SECTION_ORDER.map((sectionKey) => (
        <React.Fragment key={sectionKey}>{sections[sectionKey]}</React.Fragment>
      ))}
    </div>
  );
};

export default Dashboard;
