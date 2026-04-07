import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    Clock
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
        const ch = supabase.channel('admin-stock-sync-refined-v1')
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
        <div className="space-y-10 pb-20 animate-slide-up max-w-7xl mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="p-4 bg-primary/10 text-primary rounded-3xl border border-primary/20">
                       <ShieldCheck size={32} />
                   </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Approvals</h1>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">Authorize and audit farm stock entries</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                       <Input placeholder="Search records..." className="pl-12 h-14 rounded-2xl bg-card border-border/40" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
                {(['PENDING_APPROVAL', 'APPROVED', 'OUT_OF_STOCK', 'REJECTED', 'SALES_HISTORY'] as const).map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t as Tab)} 
                        className={`
                            flex items-center gap-3 px-6 py-3 rounded-xl whitespace-nowrap transition-all font-bold text-[10px] uppercase tracking-widest border
                            ${tab === t ? 'bg-primary text-white border-primary shadow-glow' : 'bg-card text-muted-foreground border-border/20 hover:bg-muted/10'}
                        `}
                    >
                        {t.replace('_', ' ')}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${tab === t ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>
                            {t === 'SALES_HISTORY' ? sales.length : counts[t as keyof typeof counts]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 gap-6">
                {tab === 'SALES_HISTORY' ? (
                    salesLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={100} borderRadius={24} />)}
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="py-24 text-center bg-card/20 rounded-[40px] border border-dashed border-border/40">
                             <Clock size={64} className="mx-auto opacity-10 mb-4" />
                             <p className="text-sm font-bold opacity-30 uppercase tracking-widest italic">No transaction history found</p>
                        </div>
                    ) : sales.map(s => (
                        <div key={s.id} className="p-8 bg-card rounded-[32px] border border-border/20 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all"><Clock size={24} /></div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">{s.receiptNumber}</p>
                                    <h4 className="font-black text-xl tracking-tight">₦{s.totalPrice.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <Badge variant="outline" className="rounded-xl p-2 px-4 uppercase text-[9px] font-bold">{s.paymentMethod}</Badge>
                                <p className="text-[10px] font-bold opacity-30 uppercase">{new Date(s.createdAt).toLocaleDateString()}</p>
                                <Button variant="outline" size="sm" className="rounded-xl px-6 h-10" onClick={() => navigate(`/admin/sales/${s.id}`)}>View Details</Button>
                            </div>
                        </div>
                    ))
                ) : isLoading ? (
                    <div className="space-y-8">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={250} borderRadius={40} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-32 text-center bg-card/20 rounded-[48px] border border-dashed border-border/40">
                        <Package size={80} className="mx-auto opacity-10 mb-6" />
                        <p className="text-sm font-bold uppercase opacity-20 tracking-widest italic">No assets found in this category</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {filtered.map(item => (
                            <div key={item.id} className="bg-card rounded-[40px] border border-border/20 overflow-hidden shadow-sm hover:shadow-xl transition-all hover:border-primary/30 flex flex-col md:flex-row group">
                                 <div className="w-full md:w-72 h-64 md:h-auto bg-slate-900 overflow-hidden relative border-r border-border/5">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-primary/10">
                                            <Package size={64} />
                                        </div>
                                    )}
                                    {item.status === 'APPROVED' && (
                                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-glow">Authorized</div>
                                    )}
                                 </div>
                                 <div className="flex-1 p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                                    <div className="space-y-2 flex-1 text-center md:text-left">
                                       <h4 className="font-black text-3xl tracking-tight uppercase group-hover:text-primary transition-colors leading-none">{item.name}</h4>
                                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 italic">Submitted by {item.submittedByName || 'Staff'}</p>
                                       <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                            <div className="px-4 py-2 bg-muted/20 border border-border/10 rounded-xl text-[10px] font-bold uppercase tracking-widest">{item.quantity} {item.unit}</div>
                                            <div className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest">₦{item.unitPrice.toLocaleString()} / Unit</div>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {item.status === 'PENDING_APPROVAL' && (
                                           <>
                                              <Button className="rounded-2xl h-14 px-8 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/10" onClick={() => approve(item)} isLoading={acting === item.id} leftIcon={CheckCircle2}>
                                                  Approve
                                              </Button>
                                              <Button variant="outline" className="rounded-2xl h-14 px-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/5" onClick={() => { setRejectItem(item); setRejectNote(''); }} leftIcon={X}>
                                                  Reject
                                              </Button>
                                           </>
                                        )}
                                        {item.status === 'REJECTED' && item.rejectionComment && (
                                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-xs">
                                                <p className="text-[10px] text-rose-500 font-bold uppercase">Reason: {item.rejectionComment}</p>
                                            </div>
                                        )}
                                        <Button variant="outline" size="icon" className="rounded-xl w-14 h-14" onClick={() => navigate(`/admin/stock/edit/${item.id}`)}><Edit3 size={20} /></Button>
                                        <Button variant="outline" size="icon" className="rounded-xl w-14 h-14 hover:text-rose-500"><Trash2 size={20} /></Button>
                                    </div>
                                 </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            <Modal isOpen={!!rejectItem} onClose={() => setRejectItem(null)} title="Reject Stock Entry" maxWidth="md">
                <div className="space-y-6 py-4">
                    <div className="flex items-center gap-4 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600">
                        <AlertTriangle size={24} />
                        <div>
                            <h4 className="font-black text-xs uppercase">Verification Failure</h4>
                            <p className="text-[10px] font-bold opacity-70">Please explain why this stock entry is being rejected</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Rejection Comment</Label>
                        <Input 
                            value={rejectNote} 
                            onChange={e => setRejectNote(e.target.value)} 
                            placeholder="e.g. Inconsistent quantity, poor photo quality..." 
                            className="h-14"
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 h-14" onClick={() => setRejectItem(null)}>Cancel</Button>
                        <Button className="flex-1 h-14 bg-rose-500" onClick={confirmReject} isLoading={acting === rejectItem?.id}>Confirm Rejection</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminStockPage;
