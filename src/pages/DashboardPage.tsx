import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Package,
  History,
  DollarSign,
  Zap,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Layers,
  ShieldCheck,
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

/* Sub-components */
const KPICard = React.memo(({ label, value, meta, icon: Icon, trend, trendType = 'primary' }: any) => (
  <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-xl p-0 h-full shadow-premium" noPadding>
    <div className="flex items-start justify-between p-8">
      <div className={`p-4 rounded-[28px] ${trendType === 'up' ? 'bg-emerald-500/10 text-emerald-500 shadow-glow' : (trendType === 'down' ? 'bg-rose-500/10 text-rose-500 shadow-glow' : 'bg-primary/10 text-primary shadow-glow')} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
        <Icon size={32} strokeWidth={2.5} />
      </div>
      {trend && (
        <Badge variant={trend > 0 ? 'success' : 'danger'} className="font-black text-[10px] px-3 py-1.5 flex items-center gap-1.5 ring-4 ring-background/50 shadow-sm italic">
          {trend > 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
          {Math.abs(trend)}%
        </Badge>
      )}
    </div>
    <div className="px-8 pb-10">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-40 mb-2 italic">{label}</p>
      <h2 className="text-4xl font-black tracking-tighter leading-none shrink-0 tabular-nums italic">
        {label.toLowerCase().includes('stock') ? '' : '₦'}{value.toLocaleString()}
      </h2>
      <div className="mt-5 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shadow-glow animate-pulse ${trendType === 'up' ? 'bg-emerald-500' : (trendType === 'down' ? 'bg-rose-500' : 'bg-primary')}`} />
        <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">
           {meta}
        </p>
      </div>
    </div>
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-700 pointer-events-none" />
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
             userName: l.performed_by_name || 'System Auth',
             action: l.action_type,
             isDeleted: l.action_type === 'DELETE',
             timestamp: l.timestamp
           }));
           setActivity(formattedLogs);
        }
      }
    } catch (err) {
      console.error('Dashboard synchronization failed:', err);
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
          {[1, 2, 3].map(i => <Skeleton key={i} height={220} borderRadius={48} />)}
        </div>
        <Skeleton height={550} borderRadius={48} />
      </div>
    );
  }

  const canViewLogs = isSuperAdmin || isManager || isAuditor;

  return (
    <div className="space-y-16 pb-20 animate-slide-up">
      {/* Header with quick actions */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end px-2">
          <div>
             <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
               Command <span className="text-primary italic underline underline-offset-8 decoration-primary/20 decoration-4">Dashboard</span>
             </h1>
             <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40 italic">Global operational oversight and forensic data analysis</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl bg-card border-border/40 shadow-sm" onClick={loadData}>
                <RefreshCw size={24} strokeWidth={2.5} className={isLoading ? 'animate-spin' : ''} />
             </Button>
             <Button className="rounded-3xl h-14 px-8 font-black uppercase tracking-tight italic shadow-glow" onClick={() => navigate('/admin/analytics')}>
                <Zap size={20} className="mr-3" fill="currentColor" /> Detailed Analytics
             </Button>
          </div>
      </div>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <KPICard
          label="Global Yield"
          value={stats.revenue}
          meta={`₦${stats.todayRevenue.toLocaleString()} in current shift`}
          icon={DollarSign}
          trend={12.5}
          trendType="primary"
        />
        <KPICard
          label="Consolidated Profit"
          value={stats.profit}
          meta="Net after verified expenses"
          icon={TrendingUp}
          trend={8.4}
          trendType="up"
        />
        <KPICard
          label="Restock Required"
          value={stats.lowStock}
          meta="Critical logistics warnings"
          icon={Package}
          trend={-2.1}
          trendType="down"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 space-y-12">
          <Card className="rounded-[48px] border-border/40 bg-card/40 backdrop-blur-xl shadow-premium p-0 overflow-hidden" noPadding>
            <div className="p-10 border-b border-border/20 bg-muted/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Yield Performance</h3>
                   <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 mt-3 italic">Autonomous satellite data capture</p>
                </div>
                <div className="flex bg-background/50 p-2 rounded-[24px] border border-border/40 shadow-sm shrink-0">
                   <button 
                        onClick={() => setRevenuePeriod('weekly')} 
                        className={`px-6 py-2.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest italic ${revenuePeriod === 'weekly' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50'}`}
                   >
                        7D View
                   </button>
                   <button 
                        onClick={() => setRevenuePeriod('monthly')} 
                        className={`px-6 py-2.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest italic ${revenuePeriod === 'monthly' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50'}`}
                   >
                        30D View
                   </button>
                </div>
            </div>
            
            <div className="p-10">
                <div className="h-[450px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="var(--border)" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}
                        dy={20}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 900 }}
                        tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '32px', 
                          border: '4px solid var(--border)',
                          boxShadow: 'var(--shadow-premium)',
                          backgroundColor: 'var(--card)',
                          color: 'var(--foreground)',
                          padding: '24px',
                          fontWeight: 'black',
                          textTransform: 'uppercase',
                          fontStyle: 'italic',
                          letterSpacing: '-0.025em'
                        }}
                        cursor={{ stroke: 'var(--primary)', strokeWidth: 3, strokeDasharray: '6 6' }}
                        formatter={(value: any) => [`₦${value.toLocaleString()}`, 'Yield']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--primary)" 
                        strokeWidth={6} 
                        fillOpacity={1} 
                        fill="url(#chartGradient)" 
                        animationDuration={2500}
                        activeDot={{ r: 10, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 5, shadow: 'var(--shadow-glow)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-12 flex flex-wrap items-center gap-8 justify-center pt-8 border-t border-border/10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-sm"><TrendingUp size={20} strokeWidth={3} /></div>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mb-1">Period Delta</p>
                         <p className="text-sm font-black italic">+{revenuePeriod === 'weekly' ? '12.4' : '24.8'}% Deviation</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm"><ShieldCheck size={20} strokeWidth={3} /></div>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mb-1">Data Integrity</p>
                         <p className="text-sm font-black italic uppercase">Forensic Validated</p>
                      </div>
                   </div>
                </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-12">
          {canViewLogs && (
            <Card className="h-full rounded-[48px] border-border/40 bg-card/60 backdrop-blur-xl shadow-premium p-0 overflow-hidden" noPadding>
              <div className="p-10 border-b border-border/20 bg-muted/5">
                 <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none">Operational Log</h3>
                 <p className="text-[10px] font-black uppercase text-muted-foreground opacity-40 mt-3 tracking-widest italic leading-none">Real-time personnel node tracking</p>
              </div>
              <div className="p-10 space-y-10">
                {activity.map((log) => (
                  <div key={log.id} className="flex gap-6 items-start group relative">
                    <div className={`mt-2 w-3.5 h-3.5 rounded-full shrink-0 border-4 border-background shadow-glow transition-all duration-500 group-hover:scale-150 ${log.isDeleted ? 'bg-rose-500 shadow-rose-500/30' : 'bg-primary shadow-primary/30'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-black truncate tracking-tight uppercase leading-none italic group-hover:text-primary transition-colors">{log.userName}</p>
                        <span className="text-[9px] font-black text-muted-foreground opacity-30 uppercase tracking-[0.2em] tabular-nums">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-black uppercase tracking-widest opacity-40 italic">
                        {log.action.replace('_', ' ')} <span className="text-[9px] not-italic font-medium lowercase opacity-60">protocol initiated</span>
                      </p>
                    </div>
                  </div>
                ))}
                
                {activity.length === 0 && (
                  <div className="py-20 text-center space-y-6 opacity-40">
                    <History size={80} strokeWidth={1} className="mx-auto text-muted-foreground/20" />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] italic">System Idle Node — No recent logs</p>
                  </div>
                )}
                
                <Button variant="ghost" fullWidth className="mt-6 h-16 rounded-[28px] bg-muted/20 border border-border/20 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all font-black uppercase tracking-widest text-[10px] italic" onClick={() => navigate('/admin/activity')}>
                  Audit Full Payload <ChevronRight size={18} className="ml-2" strokeWidth={3} />
                </Button>
              </div>
            </Card>
          )}

          <Card className="rounded-[48px] border-border/40 bg-card/60 backdrop-blur-xl shadow-premium p-0 overflow-hidden" noPadding>
             <div className="p-10 border-b border-border/20 bg-muted/5">
                <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none">Security Node</h3>
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-40 mt-3 tracking-widest italic leading-none">Global risk and stock alerts</p>
             </div>
             <div className="p-10 space-y-10">
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).slice(0, 3).map((item) => (
                  <div key={item.id} className="space-y-5 group">
                     <div className="flex justify-between items-center bg-rose-500/5 p-6 rounded-[32px] border border-rose-500/20 group-hover:bg-rose-500/10 transition-all duration-500">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1 leading-none italic">Depletion Incident</span>
                           <span className="text-lg font-black truncate pr-4 uppercase tracking-tighter italic">{item.name}</span>
                        </div>
                        <Badge variant="danger" className="animate-pulse shadow-glow ring-4 ring-background/50 h-10 px-6 font-black tracking-widest italic">RESTOCK</Badge>
                     </div>
                     <div className="px-2 space-y-3">
                        <div className="h-4 w-full bg-muted/20 rounded-full overflow-hidden border border-border/10 p-1">
                            <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-glow animate-pulse" style={{ width: '22%' }} />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-glow animate-pulse" />
                               <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic opacity-60">System Critical</span>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 tabular-nums">
                                {item.quantity} / {item.min_threshold} <span className="opacity-60">{item.unit.toUpperCase()}</span>
                            </span>
                        </div>
                     </div>
                  </div>
                ))}
                
                {storage.filter(i => (i.quantity || 0) <= (i.min_threshold || 0)).length === 0 && (
                  <div className="py-24 text-center bg-emerald-500/5 rounded-[48px] border-4 border-dashed border-emerald-500/20 group hover:bg-emerald-500/10 transition-all duration-700">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 border-2 border-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-glow">
                        <Zap className="text-emerald-500" size={36} fill="currentColor" strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-emerald-600 uppercase tracking-tighter italic italic">Logistics Nominal</p>
                        <p className="text-[10px] text-emerald-500/40 uppercase font-black tracking-[0.2em] italic">All resource levels authenticated</p>
                    </div>
                  </div>
                )}
                
                <Button variant="outline" fullWidth className="h-16 rounded-[28px] border-border/40 font-black uppercase tracking-widest text-[10px] italic hover:bg-card/60 transition-all" onClick={() => navigate('/stock')}>
                   Initialize Procurement <LayoutGrid size={18} className="ml-3" strokeWidth={3} />
                </Button>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
