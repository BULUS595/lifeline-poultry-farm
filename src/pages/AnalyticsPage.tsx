import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
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
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { Expense } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const AnalyticsPage: React.FC = () => {
  const { isSuperAdmin, isManager, isAccountant, isAuditor } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDateStr = '';
      const now = new Date();
      if (period === 'daily') now.setDate(now.getDate() - 7);
      else if (period === 'weekly') now.setDate(now.getDate() - 30);
      else now.setMonth(now.getMonth() - 3);
      startDateStr = now.toISOString();

      const [salesRes, expensesRes] = await Promise.all([
        supabase.from('retail_sales').select('*').gte('created_at', startDateStr).order('created_at', { ascending: true }),
        supabase.from('expenses').select('*').gte('date', startDateStr.split('T')[0]).order('date', { ascending: true })
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
    } catch (error) {
      console.error('Analytics load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

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
    return Object.values(dataMap).map(item => ({ ...item, profit: item.revenue - item.expenses }))
                 .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [sales, expenses]);

  const bestSellers = useMemo(() => {
    const items: Record<string, number> = {};
    sales.forEach(s => {
      let safeItems = Array.isArray(s.items) ? s.items : [];
      if (typeof s.items === 'string') { try { safeItems = JSON.parse(s.items); } catch (e) {} }
      if (Array.isArray(safeItems)) {
        safeItems.forEach((item: any) => { items[item.name] = (items[item.name] || 0) + (item.quantity || 0); });
      }
    });
    return Object.entries(items).map(([name, value]) => ({ name, value }))
                 .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [sales]);

  const canView = isSuperAdmin || isManager || isAccountant || isAuditor;
  if (!canView) return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-8 animate-slide-up px-6">
       <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-2 animate-bounce-slow">
         <ShieldCheck size={48} strokeWidth={2.5} />
       </div>
       <div className="space-y-4">
         <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Access Restriction <span className="text-rose-500 italic underline">Protocol</span></h2>
         <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Financial node only accessible to authorized personnel with L2 clearance or higher.</p>
       </div>
       <Button variant="secondary" className="rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
          Return to Dashboard
       </Button>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
             Financial <span className="text-primary italic underline underline-offset-8 decoration-4">Terminal</span>
           </h1>
           <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Global farm performance metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-card/40 backdrop-blur-xl p-2 rounded-2xl border border-border/40 shadow-premium">
           {['daily', 'weekly', 'monthly'].map(p => (
              <button 
                key={p} 
                onClick={() => setPeriod(p as any)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${period === p ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                {p === 'daily' ? '7D Node' : p === 'weekly' ? '30D Node' : 'Quarter View'}
              </button>
           ))}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Cumulative Revenue', value: financialStats.revenue, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', trend: 12.5 },
            { label: 'Aggregate Expenses', value: financialStats.cost, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: -4.2 },
            { label: 'Net Profit', value: financialStats.profit, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 8.9 },
            { label: 'Relative Margin', value: financialStats.margin, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', unit: '%', trend: 2.1 }
          ].map((stat, i) => (
            <Card key={i} hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 overflow-hidden" noPadding>
               <div className="p-8 pb-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                         <stat.icon size={28} strokeWidth={2.5} />
                      </div>
                      {stat.trend && (
                        <Badge variant={stat.trend > 0 ? 'success' : 'danger'} className="font-black text-[10px] px-3 py-1.5 flex items-center gap-1.5 ring-4 ring-background/50">
                          {stat.trend > 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
                          {Math.abs(stat.trend)}%
                        </Badge>
                      )}
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">{stat.label}</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums">
                        {stat.unit === '%' ? '' : '₦'}{stat.value.toLocaleString()}{stat.unit || ''}
                      </h3>
                   </div>
               </div>
               <div className="h-2 w-full bg-muted/20">
                  <div className={`h-full ${stat.color.replace('text', 'bg')} opacity-40`} style={{ width: '65%' }} />
               </div>
               <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
            </Card>
          ))}
      </div>

      {/* Main Flow Chart */}
      <Card title="Flow Metrics" subtitle="Real-time financial performance tracking" className="rounded-[48px] border-border/40 bg-card/40 backdrop-blur-xl p-8" noPadding>
         <div className="h-[500px] w-full pt-12">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                     <linearGradient id="glowRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                     </linearGradient>
                     <linearGradient id="glowExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(244 63 94)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="rgb(244 63 94)" stopOpacity={0} />
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} 
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
                    contentStyle={{ borderRadius: '24px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-premium)', padding: '20px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}
                    cursor={{ stroke: 'var(--primary)', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Legend verticalAlign="top" align="right" height={60} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }} />
                  <Area name="Authorized Revenue" type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={6} fillOpacity={1} fill="url(#glowRev)" animationDuration={2500} activeDot={{ r: 8, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 4 }} />
                  <Area name="Vetted Expenses" type="monotone" dataKey="expenses" stroke="rgb(244 63 94)" strokeWidth={6} fillOpacity={1} fill="url(#glowExp)" animationDuration={2500} activeDot={{ r: 8, fill: 'rgb(244 63 94)', stroke: 'var(--background)', strokeWidth: 4 }} />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Distribution Pie */}
          <Card title="P&L Distribution" subtitle="Net retention vs operational volume" className="border-border/40 bg-card/60 backdrop-blur-sm p-8 pb-12">
             <div className="h-[320px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={[{ name: 'Net Retention', value: financialStats.profit }, { name: 'Operational Burden', value: financialStats.cost }]}
                        cx="50%" cy="50%" innerRadius={85} outerRadius={120} paddingAngle={8} stroke="none" dataKey="value"
                        animationBegin={500} animationDuration={1500}
                      >
                         <Cell fill="var(--primary)" className="drop-shadow-glow" />
                         <Cell fill="rgb(244 63 94)" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-xl)' }}
                        itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="diamond" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }} />
                   </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <Zap size={32} className="text-primary animate-pulse mb-1" fill="currentColor" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40">Healthy</span>
                </div>
             </div>
          </Card>

          {/* Performance Rankings */}
          <Card title="Sales Velocity" subtitle="Critical inventory movement tracking" className="border-border/40 bg-card/60 backdrop-blur-sm p-8">
             <div className="space-y-7 pt-4">
                {bestSellers.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-6 p-5 bg-card border border-border/40 rounded-[28px] group hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 shadow-sm">
                     <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center text-primary font-black text-2xl italic group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-500 border border-border/40">
                        #{idx + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-2.5">
                            <h4 className="font-black uppercase tracking-tight truncate pr-4 text-[15px] italic leading-none">{item.name}</h4>
                            <span className="text-[11px] font-black tabular-nums tracking-widest text-primary italic">{item.value} UNITS</span>
                        </div>
                        <div className="flex items-center gap-0 mt-3">
                           <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden border border-border/20">
                              <div className="h-full bg-primary rounded-full group-hover:shadow-glow transition-all duration-1000" style={{ width: `${(item.value / bestSellers[0].value) * 100}%` }} />
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
                {bestSellers.length === 0 && (
                  <div className="py-24 text-center opacity-40 bg-muted/5 rounded-[40px] border-2 border-dashed border-border/50">
                     <Layers size={64} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">No circulation logs detected</p>
                  </div>
                )}
                <Button variant="ghost" fullWidth className="mt-4 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px] opacity-40 hover:opacity-100 hover:bg-primary/5 hover:text-primary transition-all">
                    Generate Extended Analytics Report
                </Button>
             </div>
          </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
