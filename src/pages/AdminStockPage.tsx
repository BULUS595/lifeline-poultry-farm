import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    ShoppingBag, TrendingUp, Clock, ShieldX,
    ArrowUpRight, Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge, Modal, Input, Label } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

export const AdminStockPage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<StockItem[]>([]);
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salesLoading, setSalesLoading] = useState(false);
    const [tab, setTab] = useState<Tab>('PENDING_APPROVAL');
    const [search, setSearch] = useState('');
    const [acting, setActing] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [editItem, setEditItem] = useState<StockItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editQty, setEditQty] = useState('');
    const [editPrice, setEditPrice] = useState('');

    const [rejectItem, setRejectItem] = useState<StockItem | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<string | null>(null);

    const loadStock = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getAllStockItems();
            setItems(data);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSales = useCallback(async () => {
        setSalesLoading(true);
        try {
            const res = await supabaseDataService.getRetailSales(user ? { id: user.id, role: user.role } : undefined);
            if (res.success) setSales(res.data);
        } finally {
            setSalesLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('admin-stock-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock]);

    useEffect(() => {
        if (tab === 'SALES_HISTORY') loadSales();
    }, [tab, loadSales]);

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
        if (!file || !editItem) return;
        setUploadPhase('Compressing...');
        setUploadProgress(20);
        try {
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            setUploadPhase('Uploading...');
            setUploadProgress(50);
            const timer = setInterval(() => { setUploadProgress(p => p < 95 ? p + 2 : p); }, 200);
            const url = await supabaseDataService.uploadStockImage(compressedFile);
            clearInterval(timer);
            setUploadProgress(100);
            if (url) setEditItem({ ...editItem, imageUrl: url });
        } finally {
            setTimeout(() => { setUploadPhase(null); setUploadProgress(0); }, 800);
        }
    };

    const filtered = useMemo(() =>
        items.filter(i => (i.status === tab) && i.name.toLowerCase().includes(search.toLowerCase())), [items, tab, search]);

    const filteredSales = useMemo(() =>
        sales.filter(s => {
            let safeIts = Array.isArray(s.items) ? s.items : [];
            if (typeof s.items === 'string') { try { safeIts = JSON.parse(s.items); } catch(e) {} }
            return ((s.receiptNumber || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
            safeIts.some((it: any) => (it.name || '').toLowerCase().includes(search.toLowerCase())));
        }), [sales, search]);

    const counts = {
        PENDING_APPROVAL: items.filter(i => i.status === 'PENDING_APPROVAL').length,
        APPROVED: items.filter(i => i.status === 'APPROVED').length,
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
        OUT_OF_STOCK: items.filter(i => i.status === 'OUT_OF_STOCK').length,
    };

    if (!isSuperAdmin && !isManager) return (
      <div className="h-[60vh] flex flex-col items-center justify-center animate-slide-up px-6 text-center">
         <ShieldCheck size={64} className="text-rose-500 mb-6 opacity-20" />
         <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Access Restricted</h2>
         <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-60">Admin access is required to view Governance Hub.</p>
         <Button variant="secondary" className="mt-8 rounded-xl px-10 h-14 font-bold uppercase tracking-widest text-[10px]" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );

    const approve = async (item: StockItem) => {
        if (!user) return;
        setActionError(null);
        setActing(item.id);
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        else setActionError(`Failed to approve "${item.name}"`);
        setActing(null);
    };

    const confirmReject = async () => {
        if (!rejectItem || !user) return;
        setActing(rejectItem.id);
        const ok = await supabaseDataService.rejectStockItem(rejectItem.id, rejectNote.trim(), { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === rejectItem.id ? { ...i, status: 'REJECTED', rejectionComment: rejectNote.trim() } : i));
        setRejectItem(null);
        setActing(null);
    };

    const confirmEdit = async () => {
        if (!editItem || !user) return;
        setActing(editItem.id);
        const newQty = parseFloat(editQty);
        const newStatus = (editItem.status === 'OUT_OF_STOCK' && newQty > 0) ? 'APPROVED' : editItem.status;
        const ok = await supabaseDataService.updateStockItem(editItem.id, {
            name: editName, quantity: newQty, unitPrice: parseFloat(editPrice), imageUrl: editItem.imageUrl
        }, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: editName, quantity: newQty, unitPrice: parseFloat(editPrice), imageUrl: editItem.imageUrl, status: newStatus } : i));
            setEditItem(null);
        }
        setActing(null);
    };

    const deleteItem = async (item: StockItem) => {
        if (!user || !confirm(`Permanently delete "${item.name}"?`)) return;
        setActing(item.id);
        const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
        setActing(null);
    };

    return (
        <div className="space-y-12 pb-20 animate-slide-up">
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div>
                   <div className="flex items-center gap-3 mb-4">
                       <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-glow">
                           <ShieldCheck size={28} strokeWidth={2.5} />
                       </div>
                       <div>
                           <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                             Governance <span className="text-primary italic">HUB</span>
                           </h1>
                           <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest mt-1.5 opacity-50 italic">Central Approval Terminal</p>
                       </div>
                   </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-80 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input type="text" placeholder="Filter submissions..." className="pl-12 h-14 rounded-[24px] bg-card/50 border-border/40 backdrop-blur-sm shadow-inner" value={search} onChange={e => setSearch(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadStock} className="rounded-2xl w-14 h-14 bg-card border-border/40 shadow-sm hover:text-primary transition-all"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} /></Button>
                </div>
            </div>

            {actionError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between text-rose-600">
                   <div className="flex items-center gap-3 font-bold uppercase text-[10px] tracking-widest">
                       <AlertTriangle size={18} /> {actionError}
                   </div>
                   <button onClick={() => setActionError(null)} className="p-1.5 hover:bg-rose-500/10 rounded-lg"><X size={16} /></button>
                </div>
            )}

            <div className="flex items-center gap-3 overflow-x-auto pb-2 px-2 no-scrollbar">
                {[
                    { id: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
                    { id: 'APPROVED', label: 'Approved', count: counts.APPROVED },
                    { id: 'OUT_OF_STOCK', label: 'Sold Out', count: counts.OUT_OF_STOCK },
                    { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
                    { id: 'SALES_HISTORY', label: 'Sales History', count: sales.length },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`
                        flex items-center gap-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all font-bold text-[10px] uppercase tracking-widest border
                        ${tab === t.id ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-card border-border/40 hover:border-primary/20'}
                    `}>
                        {t.label} 
                        {t.count > 0 && <span className={`px-2 py-0.5 rounded-lg text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-muted/10'}`}>{t.count}</span>}
                    </button>
                ))}
            </div>

            <div className="min-h-[500px]">
                {tab === 'SALES_HISTORY' ? (
                    <div className="space-y-8 animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                           <Card className="bg-emerald-500/5 border-emerald-500/10 p-8 rounded-[40px] flex items-center gap-6">
                              <div className="p-5 bg-emerald-500/10 rounded-2xl text-emerald-500"><TrendingUp size={30} /></div>
                              <div>
                                 <p className="text-[9px] font-bold uppercase text-emerald-600 tracking-widest opacity-60 mb-1">Total Revenue</p>
                                 <h3 className="text-3xl font-black tracking-tighter tabular-nums">₦{sales.reduce((s, sale) => s + (sale.totalPrice || 0), 0).toLocaleString()}</h3>
                              </div>
                           </Card>
                           <Card className="bg-primary/5 border-primary/10 p-8 rounded-[40px] flex items-center gap-6 justify-between">
                              <div className="flex items-center gap-6">
                                 <div className="p-5 bg-primary/10 rounded-2xl text-primary"><ShoppingBag size={30} /></div>
                                 <div>
                                    <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60 mb-1">Sales Volume</p>
                                    <h3 className="text-3xl font-black tracking-tighter tabular-nums">{sales.length} <span className="text-xs opacity-40 italic">Invoices</span></h3>
                                 </div>
                              </div>
                              <Button variant="ghost" className="rounded-2xl w-14 h-14 bg-primary/10 text-primary" onClick={() => navigate('/admin/sales')}><ArrowUpRight size={24} /></Button>
                           </Card>
                        </div>

                        <div className="space-y-4 px-2">
                           {salesLoading ? [1,2,3].map(i => <Skeleton key={i} height={100} borderRadius={24} />) : filteredSales.length === 0 ? (
                               <div className="py-20 text-center opacity-30">
                                  <ShoppingBag size={80} className="mx-auto mb-4 stroke-1" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">No sales records found</p>
                               </div>
                           ) : filteredSales.map(sale => (
                               <Card key={sale.id} className="p-0 overflow-hidden border-border/20 bg-card/60 rounded-[30px]" noPadding>
                                  <div className="flex items-center gap-6 p-6">
                                     <div className="w-16 h-16 rounded-2xl bg-muted/10 flex flex-col items-center justify-center border border-border/20 shrink-0">
                                        <span className="text-[8px] font-bold opacity-40 uppercase">REC</span>
                                        <span className="text-md font-black tracking-tighter italic">{sale.receiptNumber?.slice(-5)}</span>
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                           <div>
                                              <h4 className="font-black text-xl uppercase tracking-tighter truncate">{sale.customerName || 'Direct Client'}</h4>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <Clock size={12} className="opacity-30" />
                                                  <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase">{new Date(sale.createdAt).toLocaleString()}</span>
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <p className="text-3xl font-black tracking-tighter text-emerald-600 italic">₦{(sale.totalPrice || 0).toLocaleString()}</p>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">{sale.paymentMethod || 'cash'}</p>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </Card>
                           ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-slide-up px-2">
                        {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} height={150} borderRadius={32} />) : filtered.length === 0 ? (
                           <div className="py-20 text-center opacity-30">
                              <Package size={80} className="mx-auto mb-4 stroke-1" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">Category sector empty</p>
                           </div>
                        ) : filtered.map(item => (
                           <Card key={item.id} className={`p-0 overflow-hidden border-border/20 bg-card/60 rounded-[40px] shadow-sm ${acting === item.id ? 'opacity-40 pointer-events-none' : ''}`} noPadding>
                              <div className="flex flex-col md:flex-row items-stretch">
                                 <div className="w-full md:w-56 h-48 md:h-auto overflow-hidden bg-slate-900 shrink-0 relative">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-cover opacity-80" alt={item.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/10"><Package size={60} /></div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <Badge variant={item.status === 'PENDING_APPROVAL' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'danger'} className="text-[9px] font-black uppercase px-4 h-8 backdrop-blur-xl">
                                            {item.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                 </div>
                                 <div className="flex-1 p-10 flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
                                    <div className="space-y-2 flex-1">
                                       <h4 className="font-black text-3xl tracking-tighter uppercase italic text-foreground leading-none">{item.name}</h4>
                                       <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] opacity-40">Submitted by: {item.submittedByName || 'System'}</p>
                                       <div className="flex items-center gap-3 mt-4 opacity-60">
                                            <div className="px-3 py-1 bg-muted rounded-lg text-[9px] font-black uppercase">{item.quantity} {item.unit}</div>
                                            <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase">₦{item.unitPrice.toLocaleString()} / Unit</div>
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                                        {item.status === 'PENDING_APPROVAL' && (
                                           <>
                                              <Button 
                                                className="rounded-2xl h-16 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[11px] tracking-widest shadow-glow-success active:scale-95 transition-all w-full sm:w-auto italic" 
                                                onClick={() => approve(item)} 
                                                isLoading={acting === item.id}
                                                leftIcon={CheckCircle2}
                                              >
                                                Approve
                                              </Button>
                                              <Button 
                                                variant="outline" 
                                                className="rounded-2xl h-16 px-10 border-rose-500/30 text-rose-500 font-black uppercase text-[11px] tracking-widest hover:bg-rose-500/5 active:scale-95 transition-all w-full sm:w-auto italic" 
                                                onClick={() => { setRejectItem(item); setRejectNote(''); }}
                                                leftIcon={ShieldX}
                                              >
                                                Reject
                                              </Button>
                                           </>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl bg-card border-border/40 text-muted-foreground hover:text-primary transition-all shadow-sm" onClick={() => { setEditItem(item); setEditName(item.name); setEditQty(String(item.quantity)); setEditPrice(String(item.unitPrice)); }}><Edit3 size={24} /></Button>
                                            <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl bg-card border-border/40 text-muted-foreground hover:text-rose-500 transition-all shadow-sm" onClick={() => deleteItem(item)} isLoading={acting === item.id}><Trash2 size={24} /></Button>
                                        </div>
                                    </div>
                                 </div>
                              </div>
                              {item.rejectionComment && item.status === 'REJECTED' && (
                                 <div className="bg-rose-500/5 p-6 border-t border-rose-500/10 flex items-center gap-4 text-rose-600">
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <p className="text-[11px] font-black uppercase tracking-tight italic">Reason: {item.rejectionComment}</p>
                                 </div>
                              )}
                           </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <Modal
                isOpen={!!rejectItem}
                onClose={() => setRejectItem(null)}
                title="REJECTION PROTOCOL"
                maxWidth="sm"
            >
                 <div className="space-y-10 py-4 animate-slide-up">
                    <div className="bg-rose-500/10 p-8 rounded-[32px] border border-rose-500/20 space-y-3">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Block Resource Entry</h4>
                        <p className="text-[10px] font-bold italic text-muted-foreground opacity-60 leading-relaxed">System requires a valid justification for rejection to notify the submission officer.</p>
                    </div>
                    
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Reason (Required)</Label>
                        <textarea 
                            className="w-full h-40 p-8 bg-card border border-border/40 rounded-[32px] outline-none focus:border-rose-500 transition-all font-bold text-sm shadow-inner italic resize-none custom-scrollbar" 
                            value={rejectNote} 
                            onChange={e => setRejectNote(e.target.value)} 
                            placeholder="Identify stock discrepancies or quality issues..." 
                        />
                    </div>
                    
                    <div className="flex gap-5">
                       <Button variant="outline" className="flex-1 rounded-[24px] h-18 font-black uppercase text-[11px] tracking-widest" onClick={() => setRejectItem(null)}>Abort</Button>
                       <Button className="flex-1 rounded-[24px] h-18 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[11px] tracking-widest shadow-glow-rose" onClick={confirmReject} isLoading={acting === rejectItem?.id}>Confirm Void</Button>
                    </div>
                 </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editItem}
                onClose={() => setEditItem(null)}
                title="OVERRIDE PRODUCT CORE"
                maxWidth="sm"
            >
                 <div className="space-y-10 py-4 animate-slide-up">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Visual Telemetry</Label>
                            <div className="relative aspect-video rounded-[40px] overflow-hidden bg-slate-900 border-4 border-card shadow-2xl group">
                                {editItem?.imageUrl ? (
                                    <>
                                        <img src={editItem.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt="Preview" />
                                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-xl">
                                            <label className="cursor-pointer bg-white text-slate-950 px-8 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl">
                                                Update Optic
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <label className={`
                                        w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all border-4 border-dashed
                                        ${uploadPhase ? 'border-primary bg-primary/5 animate-pulse' : 'border-border/20 hover:bg-primary/5 hover:border-primary/40'}
                                    `}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={!!uploadPhase} />
                                        {uploadPhase ? (
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 rounded-full border-8 border-primary border-t-transparent animate-spin" />
                                                <span className="text-[12px] font-black uppercase text-primary tracking-[0.2em]">{uploadProgress}%</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={48} className="text-muted-foreground/20 mb-4" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 italic">Log Visual Asset</span>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Designation</Label>
                           <Input type="text" className="h-18 px-8 rounded-[28px] bg-card border-border/40 font-black text-lg italic" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Reserve Qty</Label>
                              <Input type="number" className="h-18 px-8 rounded-[28px] bg-card border-border/40 font-black text-2xl tabular-nums italic" value={editQty} onChange={e => setEditQty(e.target.value)} />
                           </div>
                           <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Price (₦)</Label>
                              <Input type="number" className="h-18 px-8 rounded-[28px] bg-card border-border/40 font-black text-2xl tabular-nums text-primary italic" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-5 pt-4">
                       <Button variant="outline" className="flex-1 rounded-[28px] h-20 font-black uppercase text-[11px] tracking-widest border-[3px]" onClick={() => setEditItem(null)}>Abort</Button>
                       <Button className="flex-1 rounded-[28px] h-20 bg-primary text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-glow" onClick={confirmEdit} isLoading={acting === editItem?.id}>Sync Data</Button>
                    </div>
                 </div>
            </Modal>
        </div>
    );
};

export default AdminStockPage;
