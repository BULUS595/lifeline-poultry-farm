import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Calendar,
  FileText,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  Activity,
  Info,
  Hash,
  UserCheck,
  History,
  TrendingDown,
  ChevronDown,
  ShieldX,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabaseDataService, supabase } from '../services/supabaseService';
import { MortalityLogForm } from '../components/MortalityLogForm';
import type { MortalityLog } from '../types';
import { Card, Button, Badge, Modal } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

export const MortalityLogsPage: React.FC<{ farmId: string }> = ({ farmId }) => {
  const { user, isSuperAdmin, isManager } = useAuth();
  const isInventory = user?.role === 'inventory_officer' || user?.role === 'inventory_staff';
  const canCreate = isInventory || isSuperAdmin || isManager;

  const [logs, setLogs] = useState<MortalityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingLogId, setActingLogId] = useState<string | null>(null);
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

      const data = await supabaseDataService.getMortalityLogs(farmId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setLogs(data as MortalityLog[]);
    } catch (error) {
      console.error('Attrition link error:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleDelete = async (log: MortalityLog) => {
    if (!isSuperAdmin && !isManager) return;
    if (!confirm('Authorize Record Deletion: This action is forensic and will be logged. Proceed?')) return;
    setActingLogId(log.id);
    try {
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        user_name: user?.name,
        action: 'DELETED_MORTALITY_LOG',
        data_type: 'mortality',
        data_id: log.id,
        details: `AUTHORIZED DELETION: Mortality of ${log.count} from ${log.date}`,
        previous_state: log,
        is_deleted: true,
        timestamp: new Date().toISOString()
      }]);
      await supabaseDataService.deleteMortalityLog(log.id);
      setLogs(logs.filter(l => l.id !== log.id));
    } catch (error) {
      console.error('Deletion protocol error:', error);
    } finally {
      setActingLogId(null);
    }
  };

  const handleFormSubmit = (log: MortalityLog) => {
    setLogs([log, ...logs] as MortalityLog[]);
    setShowForm(false);
  };

  const stats = {
    total: logs.reduce((sum, log) => sum + log.count, 0),
    avg: logs.length > 0 ? (logs.reduce((sum, log) => sum + log.count, 0) / logs.length).toFixed(1) : '0',
    count: logs.length
  };

  return (
    <div className="space-y-12 pb-20 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0 text-rose-500 underline underline-offset-8 decoration-rose-500/30 decoration-4">
             Attrition <span className="italic">Terminal</span>
           </h1>
           <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Biological stability and incident oversight</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <Card className="flex-1 md:flex-none p-0 overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm shadow-sm" noPadding>
                <div className="flex items-center gap-4 px-6 py-4">
                  <Calendar className="text-rose-500 shrink-0" size={20} strokeWidth={2.5} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 leading-none mb-1">Incident Window</span>
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
            {canCreate && (
                <Button size="lg" variant={showForm ? 'outline' : 'danger'} className="rounded-3xl px-10 py-8 text-lg shadow-glow font-black uppercase tracking-tight italic" onClick={() => setShowForm(true)}>
                    <Plus className="mr-3 w-6 h-6" strokeWidth={3} /> Record Incident
                </Button>
            )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { label: 'Total Attrition', value: stats.total, unit: 'BIRDS', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'Incident Velocity', value: stats.avg, unit: 'AVG/EVENT', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Historical Reports', value: stats.count, unit: 'FILES', icon: History, color: 'text-blue-500', bg: 'bg-blue-500/10' }
          ].map((stat, i) => (
            <Card key={i} hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 overflow-hidden" noPadding>
               <div className="p-8 pb-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                         <stat.icon size={28} strokeWidth={2.5} />
                      </div>
                      <div className="w-12 h-1 bg-muted/20 rounded-full" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">{stat.label}</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums shrink-0">
                        {stat.value} <span className="text-[10px] opacity-40 italic tracking-widest">{stat.unit}</span>
                      </h3>
                   </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-700 pointer-events-none" />
            </Card>
          ))}
      </div>

      {/* Incident List */}
      <div className="space-y-6">
          <div className="flex items-center gap-4 px-2 mb-2">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 shadow-glow">
                  <ShieldX size={20} className="text-rose-500" strokeWidth={2.5} />
              </div>
              <div>
                  <h3 className="font-black uppercase tracking-tighter text-xl leading-none">Vetted Incident reports</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mt-1">Personnel verified biological attrition logs</p>
              </div>
          </div>

          {loading ? (
             [1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={100} borderRadius={32} />)
          ) : logs.length === 0 ? (
             <div className="py-28 text-center bg-emerald-500/5 rounded-[48px] border-4 border-dashed border-emerald-500/40 opacity-40">
                <CheckCircle2 size={120} strokeWidth={1} className="mx-auto mb-6 text-emerald-500 opacity-20" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter px-4 text-emerald-600">Zero mortality events detected</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 max-w-sm mx-auto text-emerald-500 opacity-60">System operational stability: 100%</p>
             </div>
          ) : (
             logs.map(log => (
                <Card key={log.id} className="group hover:border-rose-500/40 hover:bg-rose-500/5 transition-all duration-500 border-l-8 border-l-border/40 hover:border-l-rose-500 p-0 overflow-hidden" noPadding>
                   <div className="flex items-center gap-6 p-6 md:p-8">
                       <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                          <AlertTriangle size={24} strokeWidth={2.5} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2 mb-3">
                             <div className="flex items-center gap-4">
                                <p className="font-black text-xl tracking-tighter uppercase italic leading-none">{new Date(log.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                <Badge variant="danger" className="text-[10px] font-black px-3 py-1.5 shadow-sm uppercase tracking-widest italic">
                                    <ShieldAlert size={12} strokeWidth={3} className="mr-2" /> {log.cause || 'Investigation Required'}
                                </Badge>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-3xl font-black tracking-tighter italic leading-none tabular-nums text-rose-600">-{log.count}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">UNITS lost</span>
                             </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-6">
                             <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5 rounded-xl border border-border/40">
                                <Hash size={14} strokeWidth={2.5} className="text-muted-foreground opacity-40" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest tabular-nums">{log.batchId || 'GLOBAL-SYSTEM'}</span>
                             </div>
                             <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5 rounded-xl border border-border/40">
                                <UserCheck size={14} strokeWidth={2.5} className="text-muted-foreground opacity-40" />
                                <span className="text-[11px] font-black text-foreground uppercase tracking-tighter italic">{log.workerName || 'Root Admin'}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-glow" />
                                <span className="text-xs font-black italic text-muted-foreground opacity-60 truncate max-w-sm">"{log.notes || 'No extended protocol notes'}"</span>
                             </div>
                          </div>
                       </div>
                       {(isSuperAdmin || isManager) && (
                          <Button variant="outline" size="icon" onClick={() => handleDelete(log)} className="w-12 h-12 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 active:scale-90" isLoading={actingLogId === log.id} disabled={!!actingLogId}><Trash2 size={18} strokeWidth={2.5} /></Button>
                       )}
                   </div>
                </Card>
             ))
          )}
      </div>

      {/* Modal Entry Form */}
      <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Incident Protocol Initiation"
          maxWidth="xl"
      >
           <div className="space-y-10 py-2 animate-slide-up">
              <div className="p-8 bg-rose-500/5 rounded-[40px] border-2 border-dashed border-rose-500/20 relative overflow-hidden group">
                  <MortalityLogForm
                    farmId={farmId}
                    workerId={user?.id || ''}
                    workerName={user?.name}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowForm(false)}
                  />
                  <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-rose-500/5 rounded-full blur-3xl" />
              </div>
              
              <div className="bg-muted/10 p-8 rounded-[32px] border border-border/40 flex items-start gap-6 shadow-sm">
                  <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center border border-border/40 shrink-0 shadow-sm">
                      <ShieldX size={24} className="text-rose-500 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Forensic Directive</h4>
                      <p className="text-xs font-black italic text-muted-foreground leading-relaxed opacity-60">
                        Incident reports are permanent records utilized for biological risk assessment. Ensure cause of attrition is accurately identified to prevent system-wide contagion.
                      </p>
                  </div>
              </div>
           </div>
      </Modal>
    </div>
  );
};

export default MortalityLogsPage;
