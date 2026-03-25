import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Package,
  History,
  DollarSign,
  AlertTriangle,
  Zap,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseService';
import { type Farm } from '../types';
import styles from './DashboardPage.module.css';

/* Sub-components for better performance and DOM isolation */
const KPICard = React.memo(({ label, value, meta, icon, type, trend }: any) => (
  <div className={`${styles.kpiCard} card gpu-accelerate render-fast`}>
    <div className={styles.kpiHeader}>
      <div className={`${styles.iconBox} ${styles[type]}`}>
        {icon}
      </div>
      {trend && (
        <div className={trend > 0 ? styles.trendUp : styles.trendDown}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <AlertTriangle size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className={styles.kpiContent}>
      <span className={styles.kpiLabel}>{label}</span>
      <h2 className={styles.kpiValue}>₦{value.toLocaleString()}</h2>
      <p className={styles.kpiMeta}>{meta}</p>
    </div>
  </div>
));

const RevenueChart = React.memo(({ data, period, onPeriodChange }: { data: any[], period: string, onPeriodChange: (p: string) => void }) => (
  <div className={`${styles.chartCard} card gpu-accelerate render-fast`}>
    <div className={styles.cardHeader}>
      <h3 className={styles.cardTitle}>Revenue Performance</h3>
      <div className={styles.cardActions}>
        <button className={period === 'weekly' ? styles.activeBtn : ''} onClick={() => onPeriodChange('weekly')}>Weekly</button>
        <button className={period === 'monthly' ? styles.activeBtn : ''} onClick={() => onPeriodChange('monthly')}>Monthly</button>
      </div>
    </div>
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12, fontWeight: 700 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12, fontWeight: 700 }}
            tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)'
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-primary)"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorPrimary)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
));

const OperationalLog = React.memo(({ activity, onMore }: any) => (
  <div className={`${styles.sidebarCard} card render-fast`}>
    <div className={styles.sidebarHeader}>
      <h3 className={styles.cardTitle}><History size={20} /> Operation Log</h3>
    </div>
    <div className={styles.activityList}>
      {activity.map((log: any) => (
        <div key={log.id} className={styles.activityItem}>
          <div className={styles.activityDot} style={{ background: log.isDeleted ? 'var(--color-danger)' : 'var(--color-primary)' }} />
          <div className={styles.activityInfo}>
            <span className={styles.activityUser}>{log.userName || 'System'}</span>
            <span className={styles.activityAction}>
              {log.isDeleted ? ' deleted ' : ' '}
              {log.action.replace('_', ' ').toLowerCase()}
            </span>
            <span className={styles.activityTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      ))}
      {activity.length === 0 && (
        <div className={styles.emptyState}>No recent activity detected.</div>
      )}
    </div>
    <button className={styles.moreBtn} onClick={onMore}>
      View Operational Audit <ChevronRight size={14} />
    </button>
  </div>
));

const InventoryHealth = React.memo(({ storage }: any) => {
  const lowStock = storage.filter((i: any) => (i.quantity || 0) <= (i.min_threshold || 0));
  return (
    <div className={`${styles.sidebarCard} card render-fast`}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.cardTitle}><Activity size={20} /> Inventory Health</h3>
      </div>
      <div className={styles.stockList}>
        {lowStock.slice(0, 3).map((item: any) => (
          <div key={item.id} className={styles.stockItem}>
            <div className={styles.stockMeta}>
              <span className={styles.stockName}>{item.name}</span>
              <span className={styles.stockStatus}>CRITICAL</span>
            </div>
            <div className={styles.stockBar}>
              <div className={styles.stockFill} style={{ width: '20%', background: 'var(--color-danger)' }} />
            </div>
          </div>
        ))}
        {lowStock.length === 0 && (
          <div className={styles.emptyState}>
            <Zap size={24} color="var(--color-success)" style={{ opacity: 0.2 }} />
            <span>All systems optimal.</span>
          </div>
        )}
      </div>
    </div>
  );
});

