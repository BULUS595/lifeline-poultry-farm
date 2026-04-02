import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    AlertTriangle,
    Package,
    Trash2,
    Search,
    XCircle,
    Edit3,
    AlertCircle,
    Zap,
    Database,
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
    minThreshold: string;
    imageUrl: string;
};

const EMPTY_FORM: FormData = { name: '', quantity: '', unitPrice: '', unit: 'units', minThreshold: '10', imageUrl: '' };

const StatusBadge = React.memo(({ status }: { status: string }) => {
    switch (status) {
        case 'APPROVED': return <Badge variant="success" className="font-black italic px-4 py-1.5 shadow-sm ring-4 ring-background/50 uppercase tracking-widest text-[9px]">Verified</Badge>;
        case 'REJECTED': return <Badge variant="danger" className="font-black italic px-4 py-1.5 shadow-sm ring-4 ring-background/50 uppercase tracking-widest text-[9px]">Denied</Badge>;
        default: return <Badge variant="warning" className="font-black italic px-4 py-1.5 shadow-sm ring-4 ring-background/50 uppercase tracking-widest text-[9px]">Pending Audit</Badge>;
    }
});

export const StoragePage: React.FC = () => {
    const { user, isSuperAdmin, isManager, isInventory } = useAuth();
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
    
    const isInventoryOfficer = isInventory;
    const isAdminView = isSuperAdmin || isManager;
    const [filterStatus, setFilterStatus] = useState<'all' | string>(isAdminView ? 'PENDING_APPROVAL' : 'all');
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    useEffect(() => {
        if (user) console.log("Inventory Module — Active Identity:", user.role);
    }, [user]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
        } catch (err) {
            console.error('Stock load error:', err);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdminView]);

    useEffect(() => {
        loadData();
        const channel = supabase
            .channel('storage-page-sync-v10')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    const handleImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) { setFormError('Format not supported — please select an image.'); return; }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setForm(f => ({ ...f, imageUrl: e.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.name.trim()) { setFormError('Item designation is required.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Quantity must be a positive integer.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Unit price must be a valid currency amount.'); return; }
        if (!form.imageUrl && !selectedFile && !editingItem) { setFormError('Secure visual ID (image) is required.'); return; }

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
                setToast({ message: 'Resource status synchronized successfully.', type: 'success' });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
                setToast({ message: 'New stock entry dispatched for approval.', type: 'success' });
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            console.error(err);
            setFormError('Terminal uplink failed — please retry.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Confirm permanent deletion of "${item.name}"?`)) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
        } finally {
            setActingItem(null);
        }
    };

    const handleApprove = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
            if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        } finally {
            setActingItem(null);
        }
    };

    const handleReject = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        const comment = prompt(`Reason for protocol rejection:`, 'Audit required');
        if (comment === null) return;
        setActingItem(item.id);
        try {
            const ok = await supabaseDataService.rejectStockItem(item.id, comment, { id: user.id, name: user.name, role: user.role });
            if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'REJECTED', rejectionComment: comment } : i));
        } finally {
            setActingItem(null);
        }
    };

    const filtered = useMemo(() => items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchStatus = filterStatus === 'all' || i.status === filterStatus;
        return matchSearch && matchStatus;
    }), [items, debouncedSearch, filterStatus]);

    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-12 animate-slide-up">
                <Skeleton height={120} borderRadius={48} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={350} borderRadius={48} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-slide-up min-h-screen">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-10 right-10 z-[200] p-6 rounded-[32px] border-4 shadow-premium animate-slide-in flex items-center gap-4 ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
                    {toast.type === 'success' ? <Zap className="animate-pulse" /> : <AlertTriangle />}
                    <span className="font-black uppercase tracking-widest text-[10px]">{toast.message}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between px-2">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                     Farm <span className="text-primary underline underline-offset-8 decoration-4">Inventory</span>
                   </h1>
                   <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-3 opacity-40">Manage Stock and Production Resources</p>
                </div>
                {isInventoryOfficer && (
                    <Button size="lg" className="rounded-2xl px-10 h-16 font-black uppercase text-xs tracking-widest shadow-glow" onClick={() => { setEditingItem(null); setForm(EMPTY_FORM); setShowForm(true); }}>
                        <Plus className="mr-2 w-5 h-5" strokeWidth={3} /> Add Stock
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-center bg-card p-6 rounded-[32px] border-2 border-border/40 shadow-sm">
                <div className="flex bg-muted/20 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto custom-scrollbar border border-border/20">
                    {['all', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`
                                px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all
                                ${filterStatus === s ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}
                            `}
                        >
                            {s === 'all' ? 'All Items' : s.split('_')[0]}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full xl:w-[350px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={18} />
                    <Input 
                        type="text" 
                        placeholder="Search stock..." 
                        className="pl-11 h-12 rounded-xl border-border/40 bg-card font-bold text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Inventory Grid */}
            {hasError ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-24 bg-rose-500/5 rounded-[40px] border-2 border-dashed border-rose-500/20 opacity-80 min-h-[400px]">
                    <XCircle size={80} strokeWidth={1.5} className="mb-6 text-rose-500 opacity-40" />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-rose-600">Connection Failed</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/60 mt-4">Unable to sync with storage node</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-24 bg-muted/5 rounded-[40px] border-2 border-dashed border-border/40 opacity-60 min-h-[400px]">
                    <Database size={80} strokeWidth={1.5} className="mb-6 opacity-20" />
                    <h3 className="text-xl font-bold uppercase tracking-tighter">Empty Records</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mt-4">No matching stock found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map(item => (
                        <Card key={item.id} className="group relative flex flex-col pt-0 px-0 h-full border-2 border-border/40 bg-card rounded-[40px] transition-all hover:border-primary/40 shadow-sm hover:shadow-premium overflow-hidden" noPadding>
                            <div className="aspect-[16/9] w-full relative bg-slate-900 overflow-hidden border-b-2 border-border/20">
                                {item.imageUrl 
                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    : <div className="w-full h-full flex items-center justify-center text-primary/10 bg-slate-900"><Package size={60} strokeWidth={1} /></div>
                                }
                                <div className="absolute top-5 left-5 flex flex-col gap-2">
                                    <StatusBadge status={item.status} />
                                    {item.quantity <= item.minThreshold && (
                                        <Badge variant="danger" className="animate-pulse shadow-glow font-black h-8 px-4 text-[9px] uppercase tracking-widest">Low Stock</Badge>
                                    )}
                                </div>
                                
                                {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-6 bg-primary/10 backdrop-blur-sm">
                                        <div className="flex gap-3">
                                            <Button variant="primary" className="rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-glow" onClick={() => handleApprove(item)} isLoading={actingItem === item.id} disabled={!!actingItem}>Approve</Button>
                                            <Button variant="danger" className="rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-glow" onClick={() => handleReject(item)} isLoading={actingItem === item.id} disabled={!!actingItem}>Reject</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-8 flex-1 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-xl truncate tracking-tight uppercase">{item.name}</h3>
                                        <span className="text-2xl font-black tracking-tighter text-primary tabular-nums">₦{item.unitPrice.toLocaleString()}</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-muted/10 rounded-2xl p-5 border border-border/10 shadow-inner">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-bold uppercase text-muted-foreground opacity-40 mb-1 tracking-widest">Current Stock</span>
                                           <span className="text-xl font-black tabular-nums">{item.quantity} <span className="text-xs font-bold opacity-30">{item.unit.toUpperCase()}</span></span>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full shadow-lg ${item.quantity > item.minThreshold ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    </div>

                                    {item.status === 'REJECTED' && item.rejectionComment && (
                                        <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 flex items-start gap-4">
                                            <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={16} strokeWidth={3} />
                                            <p className="text-xs text-rose-700 italic font-bold leading-relaxed">"{item.rejectionComment}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-8 mt-10 border-t border-border/10">
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-30 uppercase tracking-[0.2em]">{new Date(item.lastUpdated).toLocaleDateString()}</span>
                                    <div className="flex gap-3">
                                        <Button variant="outline" size="icon" className="w-11 h-11 bg-card rounded-xl border-border/40 shadow-sm hover:text-primary transition-all" onClick={() => { setEditingItem(item); setForm({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice), unit: item.unit, minThreshold: String(item.minThreshold), imageUrl: item.imageUrl || '' }); setShowForm(true); }} disabled={!!actingItem}><Edit3 size={18} /></Button>
                                        <Button variant="outline" size="icon" className="w-11 h-11 bg-card rounded-xl border-border/40 shadow-sm hover:text-rose-500 transition-all" onClick={() => handleDelete(item)} isLoading={actingItem === item.id} disabled={!!actingItem}><Trash2 size={18} /></Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Product Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingItem ? "Update Stock" : "New Inventory Item"}
                maxWidth="xl"
            >
                <div className="space-y-10 py-4 animate-slide-up">
                    {formError && (
                        <div className="p-5 bg-rose-500/10 border-2 border-dashed border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                            <AlertCircle size={20} className="text-rose-500" /> {formError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 md:col-span-2">
                            <Label htmlFor="item-name" className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Product Designation</Label>
                            <Input id="item-name" type="text" placeholder="e.g. Broiler Starter 50kg" className="h-16 rounded-2xl border-border/40 font-bold bg-muted/5 shadow-inner" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-3">
                            <Label htmlFor="item-qty" className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Available Stock</Label>
                            <Input id="item-qty" type="number" className="h-16 rounded-2xl border-border/40 font-bold bg-muted/5 tabular-nums shadow-inner" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-3">
                            <Label htmlFor="item-unit" className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Pricing Unit</Label>
                            <Select id="item-unit" className="h-16 rounded-2xl border-border/40 font-bold bg-muted/5 shadow-inner" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                {['units', 'kg', 'birds', 'litres', 'crates', 'bags', 'kilograms', 'grams'].map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                            </Select>
                        </div>
                        
                        <div className="space-y-3">
                            <Label htmlFor="item-price" className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Price per Unit (₦)</Label>
                            <Input id="item-price" type="number" className="h-16 rounded-2xl border-border/40 font-black text-2xl tracking-tighter text-primary bg-muted/5 tabular-nums shadow-inner" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-3">
                            <Label htmlFor="item-threshold" className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Low Alert Level</Label>
                            <Input id="item-threshold" type="number" className="h-16 rounded-2xl border-border/40 font-bold bg-muted/5 tabular-nums shadow-inner" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
                        </div>
                    </div>

                    <div className="space-y-6 bg-muted/5 p-10 rounded-[40px] border-2 border-dashed border-border/20">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground opacity-40 ml-1 tracking-widest">Visual Documentation</Label>
                       <div className="flex flex-col sm:flex-row gap-4">
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                          <Button variant="outline" className="flex-1 rounded-2xl h-16 font-black text-[10px] uppercase tracking-widest" onClick={() => fileInputRef.current?.click()}>Upload File</Button>
                          <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                          <Button variant="outline" className="flex-1 rounded-2xl h-16 font-black text-[10px] uppercase tracking-widest" onClick={() => cameraInputRef.current?.click()}>Take Photo</Button>
                       </div>
                       
                       {form.imageUrl && (
                           <div className="relative group w-56 h-56 rounded-[32px] overflow-hidden border-2 border-primary/20 mx-auto shadow-premium mt-8">
                               <img src={form.imageUrl} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <button className="bg-rose-500 text-white w-14 h-14 rounded-2xl shadow-glow flex items-center justify-center transition-transform active:scale-90" onClick={() => { setForm(f => ({ ...f, imageUrl: '' })); setSelectedFile(null); }}>
                                        <Trash2 size={24} />
                                    </button>
                               </div>
                           </div>
                       )}
                    </div>

                    <div className="flex gap-6 pt-6">
                        <Button variant="outline" className="flex-1 rounded-[28px] h-20 font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => setShowForm(false)}>Discard</Button>
                        <Button className="flex-1 rounded-[28px] h-20 shadow-glow font-black uppercase text-sm tracking-tight text-white bg-primary" onClick={handleSubmit} isLoading={isSubmitting}>
                            {editingItem ? 'Finalize Changes' : 'Submit Entry'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
