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
    X,
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
    const config: any = {
        APPROVED: { color: 'bg-emerald-500 shadow-glow-success', label: 'Market-Ready', icon: CheckCircle2 },
        PENDING_APPROVAL: { color: 'bg-primary shadow-glow', label: 'Awaiting Verification', icon: Clock },
        REJECTED: { color: 'bg-rose-500 shadow-glow-rose', label: 'Flagged / Rectify', icon: XOctagon },
        OUT_OF_STOCK: { color: 'bg-slate-300', label: 'Depleted', icon: Database },
    };
    const c = config[status] || { color: 'bg-slate-500', label: status, icon: Package };
    const Icon = c.icon;

    return (
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white ${c.color} ${className}`}>
            <Icon size={14} strokeWidth={3} />
            {c.label}
        </div>
    );
});

export const StoragePage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actingItem, setActingItem] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Upload Progress
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<string | null>(null);

    const canManageAll = isSuperAdmin || isManager;
    const canApprove = isSuperAdmin || isManager;
    const canAddStock = true; // All authenticated employees can log submissions

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
        } catch (err) {
            setHasError(true);
            setToast({ message: 'Sync failed: Communication line down.', type: 'error' });
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

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;
                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.8);
                };
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadPhase('Compressing Data...');
        setUploadProgress(20);
        
        try {
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            
            setUploadPhase('Uploading File...');
            setUploadProgress(50);
            
            const timer = setInterval(() => {
                setUploadProgress(p => p < 95 ? p + 2 : p);
            }, 200);

            const url = await supabaseDataService.uploadStockImage(compressedFile);
            
            clearInterval(timer);
            setUploadProgress(100);
            
            if (url) {
                setForm(f => ({ ...f, imageUrl: url }));
                setToast({ message: 'Telemetry data acquired.', type: 'success' });
            }
        } catch (err: any) {
            setToast({ message: `Upload failed: ${err.message}`, type: 'error' });
        } finally {
            setTimeout(() => {
                setUploadPhase(null);
                setUploadProgress(0);
            }, 800);
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

        if (!form.name.trim()) { setFormError('Product designation required.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Invalid quantity metric.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Invalid price valuation.'); return; }
        if (!form.imageUrl) { setFormError('Visual telemetry image required.'); return; }

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
                setToast({ message: 'Asset baseline updated.', type: 'success' });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
                setToast({ message: 'Submission queued for verification.', type: 'success' });
            }
            setShowForm(false);
            loadData();
        } catch {
            setFormError('Structural error encountered during sync.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Discard asset "${item.name}"?`)) return;
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
                setToast({ message: 'Asset fully verified and live.', type: 'success' });
            }
        } finally {
            setActingItem(null);
        }
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const filteredItems = useMemo(() =>
        items.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
            return matchesSearch && matchesStatus;
        }), [items, searchTerm, filterStatus]);

    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-12 animate-slide-up px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={180} borderRadius={45} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-12 mt-20">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={400} borderRadius={56} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-16 animate-slide-up px-2 pb-24">
            {/* ── System Header ─────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-10 justify-between items-start lg:items-end px-4">
                <div>
                    <div className="flex items-center gap-5 mb-4">
                        <div className="p-5 bg-primary/10 text-primary rounded-[32px] border-2 border-primary/20 shadow-glow animate-pulse-slow">
                            <Database size={36} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
                                Inventory <span className="text-primary underline underline-offset-[12px] decoration-8 decoration-primary/10">HUB</span>
                            </h1>
                            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-[0.4em] mt-3 opacity-50 italic">Operational Warehouse Console</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-[450px] group">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={22} />
                        <input
                            placeholder="SEARCH CURRENT SECTOR Assets..."
                            className="w-full pl-16 h-20 rounded-[35px] bg-card/40 border-2 border-border/40 backdrop-blur-3xl shadow-inner transition-all focus:border-primary/50 text-[12px] font-black uppercase tracking-widest focus:outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canAddStock && (
                        <button
                            onClick={openNewForm}
                            className="bg-primary hover:bg-primary/90 text-white h-20 px-10 rounded-[35px] text-[12px] font-black uppercase tracking-[0.2em] shadow-glow transform hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-4 shrink-0 italic"
                        >
                            <Plus size={24} strokeWidth={4} /> Log Stock
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filter Segment ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-5 px-4">
                {[
                    { key: 'all', label: 'All Operations' },
                    { key: 'PENDING_APPROVAL', label: 'Verification Queue' },
                    { key: 'APPROVED', label: 'Active Reserve' },
                    { key: 'REJECTED', label: 'Flagged / Blocked' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={`
                            px-10 py-5 rounded-[28px] text-[11px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-5 hover:translate-y-[-4px]
                            ${filterStatus === key 
                                ? 'bg-slate-950 border-slate-950 text-white shadow-2xl scale-110 z-10' 
                                : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80 hover:border-border/60'}
                        `}
                    >
                        {label}
                        <span className={`px-3 py-1 rounded-xl text-[10px] ${filterStatus === key ? 'bg-primary text-white shadow-glow' : 'bg-muted text-muted-foreground opacity-30 font-bold'}`}>
                            {items.filter(i => key === 'all' ? true : i.status === key).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Main content grid ────────────────────────────────────────── */}
            {hasError ? (
                <div className="flex flex-col items-center justify-center py-48 text-center rounded-[65px] border-4 border-dashed border-rose-500/10 bg-rose-500/5 px-12 mx-4">
                    <XCircle size={100} className="text-rose-500 mb-10 stroke-1" />
                    <h3 className="text-4xl font-black uppercase tracking-tighter text-rose-600 mb-5 italic">Connection Error</h3>
                    <p className="text-[13px] font-bold uppercase tracking-[0.4em] text-rose-500 opacity-60">System synchronisation link severed</p>
                    <button onClick={loadData} className="mt-12 px-16 py-6 bg-rose-500 text-white rounded-[32px] font-black text-sm uppercase tracking-widest shadow-glow-rose hover:scale-105 active:scale-95 transition-all italic">Retry Link</button>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-48 text-center rounded-[65px] border-4 border-dashed border-border/20 px-12 mx-4 bg-muted/5">
                    <Database size={100} className="text-muted-foreground/10 mb-10 stroke-1 animate-pulse-slow" />
                    <h3 className="text-4xl font-black uppercase tracking-tighter text-muted-foreground mb-5 italic">Segment Offline</h3>
                    <p className="text-[13px] font-bold uppercase tracking-[0.4em] text-muted-foreground opacity-30 italic">No operational assets detected</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-12 px-2">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group relative bg-card/60 backdrop-blur-3xl rounded-[60px] border-2 border-border/20 transition-all duration-700 hover:shadow-glow hover:border-primary/40 hover:-translate-y-5 overflow-hidden flex flex-col h-full shadow-premium">
                            <div className={`absolute top-0 left-0 w-3 h-full transition-transform group-hover:scale-y-110 duration-1000 ${
                                item.status === 'APPROVED' ? 'bg-emerald-500 shadow-glow-success' : 
                                item.status === 'PENDING_APPROVAL' ? 'bg-primary shadow-glow' : 
                                item.status === 'REJECTED' ? 'bg-rose-500 shadow-glow-rose' : 'bg-slate-400'
                            }`} />

                            <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden border-b-2 border-border/10 shrink-0">
                                {item.imageUrl
                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" />
                                    : <div className="w-full h-full flex items-center justify-center text-primary/10 transition-transform group-hover:scale-110"><Package size={100} strokeWidth={1} /></div>
                                }
                                
                                <div className="absolute top-8 left-8">
                                     <StatusBadge status={item.status} className="shadow-2xl backdrop-blur-xl bg-slate-900/40 border-white/5" />
                                </div>

                                {item.quantity <= item.minThreshold && (
                                    <div className="absolute top-8 right-8">
                                        <Badge variant="danger" className="text-[11px] font-black px-6 py-3 rounded-full shadow-glow-rose animate-bounce-subtle italic">DEPLETION ALERT</Badge>
                                    </div>
                                )}

                                {canApprove && item.status === 'PENDING_APPROVAL' && (
                                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center p-12 gap-8 translate-y-20 group-hover:translate-y-0">
                                         <button
                                            onClick={() => handleApprove(item)}
                                            disabled={!!actingItem}
                                            className="w-full h-20 bg-emerald-500 text-white rounded-[32px] font-black uppercase text-[12px] tracking-[0.2em] shadow-glow-success flex items-center justify-center gap-5 hover:scale-105 active:scale-95 transition-all italic"
                                         >
                                            <CheckCircle2 size={28} strokeWidth={3} /> Verify and Launch
                                         </button>
                                         <button
                                            onClick={() => {/* handle reject logic */}}
                                            disabled={!!actingItem}
                                            className="w-full h-20 bg-rose-500/10 text-rose-500 border-2 border-rose-500/30 rounded-[32px] font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-5 hover:bg-rose-500 hover:text-white transition-all italic active:scale-95"
                                         >
                                            <ShieldX size={28} strokeWidth={3} /> Void Submission
                                         </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-12 flex-1 flex flex-col">
                                <div className="w-full mb-10">
                                    <h4 className="font-black text-4xl uppercase tracking-tighter truncate text-foreground leading-tight mb-4 group-hover:text-primary transition-colors italic">{item.name}</h4>
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-primary/40 shadow-glow" />
                                        <p className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic">{item.category || 'Asset Class'}</p>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-12 py-10 border-y-2 border-border/10 mb-10">
                                    <div className="flex flex-col gap-3">
                                        <p className="text-[11px] font-black text-muted-foreground uppercase opacity-30 tracking-[0.2em] italic leading-none">Reserve Status</p>
                                        <div className="flex items-end gap-3 text-foreground">
                                            <span className="font-black text-5xl tabular-nums tracking-tighter leading-none">{item.quantity}</span>
                                            <span className="text-[12px] font-black text-muted-foreground opacity-40 uppercase tracking-widest leading-none pb-1.5 italic">{item.unit}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <p className="text-[11px] font-black text-muted-foreground uppercase opacity-30 tracking-[0.2em] italic leading-none text-right">Metric Value</p>
                                        <span className="font-black text-5xl tabular-nums tracking-tighter text-primary leading-none italic">₦{item.unitPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="w-full flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-[22px] bg-muted/40 flex items-center justify-center border-2 border-border/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-inner">
                                            <User size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-20 tracking-widest leading-none mb-2 italic">Handler ID</span>
                                            <p className="text-[14px] font-black text-foreground uppercase tracking-tighter leading-none">{item.submittedByName || 'SYSTEM'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => openEditForm(item)}
                                            disabled={!!actingItem || (!canManageAll && (item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED'))}
                                            className="w-16 h-16 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/40 rounded-[22px] border-2 border-border/40 shadow-sm transition-all active:scale-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-6 group-hover:translate-y-0 duration-500"
                                            title="Override Data"
                                        >
                                            <Edit3 size={24} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            disabled={!!actingItem || (!canManageAll && (item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED'))}
                                            className="w-16 h-16 bg-card hover:bg-rose-500/5 hover:text-rose-500 hover:border-rose-400/40 rounded-[22px] border-2 border-border/40 shadow-sm transition-all active:scale-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-6 group-hover:translate-y-0 duration-500 delay-100"
                                            title="Purge Entry"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add/Edit Stock Modal ─────────────────────────────────────────── */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingItem ? 'CORE ASSET OVERRIDE' : 'REGISTER NEW ASSET'}
                maxWidth="md"
            >
                <div className="space-y-12 py-8 animate-slide-up max-h-[78vh] overflow-y-auto px-4 custom-scrollbar">
                    {formError && (
                        <div className="bg-rose-500/10 border-2 border-rose-500/20 p-6 rounded-[32px] flex items-center gap-5 text-rose-500 animate-shake">
                            <AlertCircle size={24} strokeWidth={3} />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-tight">{formError}</p>
                        </div>
                    )}

                    {/* Section 1: Visual Telemetry */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-2 px-2">
                            <div className="w-2 h-8 bg-primary rounded-full shadow-glow" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-50 italic">Visual Telemetry</h4>
                        </div>
                        
                        <div className="relative group">
                            {form.imageUrl ? (
                                <div className="aspect-video rounded-[45px] overflow-hidden border-[6px] border-card bg-card shadow-premium relative">
                                    <img src={form.imageUrl} className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" alt="Preview" />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-xl">
                                        <label className="cursor-pointer bg-white text-slate-950 px-10 py-5 rounded-[22px] font-black text-[11px] uppercase tracking-[0.2em] hover:scale-110 active:scale-95 transition-all shadow-2xl">
                                            Replace Entry
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <label className={`
                                    aspect-video rounded-[45px] border-[4px] border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-500 bg-muted/5
                                    ${uploadPhase ? 'border-primary bg-primary/5 ring-[12px] ring-primary/5 scale-95 shadow-glow' : 'border-border/20 hover:border-primary/40 hover:bg-primary/20 hover:scale-[1.02]'}
                                `}>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={!!uploadPhase} />
                                    
                                    {uploadPhase ? (
                                        <div className="flex flex-col items-center gap-8 w-full px-16">
                                            <div className="relative w-28 h-28">
                                                <svg className="w-full h-full rotate-[-90deg]">
                                                    <circle cx="56" cy="56" r="50" className="fill-none stroke-muted/10 stroke-[8]" />
                                                    <circle cx="56" cy="56" r="50" className="fill-none stroke-primary stroke-[8] transition-all duration-700 shadow-glow" strokeDasharray="314" strokeDashoffset={314 - (314 * uploadProgress / 100)} />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="font-black text-2xl tabular-nums text-primary tracking-tighter leading-none">{uploadProgress}%</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">Status</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] animate-pulse text-primary italic">{uploadPhase}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-8 bg-card rounded-[32px] shadow-2xl text-muted-foreground group-hover:text-primary transition-all duration-500 border-2 border-border/10 group-hover:border-primary/20 rotate-0 group-hover:rotate-6">
                                                <Upload size={48} strokeWidth={2.5} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[12px] font-black uppercase tracking-[0.25em] mb-2">Initialize Capture</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic tracking-widest">JPG / PNG High Fidelity</p>
                                            </div>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Core Asset Definitions */}
                    <div className="space-y-10 bg-slate-100/5 p-12 rounded-[56px] border border-border/10 backdrop-blur-3xl shadow-inner-premium">
                        <div className="flex items-center gap-4 mb-2 px-2">
                             <div className="w-2 h-8 bg-primary rounded-full shadow-glow" />
                             <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-50 italic">Asset Core</h4>
                        </div>

                        <div className="space-y-10">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] ml-2 italic">Designation</Label>
                                <Input
                                    placeholder="Enter Product Specification..."
                                    className="h-18 px-10 rounded-[28px] bg-card/60 border-2 border-border/20 font-black text-lg uppercase focus:ring-[10px] focus:ring-primary/5 transition-all italic"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] ml-2 italic">Sector Category</Label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full h-18 px-10 rounded-[28px] bg-card border-2 border-border/20 font-black text-[12px] uppercase tracking-widest focus:border-primary/40 focus:outline-none appearance-none cursor-pointer transition-all hover:bg-muted/10 shadow-sm italic"
                                    >
                                        <option value="feed">Nutritional (Feed)</option>
                                        <option value="medicine">Bioscience (Meds)</option>
                                        <option value="equipment">Operational (Tools)</option>
                                        <option value="birds">Livestock (Birds)</option>
                                        <option value="eggs">Production (Yield)</option>
                                        <option value="other">Standard Segment</option>
                                    </select>
                                </div>
                                <div className="space-y-4 text-left">
                                    <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] ml-2 italic">Metric Unit</Label>
                                    <select
                                        value={form.unit}
                                        onChange={e => setForm({ ...form, unit: e.target.value })}
                                        className="w-full h-18 px-10 rounded-[28px] bg-card border-2 border-border/20 font-black text-[12px] uppercase tracking-widest focus:border-primary/40 focus:outline-none appearance-none cursor-pointer transition-all hover:bg-muted/10 shadow-sm italic"
                                    >
                                        <option value="bags">Bags (Industrial)</option>
                                        <option value="units">Units (Individual)</option>
                                        <option value="litres">Litres (Fluid)</option>
                                        <option value="kg">Kilograms (Mass)</option>
                                        <option value="crates">Crates (Batch)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Value Logistics */}
                    <div className="space-y-8 px-2">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-2 h-8 bg-primary rounded-full shadow-glow" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-50 italic">Logistics Data</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <Label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-2 italic">Net Vol</Label>
                                <Input
                                    type="number"
                                    placeholder="000"
                                    className="h-18 px-8 rounded-[28px] bg-card/60 border-2 border-border/20 text-3xl font-black tabular-nums tracking-tighter shadow-sm text-center"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-2 italic">Market Value (₦)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="h-18 px-8 rounded-[28px] bg-card/60 border-2 border-border/20 text-3xl font-black text-primary tabular-nums tracking-tighter shadow-sm text-center"
                                    value={form.unitPrice}
                                    onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-2 italic">Alert LVL</Label>
                                <Input
                                    type="number"
                                    placeholder="10"
                                    className="h-18 px-8 rounded-[28px] bg-card/60 border-2 border-border/20 text-3xl font-black text-rose-500/80 tabular-nums tracking-tighter shadow-sm text-center"
                                    value={form.minThreshold}
                                    onChange={e => setForm({ ...form, minThreshold: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Narrative Description */}
                    <div className="space-y-4 px-2">
                        <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] ml-2 italic">Operational Narrative (Optional)</Label>
                        <textarea
                            placeholder="Specify additional asset parameters or storage notes..."
                            className="w-full h-32 px-8 py-6 rounded-[32px] bg-card border-2 border-border/20 font-bold text-sm focus:border-primary/40 focus:outline-none transition-all italic resize-none custom-scrollbar"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    {/* Action Matrix */}
                    <div className="pt-10 flex gap-6 no-print pb-6 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-20 rounded-[30px] font-black uppercase text-[11px] tracking-[0.2em] border-[3px] hover:bg-slate-100/5 active:scale-95 transition-all italic"
                            onClick={() => setShowForm(false)}
                            disabled={isSubmitting}
                        >
                            Abort Entry
                        </Button>
                        <Button
                            className="flex-[2] h-20 rounded-[30px] bg-primary text-white font-black uppercase text-[11px] tracking-[0.3em] shadow-glow transform hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 italic"
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                        >
                            {editingItem ? 'Update Asset Core' : 'Submit to Admin'} <Send className="ml-4" size={24} strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── System Notifications ────────────────────────────────────────── */}
            {toast && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] animate-slide-up-fade">
                    <div className={`
                        px-10 py-6 rounded-[35px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] flex items-center gap-6 border-2 backdrop-blur-3xl animate-glow-slow
                        ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500 shadow-glow-success' : 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-glow-rose'}
                    `}>
                        {toast.type === 'success' ? <BadgeCheck size={32} strokeWidth={3} /> : <AlertTriangle size={32} strokeWidth={3} />}
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40 mb-1 leading-none">{toast.type === 'success' ? 'Synchronised' : 'System Alert'}</span>
                            <span className="text-[12px] font-black uppercase tracking-[0.15em] italic leading-none">{toast.message}</span>
                        </div>
                        <button onClick={() => setToast(null)} className="ml-4 p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoragePage;
