import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, AlertTriangle, CheckCircle2,
    X, ShieldCheck, Clock, XCircle, RefreshCw,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Button, Modal, Input, Label, Badge } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY';

const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'success';
    if (status === 'PENDING_APPROVAL') return 'warning';
    if (status === 'REJECTED') return 'danger';
    return 'neutral';
};

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
        const ch = supabase.channel('admin-stock-v2')
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
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
    }), [items]);

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
        { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
        { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
        { key: 'SALES_HISTORY', label: 'Sales History', count: sales.length },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Stock Approvals</h1>
                            <p className="text-sm text-muted-foreground">Review and approve stock submitted by inventory staff</p>
                        </div>
                    </div>
                    <button
                        onClick={loadStock}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-card border border-border/40 rounded-xl hover:bg-muted/20 transition-all"
                    >
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        placeholder="Search by item name..."
                        className="w-full pl-10 pr-4 h-11 rounded-xl bg-card border border-border/40 text-sm focus:outline-none focus:border-primary/50 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-border/30 pb-0 overflow-x-auto no-scrollbar">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all
                                ${tab === t.key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'}
                            `}
                        >
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === t.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {tab === 'SALES_HISTORY' ? (
                    salesLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} height={72} borderRadius={16} />)}
                        </div>
                    ) : sales.length === 0 ? (
                        <EmptyState icon={<Clock />} message="No sales history yet" />
                    ) : (
                        <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
                            {sales.map(s => (
                                <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{s.receiptNumber}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-muted px-3 py-1 rounded-lg capitalize">{s.paymentMethod}</span>
                                        <span className="font-bold text-sm">₦{s.totalPrice.toLocaleString()}</span>
                                        <button
                                            onClick={() => navigate(`/admin/sales/${s.id}`)}
                                            className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
                                        >
                                            View <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={88} borderRadius={16} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={<Package />} message={`No ${tab.toLowerCase().replace('_', ' ')} items found`} />
                ) : (
                    <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
                        {filtered.map(item => (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-muted/5 transition-all group">
                                {/* Item info */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-border/10">
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={22} /></div>
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{item.name}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-xs text-muted-foreground">₦{item.unitPrice.toLocaleString()} / unit</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-xs text-muted-foreground">by {item.submittedByName || 'Staff'}</span>
                                        </div>
                                        {item.status === 'REJECTED' && item.rejectionComment && (
                                            <p className="text-xs text-rose-500 mt-1 font-medium">Reason: {item.rejectionComment}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Status + actions */}
                                <div className="flex items-center gap-3 shrink-0 pl-16 sm:pl-0">
                                    <Badge variant={statusColor(item.status) as any} className="text-[10px]">
                                        {item.status.replace('_', ' ')}
                                    </Badge>

                                    {item.status === 'PENDING_APPROVAL' && (
                                        <>
                                            <button
                                                onClick={() => approve(item)}
                                                disabled={acting === item.id}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-sm"
                                            >
                                                {acting === item.id
                                                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    : <CheckCircle2 size={14} />
                                                }
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => { setRejectItem(item); setRejectNote(''); }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-card border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold rounded-xl transition-all active:scale-95"
                                            >
                                                <XCircle size={14} />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            <Modal isOpen={!!rejectItem} onClose={() => setRejectItem(null)} title="Reject Stock Entry" maxWidth="sm">
                <div className="space-y-5 py-2">
                    <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">
                            You are about to reject <strong>{rejectItem?.name}</strong>. Please provide a reason so the inventory officer can fix and resubmit.
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Reason for rejection</Label>
                        <Input
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="e.g. Wrong quantity, unclear photo..."
                            className="h-12"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 h-11" onClick={() => setRejectItem(null)}>Cancel</Button>
                        <Button
                            className="flex-1 h-11 bg-rose-500 hover:bg-rose-600"
                            onClick={confirmReject}
                            isLoading={acting === rejectItem?.id}
                        >
                            Confirm Rejection
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
    <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-card/30 rounded-2xl border border-dashed border-border/30">
        <div className="w-12 h-12 text-muted-foreground/20 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
        <p className="text-sm font-medium text-muted-foreground/50">{message}</p>
    </div>
);

export default AdminStockPage;
