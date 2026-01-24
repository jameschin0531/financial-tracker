import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { useAuth } from '../../context/AuthContext';
import { getNetWorthHistory } from '../../services/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSupabase, isSupabaseInitialized } from '../../services/supabaseClient';

const NetWorthChart: React.FC = () => {
  const { data } = useFinancialData();
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<{ date: string; netWorth: number }>>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const h = await getNetWorthHistory(data);
      setHistory(h);

      // Persist daily snapshots to DB (best-effort) and read back for display.
      if (!user || !isSupabaseInitialized() || h.length === 0) return;
      try {
        const supabase = getSupabase();
        const rows = h.map((p) => ({
          user_id: user.id,
          date: p.date, // ISO date string (YYYY-MM-DD)
          net_worth: p.netWorth,
        }));

        const { error } = await supabase
          .from('net_worth_daily')
          .upsert(rows, { onConflict: 'user_id,date' });

        if (error) {
          console.warn('Failed to upsert net worth daily snapshots:', error);
          return;
        }

        const { data: stored, error: readError } = await supabase
          .from('net_worth_daily')
          .select('date, net_worth')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (readError) {
          console.warn('Failed to read net worth daily snapshots:', readError);
          return;
        }

        if (stored && stored.length > 0) {
          setHistory(stored.map((row) => ({
            date: row.date,
            netWorth: typeof row.net_worth === 'number' ? row.net_worth : Number(row.net_worth),
          })));
        }
      } catch (e) {
        console.warn('Failed to upsert/read net worth daily snapshots:', e);
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

  const lastPoint = history[history.length - 1];
  const lastUpdatedLabel = lastPoint ? `Last updated: ${formatDate(lastPoint.date)}` : null;

  return (
    <div>
      {lastUpdatedLabel && (
        <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
          {lastUpdatedLabel}
        </div>
      )}
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
    </div>
  );
};

export default NetWorthChart;

