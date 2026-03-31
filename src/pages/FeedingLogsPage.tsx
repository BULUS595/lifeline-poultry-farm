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
  ChevronDown,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabaseDataService } from '../services/supabaseService';
import { FeedingLogForm } from '../components/FeedingLogForm';
import type { FeedingLog } from '../types';
import { Card, Button, Badge, Modal } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

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
      console.error('Nutrition link error:', error);
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
    <div className="space-y-12 pb-20 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
             Nutrition <span className="text-primary italic underline underline-offset-8 decoration-4">Terminal</span>
           </h1>
           <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Feed deployment & consumption oversight</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <Card className="flex-1 md:flex-none p-0 overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm shadow-sm" noPadding>
                <div className="flex items-center gap-4 px-6 py-4">
                  <Calendar className="text-primary shrink-0" size={20} strokeWidth={2.5} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 leading-none mb-1">Audit Window</span>
                    <input 
                        type="month" 
                        className="bg-transparent font-black text-[13px] outline-none text-foreground uppercase tracking-tighter" 
                        value={selectedDate.slice(0, 7)} 
                        onChange={e => setSelectedDate(`${e.target.value}-01`)} 
                    />
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground ml-2 opacity-40" />
                </div>
            </Card>
            <Button size="lg" className="rounded-3xl px-10 py-8 text-lg shadow-glow font-black uppercase tracking-tight italic" onClick={() => setShowForm(true)}>
                <Plus className="mr-3 w-6 h-6" strokeWidth={3} /> Log Session
            </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Cumulative Mass', value: stats.total.toLocaleString(), unit: 'KG', icon: Utensils, color: 'text-primary', bg: 'bg-primary/10', trend: 4.2 },
            { label: 'Session Average', value: stats.avg, unit: 'UNITS', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 2.1 },
            { label: 'Resource SKUs', value: stats.types, unit: 'TYPES', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 0 },
            { label: 'Deployment Count', value: stats.count, unit: 'LOGS', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 1.5 }
          ].map((stat, i) => (
            <Card key={i} hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 overflow-hidden" noPadding>
               <div className="p-8 pb-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                         <stat.icon size={28} strokeWidth={2.5} />
                      </div>
                      {stat.trend > 0 && (
                        <Badge variant="primary" className="font-black text-[10px] px-3 py-1.5 flex items-center gap-1.5 ring-4 ring-background/50">
                          <ArrowUpRight size={12} strokeWidth={3} />
                          {stat.trend}%
                        </Badge>
                      )}
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">{stat.label}</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums shrink-0">
                        {stat.value} <span className="text-[10px] opacity-40 italic tracking-widest">{stat.unit}</span>
                      </h3>
                   </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700 pointer-events-none" />
            </Card>
          ))}
      </div>

      {/* Logs List */}
      <div className="space-y-6">
          <div className="flex items-center gap-4 px-2 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <ClipboardList size={20} className="text-primary" strokeWidth={2.5} />
              </div>
              <div>
                  <h3 className="font-black uppercase tracking-tighter text-xl leading-none">Activity History</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mt-1">Personnel verified deployment logs</p>
              </div>
          </div>

          {loading ? (
             [1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={100} borderRadius={32} />)
          ) : logs.length === 0 ? (
             <div className="py-28 text-center bg-muted/10 rounded-[48px] border-4 border-dashed border-border/40 opacity-40">
                <History size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter px-4">Zero nutrition records in current window</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 max-w-sm mx-auto opacity-60">System stands ready for new deployment protocol</p>
             </div>
          ) : (
             logs.map(log => (
                <Card key={log.id} className="group hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 border-l-8 border-l-border/40 hover:border-l-primary p-0 overflow-hidden" noPadding>
                   <div className="flex items-center gap-6 p-6 md:p-8">
                       <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                          <Utensils size={24} className="text-primary" strokeWidth={2.5} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2 mb-3">
                             <div className="flex items-center gap-4">
                                <p className="font-black text-xl tracking-tighter uppercase italic leading-none">{new Date(log.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                <Badge variant="primary" className="text-[10px] font-black px-3 py-1.5 shadow-sm">
                                    <Clock size={12} strokeWidth={3} className="mr-2" /> {log.time}
                                </Badge>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-3xl font-black tracking-tighter italic leading-none tabular-nums text-foreground group-hover:text-primary transition-colors">{log.quantity.toLocaleString()}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{log.unit.toUpperCase()}</span>
                             </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-6">
                             <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5 rounded-xl border border-border/40">
                                <Package size={14} strokeWidth={2.5} className="text-primary" />
                                <span className="text-[11px] font-black text-foreground uppercase tracking-widest italic">{log.feedType}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-glow" />
                                <span className="text-xs font-black italic text-muted-foreground opacity-60 truncate max-w-md">"{log.notes || 'Routine biological fuel deployment'}"</span>
                             </div>
                          </div>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 active:scale-90">
                          <CheckCircle2 size={24} strokeWidth={2.5} />
                       </div>
                   </div>
                </Card>
             ))
          )}
      </div>

      {/* Modal Entry Form */}
      <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Nutritional Deployment Protocol"
          maxWidth="xl"
      >
           <div className="space-y-10 py-2 animate-slide-up">
              <div className="p-8 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/20 relative overflow-hidden group">
                  <FeedingLogForm
                    farmId={farmId}
                    workerId={user?.id || ''}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowForm(false)}
                  />
                  <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
              </div>
              
              <div className="bg-muted/10 p-8 rounded-[32px] border border-border/40 flex items-start gap-6">
                  <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center border border-border/40 shrink-0 shadow-sm">
                      <Zap size={24} className="text-primary animate-pulse" fill="currentColor" />
                  </div>
                  <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Personnel Directive</h4>
                      <p className="text-xs font-black italic text-muted-foreground leading-relaxed opacity-60">
                        Ensure all resource SKUs are cross-referenced with physical storage levels before authorizing deployment logs. Accurate data maintains system biological stability.
                      </p>
                  </div>
              </div>
           </div>
      </Modal>
    </div>
  );
};

export default FeedingLogsPage;