export const DashboardPage: React.FC = () => {
  const { user, isSuperAdmin, isManager, isAuditor } = useAuth();
  const navigate = useNavigate();


  const [farms, setFarms] = useState<Farm[]>([]);
  const [sales, setSales] = useState<any[]>([]); // Using RetailSale from new schema
  const [expenses, setExpenses] = useState<any[]>([]);
  const [storage, setStorage] = useState<any[]>([]); // Using StockItems from new schema
  const [activity, setActivity] = useState<any[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: farmData } = await supabase.from('farms').select('*');
      if (farmData && farmData.length > 0) {
        setFarms(farmData as Farm[]);
        const [salesList, expensesList, inventory, logs] = await Promise.all([
          supabase.from('retail_sales').select('*').limit(300).order('created_at', { ascending: false }),
          supabase.from('expenses').select('*').eq('status', 'approved'),
          supabase.from('stock_items').select('*'),
          supabase.from('stock_activity_logs').select('*').limit(15).order('timestamp', { ascending: false })
        ]);
        if (salesList.data) setSales(salesList.data);
        if (expensesList.data) setExpenses(expensesList.data);
        if (inventory.data) setStorage(inventory.data);
        if (logs.data) {
           const formattedLogs = logs.data.map((l: any) => ({
             id: l.id,
             userName: l.performed_by_name || 'System',
             action: l.action_type,
             isDeleted: l.action_type === 'DELETE',
             timestamp: l.timestamp
           }));
           setActivity(formattedLogs);
        }
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.created_at.startsWith(today)).reduce((sum, s) => sum + (s.total_price || 0), 0);
    const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const lowStock = storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).length;

    return { revenue: totalSales, todayRevenue: todaySales, profit: totalSales - totalExp, lowStock };
  }, [sales, expenses, storage]);

  const chartData = useMemo(() => {
    const days = revenuePeriod === 'weekly' ? 7 : 30;
    const periodDays = [...Array(days)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split('T')[0];
    });
    return periodDays.map(date => ({
      name: new Date(date).toLocaleDateString('en-US', {
        weekday: revenuePeriod === 'weekly' ? 'short' : undefined,
        month: revenuePeriod === 'monthly' ? 'short' : undefined,
        day: revenuePeriod === 'monthly' ? 'numeric' : undefined
      }),
      revenue: sales.filter(s => s.created_at.startsWith(date)).reduce((sum, s) => sum + (s.total_price || 0), 0),
    }));
  }, [sales, revenuePeriod]);
  if (user?.role === 'sales_staff') return <Navigate to="/sales" replace />;
  if (user?.role === 'inventory_staff') return <Navigate to="/stock" replace />;

  if (isLoading && farms.length === 0) {
    return (
      <Layout title="Modern Console">
        <div className={styles.loading}>
          <Skeleton height={200} borderRadius={30} />
          <div className="grid-3" style={{ marginTop: '30px' }}>
            <Skeleton height={180} borderRadius={30} />
            <Skeleton height={180} borderRadius={30} />
            <Skeleton height={180} borderRadius={30} />
          </div>
        </div>
      </Layout>
    );
  }

  const canViewLogs = isSuperAdmin || isManager || isAuditor;

  return (
    <Layout title="Overview">
      <div className={`${styles.dashboard} animate-fade`}>
        <header className={styles.header}>
          <div className={styles.welcome}>
            <h1 className={styles.title}>Hello, {user?.name}</h1>
            <p className={styles.subtitle}>Welcome back! Here's what's happening on your farm today.</p>
          </div>
          <div className={styles.actions}>
            <button className="btn-outline" onClick={() => loadData()}>
              <Filter size={18} /> Filters
            </button>
            <button className="btn-primary" onClick={() => navigate('/sales')}>
              <Plus size={18} /> New Transaction
            </button>
          </div>
        </header>

        <section className={styles.kpiRow}>
          <KPICard
            label="Total Revenue"
            value={stats.revenue}
            meta={`₦${stats.todayRevenue.toLocaleString()} earned today`}
            icon={<DollarSign size={24} />}
            type="blue"
            trend={12}
          />
          <KPICard
            label="Net Profit"
            value={stats.profit}
            meta="Calculated from gross ledger"
            icon={<TrendingUp size={24} />}
            type="emerald"
            trend={8.4}
          />
          <KPICard
            label="Storage Status"
            value={storage.length}
            meta={`${stats.lowStock} items need restocking`}
            icon={<Package size={24} />}
            type="amber"
          />
        </section>

        <main className={styles.gridContainer}>
          <RevenueChart
            data={chartData}
            period={revenuePeriod}
            onPeriodChange={(p: any) => setRevenuePeriod(p)}
          />

          <div className={styles.sidebarColumn}>
            {canViewLogs && (
              <OperationalLog
                activity={activity}
                onMore={() => navigate('/admin/activity')}
              />
            )}
            <InventoryHealth storage={storage} />
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default DashboardPage;
