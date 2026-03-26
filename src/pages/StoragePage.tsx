import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    AlertTriangle,
    X,
    Package,
    Trash2,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    Camera,
    Paperclip,
    Send,
    Edit3,
    RefreshCw,
    Filter,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem } from '../types';
import { Card, Button, Badge } from '../components/ui';

type FormData = {
    name: string;
    quantity: string;
    unitPrice: string;
    unit: string;
    minThreshold: string;
    imageUrl: string;
};

const EMPTY_FORM: FormData = { name: '', quantity: '', unitPrice: '', unit: 'units', minThreshold: '10', imageUrl: '' };

const StatusBadge = React.memo(({ status }: { status: string }) => {
    switch (status) {
        case 'APPROVED': return <Badge variant="success">Approved</Badge>;
        case 'REJECTED': return <Badge variant="error">Rejected</Badge>;
        default: return <Badge variant="warning">Pending</Badge>;
    }
});

export const StoragePage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const isAdminView = isSuperAdmin || isManager;
    const [filterStatus, setFilterStatus] = useState<'all' | string>(isAdminView ? 'PENDING_APPROVAL' : 'all');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getAllStockItems('farm-1');
            if (!isAdminView) {
                setItems(data.filter(i => i.submittedBy === user?.id));
            } else {
                setItems(data);
            }
        } catch (err) {
            console.error('Stock load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdminView]);

    useEffect(() => {
        loadData();
        const channel = supabase
            .channel('storage-page-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    const handleImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) { setFormError('Please select an image file.'); return; }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setForm(f => ({ ...f, imageUrl: e.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.name.trim()) { setFormError('Item name is required.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Quantity must be positive.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Unit price must be positive.'); return; }
        if (!form.imageUrl && !selectedFile && !editingItem) { setFormError('Product image is required.'); return; }

        setIsSubmitting(true);
        try {
            let uploadedUrl = editingItem?.imageUrl || '';
            if (selectedFile) {
                const newUrl = await supabaseDataService.uploadStockImage(selectedFile);
                if (newUrl) uploadedUrl = newUrl;
            }

            const payload = {
                name: form.name.trim(),
                quantity: qty,
                unitPrice: price,
                unit: form.unit || 'units',
                minThreshold: parseFloat(form.minThreshold) || 10,
                imageUrl: uploadedUrl,
                farmId: 'farm-1',
            };

            if (editingItem) {
                await supabaseDataService.updateStockItem(editingItem.id, payload, { id: user.id, name: user.name, role: user.role });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            console.error(err);
            setFormError('Submission failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Delete "${item.name}"?`)) return;
        const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const handleApprove = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
    };

    const handleReject = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        const comment = prompt(`Reason for rejection:`, 'Review price/quantity');
        if (comment === null) return;
        const ok = await supabaseDataService.rejectStockItem(item.id, comment, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'REJECTED', rejectionComment: comment } : i));
    };

    const filtered = useMemo(() => items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchStatus = filterStatus === 'all' || i.status === filterStatus;
        return matchSearch && matchStatus;
    }), [items, debouncedSearch, filterStatus]);

    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-6">
                <Skeleton height={100} borderRadius={24} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={200} borderRadius={24} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
                <div>
                   <h1 className="text-3xl font-black tracking-tighter uppercase italic">Inventory <span className="text-primary underline">Control</span></h1>
                   <p className="text-muted-foreground font-medium mt-1">Manage stock submissions and approvals.</p>
                </div>
                {!isAdminView && (
                    <Button size="lg" className="rounded-2xl px-8 shadow-glow" onClick={() => { setEditingItem(null); setForm(EMPTY_FORM); setShowForm(true); }}>
                        <Plus className="mr-2" size={20} strokeWidth={3} /> Submit Item
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-3xl border border-border/50 shadow-soft">
                <div className="flex bg-muted/50 p-1 rounded-2xl w-full md:w-auto overflow-x-auto hide-scrollbar">
                    {['all', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`
                                px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all
                                ${filterStatus === s ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}
                            `}
                        >
                            {s === 'all' ? 'Everything' : s.replace('_APPROVAL', '')}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search stock..." 
                        className="w-full pl-11 pr-4 py-2.5 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(item => (
                    <Card key={item.id} className="group overflow-hidden flex flex-col pt-0 px-0" noPadding>
                        <div className="aspect-video w-full relative bg-muted/20 overflow-hidden border-b border-border/50">
                            {item.imageUrl 
                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                : <div className="w-full h-full flex items-center justify-center opacity-10"><Package size={64} /></div>
                            }
                            <div className="absolute top-4 left-4">
                                <StatusBadge status={item.status} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                <div className="flex gap-2 w-full">
                                    {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                        <>
                                            <Button variant="primary" size="sm" className="flex-1 rounded-xl" onClick={() => handleApprove(item)} leftIcon={CheckCircle2}>Approve</Button>
                                            <Button variant="danger" size="sm" className="flex-1 rounded-xl" onClick={() => handleReject(item)} leftIcon={XCircle}>Reject</Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-lg tracking-tight truncate max-w-[180px]">{item.name}</h3>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Submitted by {item.submittedByName || 'Staff'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black tracking-tighter text-primary">₦{item.unitPrice.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.quantity} {item.unit} available</p>
                                </div>
                            </div>

                            {item.status === 'REJECTED' && item.rejectionComment && (
                                <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 flex items-start gap-3">
                                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={14} />
                                    <p className="text-xs text-rose-700 italic font-medium leading-relaxed">"{item.rejectionComment}"</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(item.lastUpdated).toLocaleDateString()}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={() => { setEditingItem(item); setForm({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice), unit: item.unit, minThreshold: String(item.minThreshold), imageUrl: item.imageUrl || '' }); setShowForm(true); }}><Edit3 size={16} /></Button>
                                    <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => handleDelete(item)}><Trash2 size={16} /></Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                
                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4 opacity-30">
                        <Package size={80} strokeWidth={1} className="mx-auto" />
                        <p className="text-xl font-black uppercase italic tracking-tighter">No Stock entries found</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                    <Card className="w-full max-w-xl shadow-2xl rounded-[32px] overflow-hidden" noPadding title={editingItem ? "Update Item" : "New Submission"}>
                        <div className="p-8 space-y-6">
                            {formError && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertTriangle size={18} /> {formError}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Product Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" placeholder="Broiler Chicken" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Quantity</label>
                                    <input type="number" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unit</label>
                                    <select className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                        {['units', 'kg', 'birds', 'litres', 'crates', 'bags'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unit Price (₦)</label>
                                    <input type="number" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Low Stock Limit</label>
                                    <input type="number" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
                                </div>
                            </div>

                            <div className="space-y-4">
                               <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Product Image</p>
                               <div className="flex gap-4">
                                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                                  <Button variant="secondary" className="rounded-2xl flex-1 py-6" onClick={() => fileInputRef.current?.click()} leftIcon={Paperclip}>Gallery</Button>
                                  <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                                  <Button variant="secondary" className="rounded-2xl flex-1 py-6" onClick={() => cameraInputRef.current?.click()} leftIcon={Camera}>Camera</Button>
                               </div>
                               {form.imageUrl && (
                                   <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-border mx-auto">
                                       <img src={form.imageUrl} className="w-full h-full object-cover" />
                                       <button className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}>
                                           <X size={14} />
                                       </button>
                                   </div>
                               )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button className="flex-1 rounded-2xl py-6 shadow-glow" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={Send}>
                                    {editingItem ? 'Update' : 'Submit'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default StoragePage;
