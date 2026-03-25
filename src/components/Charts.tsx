/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { MortalityLog, FeedingLog, Expense } from '../types';
import styles from './Charts.module.css';

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: '#94a3b8',
  grid: 'rgba(51, 65, 85, 0.4)',
  tooltip: {
    bg: '#0f172a',
    border: '#1e293b'
  }
};

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>
          <span style={{ color: payload[0].color }}>{payload[0].name}:</span> {prefix}{payload[0].value.toLocaleString()}{suffix}
        </p>
      </div>
    );
  }
  return null;
};

interface MortalityChartProps {
  logs: MortalityLog[];
}

export const MortalityTrendChart: React.FC<MortalityChartProps> = ({ logs }) => {
  const data = useMemo(() => {
    const grouped = logs.reduce(
      (acc, log) => {
        const date = log.date;
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.count += log.count;
        } else {
          acc.push({ date, count: log.count });
        }
        return acc;
      },
      [] as Array<{ date: string; count: number }>
    );
    return grouped.sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  if (data.length === 0) return <div className={styles.empty}>No mortality data captured</div>;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <Tooltip content={<CustomTooltip name="Mortality" suffix=" birds" />} />
          <Area
            type="monotone"
            dataKey="count"
            name="Mortality"
            stroke={CHART_COLORS.danger}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface FeedingChartProps {
  logs: FeedingLog[];
}

export const FeedingTrendChart: React.FC<FeedingChartProps> = ({ logs }) => {
  const data = useMemo(() => {
    const grouped = logs.reduce(
      (acc, log) => {
        const date = log.date;
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.quantity += log.quantity;
        } else {
          acc.push({ date, quantity: log.quantity });
        }
        return acc;
      },
      [] as Array<{ date: string; quantity: number }>
    );
    return grouped.sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  if (data.length === 0) return <div className={styles.empty}>No feeding logs available</div>;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <Tooltip content={<CustomTooltip name="Feed Used" suffix=" units" />} />
          <Line
            type="monotone"
            dataKey="quantity"
            name="Feed Used"
            stroke={CHART_COLORS.primary}
            strokeWidth={3}
            dot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 2, stroke: '#0f172a' }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ExpenseChartProps {
  expenses: Expense[];
}

export const ExpenseByCategoryChart: React.FC<ExpenseChartProps> = ({ expenses }) => {
  const data = useMemo(() => {
    const categoryTotals = expenses.reduce(
      (acc, exp) => {
        const existing = acc.find(item => item.name === exp.category);
        if (existing) {
          existing.value += exp.amount;
        } else {
          acc.push({ name: exp.category, value: exp.amount });
        }
        return acc;
      },
      [] as Array<{ name: string; value: number }>
    );
    return categoryTotals.sort((a, b) => b.value - a.value);
  }, [expenses]);

  const COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, '#a855f7', '#ec4899', '#06b6d4'];

  if (data.length === 0) return <div className={styles.empty}>No financial records available</div>;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip prefix="₦" />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ExpenseTrendProps {
  expenses: Expense[];
}

export const ExpenseTrendChart: React.FC<ExpenseTrendProps> = ({ expenses }) => {
  const data = useMemo(() => {
    const grouped = expenses.reduce(
      (acc, exp) => {
        const date = exp.date;
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.amount += exp.amount;
        } else {
          acc.push({ date, amount: exp.amount });
        }
        return acc;
      },
      [] as Array<{ date: string; amount: number }>
    );
    return grouped.sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  if (data.length === 0) return <div className={styles.empty}>No expense data available</div>;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <Tooltip content={<CustomTooltip prefix="₦" name="Spent" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="amount" name="Spent" fill={CHART_COLORS.secondary} radius={[6, 6, 0, 0]} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const FeedTypeBreakdownChart: React.FC<{ logs: FeedingLog[] }> = ({ logs }) => {
  const data = useMemo(() => {
    const feedTotals = logs.reduce(
      (acc, log) => {
        const existing = acc.find(item => item.name === log.feedType);
        if (existing) {
          existing.value += log.quantity;
        } else {
          acc.push({ name: log.feedType, value: log.quantity });
        }
        return acc;
      },
      [] as Array<{ name: string; value: number }>
    );
    return feedTotals.sort((a, b) => b.value - a.value);
  }, [logs]);

  if (data.length === 0) return <div className={styles.empty}>No distribution data</div>;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} width={80} />
          <Tooltip content={<CustomTooltip suffix=" units" name="Volume" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="value" name="Volume" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default {
  MortalityTrendChart,
  FeedingTrendChart,
  ExpenseByCategoryChart,
  ExpenseTrendChart,
  FeedTypeBreakdownChart
};
