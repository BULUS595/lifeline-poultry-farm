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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabaseDataService, supabase } from '../services/supabaseService';
import { MortalityLogForm } from '../components/MortalityLogForm';
import type { MortalityLog } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const MortalityLogsPage: React.FC<{ farmId: string }> = ({ farmId }) => {
  const { user, isSuperAdmin, isManager } = useAuth();
  const isInventory = user?.role === 'inventory_officer' || user?.role === 'inventory_staff';
  const canCreate = isInventory || isSuperAdmin || isManager;

  const [logs, setLogs] = useState<MortalityLog[]>([]);
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

      const data = await supabaseDataService.getMortalityLogs(farmId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setLogs(data as MortalityLog[]);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleDelete = async (log: MortalityLog) => {
    if (!isSuperAdmin && !isManager) return;
    if (!confirm('Authorize Record Deletion: This action is forensic and will be logged. Proceed?')) return;
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
      console.error('Error deleting log:', error);
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
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic text-rose-500 underline decoration-rose-200">Attrition <span className="italic">Terminal</span></h1>
           <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Consolidated tracking of livestock mortality events</p>
        </div>
        {canCreate && (
          <Button size="lg" variant={showForm ? 'outline' : 'danger'} className="rounded-2xl px-8 shadow-glow" onClick={() => setShowForm(!showForm)} leftIcon={showForm ? X : Plus}>
             {showForm ? 'Cancel Entry' : 'Record Incident'}
          </Button>
        )}
      </div>

      {/* Form Overlay */}
      {showForm && (
        <Card className="border-l-4 border-l-rose-500 animate-in slide-in-from-top duration-300" noPadding title="Incident Report Entry">
           <div className="p-8">
              <MortalityLogForm
                farmId={farmId}
                workerId={user?.id || ''}
                workerName={user?.name}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
           </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Total Attrition', value: stats.total, unit: 'BIRDS', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'Velocity Rate', value: stats.avg, unit: 'AVG/INCIDENT', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Incident Volume', value: stats.count, unit: 'REPORTS', icon: History, color: 'text-blue-500', bg: 'bg-blue-500/10' }
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

      {/* Filter */}
      <Card className="rounded-[40px] p-2" noPadding>
          <div className="p-4 flex items-center gap-4">
              <Calendar className="text-rose-500" size={20} />
              <div className="flex-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Historical window</p>
                 <input type="month" className="bg-transparent font-bold text-sm outline-none w-full" value={selectedDate.slice(0, 7)} onChange={e => setSelectedDate(`${e.target.value}-01`)} />
              </div>
          </div>
      </Card>

      {/* List */}
      <div className="space-y-4">
          {loading ? (
             [1,2,3,4].map(i => <Skeleton key={i} height={80} borderRadius={24} />)
          ) : logs.length === 0 ? (
             <div className="py-20 text-center opacity-20">
                <CheckCircle2 size={80} strokeWidth={1} className="mx-auto mb-4 text-emerald-500" />
                <p className="text-xs font-black uppercase tracking-widest italic text-emerald-600">No mortality events recorded in this window</p>
             </div>
          ) : (
             logs.map(log => (
                <Card key={log.id} className="group hover:border-rose-500/30 hover:bg-rose-500/5 transition-all p-4 border-l-4 border-l-border/50 hover:border-l-rose-500" noPadding>
                   <div className="flex items-center gap-5 p-2">
                       <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 group-hover:scale-110 transition-transform">
                          <AlertTriangle size={18} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-4 mb-1">
                             <div className="flex items-center gap-3">
                                <span className="font-bold text-sm">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-lg border border-rose-500/20">
                                   <ShieldAlert size={10} />
                                   <span className="text-[9px] font-black uppercase tracking-widest leading-none">{log.cause || 'UNSPECIFIED'}</span>
                                </div>
                             </div>
                             <span className="text-lg font-black tracking-tighter italic text-rose-600">-{log.count} BIRDS</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-60">
                                   <Hash size={10} /> {log.batchId || 'NO BATCH'}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-60">
                                   <UserCheck size={10} /> {log.workerName || 'UNKNOWN'}
                                </div>
                             </div>
                             <span className="text-[10px] font-medium text-muted-foreground italic truncate max-w-[200px] opacity-60">{log.notes || 'Incident recorded'}</span>
                          </div>
                       </div>
                       {(isSuperAdmin || isManager) && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(log)} className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"><Trash2 size={16} /></Button>
                       )}
                   </div>
                </Card>
             ))
          )}
      </div>
    </div>
  );
};

export default MortalityLogsPage;
