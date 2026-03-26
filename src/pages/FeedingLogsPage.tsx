import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle2,
  Activity,
  ClipboardList,
  TrendingUp,
  Utensils,
  Package,
  History,
  Filter,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabaseDataService } from '../services/supabaseService';
import { FeedingLogForm } from '../components/FeedingLogForm';
import type { FeedingLog } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const FeedingLogsPage: React.FC<{ farmId: string }> = ({ farmId }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const data = await supabaseDataService.getFeedingLogs(farmId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setLogs(data as FeedingLog[]);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleFormSubmit = (log: FeedingLog) => {
    setLogs([log, ...logs] as FeedingLog[]);
    setShowForm(false);
  };

  const stats = {
    total: logs.reduce((sum, log) => sum + log.quantity, 0),
    avg: logs.length > 0 ? (logs.reduce((sum, log) => sum + log.quantity, 0) / logs.length).toFixed(1) : '0',
    types: [...new Set(logs.map(log => log.feedType))].length,
    count: logs.length
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic">Nutrition <span className="text-primary italic underline">Terminal</span></h1>
           <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Operational deployment of resource SKUs</p>
        </div>
        <Button size="lg" className="rounded-2xl px-8 shadow-glow" onClick={() => setShowForm(!showForm)} leftIcon={showForm ? X : Plus}>
           {showForm ? 'Cancel Entry' : 'Add Feeding Log'}
        </Button>
      </div>

      {/* Submission Form Overlay */}
      {showForm && (
        <Card className="border-l-4 border-l-primary animate-in slide-in-from-top duration-300" noPadding title="Nutritional Deployment">
           <div className="p-8">
              <FeedingLogForm
                farmId={farmId}
                workerId={user?.id || ''}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
           </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Cumulative Mass', value: stats.total.toLocaleString(), unit: 'KG', icon: Utensils, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Avg Session', value: stats.avg, unit: 'UNITS', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Unique SKUs', value: stats.types, unit: 'TYPES', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Session Count', value: stats.count, unit: 'LOGS', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
          ].map((stat, i) => (
            <Card key={i} className="relative overflow-hidden group">
               <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}><stat.icon size={20} strokeWidth={2.5} /></div>
                  <div className="w-12 h-1 bg-muted/30 rounded-full" />
               </div>
               <div className="mt-5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black tracking-tighter mt-1">{stat.value} <span className="text-[10px] opacity-40 italic">{stat.unit}</span></h3>
               </div>
            </Card>
          ))}
      </div>

      {/* Period Filter */}
      <Card className="rounded-[40px] p-2" noPadding>
          <div className="p-4 flex items-center gap-4">
              <Calendar className="text-primary" size={20} />
              <div className="flex-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Historical Window</p>
                 <input type="month" className="bg-transparent font-bold text-sm outline-none w-full" value={selectedDate.slice(0, 7)} onChange={e => setSelectedDate(`${e.target.value}-01`)} />
              </div>
              <div className="w-px h-10 bg-border/50" />
              <Button variant="ghost" size="icon" className="rounded-xl"><Filter size={18} /></Button>
          </div>
      </Card>

      {/* Data List */}
      <div className="space-y-4">
          {loading ? (
             [1,2,3,4].map(i => <Skeleton key={i} height={80} borderRadius={24} />)
          ) : logs.length === 0 ? (
             <div className="py-20 text-center opacity-20">
                <History size={80} strokeWidth={1} className="mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest italic">No deployments logged in this window</p>
             </div>
          ) : (
             logs.map(log => (
                <Card key={log.id} className="group hover:border-primary/30 hover:bg-primary/5 transition-all p-4 border-l-4 border-l-border/50 hover:border-l-primary" noPadding>
                   <div className="flex items-center gap-5 p-2">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-110 transition-transform">
                          <Utensils size={18} className="text-primary" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-4 mb-1">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0.5"><Clock size={10} className="mr-1" /> {log.time}</Badge>
                             </div>
                             <span className="text-lg font-black tracking-tighter italic">{log.quantity.toLocaleString()} {log.unit.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Package size={12} className="text-muted-foreground opacity-50" />
                                <span className="text-xs font-bold text-muted-foreground uppercase opacity-80">{log.feedType}</span>
                             </div>
                             <span className="text-[10px] font-medium text-muted-foreground italic truncate max-w-[200px] opacity-60">
                                {log.notes || 'Routine deployment'}
                             </span>
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 size={16} />
                       </div>
                   </div>
                </Card>
             ))
          )}
      </div>
    </div>
  );
};

export default FeedingLogsPage;
