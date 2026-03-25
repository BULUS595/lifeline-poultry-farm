import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { Layout } from '../components/Layout';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Calendar,
  Package,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import type { Expense } from '../types';
import styles from './AnalyticsPage.module.css';


export const AnalyticsPage: React.FC = () => {
  const { isSuperAdmin, isManager, isAccountant, isAuditor } = useAuth();
  const [sales, setSales] = useState<any[]>([]); // RetailSale type
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const loadData = useCallback(async () => {
    try {
      let startDateStr = '';
      const now = new Date();
      if (period === 'daily') {
        now.setDate(now.getDate() - 7);
      } else if (period === 'weekly') {
        now.setDate(now.getDate() - 30);
      } else {
        now.setMonth(now.getMonth() - 3); // Quarter
      }
      startDateStr = now.toISOString(); // Use ISO string for created_at which is timestamptz

      const [salesRes, expensesRes] = await Promise.all([
        supabase.from('retail_sales').select('*').gte('created_at', startDateStr).order('created_at', { ascending: true }),
        supabase.from('expenses').select('*').eq('status', 'approved').gte('date', startDateStr.split('T')[0]).order('date', { ascending: true })
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
    } catch (error) {
      console.error('Analytics load error:', error);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const financialStats = useMemo(() => {
    const revenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const cost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, cost, profit, margin };
  }, [sales, expenses]);

  const chartData = useMemo(() => {
    const dataMap: Record<string, { label: string; revenue: number; expenses: number; profit: number }> = {};

    sales.forEach(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dataMap[date]) dataMap[date] = { label: date, revenue: 0, expenses: 0, profit: 0 };
      dataMap[date].revenue += (s.total_price || 0);
    });

    expenses.forEach(e => {
      const date = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dataMap[date]) dataMap[date] = { label: date, revenue: 0, expenses: 0, profit: 0 };
      dataMap[date].expenses += (e.amount || 0);
    });

    return Object.values(dataMap).map(item => ({
      ...item,
      profit: item.revenue - item.expenses
    })).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [sales, expenses]);


  const pnlData = useMemo(() => [
    { name: 'Total Revenue', value: financialStats.revenue },
    { name: 'Total Costs', value: financialStats.cost }
  ], [financialStats]);

  const bestSellers = useMemo(() => {
    const items: Record<string, number> = {};
    sales.forEach(s => {
      let safeItems = Array.isArray(s.items) ? s.items : [];
      if (typeof s.items === 'string') {
        try {
          safeItems = JSON.parse(s.items);
        } catch (e) {
          console.error('Failed to parse sales items for analytics:', e);
        }
      }

      if (Array.isArray(safeItems)) {
        safeItems.forEach((item: any) => {
          items[item.name] = (items[item.name] || 0) + (item.quantity || 0);
        });
      }
    });
    return Object.entries(items)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [sales]);

  const canView = isSuperAdmin || isManager || isAccountant || isAuditor;

  if (!canView) {
    return (
      <Layout title="Analytics Restricted">
        <div className="card text-center" style={{ padding: '4rem' }}>
          <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}><TrendingDown size={48} /></div>
          <h2>Access Denied</h2>
          <p>Only users with Admin, Manager, or Accountant privileges can view financial reports.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Analytics Terminal">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Analytics <span style={{ color: 'var(--color-primary)' }}>Terminal</span></h1>
            <p>Aggregated financial data from all farm operations.</p>
          </div>
          <div className={styles.periodToggle}>
            <Calendar size={18} />
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)}>
              <option value="daily">LAST 7 DAYS</option>
              <option value="weekly">LAST 30 DAYS</option>
              <option value="monthly">THIS QUARTER</option>
            </select>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} card`} style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className={`${styles.icon} ${styles.revenue}`}><Wallet size={24} /></div>
            <div className={styles.content}>
              <span className={styles.label}>Cumulative Revenue</span>
              <span className={styles.value}>₦{financialStats.revenue.toLocaleString()}</span>
            </div>
          </div>
          <div className={`${styles.statCard} card`}>
            <div className={`${styles.icon} ${styles.expenses}`}><TrendingDown size={24} /></div>
            <div className={styles.content}>
              <span className={styles.label}>Consolidated Costs</span>
              <span className={styles.value}>₦{financialStats.cost.toLocaleString()}</span>
            </div>
          </div>
          <div className={`${styles.statCard} card`} style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className={`${styles.icon} ${styles.profit}`}><TrendingUp size={24} /></div>
            <div className={styles.content}>
              <span className={styles.label}>Net Retention</span>
              <span className={styles.value}>₦{financialStats.profit.toLocaleString()}</span>
            </div>
          </div>
          <div className={`${styles.statCard} card`}>
            <div className={`${styles.icon} ${styles.margin}`}><PieIcon size={24} /></div>
            <div className={styles.content}>
              <span className={styles.label}>Relative Margin</span>
              <span className={styles.value}>{financialStats.margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className={styles.chartMain}>
          <div className="card" style={{ padding: '24px' }}>
            <div className={styles.chartHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ margin: 0 }}>Financial Flow Metrics</h2>
              </div>
              <p>Real-time revenue and expenditure tracking over the selected fiscal period.</p>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                    tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      boxShadow: 'var(--shadow-xl)'
                    }}
                    labelStyle={{ color: 'var(--color-text)', fontWeight: 700, marginBottom: '8px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '24px' }}
                  />
                  <Area
                    name="Total Revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    name="Total Expenses"
                    type="monotone"
                    dataKey="expenses"
                    stroke="var(--color-danger)"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorExp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          <div className="card" style={{ padding: '24px' }}>
            <div className={styles.chartHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <PieIcon size={20} style={{ color: 'var(--color-accent)' }} />
                <h2 style={{ margin: 0 }}>Profit vs Loss</h2>
              </div>
              <p>Overall financial distribution.</p>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pnlData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={8}
                    stroke="none"
                    dataKey="value"
                  >
                    <Cell fill="var(--color-primary)" />
                    <Cell fill="var(--color-danger)" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                    formatter={(value: any) => `₦${Number(value).toLocaleString()}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div className={styles.chartHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShoppingCart size={20} style={{ color: 'var(--color-success)' }} />
                <h2 style={{ margin: 0 }}>Performance Rankings</h2>
              </div>
              <p>Top velocity SKUs in the inventory.</p>
            </div>
            <div className={styles.bestSellersList}>
              {bestSellers.map((item, idx) => (
                <div key={item.name} className={styles.sellerItem}>
                  <div className={styles.sellerInfo}>
                    <span className={styles.sellerRank}>{idx + 1}</span>
                    <span className={styles.sellerName}>{item.name}</span>
                  </div>
                  <div className={styles.sellerValue}>
                    <strong>{item.value.toLocaleString()}</strong>
                    <span>UNT SOLD</span>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
                  <Package size={40} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>Insufficient circulation data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
