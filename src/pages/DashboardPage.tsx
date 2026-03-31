import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Package,
  History,
  DollarSign,
  Zap,
  ArrowDownRight,
  RefreshCw,
  LayoutGrid,
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

/* KPI Component */
const KPICard = React.memo(({ label, value, meta, icon: Icon, trend, trendType = 'primary' }: any) => (
  <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-xl p-0 h-full shadow-premium" noPadding>
    <div className="flex items-start justify-between p-8">
      <div className={`p-4 rounded-[24px] ${trendType === 'up' ? 'bg-emerald-500/10 text-emerald-500 shadow-glow' : (trendType === 'down' ? 'bg-rose-500/10 text-rose-500 shadow-glow' : 'bg-primary/10 text-primary shadow-glow')} group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={30} strokeWidth={2.5} />
      </div>
      {trend !== undefined && (
        <Badge variant={trend > 0 ? 'success' : 'danger'} className="font-bold text-[9px] px-3 py-1.5 flex items-center gap-1 shadow-sm">
          {trend > 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
          {Math.abs(trend)}%
        </Badge>
      )}
    </div>
    <div className="px-8 pb-10">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 mb-2">{label}</p>
      <h2 className="text-4xl font-black tracking-tighter leading-none tabular-nums">
        {label.toLowerCase().includes('stock') ? '' : '₦'}{value.toLocaleString()}
      </h2>
      <div className="mt-4 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${trendType === 'up' ? 'bg-emerald-500' : (trendType === 'down' ? 'bg-rose-500' : 'bg-primary')}`} />
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
           {meta}
        </p>
      </div>
    </div>
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
          supabase.from('stock_activity_logs').select('*').limit(10).order('timestamp', { ascending: false })
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
      console.error('Dashboard data update failed:', err);
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
    const lowStockCount = storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).length;

    return { revenue: totalSales, todayRevenue: todaySales, profit: totalSales - totalExp, lowStock: lowStockCount };
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
      <div className="space-y-12 animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} height={200} borderRadius={40} />)}
        </div>
        <Skeleton height={500} borderRadius={40} />
      </div>
    );
  }

  const canViewLogs = isSuperAdmin || isManager || isAuditor;

  return (
    <div className="space-y-12 pb-20 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center px-2">
          <div>
             <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
               Farm <span className="text-primary underline underline-offset-8 decoration-primary/10 decoration-4">Overview</span>
             </h1>
             <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest mt-3 opacity-50 italic">Operational summary and business performance</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl bg-card border-border/40 shadow-sm" onClick={loadData}>
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
             </Button>
             <Button className="rounded-xl h-12 px-6 font-bold uppercase text-[10px] tracking-widest shadow-lg" onClick={() => navigate('/admin/analytics')}>
                View Reports
             </Button>
          </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <KPICard
          label="Total Revenue"
          value={stats.revenue}
          meta={`₦${stats.todayRevenue.toLocaleString()} earned today`}
          icon={DollarSign}
          trend={12.5}
        />
        <KPICard
          label="Net Profit"
          value={stats.profit}
          meta="Revenue minus expenses"
          icon={TrendingUp}
          trend={8.4}
          trendType="up"
        />
        <KPICard
          label="Low Stock Items"
          value={stats.lowStock}
          meta="Items requiring restock"
          icon={Package}
          trend={-2.1}
          trendType="down"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-[40px] border-border/40 shadow-premium p-0" noPadding>
            <div className="p-8 border-b border-border/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tighter">Revenue Trends</h3>
                   <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest opacity-40 mt-1 italic">Sales performance over time</p>
                </div>
                <div className="flex bg-muted/5 p-1.5 rounded-xl border border-border/20 shadow-sm">
                   <button 
                        onClick={() => setRevenuePeriod('weekly')} 
                        className={`px-5 py-2 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest ${revenuePeriod === 'weekly' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/10'}`}
                   >
                        7 Days
                   </button>
                   <button 
                        onClick={() => setRevenuePeriod('monthly')} 
                        className={`px-5 py-2 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest ${revenuePeriod === 'monthly' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/10'}`}
                   >
                        30 Days
                   </button>
                </div>
            </div>
            
            <div className="p-10">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontWeight: 700 }}
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontWeight: 700 }}
                        tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none',
                          boxShadow: 'var(--shadow-lg)',
                          backgroundColor: 'var(--card)',
                          padding: '16px',
                        }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--primary)" 
                        strokeWidth={3} 
                        fill="url(#chartGradient)" 
                        animationDuration={1500}
                        activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          {canViewLogs && (
            <Card className="rounded-[40px] border-border/40 shadow-premium p-0 overflow-hidden" noPadding>
              <div className="p-8 border-b border-border/10 bg-muted/5">
                 <h3 className="text-lg font-black uppercase tracking-tighter">Recent Logs</h3>
                 <p className="text-[9px] font-bold uppercase text-muted-foreground opacity-40 mt-1 tracking-widest">Update history</p>
              </div>
              <div className="p-8 space-y-8">
                {activity.map((log) => (
                  <div key={log.id} className="flex gap-4 items-start group">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${log.isDeleted ? 'bg-rose-500' : 'bg-primary'} shadow-sm`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-bold truncate tracking-tight uppercase">{log.userName}</p>
                        <span className="text-[9px] font-bold text-muted-foreground opacity-30 uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                        {log.action.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {activity.length === 0 && (
                  <div className="py-12 text-center opacity-30">
                    <History size={48} strokeWidth={1} className="mx-auto" />
                    <p className="text-[9px] font-bold uppercase mt-4">Empty logs</p>
                  </div>
                )}
                
                <Button variant="ghost" fullWidth className="h-14 rounded-2xl bg-muted/5 border border-border/10 hover:bg-primary/5 hover:text-primary transition-all font-bold uppercase text-[9px] tracking-widest" onClick={() => navigate('/admin/activity')}>
                  All Activities <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          )}

          <Card className="rounded-[40px] border-border/40 shadow-premium p-0" noPadding>
              <div className="p-8 border-b border-border/10">
                 <h3 className="text-lg font-black uppercase tracking-tighter">Stock Alerts</h3>
              </div>
              <div className="p-8 space-y-6">
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).slice(0, 2).map((item) => (
                  <div key={item.id} className="space-y-4">
                     <div className="flex justify-between items-center bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-bold uppercase text-rose-500 mb-1">Low Stock</span>
                           <span className="text-md font-bold truncate uppercase tracking-tighter">{item.name}</span>
                        </div>
                        <Badge variant="danger" className="text-[8px] font-black h-8 px-4 flex items-center">REQ. REPLENISH</Badge>
                     </div>
                     <div className="px-1 space-y-2">
                        <div className="h-2 w-full bg-muted/10 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: '25%' }} />
                        </div>
                        <div className="flex justify-between items-center px-1">
                             <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Action Required</span>
                             <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 tabular-nums">
                                 {item.quantity} / {item.min_threshold} {item.unit}
                             </span>
                        </div>
                     </div>
                  </div>
                ))}
                
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).length === 0 && (
                  <div className="py-12 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                    <Zap className="text-emerald-500 mx-auto mb-4" size={32} strokeWidth={3} />
                    <p className="text-xs font-bold text-emerald-600 uppercase">Stock Healthy</p>
                  </div>
                )}
                
                <Button variant="outline" fullWidth className="h-14 rounded-2xl border-border/40 font-bold uppercase text-[9px] tracking-widest" onClick={() => navigate('/stock')}>
                   Inventory <LayoutGrid size={14} className="ml-2" />
                </Button>
              </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
