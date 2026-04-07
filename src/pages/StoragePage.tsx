import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Database, Package,
    Save, Upload, Edit2, Search, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem } from '../types';
import { Button, Input, Modal, Label, Badge } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

type FormData = {
    name: string;
    quantity: string;
    unitPrice: string;
    unit: string;
    category: string;
    description: string;
    imageUrl: string;
};

const EMPTY_FORM: FormData = {
    name: '',
    quantity: '',
    unitPrice: '',
    unit: 'Units',
    category: 'General',
    description: '',
    imageUrl: '',
};

const statusConfig: Record<string, { label: string; variant: any; icon: React.ReactNode }> = {
    APPROVED:         { label: 'Approved',        variant: 'success', icon: <CheckCircle2 size={13} /> },
    PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning', icon: <Clock size={13} /> },
    REJECTED:         { label: 'Rejected',         variant: 'danger',  icon: <XCircle size={13} /> },
};

export const StoragePage: React.FC = () => {
    const { user, isAdmin, isInventory } = useAuth();
    const canAddStock = isInventory || isAdmin;

    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getAdminStockItems();
            setItems(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const ch = supabase.channel('storage-v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
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
                    let { width, height } = img;
                    const MAX = 1200;
                    if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
                    else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.85);
                };
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadPhase('Optimizing...');
        setUploadProgress(20);
        try {
            const blob = await compressImage(file);
            const compressed = new File([blob], file.name, { type: 'image/jpeg' });
            setUploadPhase('Uploading...');
            setUploadProgress(50);
            const timer = setInterval(() => setUploadProgress(p => p < 95 ? p + 2 : p), 200);
            const url = await supabaseDataService.uploadStockImage(compressed);
            clearInterval(timer);
            setUploadProgress(100);
            if (url) setForm(f => ({ ...f, imageUrl: url }));
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => { setUploadPhase(null); setUploadProgress(0); }, 1500);
        }
    };

    const openAdd = () => { setEditingItem(null); setForm(EMPTY_FORM); setShowForm(true); };
    const openEdit = (item: StockItem) => {
        setEditingItem(item);
        setForm({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice), unit: item.unit || '', category: item.category || '', description: item.description || '', imageUrl: item.imageUrl || '' });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!user || !form.name || !form.quantity || !form.unitPrice) return;
        setIsSubmitting(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                quantity: parseFloat(form.quantity),
                unitPrice: parseFloat(form.unitPrice),
                unit: form.unit,
                category: form.category,
                description: form.description,
                imageUrl: form.imageUrl,
                status: editingItem ? editingItem.status : 'PENDING_APPROVAL',
                submittedBy: user.id,
                submittedByName: user.name || 'Staff',
                farmId: '1',
            };
            if (editingItem) {
                await supabaseDataService.updateStockItem(editingItem.id, payload);
            } else {
                await supabaseDataService.addStockItem(payload);
            }
            setShowForm(false);
            setEditingItem(null);
            setForm(EMPTY_FORM);
            loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = useMemo(() =>
        items.filter(i => {
            const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === 'all' || i.status === filterStatus;
            return matchSearch && matchStatus;
        }),
        [items, searchTerm, filterStatus]
    );

    const counts = useMemo(() => ({
        all: items.length,
        PENDING_APPROVAL: items.filter(i => i.status === 'PENDING_APPROVAL').length,
        APPROVED: items.filter(i => i.status === 'APPROVED').length,
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
    }), [items]);

    const filterTabs = [
        { key: 'all',             label: 'All',     count: counts.all },
        { key: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
        { key: 'APPROVED',        label: 'Approved', count: counts.APPROVED },
        { key: 'REJECTED',        label: 'Rejected', count: counts.REJECTED },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <Database size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                            <p className="text-sm text-muted-foreground">Manage your farm stock and supplies</p>
                        </div>
                    </div>
                    {canAddStock && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
                        >
                            <Plus size={18} />
                            Add Stock
                        </button>
                    )}
                </div>

                {/* Search + Filters */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            placeholder="Search items..."
                            className="w-full pl-10 pr-4 h-11 rounded-xl bg-card border border-border/40 text-sm focus:outline-none focus:border-primary/50 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 border-b border-border/30 overflow-x-auto no-scrollbar">
                        {filterTabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setFilterStatus(t.key)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all
                                    ${filterStatus === t.key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'}
                                `}
                            >
                                {t.label}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filterStatus === t.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {isLoading && items.length === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={80} borderRadius={16} />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center gap-3 bg-card/30 rounded-2xl border border-dashed border-border/30">
                        <Package size={40} className="text-muted-foreground/20" />
                        <p className="text-sm font-medium text-muted-foreground/50">No items found</p>
                        {canAddStock && (
                            <button onClick={openAdd} className="text-sm text-primary font-semibold hover:underline mt-1">
                                + Add your first stock item
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
                        {filteredItems.map(item => {
                            const sc = statusConfig[item.status] || statusConfig['PENDING_APPROVAL'];
                            return (
                                <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/5 transition-all group">
                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-border/10">
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={22} /></div>
                                        }
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{item.name}</p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                            <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                                            <span className="text-muted-foreground/40">·</span>
                                            <span className="text-xs text-muted-foreground">₦{item.unitPrice.toLocaleString()} / unit</span>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <div className="shrink-0 hidden sm:flex items-center gap-1.5">
                                        <Badge variant={sc.variant} className="flex items-center gap-1 text-[10px] py-1">
                                            {sc.icon} {sc.label}
                                        </Badge>
                                    </div>

                                    {/* Edit button */}
                                    <button
                                        onClick={() => openEdit(item)}
                                        className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingItem ? 'Edit Stock Item' : 'Add New Stock'} maxWidth="md">
                <div className="space-y-5 py-2">

                    {/* Photo upload */}
                    <div
                        className="relative h-44 rounded-2xl bg-muted/10 border-2 border-dashed border-border/40 overflow-hidden flex items-center justify-center group cursor-pointer"
                    >
                        {form.imageUrl ? (
                            <>
                                <img src={form.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <label className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl cursor-pointer hover:bg-white/90 transition-all">
                                        Change Photo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </>
                        ) : uploadPhase ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-semibold text-primary">{uploadPhase}</p>
                                <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-all">
                                <div className="w-12 h-12 bg-card border border-border/40 rounded-2xl flex items-center justify-center text-primary">
                                    <Upload size={22} />
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground">Click to add a photo</p>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>

                    {/* Form fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <Label>Item Name *</Label>
                            <Input placeholder="e.g. Layers Mash" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Quantity *</Label>
                            <Input type="number" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Unit</Label>
                            <Input placeholder="Bags, Units..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="h-11" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label>Unit Price (₦) *</Label>
                            <Input type="number" placeholder="0.00" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="h-11 text-emerald-500 border-emerald-500/20 bg-emerald-500/5 focus:border-emerald-500/50" />
                        </div>
                    </div>

                    {/* Info banner for non-admins */}
                    {!isAdmin && (
                        <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-amber-600">
                                This item will be sent to the Admin for approval before it's available for sale.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 h-11" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button className="flex-1 h-11" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={Save}>
                            {editingItem ? 'Save Changes' : 'Submit Stock'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
