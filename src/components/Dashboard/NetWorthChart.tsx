import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { useAuth } from '../../context/AuthContext';
import { buildWeeklyNetWorthSeries, getNetWorthHistory, startOfWeekISO } from '../../services/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSupabase, isSupabaseInitialized } from '../../services/supabaseClient';

type NetWorthHistoryPoint = { date: string; netWorth: number };

type NetWorthDailyRow = {
  date: string;
  net_worth: number | string;
};

type NetWorthWeeklyRow = {
  week_start: string;
  net_worth: number | string;
};

const toISODate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toNumber = (value: number | string): number => {
  return typeof value === 'number' ? value : Number(value);
};

const toDailySnapshots = (rows: NetWorthDailyRow[]): Array<{ date: string; netWorth: number }> => {
  return rows.map((row) => ({
    date: row.date,
    netWorth: toNumber(row.net_worth),
  }));
};

const toWeeklySnapshots = (rows: NetWorthWeeklyRow[]): Array<{ weekStart: string; netWorth: number }> => {
  return rows.map((row) => ({
    weekStart: row.week_start,
    netWorth: toNumber(row.net_worth),
  }));
};

const createWeeklyRowsFromDaily = (
  userId: string,
  dailyHistory: NetWorthHistoryPoint[],
): Array<{ user_id: string; week_start: string; net_worth: number }> => {
  const latestByWeek = new Map<string, NetWorthHistoryPoint>();

  dailyHistory.forEach((point) => {
    const weekStart = startOfWeekISO(point.date);
    const existing = latestByWeek.get(weekStart);

    if (!existing || point.date > existing.date) {
      latestByWeek.set(weekStart, point);
    }
  });

  return Array.from(latestByWeek.entries()).map(([weekStart, point]) => ({
    user_id: userId,
    week_start: weekStart,
    net_worth: point.netWorth,
  }));
};

const NetWorthChart: React.FC = () => {
  const { data } = useFinancialData();
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<{ date: string; netWorth: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const localHistory = await getNetWorthHistory(data);
      const localWeeklyFallback = buildWeeklyNetWorthSeries([], localHistory.map((point) => ({
        date: point.date,
        netWorth: point.netWorth,
      })));

      if (!user || !isSupabaseInitialized()) {
        if (!cancelled) {
          setHistory(localWeeklyFallback);
        }
        return;
      }

      try {
        const supabase = getSupabase();

        if (localHistory.length > 0) {
          const todayIso = toISODate(new Date());
          const todayPoint = localHistory.find((point) => point.date === todayIso) ?? localHistory[localHistory.length - 1];

          if (todayPoint) {
            const weekStart = startOfWeekISO(todayPoint.date);

            await Promise.all([
              supabase
                .from('net_worth_daily')
                .upsert([
                  {
                    user_id: user.id,
                    date: todayPoint.date,
                    net_worth: todayPoint.netWorth,
                  },
                ], { onConflict: 'user_id,date' }),
              supabase
                .from('net_worth_snapshots')
                .upsert([
                  {
                    user_id: user.id,
                    week_start: weekStart,
                    net_worth: todayPoint.netWorth,
                  },
                ], { onConflict: 'user_id,week_start' }),
            ]);
          }
        }

        const [weeklyResult, dailyResult] = await Promise.all([
          supabase
            .from('net_worth_snapshots')
            .select('week_start, net_worth')
            .eq('user_id', user.id)
            .order('week_start', { ascending: true }),
          supabase
            .from('net_worth_daily')
            .select('date, net_worth')
            .eq('user_id', user.id)
            .order('date', { ascending: true }),
        ]);

        if (weeklyResult.error) {
          console.warn('Failed to read net worth weekly snapshots:', weeklyResult.error);
        }

        if (dailyResult.error) {
          console.warn('Failed to read net worth daily snapshots:', dailyResult.error);
        }

        let weeklyRows = (weeklyResult.data || []) as NetWorthWeeklyRow[];
        let dailyRows = (dailyResult.data || []) as NetWorthDailyRow[];

        if (weeklyRows.length === 0 && dailyRows.length === 0 && localHistory.length > 0) {
          const bootstrapDailyRows = localHistory.map((point) => ({
            user_id: user.id,
            date: point.date,
            net_worth: point.netWorth,
          }));

          const bootstrapWeeklyRows = createWeeklyRowsFromDaily(user.id, localHistory);

          const [dailyBootstrapResult, weeklyBootstrapResult] = await Promise.all([
            supabase
              .from('net_worth_daily')
              .upsert(bootstrapDailyRows, { onConflict: 'user_id,date' }),
            supabase
              .from('net_worth_snapshots')
              .upsert(bootstrapWeeklyRows, { onConflict: 'user_id,week_start' }),
          ]);

          if (dailyBootstrapResult.error) {
            console.warn('Failed to bootstrap net worth daily snapshots:', dailyBootstrapResult.error);
          }

          if (weeklyBootstrapResult.error) {
            console.warn('Failed to bootstrap net worth weekly snapshots:', weeklyBootstrapResult.error);
          }

          dailyRows = bootstrapDailyRows.map((row) => ({
            date: row.date,
            net_worth: row.net_worth,
          }));
          weeklyRows = bootstrapWeeklyRows.map((row) => ({
            week_start: row.week_start,
            net_worth: row.net_worth,
          }));
        }

        const dbWeeklyHistory = buildWeeklyNetWorthSeries(
          toWeeklySnapshots(weeklyRows),
          toDailySnapshots(dailyRows),
        );

        if (!cancelled) {
          setHistory(dbWeeklyHistory.length > 0 ? dbWeeklyHistory : localWeeklyFallback);
        }
      } catch (e) {
        console.warn('Failed to read net worth snapshots from DB:', e);
        if (!cancelled) {
          setHistory(localWeeklyFallback);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
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

