import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    Clock, ShieldX, Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Button, Modal, Input, Label, Badge } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

export const AdminStockPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<StockItem[]>([]);
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salesLoading, setSalesLoading] = useState(false);
    const [tab, setTab] = useState<Tab>('PENDING_APPROVAL');
    const [search, setSearch] = useState('');
    const [rejectItem, setRejectItem] = useState<StockItem | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [acting, setActing] = useState<string | null>(null);

    const loadStock = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getAdminStockItems();
            setItems(data || []);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSales = useCallback(async () => {
        setSalesLoading(true);
        try {
            const data = await supabaseDataService.getRecentSales(50);
            setSales(data || []);
        } finally {
            setSalesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
        loadSales();
        const ch = supabase.channel('admin-stock-sync-v11')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock, loadSales]);

    const approve = async (item: StockItem) => {
        if (!user) return;
        setActing(item.id);
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        setActing(null);
    };

    const confirmReject = async () => {
        if (!rejectItem || !user) return;
        setActing(rejectItem.id);
        const ok = await supabaseDataService.rejectStockItem(rejectItem.id, rejectNote, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === rejectItem.id ? { ...i, status: 'REJECTED', rejectionComment: rejectNote } : i));
        setRejectItem(null);
        setActing(null);
    };

    const filtered = useMemo(() => {
        return items.filter(i => {
            const matchStatus = i.status === tab;
            const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [items, tab, search]);

    const counts = useMemo(() => ({
        PENDING_APPROVAL: items.filter(i => i.status === 'PENDING_APPROVAL').length,
        APPROVED: items.filter(i => i.status === 'APPROVED').length,
        OUT_OF_STOCK: items.filter(i => i.status === 'OUT_OF_STOCK').length,
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
    }), [items]);

    return (
        <div className="space-y-12 pb-20 animate-slide-up">
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div className="flex items-center gap-5">
                   <button onClick={() => window.history.back()} className="p-3 bg-muted/20 hover:bg-muted/40 rounded-2xl transition-all border border-border/10">
                       <X size={20} />
                   </button>
                   <div className="flex items-center gap-3">
                       <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-glow">
                           <ShieldCheck size={28} strokeWidth={2.5} />
                       </div>
                       <div>
                           <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Governance HUB</h1>
                           <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest mt-1.5 opacity-50 italic">Asset Authorization Console</p>
                       </div>
                   </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                       <Input placeholder="Filter entries..." className="pl-12 h-14 rounded-2xl bg-card border-border/40" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Button variant="outline" size="icon" onClick={loadStock} className="rounded-2xl w-14 h-14 bg-card"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} /></Button>
                </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 px-2 no-scrollbar">
                {(['PENDING_APPROVAL', 'APPROVED', 'OUT_OF_STOCK', 'REJECTED', 'SALES_HISTORY'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t as Tab)} className={`
                        flex items-center gap-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all font-bold text-[10px] uppercase tracking-widest border
                        ${tab === t ? 'bg-primary text-white border-primary shadow-glow' : 'bg-card text-muted-foreground border-border/20 hover:bg-muted/30'}
                    `}>
                        {t.replace('_', ' ')}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${tab === t ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>
                            {t === 'SALES_HISTORY' ? sales.length : counts[t as keyof typeof counts]}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 px-2">
                {tab === 'SALES_HISTORY' ? (
                    salesLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={100} borderRadius={24} />)}
                        </div>
                    ) : sales.length === 0 ? <p className="text-center py-20 opacity-30 italic uppercase text-[10px] tracking-widest">No transaction history located</p> : sales.map(s => (
                        <div key={s.id} className="p-8 bg-card rounded-[32px] border border-border/20 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl"><Clock size={20} /></div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">{s.receiptNumber}</p>
                                    <h4 className="font-black text-lg uppercase tracking-tight italic">₦{s.totalPrice.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <Badge variant="outline" className="rounded-xl border-border/10 font-black text-[9px] uppercase tracking-widest p-2 px-4 italic">{s.paymentMethod}</Badge>
                                <p className="text-[10px] font-black opacity-30 uppercase">{new Date(s.createdAt).toLocaleDateString()}</p>
                                <Button variant="outline" size="sm" className="rounded-xl px-6 h-10 font-bold uppercase text-[9px]" onClick={() => navigate(`/admin/sales/${s.id}`)}>Audit</Button>
                            </div>
                        </div>
                    ))
                ) : isLoading ? (
                    <div className="space-y-8">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={300} borderRadius={48} />)}
                    </div>
                ) : filtered.length === 0 ? <div className="py-32 text-center bg-card/20 rounded-[48px] border-4 border-dashed border-border/40"><Package size={80} className="mx-auto opacity-10 mb-6" /><p className="text-[10px] font-black uppercase opacity-20 tracking-widest italic">No matching assets in this sector</p></div> : filtered.map(item => (
                    <div key={item.id} className="bg-card rounded-[48px] border border-border/20 overflow-hidden shadow-premium group transition-all hover:border-primary/20 hover:shadow-2xl">
                        <div className="flex flex-col md:flex-row">
                             <div className="w-full md:w-80 h-72 bg-slate-900 overflow-hidden relative border-r border-border/5">
                                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-primary/10"><Package size={80} /></div>}
                                {item.status === 'APPROVED' && <div className="absolute top-6 left-6 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-glow">Authorized</div>}
                             </div>
                             <div className="flex-1 p-10 flex flex-col md:flex-row justify-between items-center gap-10">
                                <div className="space-y-3 flex-1 text-center md:text-left">
                                   <h4 className="font-black text-3xl tracking-tighter uppercase italic text-foreground leading-none">{item.name}</h4>
                                   <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] opacity-40">Submitted by: {item.submittedByName || 'System'}</p>
                                   <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                                        <div className="px-4 py-2 bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest">{item.quantity} {item.unit}</div>
                                        <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest font-bold">₦{item.unitPrice.toLocaleString()} / Unit</div>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                                    {item.status === 'PENDING_APPROVAL' && (
                                       <>
                                          <Button className="rounded-2xl h-16 px-10 bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow active:scale-95 transition-all text-[11px] font-black uppercase" onClick={() => approve(item)} isLoading={acting === item.id}>Approve Asset</Button>
                                          <Button variant="outline" className="rounded-2xl h-16 px-10 border-rose-500/30 text-rose-500 hover:bg-rose-500/5 active:scale-95 transition-all text-[11px] font-black uppercase" onClick={() => { setRejectItem(item); setRejectNote(''); }}>Reject Asset</Button>
                                       </>
                                    )}
                                    {item.status === 'REJECTED' && item.rejectionComment && (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-xs"><p className="text-[9px] text-rose-500 font-bold uppercase tracking-tight italic">Reason: {item.rejectionComment}</p></div>
                                    )}
                                    <Button variant="outline" size="icon" className="rounded-2xl w-14 h-14 hover:text-primary transition-all shadow-sm" onClick={() => navigate(`/admin/stock/edit/${item.id}`)}><Edit3 size={20} /></Button>
                                    <Button variant="outline" size="icon" className="rounded-2xl w-14 h-14 hover:text-rose-500 transition-all shadow-sm"><Trash2 size={20} /></Button>
                                </div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={!!rejectItem} onClose={() => setRejectItem(null)} title="Block Visual Asset" maxWidth="md">
                <div className="space-y-8 py-6 animate-slide-up">
                    <div className="flex items-center gap-5 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] text-rose-600">
                        <AlertTriangle size={32} />
                        <div><h4 className="font-black text-sm uppercase">Verification Denial</h4><p className="text-[10px] font-bold opacity-70">Specify formal rejection protocol reason</p></div>
                    </div>
                    <div className="space-y-3"><Label className="ml-2">Official Statement (Comment)</Label><Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Enter audit observations..." className="h-16 rounded-2xl bg-background border-border/40 font-bold italic" /></div>
                    <div className="flex gap-4 pt-6"><Button variant="outline" className="flex-1 rounded-2xl py-8 h-16 font-black uppercase text-[10px] tracking-widest border-2" onClick={() => setRejectItem(null)}>Cancel</Button><Button className="flex-1 rounded-2xl py-8 h-16 bg-rose-500 text-white shadow-glow-error font-black uppercase text-[10px] tracking-widest" onClick={confirmReject} isLoading={acting === rejectItem?.id}>Confirm Blockade</Button></div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminStockPage;
