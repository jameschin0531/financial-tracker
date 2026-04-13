import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { useFinancialData } from '../../context/FinancialDataContext';
import { useAuth } from '../../context/AuthContext';
import { buildWeeklyNetWorthSeries, getNetWorthHistory, startOfWeekISO } from '../../services/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSupabase, isSupabaseInitialized } from '../../services/supabaseClient';
import { getNetWorthYAxisDomain } from './netWorthChartUtils';

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

const chartConfig = {
  netWorth: {
    label: 'Net Worth',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

const hasFinancialData = (data: { assets: unknown[]; liabilities: unknown[]; stockHoldings: unknown[]; cryptoHoldings: unknown[] }): boolean =>
  data.assets.length > 0 || data.liabilities.length > 0 || data.stockHoldings.length > 0 || data.cryptoHoldings.length > 0;

const NetWorthChart: React.FC = () => {
  const { data } = useFinancialData();
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<{ date: string; netWorth: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip if financial data hasn't loaded yet
    if (!hasFinancialData(data)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadHistory = async () => {
      try {
        const localHistory = await getNetWorthHistory(data);
        const localWeeklyFallback = buildWeeklyNetWorthSeries([], localHistory.map((point) => ({
          date: point.date,
          netWorth: point.netWorth,
        })));

        if (!user || !isSupabaseInitialized()) {
          if (!cancelled) {
            // Use daily history directly if weekly aggregation produces too few points
            setHistory(localWeeklyFallback.length >= 2 ? localWeeklyFallback : localHistory);
            setLoading(false);
          }
          return;
        }

        const supabase = getSupabase();

        // Write today's snapshot (fire-and-forget, don't block reads)
        if (localHistory.length > 0) {
          const todayIso = toISODate(new Date());
          const todayPoint = localHistory.find((point) => point.date === todayIso) ?? localHistory[localHistory.length - 1];

          if (todayPoint) {
            const weekStart = startOfWeekISO(todayPoint.date);

            Promise.all([
              supabase
                .from('net_worth_daily')
                .upsert([{ user_id: user.id, date: todayPoint.date, net_worth: todayPoint.netWorth }], { onConflict: 'user_id,date' }),
              supabase
                .from('net_worth_snapshots')
                .upsert([{ user_id: user.id, week_start: weekStart, net_worth: todayPoint.netWorth }], { onConflict: 'user_id,week_start' }),
            ]).catch(() => {
              // Non-critical write failure
            });
          }
        }

        // Read from Supabase
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

        let weeklyRows = (weeklyResult.data || []) as NetWorthWeeklyRow[];
        let dailyRows = (dailyResult.data || []) as NetWorthDailyRow[];

        // Bootstrap DB if empty
        if (weeklyRows.length === 0 && dailyRows.length === 0 && localHistory.length > 0) {
          const bootstrapDailyRows = localHistory.map((point) => ({
            user_id: user.id,
            date: point.date,
            net_worth: point.netWorth,
          }));
          const bootstrapWeeklyRows = createWeeklyRowsFromDaily(user.id, localHistory);

          await Promise.all([
            supabase.from('net_worth_daily').upsert(bootstrapDailyRows, { onConflict: 'user_id,date' }),
            supabase.from('net_worth_snapshots').upsert(bootstrapWeeklyRows, { onConflict: 'user_id,week_start' }),
          ]).catch(() => {});

          dailyRows = bootstrapDailyRows.map((row) => ({ date: row.date, net_worth: row.net_worth }));
          weeklyRows = bootstrapWeeklyRows.map((row) => ({ week_start: row.week_start, net_worth: row.net_worth }));
        }

        const dbWeeklyHistory = buildWeeklyNetWorthSeries(
          toWeeklySnapshots(weeklyRows),
          toDailySnapshots(dailyRows),
        );

        if (!cancelled) {
          // Prefer DB data, fall back to local weekly, fall back to local daily
          if (dbWeeklyHistory.length >= 2) {
            setHistory(dbWeeklyHistory);
          } else if (localWeeklyFallback.length >= 2) {
            setHistory(localWeeklyFallback);
          } else {
            setHistory(localHistory);
          }
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to load net worth history:', e);
        if (!cancelled) {
          // Last resort: compute directly from current data
          try {
            const localHistory = await getNetWorthHistory(data);
            setHistory(localHistory);
          } catch {
            setHistory([]);
          }
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [data, user]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        <div className="h-[300px] w-full rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Add assets and liabilities to see net worth history
      </div>
    );
  }

  const chartData = history.map(item => ({
    date: formatDate(item.date),
    netWorth: item.netWorth,
  }));
  const [yAxisMin, yAxisMax] = getNetWorthYAxisDomain(history.map((item) => item.netWorth));

  const lastPoint = history[history.length - 1];
  const lastUpdatedLabel = lastPoint ? `Last updated: ${formatDate(lastPoint.date)}` : null;

  return (
    <div>
      {lastUpdatedLabel && (
        <div className="mb-2 text-muted-foreground text-xs">
          {lastUpdatedLabel}
        </div>
      )}
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={[yAxisMin, yAxisMax]}
            tickFormatter={(value) => formatCurrency(value)}
            style={{ fontSize: '0.75rem' }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
            cursor={{ strokeDasharray: '4 4' }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="var(--color-chart-1)"
            strokeWidth={3}
            dot={{ fill: 'var(--color-background)', stroke: 'var(--color-chart-1)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-chart-1)' }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export default NetWorthChart;
