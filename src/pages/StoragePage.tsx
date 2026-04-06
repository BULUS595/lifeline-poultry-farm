import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    Database,
    Plus,
    AlertTriangle,
    Package,
    Trash2,
    Edit3,
    Search,
    AlertCircle,
    XCircle,
    Upload,
    Send,
    Clock,
    BadgeCheck,
    XOctagon,
    ShieldX,
    User,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem } from '../types';
import { Card, Button, Modal, Input, Label, Select, Badge } from '../components/ui';

type FormData = {
    name: string;
    quantity: string;
    unitPrice: string;
    unit: string;
    category: string;
    description: string;
    minThreshold: string;
    imageUrl: string;
};

const EMPTY_FORM: FormData = {
    name: '',
    quantity: '',
    unitPrice: '',
    unit: 'units',
    category: 'feed',
    description: '',
    minThreshold: '10',
    imageUrl: '',
};

const StatusBadge = React.memo(({ status, className = '' }: { status: string; className?: string }) => {
    switch (status) {
        case 'APPROVED':
            return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 ${className}`}>
                    <BadgeCheck size={11} /> Approved
                </span>
            );
        case 'REJECTED':
            return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20 ${className}`}>
                    <XOctagon size={11} /> Rejected
                </span>
            );
        default:
            return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20 ${className}`}>
                    <Clock size={11} /> Pending
                </span>
            );
    }
});

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
    <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-slide-up
        ${type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : 'bg-rose-600 text-white border-rose-500'}`}
    >
        {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        {message}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const StoragePage: React.FC = () => {
    const { user, isInventory, isAdmin, isManager } = useAuth();
    
    const canApprove = isAdmin || isManager;
    const canAddStock = isAdmin || isInventory || isManager;
    const canManageAll = isAdmin || isManager;

    const [filterStatus, setFilterStatus] = useState<string>(
        isAdmin ? 'PENDING_APPROVAL' : 'all'
    );
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actingItem, setActingItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const data = await supabaseDataService.getAllStockItems('farm-1');
            if (canManageAll) {
                setItems(data || []);
            } else {
                setItems((data || []).filter(i => i.submittedBy === (user?.id || '') || i.status === 'APPROVED'));
            }
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user, canManageAll]);

    useEffect(() => {
        loadData();
        const channel = supabase
            .channel('storage-sync-final')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setActingItem('uploading');
        try {
            const url = await supabaseDataService.uploadStockImage(file);
            if (url) {
                setForm(f => ({ ...f, imageUrl: url }));
                setToast({ message: 'Telemetry data acquired.', type: 'success' });
            }
        } catch (err: any) {
            setToast({ message: `Upload failed: ${err.message}`, type: 'error' });
        } finally {
            setActingItem(null);
        }
    };

    const openNewForm = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowForm(true);
    };

    const openEditForm = (item: StockItem) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            unit: item.unit,
            category: item.category || 'feed',
            description: item.description || '',
            minThreshold: String(item.minThreshold),
            imageUrl: item.imageUrl || '',
        });
        setFormError('');
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setFormError('');

        if (!form.name.trim()) { setFormError('Name is mandatory.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Invalid quantity.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Invalid price.'); return; }
        if (!form.imageUrl) { setFormError('Visual telemetry required.'); return; }

        setIsSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                quantity: qty,
                unitPrice: price,
                unit: form.unit,
                category: form.category,
                description: form.description.trim(),
                minThreshold: parseFloat(form.minThreshold) || 10,
                imageUrl: form.imageUrl,
                farmId: 'farm-1',
            };

            if (editingItem) {
                await supabaseDataService.updateStockItem(editingItem.id, payload, { id: user.id, name: user.name, role: user.role });
                setToast({ message: 'Core asset updated.', type: 'success' });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
                setToast({ message: 'Submission queued for approval.', type: 'success' });
            }
            setShowForm(false);
            loadData();
        } catch {
            setFormError('Structural error encountered.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Confirm permanent removal of "${item.name}"?`)) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
        } finally {
            setActingItem(null);
        }
    };

    const handleApprove = async (item: StockItem) => {
        if (!user || !canApprove) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
                setToast({ message: 'Asset verified and live.', type: 'success' });
            }
        } finally {
            setActingItem(null);
        }
    };

    const handleReject = async (item: StockItem) => {
        if (!user || !canApprove) return;
        const comment = prompt('Provide rejection reasoning:');
        if (comment === null) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.rejectStockItem(item.id, comment, { id: user.id, name: user.name, role: user.role });
            if (ok) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'REJECTED' } : i));
                setToast({ message: 'Asset entry denied.', type: 'error' });
            }
        } finally {
            setActingItem(null);
        }
    };

    const filteredItems = useMemo(() => items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchStatus = filterStatus === 'all' || i.status === filterStatus;
        return matchSearch && matchStatus;
    }), [items, debouncedSearch, filterStatus]);

    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-12 animate-pulse p-10">
                <Skeleton height={120} borderRadius={32} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={400} borderRadius={40} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-slide-up pb-20">
            {toast && <Toast message={toast.message} type={toast.type} />}

            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-end px-2">
                <div>
                   <div className="flex items-center gap-4 mb-4">
                       <div className="p-4 bg-primary/10 text-primary rounded-3xl shadow-glow">
                           <Database size={32} strokeWidth={2.5} />
                       </div>
                       <div>
                           <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                             Inventory <span className="text-primary italic">HUB</span>
                           </h1>
                           <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.3em] mt-2 opacity-50 italic">Secure Warehouse Control Terminal</p>
                       </div>
                   </div>
                </div>

                <div className="flex items-center gap-6 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-[400px] group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            placeholder="OPERATIONAL SEARCH..."
                            className="w-full pl-14 h-16 rounded-[28px] bg-card/60 border-2 border-border/40 backdrop-blur-3xl shadow-inner transition-all focus:border-primary/40 text-[11px] font-black uppercase tracking-widest focus:outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canAddStock && (
                        <Button
                            variant="primary"
                            className="h-16 px-10 rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
                            onClick={openNewForm}
                            leftIcon={Plus}
                        >
                            Log Stock
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 px-2">
                {[
                    { key: 'all', label: 'All Assets' },
                    { key: 'PENDING_APPROVAL', label: 'Queued' },
                    { key: 'APPROVED', label: 'Market-Ready' },
                    { key: 'REJECTED', label: 'Flagged' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={`
                            px-8 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-4 hover:scale-105
                            ${filterStatus === key 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-110' 
                                : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80 hover:border-border/60'}
                        `}
                    >
                        {label}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${filterStatus === key ? 'bg-primary text-white shadow-glow' : 'bg-muted text-muted-foreground opacity-30'}`}>
                            {items.filter(i => key === 'all' ? true : i.status === key).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Segment */}
            {hasError ? (
                <div className="flex flex-col items-center justify-center py-40 text-center rounded-[56px] border-4 border-dashed border-rose-500/10 bg-rose-500/5 px-10">
                    <XCircle size={80} className="text-rose-500 mb-8 stroke-1" />
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-rose-600 mb-4 italic">Protocol Error 404</h3>
                    <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-rose-500 opacity-60">Synchronisation link severed</p>
                    <button onClick={loadData} className="mt-10 px-12 py-5 bg-rose-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-glow-rose active:scale-95 transition-all">Attempt Relink</button>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center rounded-[56px] border-4 border-dashed border-border/20 px-10">
                    <Database size={80} className="text-muted-foreground/10 mb-8 stroke-1" />
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-muted-foreground mb-4 italic">Segment Empty</h3>
                    <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-30 italic">No assets detected in sector</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-12">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group relative bg-card/60 backdrop-blur-3xl rounded-[48px] border-2 border-border/20 transition-all duration-700 hover:shadow-glow hover:border-primary/30 hover:-translate-y-3 overflow-hidden flex flex-col h-full">
                            <div className={`absolute top-0 left-0 w-2.5 h-full transition-transform group-hover:scale-y-110 duration-1000 ${
                                item.status === 'APPROVED' ? 'bg-emerald-500 shadow-glow-success' : 
                                item.status === 'PENDING_APPROVAL' ? 'bg-primary shadow-glow' : 
                                item.status === 'REJECTED' ? 'bg-rose-500 shadow-glow-rose' : 'bg-slate-400'
                            }`} />

                            <div className="relative aspect-square bg-slate-950 overflow-hidden border-b-2 border-border/10 shrink-0">
                                {item.imageUrl
                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" />
                                    : <div className="w-full h-full flex items-center justify-center text-primary/10 transition-transform group-hover:scale-110"><Package size={80} strokeWidth={1} /></div>
                                }
                                
                                <div className="absolute top-6 left-6">
                                     <StatusBadge status={item.status} className="shadow-2xl backdrop-blur-md bg-black/40 border-white/5" />
                                </div>

                                {item.quantity <= item.minThreshold && (
                                    <div className="absolute top-6 right-6">
                                        <Badge variant="danger" className="text-[10px] font-black px-5 py-2.5 rounded-full shadow-glow-rose animate-pulse italic">Supply Warning</Badge>
                                    </div>
                                )}

                                {canApprove && item.status === 'PENDING_APPROVAL' && (
                                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center p-10 gap-6 translate-y-12 group-hover:translate-y-0">
                                         <button
                                            onClick={() => handleApprove(item)}
                                            disabled={!!actingItem}
                                            className="w-full h-16 bg-emerald-500 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-glow-success flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all"
                                         >
                                            <CheckCircle2 size={24} strokeWidth={3} /> Verify and Launch
                                         </button>
                                         <button
                                            onClick={() => handleReject(item)}
                                            disabled={!!actingItem}
                                            className="w-full h-16 bg-rose-500 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-glow-rose flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all"
                                         >
                                            <ShieldX size={24} strokeWidth={3} /> Void Entry
                                         </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-10 flex-1 flex flex-col">
                                <div className="w-full mb-8">
                                    <h4 className="font-black text-3xl uppercase tracking-tighter truncate text-foreground leading-tight mb-3 group-hover:text-primary transition-colors italic">{item.name}</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shadow-glow" />
                                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40 italic">{item.category || 'Standard segment'}</p>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-10 py-10 border-y-2 border-border/10 mb-8">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-30 tracking-[0.15em] italic leading-none">Net Reserve</p>
                                        <div className="flex items-end gap-2 text-foreground">
                                            <span className="font-black text-4xl tabular-nums tracking-tighter leading-none">{item.quantity}</span>
                                            <span className="text-[11px] font-black text-muted-foreground opacity-40 uppercase tracking-widest leading-none pb-1">{item.unit}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-30 tracking-[0.15em] italic leading-none text-right">Unit Value</p>
                                        <span className="font-black text-4xl tabular-nums tracking-tighter text-primary leading-none">₦{item.unitPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="w-full flex items-center justify-between mt-auto pt-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center border-2 border-border/10 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                            <User size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-20 tracking-widest leading-none mb-1.5">Handler ID</span>
                                            <p className="text-[12px] font-black text-foreground uppercase tracking-tighter leading-none">{item.submittedByName || 'SYSTEM'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => openEditForm(item)}
                                            disabled={!!actingItem || (!canManageAll && (item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED'))}
                                            className="w-14 h-14 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/40 rounded-2xl border-2 border-border/40 shadow-sm transition-all active:scale-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0"
                                            title="Override Core"
                                        >
                                            <Edit3 size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            disabled={!!actingItem || (!canManageAll && (item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED'))}
                                            className="w-14 h-14 bg-card hover:bg-rose-500/5 hover:text-rose-500 hover:border-rose-400/40 rounded-2xl border-2 border-border/40 shadow-sm transition-all active:scale-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 delay-100"
                                            title="Terminate Asset"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Terminal */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingItem ? 'ASSET CORE OVERRIDE' : 'NEW SEGMENT LOG'}
                maxWidth="lg"
            >
                <div className="space-y-10 py-6">
                    {formError && (
                        <div className="flex items-center gap-4 p-6 bg-rose-500/10 border-2 border-rose-500/20 rounded-[32px] text-rose-500 text-[12px] font-black uppercase tracking-widest italic animate-shake">
                            <AlertCircle size={24} className="shrink-0" />
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-4">
                            <Label>Nominal Designation</Label>
                            <Input
                                placeholder="E.G. BIRD FEED GRADE-A"
                                className="h-18 px-8 rounded-[28px] text-lg uppercase"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4 text-left">
                                <Label>Sector</Label>
                                <Select
                                    className="h-18 px-8 rounded-[28px] uppercase"
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                >
                                    <option value="feed">Nutrients</option>
                                    <option value="medicine">Bioscience</option>
                                    <option value="birds">Livestock</option>
                                    <option value="equipment">Asset</option>
                                    <option value="eggs">Yield</option>
                                    <option value="other">Misc</option>
                                </Select>
                            </div>
                            <div className="space-y-4 text-left">
                                <Label>Metric</Label>
                                <Select
                                    className="h-18 px-8 rounded-[28px] uppercase"
                                    value={form.unit}
                                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                                >
                                    {['units', 'kg', 'bags', 'litres', 'crates', 'birds', 'grams'].map(u => (
                                        <option key={u} value={u}>{u.toUpperCase()}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4 text-left">
                                <Label>Reserve Qty</Label>
                                <Input
                                    type="number"
                                    className="h-18 px-8 rounded-[28px] text-3xl tabular-nums"
                                    value={form.quantity}
                                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-4 text-left">
                                <Label>Valuation (₦)</Label>
                                <Input
                                    type="number"
                                    className="h-18 px-8 rounded-[28px] text-3xl tabular-nums text-primary"
                                    value={form.unitPrice}
                                    onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                           <Label>Visual Data Capture</Label>
                           {form.imageUrl ? (
                               <div className="relative h-60 rounded-[40px] overflow-hidden border-4 border-card shadow-2xl group cursor-pointer" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}>
                                   <img src={form.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                   <div className="absolute inset-0 bg-rose-600/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <Trash2 size={40} className="text-white" />
                                   </div>
                               </div>
                           ) : (
                               <label className="flex flex-col items-center justify-center h-60 rounded-[40px] border-4 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                                   {actingItem === 'uploading' ? (
                                       <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 border-8 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Uploading...</span>
                                       </div>
                                   ) : (
                                       <>
                                           <Upload size={48} className="text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                                           <span className="text-sm font-black uppercase tracking-tight">Acquire Telemetry Image</span>
                                           <span className="text-[10px] font-black uppercase tracking-widest opacity-20 mt-2 italic">Capture or select digital asset</span>
                                       </>
                                   )}
                                   <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                               </label>
                           )}
                        </div>
                    </div>

                    <div className="flex gap-6 pt-6">
                        <Button
                            variant="outline"
                            className="flex-1 h-20 rounded-[32px] text-sm uppercase tracking-widest border-4"
                            onClick={() => setShowForm(false)}
                        >
                            Abort
                        </Button>
                        <Button
                            className="flex-2 h-20 rounded-[32px] text-sm uppercase tracking-widest shadow-glow"
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                        >
                            {editingItem ? 'Execute Update' : 'Finalise Submission'} <Send className="ml-3" size={20} />
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
