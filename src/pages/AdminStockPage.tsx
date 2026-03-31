import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    ShoppingBag, Banknote, Smartphone, CreditCard,
    ArrowUpRight, TrendingUp, History,
    UserCheck, Clock, ShieldX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge, Modal, Input, Label } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

const PAY_ICONS: Record<string, React.ReactNode> = {
    cash: <Banknote size={14} />,
    transfer: <Smartphone size={14} />,
    pos: <CreditCard size={14} />,
};

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
        const ch = supabase.channel('admin-stock-v4').on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock]);

    useEffect(() => {
        if (tab === 'SALES_HISTORY') loadSales();
    }, [tab, loadSales]);

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
         <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-60">Admin access is required to view this section.</p>
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
            name: editName, quantity: newQty, unitPrice: parseFloat(editPrice),
        }, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: editName, quantity: newQty, unitPrice: parseFloat(editPrice), status: newStatus } : i));
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
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-primary">
                     Stock <span className="text-foreground">Admin</span>
                   </h1>
                   <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest mt-3 opacity-50 italic">Inventory control and sales history</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-80 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input type="text" placeholder="Search products..." className="pl-12 h-14 rounded-[20px] bg-card border-border/40" value={search} onChange={e => setSearch(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadStock} className="rounded-xl w-14 h-14 bg-card border-border/40 shadow-sm"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} /></Button>
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

            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 px-2 scroll-smooth no-scrollbar">
                {[
                    { id: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
                    { id: 'APPROVED', label: 'In Stock', count: counts.APPROVED },
                    { id: 'OUT_OF_STOCK', label: 'Sold Out', count: counts.OUT_OF_STOCK },
                    { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
                    { id: 'SALES_HISTORY', label: 'Sales History', count: sales.length },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`
                        flex items-center gap-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all font-bold text-[10px] uppercase tracking-widest border
                        ${tab === t.id ? 'bg-primary text-white border-primary shadow-lg' : 'bg-card border-border/40 hover:border-primary/20'}
                    `}>
                        {t.label} 
                        {t.count > 0 && <span className={`px-2 py-0.5 rounded-lg text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-muted/10'}`}>{t.count}</span>}
                    </button>
                ))}
            </div>

            <div className="min-h-[500px]">
                {tab === 'SALES_HISTORY' ? (
                    <div className="space-y-8 animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Card className="bg-emerald-500/5 border-emerald-500/10 p-8 rounded-[32px] flex items-center gap-6">
                              <div className="p-5 bg-emerald-500/10 rounded-2xl text-emerald-500"><TrendingUp size={30} /></div>
                              <div>
                                 <p className="text-[9px] font-bold uppercase text-emerald-600 tracking-widest opacity-60 mb-1">Total Revenue</p>
                                 <h3 className="text-3xl font-black tracking-tighter tabular-nums">₦{sales.reduce((s, sale) => s + (sale.totalPrice || 0), 0).toLocaleString()}</h3>
                              </div>
                           </Card>
                           <Card className="bg-primary/5 border-primary/10 p-8 rounded-[32px] flex items-center gap-6 justify-between">
                              <div className="flex items-center gap-6">
                                 <div className="p-5 bg-primary/10 rounded-2xl text-primary"><ShoppingBag size={30} /></div>
                                 <div>
                                    <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60 mb-1">Sales Volume</p>
                                    <h3 className="text-3xl font-black tracking-tighter tabular-nums">{sales.length} <span className="text-xs opacity-40">Orders</span></h3>
                                 </div>
                              </div>
                              <Button variant="ghost" className="rounded-xl w-12 h-12 bg-primary/10 text-primary" onClick={() => navigate('/admin/sales')}><ArrowUpRight size={20} /></Button>
                           </Card>
                        </div>

                        <div className="space-y-4">
                           {salesLoading ? [1,2,3].map(i => <Skeleton key={i} height={100} borderRadius={24} />) : filteredSales.length === 0 ? (
                               <div className="py-20 text-center opacity-30">
                                  <ShoppingBag size={80} className="mx-auto mb-4" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">No sales records found</p>
                               </div>
                           ) : filteredSales.map(sale => (
                               <Card key={sale.id} className="p-0 overflow-hidden border-border/20 bg-card/60" noPadding>
                                  <div className="flex items-center gap-6 p-6">
                                     <div className="w-16 h-16 rounded-2xl bg-muted/10 flex flex-col items-center justify-center border border-border/20 shrink-0">
                                        <span className="text-[8px] font-bold opacity-40 uppercase">REC</span>
                                        <span className="text-md font-black tracking-tighter italic">{sale.receiptNumber?.slice(-5)}</span>
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                           <div>
                                              <h4 className="font-bold text-lg uppercase tracking-tight truncate">{sale.customerName || 'Direct Client'}</h4>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <Clock size={10} className="opacity-30" />
                                                  <span className="text-[9px] font-bold text-muted-foreground opacity-60">{new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <p className="text-2xl font-black tracking-tighter text-emerald-600">₦{(sale.totalPrice || 0).toLocaleString()}</p>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">{sale.paymentMethod?.toUpperCase()}</p>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </Card>
                           ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-slide-up">
                        {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} height={120} borderRadius={24} />) : filtered.length === 0 ? (
                           <div className="py-20 text-center opacity-30">
                              <Package size={80} className="mx-auto mb-4" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">No items in this category</p>
                           </div>
                        ) : filtered.map(item => (
                           <Card key={item.id} className={`p-0 overflow-hidden border-border/20 bg-card/60 ${acting === item.id ? 'opacity-40 pointer-events-none' : ''}`} noPadding>
                              <div className="flex flex-col md:flex-row items-center">
                                 <div className="w-full md:w-48 h-40 md:h-auto overflow-hidden bg-muted/10 shrink-0">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Package size={40} /></div>
                                    )}
                                 </div>
                                 <div className="flex-1 p-8 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                                    <div className="space-y-2">
                                       <Badge variant={item.status === 'PENDING_APPROVAL' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'danger'} className="text-[8px] font-black h-6 px-3">
                                          {item.status.replace('_', ' ')}
                                       </Badge>
                                       <h4 className="font-extrabold text-2xl tracking-tighter uppercase">{item.name}</h4>
                                       <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Posted by: {item.submittedByName || 'System'}</p>
                                    </div>
                                    
                                    <div className="flex flex-col items-center md:items-end">
                                       <p className="text-2xl font-black tracking-tighter mb-1">₦{item.unitPrice.toLocaleString()}</p>
                                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">{item.quantity} {item.unit} in stock</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                       {item.status === 'PENDING_APPROVAL' && (
                                          <>
                                             <Button className="rounded-xl h-12 px-6 bg-emerald-500 hover:bg-emerald-600 font-bold uppercase text-[9px] tracking-widest shadow-md" onClick={() => approve(item)} isLoading={acting === item.id}>Approve</Button>
                                             <Button variant="outline" className="rounded-xl h-12 px-6 border-rose-500/40 text-rose-600 font-bold uppercase text-[9px] tracking-widest" onClick={() => { setRejectItem(item); setRejectNote(''); }}>Reject</Button>
                                          </>
                                       )}
                                       <div className="flex items-center gap-2">
                                           <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl bg-card border-border/40 text-muted-foreground hover:text-primary transition-all" onClick={() => { setEditItem(item); setEditName(item.name); setEditQty(String(item.quantity)); setEditPrice(String(item.unitPrice)); }}><Edit3 size={18} /></Button>
                                           <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl bg-card border-border/40 text-muted-foreground hover:text-rose-500 transition-all" onClick={() => deleteItem(item)} isLoading={acting === item.id}><Trash2 size={18} /></Button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              {item.rejectionComment && item.status === 'REJECTED' && (
                                 <div className="bg-rose-500/5 p-4 border-t border-rose-500/10 flex items-center gap-3 text-rose-600">
                                    <ShieldX size={16} className="shrink-0" />
                                    <p className="text-[10px] font-bold italic opacity-80">Reason: {item.rejectionComment}</p>
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
                title="REJECTION REASON"
                maxWidth="sm"
            >
                 <div className="space-y-8 py-2 animate-slide-up">
                    <div className="bg-rose-600/5 p-6 rounded-2xl border border-rose-600/10 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Block Resource</h4>
                        <p className="text-xs italic text-muted-foreground opacity-70">Specify why this product is being rejected.</p>
                    </div>
                    
                    <div className="space-y-3">
                        <Label>Comments</Label>
                        <textarea 
                            className="w-full h-32 p-5 bg-card border border-border/40 rounded-2xl outline-none focus:border-rose-500 transition-all font-bold text-sm shadow-inner resize-none" 
                            value={rejectNote} 
                            onChange={e => setRejectNote(e.target.value)} 
                            placeholder="Enter reason..." 
                        />
                    </div>
                    
                    <div className="flex gap-4">
                       <Button variant="outline" className="flex-1 rounded-xl h-14 font-bold uppercase text-[10px] tracking-widest" onClick={() => setRejectItem(null)}>Cancel</Button>
                       <Button className="flex-1 rounded-xl h-14 bg-rose-600 hover:bg-rose-700 font-bold uppercase text-[10px] tracking-widest" onClick={confirmReject} isLoading={acting === rejectItem?.id}>Reject Now</Button>
                    </div>
                 </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editItem}
                onClose={() => setEditItem(null)}
                title="EDIT PRODUCT"
                maxWidth="sm"
            >
                 <div className="space-y-8 py-2 animate-slide-up">
                    <div className="space-y-6">
                        <div className="space-y-2">
                           <Label>Product Name</Label>
                           <Input type="text" className="h-14 rounded-xl bg-card border-border/40 font-bold" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Current Quantity</Label>
                              <Input type="number" className="h-14 rounded-xl bg-card border-border/40 font-bold" value={editQty} onChange={e => setEditQty(e.target.value)} />
                           </div>
                           <div className="space-y-2">
                              <Label>Price (₦)</Label>
                              <Input type="number" className="h-14 rounded-xl bg-card border-border/40 font-bold text-primary" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                       <Button variant="outline" className="flex-1 rounded-xl h-14 font-bold uppercase text-[10px] tracking-widest" onClick={() => setEditItem(null)}>Discard</Button>
                       <Button className="flex-1 rounded-xl h-14 font-bold uppercase text-[10px] tracking-widest shadow-lg" onClick={confirmEdit} isLoading={acting === editItem?.id}>Save Changes</Button>
                    </div>
                 </div>
            </Modal>
        </div>
    );
};

export default AdminStockPage;
