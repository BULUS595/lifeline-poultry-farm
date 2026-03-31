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
    ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseService';
import { type ActivityLog as ActivityLogType } from '../types';
import { Card, Button, Badge, Modal, Input } from '../components/ui';

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
            console.error('Audit link failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const getActionIcon = (log: ActivityLogType) => {
        if (log.isDeleted) return <Trash2 size={20} className="text-rose-500" />;
        switch (log.dataType) {
            case 'sale': return <ShoppingCart size={20} className="text-primary" />;
            case 'storage': return <Package size={20} className="text-primary" />;
            case 'expense': return <Wallet size={20} className="text-primary" />;
            case 'user': return <UserIcon size={20} className="text-primary" />;
            case 'mortality': return <TrendingDown size={20} className="text-primary" />;
            default: return <Activity size={20} className="text-primary" />;
        }
    };

    if (!isSuperAdmin && !isManager && !isAuditor) return (
      <div className="h-[70vh] flex flex-col items-center justify-center animate-slide-up px-6">
         <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
            <ShieldAlert size={48} strokeWidth={2.5} />
         </div>
         <div className="text-center space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Security Restriction <span className="text-rose-500 italic underline">Active</span></h2>
            <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Audit logs are restricted to authorized personnel with L2 clearance or above.</p>
         </div>
         <Button variant="secondary" className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
            Return to Operations
         </Button>
      </div>
    );

    const filteredLogs = useMemo(() => logs.filter(log =>
        (log.action || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (log.userName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [logs, debouncedSearch]);

    return (
        <div className="space-y-12 pb-20 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
                     Audit <span className="text-primary italic underline underline-offset-8 decoration-4">Terminal</span>
                   </h1>
                   <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Forensic identity tracking protocol</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-80 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} strokeWidth={2.5} />
                      <Input type="text" placeholder="Scan audit records..." className="pl-14 pr-6 py-4 rounded-2xl border-border/40 shadow-sm h-14" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadLogs} className="rounded-2xl w-14 h-14 bg-card/40 border-border/40 shadow-sm"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={22} strokeWidth={2.5} /></Button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={100} borderRadius={32} />)
                ) : filteredLogs.length === 0 ? (
                    <div className="py-28 text-center bg-muted/10 rounded-[48px] border-4 border-dashed border-border/40 opacity-40">
                       <Fingerprint size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                       <h3 className="text-2xl font-black uppercase italic tracking-tighter px-4">Zero fingerprints detected in vault</h3>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 max-w-sm mx-auto opacity-60">System stands ready for new identification protocols</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <Card key={log.id} className="group hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 border-l-8 border-l-border/40 hover:border-l-primary p-0 overflow-hidden" noPadding>
                            <div className="flex items-center gap-6 p-6 md:p-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-border/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm ${log.isDeleted ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                                   {getActionIcon(log)}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2 mb-3">
                                      <p className="font-black text-xl tracking-tighter uppercase italic truncate shrink-0">{log.userName || 'Root Processor'}</p>
                                      <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5 rounded-xl border border-border/40">
                                        <Clock size={12} strokeWidth={3} className="text-muted-foreground opacity-40" />
                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest tabular-nums opacity-60">#{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}</span>
                                      </div>
                                   </div>
                                   <div className="flex flex-wrap items-center gap-4">
                                      <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] shadow-sm italic ${log.isDeleted ? 'bg-rose-500 text-white' : 'bg-primary text-white shadow-glow'}`}>
                                         {log.action.replace(/_/g, ' ')}
                                      </div>
                                      <span className="text-xs text-muted-foreground font-black italic opacity-60 truncate max-w-md">Protcol Details: "{log.details}"</span>
                                   </div>
                                </div>
                                <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90" onClick={() => setSelectedLog(log)}><Eye size={20} strokeWidth={2.5} /></Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal Detail View */}
            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Audit Payload Recovery"
                maxWidth="xl"
            >
                {selectedLog && (
                    <div className="space-y-10 py-2 animate-slide-up">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                           {[
                             { label: 'Payload ID', value: `#${selectedLog.id.slice(0, 8).toUpperCase()}` },
                             { label: 'Processor', value: selectedLog.userName, italic: true },
                             { label: 'Data Node', value: selectedLog.dataType, uppercase: true },
                             { label: 'Link Status', value: 'ENCRYPTED', uppercase: true, color: 'text-emerald-500' }
                           ].map((item, i) => (
                             <div key={i} className="p-6 bg-muted/20 rounded-[28px] border border-border/40 shadow-sm group hover:border-primary/20 transition-all">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-3 opacity-40">{item.label}</p>
                                <p className={`text-xs font-black tracking-widest break-all ${item.italic ? 'italic' : ''} ${item.uppercase ? 'uppercase' : ''} ${item.color || 'text-foreground'}`}>{item.value}</p>
                             </div>
                           ))}
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-glow" />
                                    Forensic State Snapshot
                                </div>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-30">Security Standard 2.4</span>
                           </div>
                           {selectedLog.previousState ? (
                               <div className="relative group">
                                   <pre className="p-10 bg-slate-950 text-emerald-400 rounded-[40px] text-xs font-mono overflow-auto max-h-[400px] border-4 border-slate-900 shadow-2xl custom-scrollbar leading-relaxed">
                                       {JSON.stringify(selectedLog.previousState, null, 2)}
                                   </pre>
                                   <div className="absolute top-6 right-6 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
                                        <Terminal size={20} className="animate-pulse" />
                                   </div>
                               </div>
                           ) : (
                               <div className="py-24 bg-muted/10 border-4 border-dashed border-border/40 rounded-[40px] text-center mt-12">
                                  <Database size={48} className="mx-auto mb-4 opacity-10" />
                                  <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-40">No deep state modification detected by terminal</p>
                               </div>
                           )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 pt-6">
                           <Button variant="outline" className="flex-1 rounded-3xl py-8 h-18 font-black uppercase tracking-widest text-[10px]" onClick={() => setSelectedLog(null)}>Close Recovery</Button>
                           <Button className="flex-1 rounded-3xl py-8 h-18 shadow-glow font-black uppercase tracking-widest text-[11px] italic" onClick={() => setSelectedLog(null)}>Verified Audit Clear</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ActivityLogsPage;
