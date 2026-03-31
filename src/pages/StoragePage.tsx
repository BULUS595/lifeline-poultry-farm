import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    AlertTriangle,
    Package,
    Trash2,
    Search,
    CheckCircle2,
    XCircle,
    Camera,
    Paperclip,
    Send,
    Edit3,
    RefreshCw,
    LayoutGrid,
    AlertCircle,
    ArrowUpRight,
    History,
    Zap,
    ChevronRight,
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
    const { user, isSuperAdmin, isManager } = useAuth();
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
        setHasError(false);
        try {
            const data = await supabaseDataService.getAllStockItems('farm-1');
            if (!isAdminView) {
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
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
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
        <div className="space-y-16 pb-20 animate-slide-up min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-10 md:items-end justify-between px-2">
                <div>
                   <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none shrink-0">
                     Logistics <span className="text-primary italic underline underline-offset-8 decoration-primary/20 decoration-4">Terminal</span>
                   </h1>
                   <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] mt-4 opacity-40 italic">Resource Control and Inventory Node Identification</p>
                </div>
                {!isAdminView && (
                    <Button size="lg" className="rounded-[32px] px-12 py-10 text-xl shadow-glow font-black uppercase tracking-tight italic bg-primary text-white hover:scale-105 active:scale-95 transition-all" onClick={() => { setEditingItem(null); setForm(EMPTY_FORM); setShowForm(true); }}>
                        <Plus className="mr-4 w-7 h-7" strokeWidth={4} /> Submit New Node
                    </Button>
                )}
            </div>

            {/* Hub Filters */}
            <div className="flex flex-col xl:flex-row gap-8 justify-between items-center bg-card/40 backdrop-blur-3xl p-8 rounded-[48px] border-4 border-border/40 shadow-premium overflow-hidden relative group">
                <div className="flex bg-muted/20 p-2.5 rounded-[28px] w-full xl:w-auto overflow-x-auto custom-scrollbar border-2 border-border/20 relative z-10">
                    {['all', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`
                                px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 italic
                                ${filterStatus === s ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                            `}
                        >
                            {s === 'all' ? 'Universal Sync' : s.replace('_APPROVAL', ' LOG')}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full xl:w-[450px] group/input relative z-10">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-all duration-300" size={24} strokeWidth={3} />
                    <Input 
                        type="text" 
                        placeholder="Scan sku identifiers..." 
                        className="pl-16 pr-8 py-7 h-16 rounded-[24px] border-border/40 bg-card/60 font-black italic shadow-inner tracking-tight text-lg"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="absolute inset-0 bg-primary/2 group-hover:bg-primary/5 transition-colors pointer-events-none" />
            </div>

            {/* Resource Grid */}
            {hasError ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-rose-500/5 rounded-[56px] border-4 border-dashed border-rose-500/20 opacity-80 min-h-[400px]">
                    <XCircle size={140} strokeWidth={1} className="mb-8 opacity-40 text-rose-500" />
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-rose-500">Terminal Link Severed</h3>
                    <p className="max-w-md mx-auto text-xs font-black text-rose-500/80 mt-4 uppercase tracking-[0.3em] leading-relaxed italic">System unable to fetch product catalog. Verify connection.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-muted/5 rounded-[56px] border-4 border-dashed border-border/40 opacity-40 min-h-[400px]">
                    <Database size={140} strokeWidth={1} className="mb-8 opacity-20" />
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Operational Catalog Empty</h3>
                    <p className="max-w-md mx-auto text-xs font-black text-muted-foreground opacity-60 mt-4 uppercase tracking-[0.3em] leading-relaxed italic">Resource logs stand cleared and await submission arrays.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                    {filtered.map(item => (
                        <Card key={item.id} className="group relative overflow-hidden flex flex-col pt-0 px-0 h-full border-4 border-border/40 bg-card/40 backdrop-blur-xl shadow-premium rounded-[56px] transition-all duration-700 hover:border-primary/40 hover:-translate-y-4" noPadding>
                        <div className="aspect-[4/3] w-full relative bg-slate-900 overflow-hidden border-b-4 border-border/40 group-hover:border-primary/20 transition-all">
                            {item.imageUrl 
                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-2 transition-transform duration-1000 ease-out opacity-80 group-hover:opacity-100" />
                                : <div className="w-full h-full flex items-center justify-center text-primary/10 bg-slate-900"><Package size={100} strokeWidth={1} /></div>
                            }
                            <div className="absolute top-8 left-8 flex flex-col gap-3 scale-110 origin-top-left transition-transform group-hover:scale-125">
                                <StatusBadge status={item.status} />
                                {item.quantity <= item.minThreshold && (
                                    <Badge variant="danger" className="animate-pulse shadow-glow font-black h-8 px-4 text-[9px] uppercase italic ring-4 ring-background/50">Restock Incident</Badge>
                                )}
                            </div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                            
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center p-10 bg-primary/10 backdrop-blur-sm">
                                <div className="grid grid-cols-2 gap-4 w-full animate-slide-up">
                                    {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                        <>
                                            <Button variant="primary" className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] shadow-glow" onClick={() => handleApprove(item)} isLoading={actingItem === item.id} disabled={!!actingItem}>Verify Node</Button>
                                            <Button variant="danger" className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] shadow-lg" onClick={() => handleReject(item)} isLoading={actingItem === item.id} disabled={!!actingItem}>Nullify Node</Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-10 flex-1 flex flex-col justify-between space-y-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start gap-6">
                                     <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-3xl tracking-tighter truncate uppercase italic leading-none group-hover:text-primary transition-colors">{item.name}</h3>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.25em] opacity-40 mt-3 italic">Ident-Code: LL-NODE-{item.id.slice(0, 4).toUpperCase()}</p>
                                     </div>
                                     <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1 opacity-60 italic">Standard Valuation</span>
                                        <span className="text-4xl font-black tracking-tighter text-primary leading-none tabular-nums italic">₦{item.unitPrice.toLocaleString()}</span>
                                     </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-muted/20 rounded-[32px] p-6 border-2 border-border/20 shadow-inner group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center border-2 border-border/40 shadow-sm group-hover:scale-110 group-hover:rotate-12 transition-all">
                                        <Package className="w-6 h-6 text-primary" strokeWidth={3} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Active Qty</span>
                                       <span className="text-xl font-black uppercase tracking-tight tabular-nums italic">{item.quantity} <span className="text-xs opacity-60">{item.unit.toUpperCase()}</span></span>
                                    </div>
                                </div>
                                <div className="lex flex-col items-end">
                                   <div className={`w-3 h-3 rounded-full shadow-glow animate-pulse mb-1 ${item.quantity > item.minThreshold ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                   <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${item.quantity > item.minThreshold ? 'text-emerald-500' : 'text-rose-500'} italic`}>
                                       {item.quantity >= item.minThreshold ? 'Stabilized' : 'Critical'}
                                   </span>
                                </div>
                            </div>

                            {item.status === 'REJECTED' && item.rejectionComment && (
                                <div className="bg-rose-500/5 p-6 rounded-[28px] border-2 border-rose-500/10 flex items-start gap-4">
                                    <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={24} strokeWidth={2.5} />
                                    <div className="space-y-1">
                                       <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic">Protocol Audit Failure</p>
                                       <p className="text-sm text-rose-700 italic font-black leading-relaxed">"{item.rejectionComment}"</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-8 border-t-2 border-border/20 group-hover:border-primary/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-muted/10 rounded-xl"><History size={16} strokeWidth={3} className="text-muted-foreground opacity-40" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic">Sync Node</span>
                                        <span className="text-xs font-black tracking-widest opacity-80 uppercase tabular-nums italic">{new Date(item.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" size="icon" className="w-14 h-14 bg-card/60 text-muted-foreground hover:text-primary hover:border-primary/40 rounded-[20px] shadow-sm active:scale-90 transition-all" onClick={() => { setEditingItem(item); setForm({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice), unit: item.unit, minThreshold: String(item.minThreshold), imageUrl: item.imageUrl || '' }); setShowForm(true); }} disabled={!!actingItem}><Edit3 size={20} strokeWidth={3} /></Button>
                                    <Button variant="outline" size="icon" className="w-14 h-14 bg-card/60 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 rounded-[20px] shadow-sm active:scale-90 transition-all" onClick={() => handleDelete(item)} isLoading={actingItem === item.id} disabled={!!actingItem}><Trash2 size={20} strokeWidth={3} /></Button>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full blur-[80px] group-hover:bg-primary/5 transition-all pointer-events-none" />
                    </Card>
                ))}
            </div>
            )}

            {/* Submission Protocol Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingItem ? "Resource Node Update" : "Global Stock Submission Protocol"}
                maxWidth="xl"
            >
                <div className="space-y-12 py-4 animate-slide-up">
                    {formError && (
                        <div className="p-6 bg-rose-500/10 border-4 border-dashed border-rose-500/20 rounded-[32px] flex items-center gap-6 text-rose-600 text-[11px] font-black uppercase tracking-widest animate-shake leading-relaxed shadow-lg">
                            <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-glow"><AlertCircle size={24} strokeWidth={3} /></div> {formError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4 md:col-span-2">
                            <Label htmlFor="item-name" className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Operational Designation</Label>
                            <Input id="item-name" type="text" placeholder="Designate item identifier (e.g. Broiler Premix 25kg)" className="h-18 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tracking-tight" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-4">
                            <Label htmlFor="item-qty" className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Active Unit Quantity</Label>
                            <Input id="item-qty" type="number" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tabular-nums" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-4">
                            <Label htmlFor="item-unit" className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Standard Metric Unit</Label>
                            <Select id="item-unit" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                {['units', 'kg', 'birds', 'litres', 'crates', 'bags', 'kilograms', 'grams'].map(u => <option key={u} value={u}>{u.toUpperCase()} NODE</option>)}
                            </Select>
                        </div>
                        
                        <div className="space-y-4">
                            <Label htmlFor="item-price" className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Unit Fiscal Valuation (₦)</Label>
                            <Input id="item-price" type="number" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tabular-nums text-primary" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                        </div>
                        
                        <div className="space-y-4">
                            <Label htmlFor="item-threshold" className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Critical Warning Threshold</Label>
                            <Input id="item-threshold" type="number" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tabular-nums" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
                        </div>
                    </div>

                    <div className="space-y-8 bg-muted/10 p-10 rounded-[48px] border-4 border-dashed border-border/40 group/photo">
                       <Label className="ml-2 font-black italic uppercase tracking-widest text-[11px] opacity-40">Visual Forensic Identifier (Image)</Label>
                       <div className="flex flex-col sm:flex-row gap-6">
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                          <Button variant="secondary" className="rounded-[24px] flex-1 py-10 h-20 bg-background border-2 border-border/20 font-black uppercase tracking-widest text-[11px] italic hover:border-primary/40 transition-all shadow-sm" onClick={() => fileInputRef.current?.click()} leftIcon={Paperclip}>System Directory</Button>
                          <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                          <Button variant="secondary" className="rounded-[24px] flex-1 py-10 h-20 bg-background border-2 border-border/20 font-black uppercase tracking-widest text-[11px] italic hover:border-primary/40 transition-all shadow-sm" onClick={() => cameraInputRef.current?.click()} leftIcon={Camera}>Device Optics</Button>
                       </div>
                       
                       {form.imageUrl && (
                           <div className="relative group w-64 h-64 rounded-[48px] overflow-hidden border-4 border-primary/40 mx-auto shadow-premium group/preview">
                               <img src={form.imageUrl} className="w-full h-full object-cover group-hover/preview:scale-110 transition-transform duration-700" />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                    <button className="bg-rose-500 text-white w-16 h-16 rounded-[24px] shadow-glow scale-110 active:scale-90 transition-transform flex items-center justify-center border-4 border-background" onClick={() => { setForm(f => ({ ...f, imageUrl: '' })); setSelectedFile(null); }}>
                                        <Trash2 size={28} strokeWidth={3} />
                                    </button>
                               </div>
                           </div>
                       )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-8 pt-10">
                        <Button variant="outline" className="flex-1 rounded-[32px] py-10 h-20 font-black uppercase tracking-widest text-[11px] italic border-border/40" onClick={() => setShowForm(false)}>Abort Submission</Button>
                        <Button className="flex-1 rounded-[32px] py-10 h-20 shadow-glow font-black uppercase tracking-widest text-[12px] italic bg-primary text-white" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={Send}>
                            <Zap size={20} className="mr-3" fill="currentColor" /> {editingItem ? 'Finalize Node Update' : 'Initialize Logic Protocol'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
