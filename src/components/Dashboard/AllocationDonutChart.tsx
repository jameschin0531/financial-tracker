import React, { useMemo } from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCurrency } from '../../utils/formatters';
import { buildAllocationBreakdown } from './allocationChartUtils';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

interface AllocationDonutChartProps {
  allocation: Array<{ name: string; value: number }>;
  emptyMessage: string;
}

const AllocationDonutChart: React.FC<AllocationDonutChartProps> = ({ allocation, emptyMessage }) => {
  const rows = buildAllocationBreakdown(allocation, CHART_COLORS, 6);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    rows.forEach((row, index) => {
      config[row.name] = {
        label: row.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [rows]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.value, 0), [rows]);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => {
                  const numericValue = Number(value) || 0;
                  const pct = total > 0 ? ((numericValue / total) * 100).toFixed(1) : '0';
                  return `${formatCurrency(numericValue)} (${pct}%)`;
                }}
              />
            }
          />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={2}
          >
            {rows.map((entry, index) => (
              <Cell
                key={`${entry.name}-${index}`}
                fill={entry.color}
                stroke="var(--color-background)"
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
        <span className="text-sm font-medium">Total</span>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="truncate text-muted-foreground">{row.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span className="font-medium tabular-nums">{formatCurrency(row.value)}</span>
              <span className="text-muted-foreground text-xs w-12 text-right tabular-nums">{row.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllocationDonutChart;
