import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { getMonthlyCashFlowData } from '../../services/calculations';
import { formatCurrency, formatMonth } from '../../utils/formatters';

const CashFlowChart: React.FC = () => {
  const { data } = useFinancialData();
  const monthlyData = getMonthlyCashFlowData(data);

  if (monthlyData.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Add income and expenses to see cash flow data
      </div>
    );
  }

  const chartData = monthlyData.map(item => ({
    month: formatMonth(item.month),
    Income: item.income,
    Expenses: item.expenses,
    'Cash Flow': item.income - item.expenses,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="month"
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
          dataKey="Income" 
          stroke="var(--success-color)" 
          strokeWidth={2}
          dot={{ fill: 'var(--success-color)', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="Expenses" 
          stroke="var(--danger-color)" 
          strokeWidth={2}
          dot={{ fill: 'var(--danger-color)', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="Cash Flow" 
          stroke="var(--accent-color)" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: 'var(--accent-color)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CashFlowChart;

