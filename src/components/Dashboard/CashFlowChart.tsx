import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { useFinancialData } from '../../context/FinancialDataContext';
import { getMonthlyCashFlowData } from '../../services/calculations';
import { formatCurrency, formatMonth } from '../../utils/formatters';

const chartConfig = {
  income: {
    label: 'Income',
    color: 'var(--color-chart-2)',
  },
  expenses: {
    label: 'Expenses',
    color: 'var(--color-chart-5)',
  },
  cashFlow: {
    label: 'Cash Flow',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

const CashFlowChart: React.FC = () => {
  const { data } = useFinancialData();
  const monthlyData = getMonthlyCashFlowData(data);

  if (monthlyData.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Add income and expenses to see cash flow data
      </div>
    );
  }

  const chartData = monthlyData.map(item => ({
    month: formatMonth(item.month),
    income: item.income,
    expenses: item.expenses,
    cashFlow: item.income - item.expenses,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          style={{ fontSize: '0.75rem' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => formatCurrency(value)}
          style={{ fontSize: '0.75rem' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="income"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-2)', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="var(--color-chart-5)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-5)', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="cashFlow"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: 'var(--color-chart-1)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
};

export default CashFlowChart;
