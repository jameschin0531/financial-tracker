import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyNetWorthHistory } from '../../services/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSupabase, isSupabaseInitialized } from '../../services/supabaseClient';

const NetWorthChart: React.FC = () => {
  const { data } = useFinancialData();
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<{ date: string; netWorth: number }>>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const h = await getWeeklyNetWorthHistory(data);
      setHistory(h);

      // Persist weekly snapshots to DB (best-effort).
      // This runs client-side for authenticated users; if Supabase isn't configured, it safely skips.
      if (!user || !isSupabaseInitialized() || h.length === 0) return;
      try {
        const supabase = getSupabase();
        const rows = h.map((p) => ({
          user_id: user.id,
          week_start: p.date, // Monday-based ISO date string (YYYY-MM-DD)
          net_worth: p.netWorth,
        }));

        const { error } = await supabase
          .from('net_worth_snapshots')
          .upsert(rows, { onConflict: 'user_id,week_start' });

        if (error) {
          console.warn('Failed to upsert net worth snapshots:', error);
        }
      } catch (e) {
        console.warn('Failed to upsert net worth snapshots:', e);
      }
    };
    loadHistory();
  }, [data, user]);

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

