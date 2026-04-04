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
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem } from '../types';
import { Card, Button, Badge, Modal, Input, Label, Select } from '../components/ui';

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

const StatusBadge = React.memo(({ status }: { status: string }) => {
    switch (status) {
        case 'APPROVED':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                    <BadgeCheck size={11} /> Approved
                </span>
            );
        case 'REJECTED':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">
                    <XOctagon size={11} /> Rejected
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                    <Clock size={11} /> Pending
                </span>
            );
    }
});

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
    <div
        className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-slide-up
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
    const { user, isInventory, isAdmin } = useAuth();
    // Re-check Admin View logic: it should be true if user is Admin OR Inventory since they manage the stock
    const isAdminView = isAdmin || isInventory;

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

    // Load stock items
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const data = await supabaseDataService.getAllStockItems('farm-1');
            if (!isAdminView && user?.role !== 'inventory_officer') {
                setItems((data || []).filter(i => i.submittedBy === user?.id));
            } else {
                setItems(data || []);
            }
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdminView]);

    useEffect(() => {
        loadData();
        const channel = supabase
            .channel('storage-page-sync-v11')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    // Image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setActingItem('uploading');
        try {
            const url = await supabaseDataService.uploadStockImage(file);
            if (url) setForm(f => ({ ...f, imageUrl: url }));
            setToast({ message: 'Image uploaded successfully.', type: 'success' });
        } catch {
            setToast({ message: 'Image upload failed. Please try again.', type: 'error' });
        } finally {
            setActingItem(null);
        }
    };

    // Open form for new or edit
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

    // Submit form
    const handleSubmit = async () => {
        if (!user) return;
        setFormError('');

        if (!form.name.trim()) { setFormError('Stock name is required.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Please enter a valid quantity.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Please enter a valid price.'); return; }
        if (!form.imageUrl) { setFormError('A photo of the stock is required.'); return; }

        setIsSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                quantity: qty,
                unitPrice: price,
                unit: form.unit || 'units',
                category: form.category || 'feed',
                description: form.description.trim(),
                minThreshold: parseFloat(form.minThreshold) || 10,
                imageUrl: form.imageUrl,
                farmId: 'farm-1',
            };

            if (editingItem) {
                await supabaseDataService.updateStockItem(
                    editingItem.id,
                    payload,
                    { id: user.id, name: user.name, role: user.role }
                );
                setToast({ message: 'Stock item updated successfully.', type: 'success' });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
                setToast({ message: 'Stock submitted to admin for approval.', type: 'success' });
            }
            setShowForm(false);
            loadData();
        } catch {
            setFormError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete
    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
        } finally {
            setActingItem(null);
        }
    };

    // Admin actions
    const handleApprove = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
                setToast({ message: `"${item.name}" has been approved.`, type: 'success' });
            }
        } finally {
            setActingItem(null);
        }
    };

    const handleReject = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        const comment = prompt('Reason for rejection (optional):');
        if (comment === null) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.rejectStockItem(item.id, comment, { id: user.id, name: user.name, role: user.role });
            if (ok) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'REJECTED', rejectionComment: comment } : i));
                setToast({ message: `"${item.name}" has been rejected.`, type: 'error' });
            }
        } finally {
            setActingItem(null);
        }
    };

    const filtered = useMemo(() => items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchStatus = filterStatus === 'all' || i.status === filterStatus;
        return matchSearch && matchStatus;
    }), [items, debouncedSearch, filterStatus]);

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton height={80} borderRadius={16} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={280} borderRadius={20} />)}
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-28 animate-slide-up">
            {toast && <Toast message={toast.message} type={toast.type} />}

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Farm Inventory</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and submit stock items for approval</p>
                </div>

                {/* Only inventory staff and admins can see this button */}
                {isAdminView && (
                    <Button
                        variant="primary"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black italic shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
                        onClick={openNewForm}
                        leftIcon={Plus}
                    >
                        Add Stock
                    </Button>
                )}
            </div>

            {/* ── Filters ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex gap-1.5 flex-wrap">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'PENDING_APPROVAL', label: 'Pending' },
                        { key: 'APPROVED', label: 'Approved' },
                        { key: 'REJECTED', label: 'Rejected' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterStatus === key
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted/60'
                            }`}
                        >
                            {label}
                            <span className={`ml-1.5 text-[10px] ${filterStatus === key ? 'opacity-70' : 'opacity-40'}`}>
                                ({items.filter(i => key === 'all' ? true : i.status === key).length})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-60">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search stock..."
                        className="w-full pl-9 pr-4 h-9 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Grid ────────────────────────────────────────────────────── */}
            {hasError ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border-2 border-dashed border-rose-300/40 bg-rose-500/5">
                    <XCircle size={48} className="text-rose-400 mb-3" />
                    <p className="text-sm font-semibold text-rose-600">Failed to load inventory</p>
                    <button onClick={loadData} className="mt-3 text-xs underline text-rose-400">Retry</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border-2 border-dashed border-border/40">
                    <Database size={48} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No stock items found</p>
                    {!isAdminView && (
                        <button onClick={openNewForm} className="mt-3 text-xs text-primary underline">
                            Add your first item
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(item => (
                        <Card
                            key={item.id}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card hover:shadow-md transition-all hover:border-primary/30 p-0"
                            noPadding
                        >
                            {/* Image */}
                            <div className="relative aspect-video bg-muted overflow-hidden">
                                {item.imageUrl
                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    : <div className="w-full h-full flex items-center justify-center"><Package size={40} className="text-muted-foreground/20" /></div>
                                }
                                <div className="absolute top-3 left-3">
                                    <StatusBadge status={item.status} />
                                </div>
                                {item.quantity <= item.minThreshold && (
                                    <div className="absolute top-3 right-3">
                                        <span className="px-2 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">Low Stock</span>
                                    </div>
                                )}

                                {/* Admin hover overlay */}
                                {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => handleApprove(item)}
                                            disabled={!!actingItem}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-lg"
                                        >
                                            <CheckCircle2 size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(item)}
                                            disabled={!!actingItem}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors shadow-lg"
                                        >
                                            <XOctagon size={14} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Card body */}
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-semibold text-base truncate">{item.name}</h3>
                                    <span className="text-primary font-bold text-base ml-2 shrink-0">₦{item.unitPrice.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 mb-3">
                                    <span>Stock</span>
                                    <span className="font-semibold text-foreground">{item.quantity} <span className="text-xs opacity-50">{item.unit}</span></span>
                                </div>

                                {item.status === 'REJECTED' && item.rejectionComment && (
                                    <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl p-3 mb-3 text-rose-600 text-xs">
                                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                        <span className="italic">{item.rejectionComment}</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                                    <span className="text-[11px] text-muted-foreground/50">
                                        {new Date(item.lastUpdated).toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditForm(item)}
                                            disabled={
                                                !!actingItem ||
                                                (!isAdminView && item.status === 'PENDING_APPROVAL') ||
                                                (!isAdminView && item.status === 'APPROVED')
                                            }
                                            className="p-2 rounded-lg border border-border/40 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            disabled={
                                                !!actingItem ||
                                                (!isAdminView && item.status === 'PENDING_APPROVAL') ||
                                                (!isAdminView && item.status === 'APPROVED')
                                            }
                                            className="p-2 rounded-lg border border-border/40 hover:text-rose-500 hover:border-rose-400/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Add / Edit Stock Modal ───────────────────────────────────── */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingItem ? 'Edit Stock Item' : 'Add New Stock'}
                maxWidth="lg"
            >
                <div className="py-2 space-y-5">
                    {/* Error */}
                    {formError && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            {formError}
                        </div>
                    )}

                    {/* Stock Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="item-name" className="text-sm font-medium text-foreground">
                            Stock Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="item-name"
                            type="text"
                            placeholder="e.g. Broiler Starter Feed 50kg"
                            className="h-11 rounded-xl border-border/40 bg-background/50 hover:border-primary/40 focus:border-primary transition-all font-black"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>

                    {/* Category & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="item-category">Category <span className="text-rose-500">*</span></Label>
                            <Select
                                id="item-category"
                                className="h-11 rounded-xl border-border/40 bg-background/50"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            >
                                <option value="feed">Feed</option>
                                <option value="medicine">Medicine</option>
                                <option value="birds">Birds</option>
                                <option value="equipment">Equipment</option>
                                <option value="eggs">Eggs</option>
                                <option value="other">Other</option>
                            </Select>
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                            <Label htmlFor="item-desc">Description</Label>
                            <input
                                id="item-desc"
                                className="input-modern h-11 rounded-xl border-border/40 bg-background/50 hover:border-primary/40 focus:border-primary transition-all font-black placeholder:opacity-30 italic px-4"
                                placeholder="Short description..."
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Quantity + Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="item-qty" className="text-sm font-medium text-foreground">
                                Quantity <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="item-qty"
                                type="number"
                                placeholder="0"
                                className="h-11 rounded-xl border-border/60 bg-background"
                                value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="item-unit" className="text-sm font-medium text-foreground">Unit</Label>
                            <Select
                                id="item-unit"
                                className="h-11 rounded-xl border-border/60 bg-background"
                                value={form.unit}
                                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                            >
                                {['units', 'kg', 'bags', 'litres', 'crates', 'birds', 'grams'].map(u => (
                                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {/* Price + Min Threshold */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="item-price" className="text-sm font-medium text-foreground">
                                Price per Unit (₦) <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="item-price"
                                type="number"
                                placeholder="0.00"
                                className="h-11 rounded-xl border-border/60 bg-background"
                                value={form.unitPrice}
                                onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="item-threshold" className="text-sm font-medium text-foreground">
                                Low Stock Alert
                            </Label>
                            <Input
                                id="item-threshold"
                                type="number"
                                placeholder="10"
                                className="h-11 rounded-xl border-border/60 bg-background"
                                value={form.minThreshold}
                                onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Image upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                            Stock Photo <span className="text-rose-500">*</span>
                        </Label>

                        {form.imageUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-border/50 h-40">
                                <img src={form.imageUrl} className="w-full h-full object-cover" alt="Stock" />
                                <button
                                    onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-1 rounded-lg">
                                    <CheckCircle2 size={11} /> Photo attached
                                </div>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                                ${actingItem === 'uploading'
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-border/40 hover:border-primary/40 hover:bg-primary/5'}`}
                            >
                                {actingItem === 'uploading' ? (
                                    <>
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs text-primary font-medium">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground font-medium">Click to upload a photo</span>
                                        <span className="text-xs text-muted-foreground/60">JPG, PNG up to 10MB</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={actingItem === 'uploading'}
                                />
                            </label>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="flex-1 h-11 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send size={15} />
                                    {editingItem ? 'Save Changes' : 'Submit to Admin'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
