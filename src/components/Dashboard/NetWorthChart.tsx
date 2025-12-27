import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { getNetWorthHistory } from '../../services/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';

const NetWorthChart: React.FC = () => {
  const { data } = useFinancialData();
  const [history, setHistory] = useState<Array<{ date: string; netWorth: number }>>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const h = await getNetWorthHistory(data);
      setHistory(h);
    };
    loadHistory();
  }, [data]);

  if (history.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Add assets and liabilities to see net worth history
      </div>
    );
  }

  const chartData = history.map(item => ({
    date: formatDate(item.date),
    'Net Worth': item.netWorth,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="date"
          stroke="var(--text-secondary)"
          style={{ fontSize: '0.75rem' }}
        />
        <YAxis
          stroke="var(--text-secondary)"
          style={{ fontSize: '0.75rem' }}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="Net Worth"
          stroke="var(--accent-color)"
          strokeWidth={2}
          dot={{ fill: 'var(--accent-color)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default NetWorthChart;

