import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    X, Plus, Database, RefreshCw, Package, 
    Save, Upload, Edit2, Trash2
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

export const StoragePage: React.FC = () => {
    const { user, isAdmin, isInventory } = useAuth();
    const canManageAll = isAdmin;
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
            if (canManageAll) {
                setItems(data || []);
            } else {
                setItems((data || []).filter(i => i.submittedBy === (user?.id || '') || i.status === 'APPROVED'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user, canManageAll]);

    useEffect(() => {
        loadData();
        const ch = supabase.channel('storage-sync-hardened-v12')
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
                    canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.85);
                };
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadPhase('Compressing Visual Assets...');
        setUploadProgress(20);
        try {
            const blob = await compressImage(file);
            const compressed = new File([blob], file.name, { type: 'image/jpeg' });
            setUploadPhase('Transmitting via Secure Line...');
            setUploadProgress(50);
            const timer = setInterval(() => setUploadProgress(p => p < 95 ? p + 2 : p), 200);
            const url = await supabaseDataService.uploadStockImage(compressed);
            clearInterval(timer);
            setUploadProgress(100);
            if (url) {
                setForm(f => ({ ...f, imageUrl: url }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => { setUploadPhase(null); setUploadProgress(0); }, 1500);
        }
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
                status: 'PENDING_APPROVAL',
                submittedBy: user.id as string,
                submittedByName: (user.name || 'Anonymous Staff') as string,
                farmId: '1'
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

    const filteredItems = useMemo(() => {
        return items.filter(i => {
            const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === 'all' || i.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [items, searchTerm, filterStatus]);

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
            <div className="flex flex-col lg:flex-row gap-10 justify-between items-start lg:items-end px-4">
                <div className="flex items-center gap-6">
                    <button onClick={() => window.history.back()} className="p-4 bg-muted/20 hover:bg-muted/40 rounded-[28px] transition-all border border-border/10">
                        <X size={24} />
                    </button>
                    <div className="flex items-center gap-5">
                        <div className="p-5 bg-primary/10 text-primary rounded-[32px] border-2 border-primary/20 shadow-glow">
                             <Database size={36} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Inventory HUB</h1>
                            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-[0.4em] mt-3 opacity-50 italic">Operational Warehouse Terminal</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-[450px] group">
                        <div className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                             <Package size={22} />
                        </div>
                        <input placeholder="SEARCH ASSET REPOSITORY..." className="w-full pl-16 h-20 rounded-[35px] bg-card/40 border-2 border-border/40 backdrop-blur-3xl shadow-inner font-black uppercase text-[12px] tracking-widest focus:outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {canAddStock && (
                        <button onClick={() => { setShowForm(true); setEditingItem(null); setForm(EMPTY_FORM); }} className="bg-primary hover:bg-primary/90 text-white h-20 px-10 rounded-[35px] text-[12px] font-black uppercase tracking-[0.2em] shadow-glow transform hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-4 italic shrink-0">
                            <Plus size={24} strokeWidth={4} /> Log Entry
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 px-4 h-16">
                {['all', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(k => (
                    <button key={k} onClick={() => setFilterStatus(k)} className={`px-8 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all italic ${filterStatus === k ? 'bg-primary text-white shadow-glow' : 'bg-card/40 text-muted-foreground border-2 border-border/10 hover:bg-muted/10'}`}>
                        {k === 'all' ? 'Universal Sync' : k.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 px-2 pb-20">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-card rounded-[48px] border border-border/20 overflow-hidden shadow-premium group hover:border-primary/20 hover:translate-y-[-8px] transition-all duration-500">
                        <div className="h-64 bg-slate-900 relative overflow-hidden">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Package size={80} /></div>}
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING_APPROVAL' ? 'warning' : 'danger'} className="text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-lg border-2 border-white/10 backdrop-blur-md">
                                    {item.status.replace('_', ' ')}
                                </Badge>
                                <span className="px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-xl border border-white/5 uppercase">₦{item.unitPrice.toLocaleString()} / Unit</span>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Package size={20} /></div>
                                <h4 className="font-black text-xl uppercase tracking-tighter truncate">{item.name}</h4>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 bg-muted/10 p-4 rounded-[28px] border border-border/10">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40 mb-1">Available Reserve</p>
                                    <p className="text-xl font-black italic">{item.quantity} <span className="text-[10px] uppercase opacity-40">{item.unit}</span></p>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-4 pr-2">
                                    <button className="p-3 bg-muted/10 hover:bg-primary/20 hover:text-primary rounded-2xl transition-all" onClick={() => { setEditingItem(item); setForm({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice), unit: item.unit, category: item.category, description: item.description, imageUrl: item.imageUrl }); setShowForm(true); }}><Edit2 size={18} /></button>
                                    <button className="p-3 bg-muted/10 hover:bg-rose-500/20 hover:text-rose-500 rounded-2xl transition-all"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Operational Stock Entry" maxWidth="xl">
                <div className="space-y-10 py-6 animate-slide-up">
                    <div className="bg-muted/10 p-10 rounded-[48px] border-2 border-dashed border-border/30 relative group overflow-hidden h-80 flex flex-col items-center justify-center">
                        {form.imageUrl ? (
                           <div className="absolute inset-0">
                               <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                               <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <label className="bg-white text-black px-12 py-6 rounded-full font-black uppercase text-[11px] tracking-widest cursor-pointer shadow-glow">Replace Visual Asset</label>
                               </div>
                           </div>
                        ) : uploadPhase ? (
                            <div className="flex flex-col items-center gap-6 animate-pulse">
                                <div className="p-6 bg-primary text-white rounded-full shadow-glow"><Upload size={48} strokeWidth={3} className="animate-bounce" /></div>
                                <h4 className="font-black uppercase tracking-widest text-[11px]">{uploadPhase}</h4>
                                <div className="w-64 h-2 bg-muted rounded-full overflow-hidden shrink-0"><div className="h-full bg-primary transition-all duration-300 shadow-glow" style={{ width: `${uploadProgress}%` }} /></div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center gap-6 cursor-pointer hover:scale-105 transition-all">
                                <div className="p-8 bg-card border-2 border-primary/20 rounded-[35px] text-primary shadow-premium"><Upload size={48} strokeWidth={3} /></div>
                                <div className="text-center"><h4 className="font-black uppercase tracking-widest text-[11px]">Authorize Visual Telemetry</h4><p className="text-[9px] font-bold text-muted-foreground mt-2 opacity-50 uppercase tracking-widest italic">JPEG/PNG Protocol supported</p></div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3"><Label className="ml-2 italic uppercase text-[10px] font-black opacity-40">Asset Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Layers Pellets X-50" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic tracking-tight" /></div>
                        <div className="space-y-3"><Label className="ml-2 italic uppercase text-[10px] font-black opacity-40">Initial Reserve (Qty)</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0.00" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic tabular-nums tracking-tight" /></div>
                        <div className="space-y-3"><Label className="ml-2 italic uppercase text-[10px] font-black opacity-40">Unit Value (₦)</Label><Input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0.00" className="h-16 rounded-[24px] bg-rose-500/5 text-rose-500 border-rose-500/20 font-black italic text-xl tabular-nums tracking-tight" /></div>
                        <div className="space-y-3"><Label className="ml-2 italic uppercase text-[10px] font-black opacity-40">Logistics Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Bags / Units" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic tracking-tight" /></div>
                    </div>
                    <div className="flex gap-4 pt-10">
                        <Button variant="outline" className="flex-1 rounded-[32px] h-20 font-black uppercase text-[11px] tracking-widest border-2" onClick={() => setShowForm(false)}>Abort Record</Button>
                        <Button className="flex-1 rounded-[32px] h-20 bg-primary text-white shadow-glow font-black uppercase text-[11px] tracking-widest group" onClick={handleSubmit} isLoading={isSubmitting}>
                            {editingItem ? 'Save Reconsolidation' : 'Protocol Insertion'} <Save className="ml-3 group-hover:scale-125 transition-all" size={20} />
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
