import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    X, Plus, Database, Package, 
    Save, Upload, Edit2, Trash2, Search,
    Filter, Clock, CheckCircle2, AlertCircle
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
                // Non-admins see everything but can only edit their own or see approved items
                setItems(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [canManageAll]);

    useEffect(() => {
        loadData();
        const ch = supabase.channel('storage-sync-refined-v1')
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
                status: editingItem ? editingItem.status : 'PENDING_APPROVAL',
                submittedBy: user.id as string,
                submittedByName: (user.name || 'Staff') as string,
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
            <div className="space-y-8 animate-slide-up px-4">
                <div className="flex justify-between items-center bg-card/40 p-8 rounded-[32px] border border-border/10">
                    <Skeleton width={300} height={40} />
                    <Skeleton width={150} height={50} borderRadius={20} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={350} borderRadius={40} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-slide-up px-2 pb-24 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center px-4">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 text-primary rounded-3xl border border-primary/20">
                        <Database size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Inventory</h1>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">Manage your farm stock and supplies</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 overflow-hidden group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            placeholder="Find items..." 
                            className="w-full pl-12 pr-4 h-14 rounded-2xl bg-card/60 border border-border/40 focus:border-primary/50 transition-all font-bold" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    {canAddStock && (
                        <Button onClick={() => { setShowForm(true); setEditingItem(null); setForm(EMPTY_FORM); }} className="h-14 px-8 rounded-2xl shadow-glow">
                            <Plus size={20} className="mr-2" /> Add Stock
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
                <Filter size={16} className="text-muted-foreground mr-2 shrink-0" />
                {['all', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(k => (
                    <button 
                        key={k} 
                        onClick={() => setFilterStatus(k)} 
                        className={`
                            px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border
                            ${filterStatus === k 
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                                : 'bg-card text-muted-foreground border-border/20 hover:bg-muted/10'}
                        `}
                    >
                        {k === 'all' ? 'All Items' : k.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-card/20 rounded-[40px] border border-dashed border-border/40">
                        <Package size={64} className="mx-auto opacity-10 mb-4" />
                        <p className="text-sm font-bold opacity-30 uppercase tracking-widest italic">No items found matching your filters</p>
                    </div>
                ) : filteredItems.map(item => (
                    <div key={item.id} className="group bg-card rounded-[40px] border border-border/30 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full">
                        {/* Image area */}
                        <div className="h-56 bg-slate-900 relative">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary/10">
                                    <Package size={64} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING_APPROVAL' ? 'warning' : 'danger'} className="shadow-lg backdrop-blur-md">
                                    {item.status.replace('_', ' ')}
                                </Badge>
                                <span className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black border border-white/10 shadow-lg">
                                    ₦{item.unitPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="p-6 flex flex-col flex-1 gap-4">
                            <div className="space-y-1">
                                <h4 className="font-black text-lg uppercase tracking-tight truncate group-hover:text-primary transition-colors">{item.name}</h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 tracking-widest">Added by {item.submittedByName || 'Staff'}</p>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-border/10">
                                <div className="bg-muted/10 p-3 rounded-2xl border border-border/10">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40 mb-1">Available</p>
                                    <p className="text-base font-black italic">{item.quantity} <span className="text-[9px] uppercase opacity-40">{item.unit}</span></p>
                                </div>
                                <div className="flex gap-2 items-center justify-end">
                                    <button 
                                        onClick={() => {
                                            setEditingItem(item);
                                            setForm({
                                                name: item.name,
                                                quantity: String(item.quantity),
                                                unitPrice: String(item.unitPrice),
                                                unit: item.unit || '',
                                                category: item.category || '',
                                                description: item.description || '',
                                                imageUrl: item.imageUrl || ''
                                            });
                                            setShowForm(true);
                                        }}
                                        className="p-3 bg-muted/20 hover:bg-primary/20 hover:text-primary rounded-xl transition-all active:scale-90"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="p-3 bg-muted/20 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-all active:scale-90 opacity-40 hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingItem ? "Update Stock" : "Add New Stock"} maxWidth="lg">
                <div className="space-y-8 py-4">
                    {/* Visual Section */}
                    <div className="bg-muted/10 p-4 rounded-[32px] border-2 border-dashed border-border/30 overflow-hidden h-64 flex flex-col items-center justify-center relative group">
                        {form.imageUrl ? (
                            <div className="absolute inset-0">
                                <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <label className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer shadow-glow transform hover:scale-105 active:scale-95 transition-all">
                                        Update Photo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        ) : uploadPhase ? (
                            <div className="flex flex-col items-center gap-4 animate-slide-up">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow" />
                                <h4 className="font-black uppercase tracking-widest text-[10px] text-primary">{uploadPhase}</h4>
                                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-all duration-500">
                                <div className="p-6 bg-card border border-border/40 rounded-3xl text-primary shadow-soft group-hover:shadow-glow transition-all">
                                    <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-black uppercase tracking-widest text-[10px]">Add Product Photo</h4>
                                    <p className="text-[9px] font-bold text-muted-foreground mt-2 opacity-40 uppercase">Support: PNG, JPG</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>

                    {/* Form Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input 
                                placeholder="e.g. Layers Mash" 
                                value={form.name} 
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Logistics Unit</Label>
                            <Input 
                                placeholder="e.g. Bags, Units" 
                                value={form.unit} 
                                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={form.quantity} 
                                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit Price (₦)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={form.unitPrice} 
                                onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} 
                                className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5 focus:border-emerald-500/50"
                            />
                        </div>
                    </div>

                    {!isAdmin && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 items-center">
                            <Clock size={18} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">This entry will be sent to the Admin for approval before it becomes available for sales.</p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 h-14" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                        <Button 
                            className="flex-1 h-14" 
                            onClick={handleSubmit} 
                            isLoading={isSubmitting}
                            leftIcon={Save}
                        >
                            {editingItem ? 'Save Changes' : 'Submit Stock'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoragePage;
