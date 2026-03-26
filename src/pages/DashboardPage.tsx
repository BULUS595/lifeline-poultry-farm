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
  ArrowDownRight,
  RefreshCw,
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
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseService';
import { type Farm } from '../types';
import { Card, Button, Badge } from '../components/ui';

/* Sub-components */
const KPICard = React.memo(({ label, value, meta, icon: Icon, trend, trendType }: any) => (
  <Card hoverable className="relative overflow-hidden group">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-2xl ${trendType === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-primary'}`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {trend > 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="mt-5">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <h2 className="text-3xl font-black mt-1 tracking-tighter">₦{value.toLocaleString()}</h2>
      <p className="text-xs text-muted-foreground mt-2 font-medium opacity-70 flex items-center gap-1.5">
        <RefreshCw size={10} className="animate-spin-slow" /> {meta}
      </p>
    </div>
    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
  </Card>
));

export const DashboardPage: React.FC = () => {
  const { user, isSuperAdmin, isManager, isAuditor } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [storage, setStorage] = useState<any[]>([]);
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
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} height={180} borderRadius={24} />)}
        </div>
        <Skeleton height={400} borderRadius={24} />
      </div>
    );
  }

  const canViewLogs = isSuperAdmin || isManager || isAuditor;

  return (
    <div className="space-y-8 pb-10">
      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Total Revenue"
          value={stats.revenue}
          meta={`₦${stats.todayRevenue.toLocaleString()} earned today`}
          icon={DollarSign}
          trend={12.5}
          trendType="blue"
        />
        <KPICard
          label="Net Profit"
          value={stats.profit}
          meta="Based on approved expenses"
          icon={TrendingUp}
          trend={8.4}
          trendType="up"
        />
        <KPICard
          label="Restock Needed"
          value={stats.lowStock}
          meta="Critical items in storage"
          icon={Package}
          trend={-2.1}
          trendType="down"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          <Card 
            title="Revenue Performance" 
            subtitle="Financial growth visualization"
            footer={
              <div className="flex items-center gap-3">
                 <Badge variant="success">+{revenuePeriod === 'weekly' ? '12%' : '24%'} growth</Badge>
                 <span className="text-xs text-muted-foreground font-medium">vs last period</span>
              </div>
            }
          >
            <div className="flex items-center justify-end mb-6 gap-2">
              <Button 
                variant={revenuePeriod === 'weekly' ? 'primary' : 'secondary'} 
                size="sm" 
                onClick={() => setRevenuePeriod('weekly')}
                className="rounded-xl px-4"
              >
                7 Days
              </Button>
              <Button 
                variant={revenuePeriod === 'monthly' ? 'primary' : 'secondary'} 
                size="sm" 
                onClick={() => setRevenuePeriod('monthly')}
                className="rounded-xl px-4"
              >
                30 Days
              </Button>
            </div>
            
            <div className="h-[350px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--primary)" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#chartGradient)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {canViewLogs && (
            <Card title="Activity Log" subtitle="Real-time farm events" className="h-full">
              <div className="space-y-5">
                {activity.map((log) => (
                  <div key={log.id} className="flex gap-4 items-start group">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${log.isDeleted ? 'bg-rose-500' : 'bg-primary'} group-hover:scale-150 transition-transform`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-sm font-bold truncate tracking-tight">{log.userName}</p>
                        <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Performed <span className="font-bold text-foreground lowercase opacity-80">{log.action.replace('_', ' ')}</span> operation
                      </p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto">
                      <History className="text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium italic">No logs found today.</p>
                  </div>
                )}
                <Button variant="ghost" fullWidth size="sm" onClick={() => navigate('/admin/activity')} className="mt-4 hover:bg-primary/5 hover:text-primary py-4">
                  Full Audit Trail <ChevronRight size={14} className="ml-1" strokeWidth={3} />
                </Button>
              </div>
            </Card>
          )}

          <Card title="Inventory Health" subtitle="Critical stock alerts">
             <div className="space-y-6">
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).slice(0, 3).map((item) => (
                  <div key={item.id} className="space-y-3">
                     <div className="flex justify-between items-center bg-rose-500/5 p-2 rounded-xl">
                        <span className="text-sm font-bold truncate pr-4">{item.name}</span>
                        <Badge variant="error" className="animate-pulse">Low</Badge>
                     </div>
                     <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: '20%' }} />
                     </div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                        Threshold: {item.min_threshold} {item.unit}
                     </p>
                  </div>
                ))}
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).length === 0 && (
                  <div className="py-8 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                    <Zap className="text-emerald-500 mx-auto mb-3" size={32} />
                    <p className="text-sm font-bold text-emerald-600">Storage Stable</p>
                    <p className="text-[10px] text-emerald-600/60 uppercase font-black mt-1">All stocks optimal</p>
                  </div>
                )}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
