import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { buildAllocationBreakdown } from './allocationChartUtils';
import styles from './Dashboard.module.css';

const COLORS = [
  'var(--accent-color)',
  'var(--success-color)',
  'var(--warning-color)',
  '#c4b5fd',
  '#f97316',
  '#7c3aed',
  '#6d28d9',
  '#fb7185',
];

interface AllocationDonutChartProps {
  allocation: Array<{ name: string; value: number }>;
  emptyMessage: string;
}

const AllocationDonutChart: React.FC<AllocationDonutChartProps> = ({ allocation, emptyMessage }) => {
  const rows = buildAllocationBreakdown(allocation, COLORS, 6);

  if (rows.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {emptyMessage}
      </div>
    );
  }

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className={styles.allocationLayout}>
      <div className={styles.allocationChartCanvas}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={rows}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={94}
              paddingAngle={2}
              labelLine={false}
              label={false}
              dataKey="value"
              nameKey="name"
              stroke="var(--bg-card)"
              strokeWidth={2}
            >
              {rows.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
              labelFormatter={(name) => String(name)}
              formatter={(value, _name, item) => {
                const numericValue = Number(value) || 0;
                const percentage = Number((item as { payload?: { percentage?: number } })?.payload?.percentage ?? 0);
                return [`${formatCurrency(numericValue)} (${percentage.toFixed(1)}%)`, ''];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.allocationBreakdown}>
        <div className={styles.allocationBreakdownHeader}>
          <span>Category</span>
          <span>Portion</span>
          <span>Value</span>
        </div>

        {rows.map((row) => (
          <div key={row.name} className={styles.allocationBreakdownRow}>
            <div className={styles.allocationCategory}>
              <span className={styles.allocationDot} style={{ backgroundColor: row.color }} aria-hidden="true" />
              <span className={styles.allocationCategoryName}>{row.name}</span>
            </div>
            <span className={styles.allocationPortion}>{row.percentage.toFixed(1)}%</span>
            <span className={styles.allocationValue}>{formatCurrency(row.value)}</span>
          </div>
        ))}

        <div className={styles.allocationTotalRow}>
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default AllocationDonutChart;
