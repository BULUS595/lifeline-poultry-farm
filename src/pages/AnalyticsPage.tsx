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
} from 'lucide-react';
import type { Expense } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const AnalyticsPage: React.FC = () => {
  const { isSuperAdmin, isManager, isAccountant, isAuditor } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
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
        supabase.from('expenses').select('*').eq('status', 'approved').gte('date', startDateStr.split('T')[0]).order('date', { ascending: true })
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
    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4 opacity-50">
       <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 mb-2"><TrendingDown size={48} /></div>
       <h2 className="text-2xl font-black uppercase tracking-tight italic">Access Restricted</h2>
       <p className="max-w-xs font-medium">Financial data is only available to authorized accounting and management roles.</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic">Financial <span className="text-primary italic underline">Terminal</span></h1>
           <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Consolidated analytics from all farm operations</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-1.5 rounded-2xl border border-border shadow-soft">
           {['daily', 'weekly', 'monthly'].map(p => (
              <button 
                key={p} 
                onClick={() => setPeriod(p as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {p === 'daily' ? '7D' : p === 'weekly' ? '30D' : 'QUARTER'}
              </button>
           ))}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Cumulative Revenue', value: financialStats.revenue, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', trend: 12.5 },
            { label: 'Aggregate Expenses', value: financialStats.cost, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: -4.2 },
            { label: 'Net Profit', value: financialStats.profit, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 8.9 },
            { label: 'Relative Margin', value: financialStats.margin, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', unit: '%', trend: 2.1 }
          ].map((stat, i) => (
            <Card key={i} hoverable className="relative overflow-hidden group">
               <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                     <stat.icon size={24} strokeWidth={2.5} />
                  </div>
                  {stat.trend && (
                    <Badge variant={stat.trend > 0 ? 'success' : 'error'} className="font-black text-[10px] px-2 py-1 flex items-center gap-1">
                      {stat.trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(stat.trend)}%
                    </Badge>
                  )}
               </div>
               <div className="mt-5 space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-3xl font-black tracking-tighter">
                    {stat.unit === '%' ? '' : '₦'}{stat.value.toLocaleString()}{stat.unit || ''}
                  </h3>
               </div>
               <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-muted/10 rounded-full blur-2xl group-hover:bg-primary/5 transition-all" />
            </Card>
          ))}
      </div>

      {/* Main Flow Chart */}
      <Card title="Flow Metrics" subtitle="Real-time performance tracking" className="rounded-[40px]">
         <div className="h-[450px] w-full pt-10">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                  <defs>
                     <linearGradient id="glowRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                     </linearGradient>
                     <linearGradient id="glowExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(244 63 94)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="rgb(244 63 94)" stopOpacity={0} />
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-xl)' }}
                    itemStyle={{ fontWeight: 800 }}
                  />
                  <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                  <Area name="Revenue" type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#glowRev)" animationDuration={2000} />
                  <Area name="Expenses" type="monotone" dataKey="expenses" stroke="rgb(244 63 94)" strokeWidth={4} fillOpacity={1} fill="url(#glowExp)" animationDuration={2000} />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Distribution Pie */}
          <Card title="P&L Distribution" subtitle="Net retention vs operational costs">
             <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={[{ name: 'Retention', value: financialStats.profit }, { name: 'Operations', value: financialStats.cost }]}
                        cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} stroke="none" dataKey="value"
                      >
                         <Cell fill="var(--primary)" />
                         <Cell fill="rgb(244 63 94)" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </Card>

          {/* Performance Rankings */}
          <Card title="Sales Velocity" subtitle="Top moving inventory items">
             <div className="space-y-6 pt-4">
                {bestSellers.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-5 p-4 bg-muted/10 rounded-3xl border border-border/50 group hover:border-primary/30 transition-all">
                     <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl italic group-hover:scale-110 transition-transform">
                        #{idx + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full group-hover:animate-pulse" style={{ width: `${(item.value / bestSellers[0].value) * 100}%` }} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.value} Units</span>
                        </div>
                     </div>
                  </div>
                ))}
                {bestSellers.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                     <Layers size={48} className="mx-auto mb-2" />
                     <p className="text-xs font-bold uppercase tracking-widest">No Circulation Logs</p>
                  </div>
                )}
             </div>
          </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
