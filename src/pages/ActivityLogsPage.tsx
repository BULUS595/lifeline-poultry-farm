import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    History,
    Search,
    User as UserIcon,
    Clock,
    TrendingDown,
    Trash2,
    Eye,
    X,
    Database,
    ShoppingCart,
    Package,
    Wallet,
    AlertCircle,
    Activity,
    ShieldCheck,
    Terminal,
    Fingerprint,
    RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseService';
import { type ActivityLog as ActivityLogType } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const ActivityLogsPage: React.FC = () => {
    const { isSuperAdmin, isManager, isAuditor } = useAuth();
    const [logs, setLogs] = useState<ActivityLogType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState<ActivityLogType | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select(`id, userId:user_id, userName:user_name, farmId:farm_id, action, dataType:data_type, dataId:data_id, details, previousState:previous_state, isDeleted:is_deleted, timestamp`)
                .order('timestamp', { ascending: false })
                .limit(100);
            if (error) throw error;
            setLogs(data as ActivityLogType[] || []);
        } catch (err) {
            console.error('Activity logs fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const getActionIcon = (log: ActivityLogType) => {
        if (log.isDeleted) return <Trash2 size={16} />;
        switch (log.dataType) {
            case 'sale': return <ShoppingCart size={16} />;
            case 'storage': return <Package size={16} />;
            case 'expense': return <Wallet size={16} />;
            case 'user': return <UserIcon size={16} />;
            case 'mortality': return <TrendingDown size={16} />;
            default: return <Activity size={16} />;
        }
    };

    if (!isSuperAdmin && !isManager && !isAuditor) return (
      <div className="h-[60vh] flex flex-col items-center justify-center opacity-50 space-y-4">
         <div className="p-6 bg-rose-500/10 rounded-full text-rose-500"><ShieldCheck size={48} /></div>
         <h2 className="text-2xl font-black uppercase tracking-tight italic">Security Restriction</h2>
         <p className="max-w-xs text-center font-medium">Global audit logs are restricted to authorized security personnel.</p>
      </div>
    );

    const filteredLogs = useMemo(() => logs.filter(log =>
        (log.action || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (log.userName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [logs, debouncedSearch]);

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic">Audit <span className="text-primary italic underline">Terminal</span></h1>
                   <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Forensic tracking of all operational events</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input type="text" placeholder="Search audit trail..." className="w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadLogs} className="rounded-2xl"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={18} /></Button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={80} borderRadius={24} />)
                ) : filteredLogs.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                       <Fingerprint size={80} strokeWidth={1} className="mx-auto mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest italic">No fingerprints detected in the current range</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <Card key={log.id} className="group hover:border-primary/30 hover:bg-primary/5 transition-all p-4 border-l-4 border-l-border/50 hover:border-l-primary" noPadding>
                            <div className="flex items-center gap-5 p-2">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-110 transition-transform ${log.isDeleted ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                                   {getActionIcon(log)}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-baseline gap-4 mb-1">
                                      <p className="font-bold text-sm truncate tracking-tight">{log.userName || 'System Processor'}</p>
                                      <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap opacity-60">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}</span>
                                   </div>
                                   <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.isDeleted ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-foreground opacity-60'}`}>{log.action.replace(/_/g, ' ')}</span>
                                      <span className="truncate opacity-70 italic">{log.details}</span>
                                   </p>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setSelectedLog(log)}><Eye size={16} /></Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                    <Card className="w-full max-w-2xl shadow-2xl rounded-[32px] overflow-hidden" noPadding title="Forensic Payload">
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-1">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Entry ID</p>
                                  <p className="text-xs font-bold font-mono">#{selectedLog.id.slice(0, 8)}</p>
                               </div>
                               <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-1">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Operator</p>
                                  <p className="text-xs font-bold leading-none">{selectedLog.userName}</p>
                               </div>
                               <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-1">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Data Class</p>
                                  <p className="text-xs font-bold uppercase tracking-tighter">{selectedLog.dataType}</p>
                               </div>
                               <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-1">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Clock</p>
                                  <p className="text-xs font-bold uppercase tracking-tighter italic">LIVE FEED</p>
                               </div>
                            </div>

                            {selectedLog.previousState ? (
                                <div className="space-y-3">
                                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                      <Terminal size={14} /> State Snapshot
                                   </div>
                                   <pre className="p-6 bg-slate-900 text-emerald-400 rounded-3xl text-xs font-mono overflow-auto max-h-[300px] border border-slate-800 shadow-inner">
                                       {JSON.stringify(selectedLog.previousState, null, 2)}
                                   </pre>
                                </div>
                            ) : (
                                <div className="py-10 bg-muted/20 border border-dashed border-border rounded-3xl text-center">
                                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">No complex state modification detected</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                               <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setSelectedLog(null)}>Exit Terminal</Button>
                               <Button className="flex-1 rounded-2xl py-6 shadow-glow" onClick={() => setSelectedLog(null)}>Verified Audit</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ActivityLogsPage;
