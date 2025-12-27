import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { getCurrentAssetAllocation } from '../../services/calculations';
import { formatCurrency } from '../../utils/formatters';

const COLORS = [
  'var(--accent-color)',
  'var(--success-color)',
  'var(--warning-color)',
  '#9c27b0',
  '#ff5722',
  '#00bcd4',
  '#795548',
  '#607d8b',
];

const CurrentAssetAllocationChart: React.FC = () => {
  const { data } = useFinancialData();
  const [allocation, setAllocation] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    const loadAllocation = async () => {
      const a = await getCurrentAssetAllocation(data.assets, data.stockHoldings, data.cryptoHoldings);
      setAllocation(a);
    };
    loadAllocation();
  }, [data.assets, data.stockHoldings, data.cryptoHoldings]);

  if (allocation.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Add current assets to see allocation
      </div>
    );
  }

  const chartData = allocation.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CurrentAssetAllocationChart;

