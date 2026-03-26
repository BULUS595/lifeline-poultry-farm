import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2, XCircle, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    ShoppingBag, Banknote, Smartphone, CreditCard,
    ArrowUpRight, TrendingUp, History,
    UserCheck, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

const PAY_ICONS: Record<string, React.ReactNode> = {
    cash: <Banknote size={12} />,
    transfer: <Smartphone size={12} />,
    pos: <CreditCard size={12} />,
};

export const AdminStockPage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const [items, setItems] = useState<StockItem[]>([]);
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salesLoading, setSalesLoading] = useState(false);
    const [tab, setTab] = useState<Tab>('PENDING_APPROVAL');
    const [search, setSearch] = useState('');
    const [acting, setActing] = useState<string | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);

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
            const data = await supabaseDataService.getRetailSales();
            setSales(data);
        } finally {
            setSalesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('admin-stock-v3').on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock).subscribe();
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
            return (s.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
            s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
            safeIts.some((it: any) => it.name?.toLowerCase().includes(search.toLowerCase())));
        }), [sales, search]);

    const counts = {
        PENDING_APPROVAL: items.filter(i => i.status === 'PENDING_APPROVAL').length,
        APPROVED: items.filter(i => i.status === 'APPROVED').length,
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
        OUT_OF_STOCK: items.filter(i => i.status === 'OUT_OF_STOCK').length,
    };

    if (!isSuperAdmin && !isManager) return (
      <div className="h-[60vh] flex flex-col items-center justify-center opacity-50 space-y-4">
         <div className="p-6 bg-rose-500/10 rounded-full text-rose-500"><ShieldCheck size={48} /></div>
         <h2 className="text-2xl font-black uppercase tracking-tight italic">Root Restricted</h2>
         <p className="max-w-xs text-center font-medium">Stock auditing is restricted to authorized management personnel.</p>
      </div>
    );

    const approve = async (item: StockItem) => {
        if (!user) return;
        setApproveError(null);
        setActing(item.id);
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        else setApproveError(`Failed to approve "${item.name}"`);
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
        if (!user || !confirm(`Delete "${item.name}"? This is permanent.`)) return;
        setActing(item.id);
        const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.filter(i => i.id !== item.id));
        setActing(null);
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic text-primary underline decoration-primary/20">Stock <span className="italic">Terminal</span></h1>
                   <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Authorize and audit global inventory flow</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input type="text" placeholder="Search resources..." className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium" value={search} onChange={e => setSearch(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadStock} className="rounded-2xl h-[46px] w-[46px]"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={18} /></Button>
                </div>
            </div>

            {/* Error banner */}
            {approveError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between text-rose-500 font-bold italic text-sm">
                   <div className="flex items-center gap-2"><AlertCircle size={18} /> {approveError}</div>
                   <button onClick={() => setApproveError(null)} className="p-1 hover:bg-rose-500/10 rounded-lg"><X size={16} /></button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {[
                    { id: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL, variant: 'warning' },
                    { id: 'APPROVED', label: 'Authorized', count: counts.APPROVED, variant: 'success' },
                    { id: 'OUT_OF_STOCK', label: 'Depleted', count: counts.OUT_OF_STOCK, variant: 'danger' },
                    { id: 'REJECTED', label: 'Denied', count: counts.REJECTED, variant: 'secondary' },
                    { id: 'SALES_HISTORY', label: 'Archived Sales', count: sales.length, variant: 'default' },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`
                        flex items-center gap-2.5 px-6 py-3 rounded-2xl whitespace-nowrap transition-all font-black text-[10px] uppercase tracking-widest border
                        ${tab === t.id ? 'bg-primary text-primary-foreground border-primary shadow-glow scale-105' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}
                    `}>
                        {t.label} 
                        {t.count > 0 && <span className={`px-2 py-0.5 rounded-lg text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-muted'}`}>{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* Content List */}
            {tab === 'SALES_HISTORY' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                       <Card className="bg-primary/10 border-primary/20 p-6 flex items-center gap-4">
                          <div className="p-4 bg-primary/20 rounded-3xl text-primary"><TrendingUp size={24} /></div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest opacity-60">Cumulative Revenue</p>
                             <h3 className="text-3xl font-black tracking-tighter">₦{sales.reduce((s, sale) => s + (sale.totalPrice || 0), 0).toLocaleString()}</h3>
                          </div>
                       </Card>
                       <Card className="bg-blue-500/10 border-blue-500/20 p-6 flex items-center gap-4">
                          <div className="p-4 bg-blue-500/20 rounded-3xl text-blue-500"><History size={24} /></div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest opacity-60">Volume of Sales</p>
                             <h3 className="text-3xl font-black tracking-tighter">{sales.length} <span className="text-sm opacity-40 font-bold uppercase italic">Transactions</span></h3>
                          </div>
                          <Button variant="ghost" className="ml-auto rounded-xl text-blue-500" onClick={() => window.location.href='/admin/sales'}><ArrowUpRight size={20} /></Button>
                       </Card>
                    </div>

                    <div className="space-y-4">
                       {salesLoading ? [1,2,3].map(i => <Skeleton key={i} height={100} borderRadius={24} />) : filteredSales.length === 0 ? (
                          <div className="py-20 text-center opacity-20"><ShoppingBag size={80} className="mx-auto mb-4" /><p className="text-xs font-black uppercase italic">No archived transactions detected</p></div>
                       ) : filteredSales.map(sale => (
                          <Card key={sale.id} className="group hover:border-primary/30 transition-all p-5" noPadding>
                             <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex flex-col items-center justify-center shrink-0 border border-border/50 group-hover:scale-105 transition-transform text-muted-foreground">
                                   <span className="text-[10px] font-black underline">SALES</span>
                                   <span className="text-sm font-black font-mono">#{sale.receiptNumber}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-start mb-2">
                                      <div>
                                         <h4 className="font-extrabold text-sm tracking-tight">{sale.customerName || 'Walk-in Customer'}</h4>
                                         <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-lg font-black tracking-tighter text-emerald-500">₦{(sale.totalPrice || 0).toLocaleString()}</p>
                                         <div className="flex items-center gap-1.5 justify-end text-[9px] font-bold text-muted-foreground uppercase mt-1">
                                            {PAY_ICONS[sale.paymentMethod]} {sale.paymentMethod}
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                      {(() => {
                                          let its = Array.isArray(sale.items) ? sale.items : [];
                                          if (typeof sale.items === 'string') { try { its = JSON.parse(sale.items); } catch(e) {} }
                                          return its.map((it: any, idx: number) => (
                                              <Badge key={idx} variant="outline" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-tight">{it.name} ×{it.quantity}</Badge>
                                          ));
                                      })()}
                                   </div>
                                </div>
                             </div>
                          </Card>
                       ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} height={100} borderRadius={24} />) : filtered.length === 0 ? (
                       <div className="py-20 text-center opacity-20"><Package size={80} className="mx-auto mb-4" /><p className="text-xs font-black uppercase italic">No resources found in current view</p></div>
                    ) : filtered.map(item => (
                       <Card key={item.id} className={`group hover:border-primary/30 transition-all p-5 ${acting === item.id ? 'opacity-50 pointer-events-none' : ''}`} noPadding>
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                             <div className="w-18 h-18 rounded-3xl bg-muted overflow-hidden shrink-0 border-2 border-border/50 group-hover:border-primary/30 transition-colors">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground opacity-40"><Package size={24} /></div>}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <div className="flex items-center gap-3">
                                         <h4 className="font-extrabold text-lg tracking-tight">{item.name}</h4>
                                         <Badge variant={item.status === 'PENDING_APPROVAL' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'danger'} className="text-[9px] font-black uppercase tracking-widest">{item.status.replace('_', ' ')}</Badge>
                                      </div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-1 flex items-center gap-2">
                                         <UserCheck size={12} className="text-primary" /> Submitted by: {item.submittedByName || 'Operational HQ'}
                                      </p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-xl font-black tracking-tighter">₦{item.unitPrice.toLocaleString()} <span className="text-[10px] opacity-40 italic">/ UNIT</span></p>
                                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.quantity} <span className="italic">{item.unit.toUpperCase()} REMAINING</span></p>
                                   </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   {item.status === 'PENDING_APPROVAL' && (
                                      <>
                                         <Button size="sm" className="rounded-xl h-9 bg-emerald-500 hover:bg-emerald-600 border-none px-4 shadow-sm" leftIcon={CheckCircle2} onClick={() => approve(item)}>Authorize</Button>
                                         <Button size="sm" variant="outline" className="rounded-xl h-9 border-rose-500/50 text-rose-500 hover:bg-rose-500/10 px-4" leftIcon={XCircle} onClick={() => { setRejectItem(item); setRejectNote(''); }}>Deny</Button>
                                      </>
                                   )}
                                   <Button variant="ghost" size="sm" className="rounded-xl h-9 text-muted-foreground" onClick={() => { setEditItem(item); setEditName(item.name); setEditQty(String(item.quantity)); setEditPrice(String(item.unitPrice)); }}><Edit3 size={16} /></Button>
                                   <Button variant="ghost" size="sm" className="rounded-xl h-9 text-muted-foreground hover:text-rose-500" onClick={() => deleteItem(item)}><Trash2 size={16} /></Button>
                                </div>
                             </div>
                          </div>
                          {item.rejectionComment && item.status === 'REJECTED' && (
                             <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-3 text-rose-500/70 text-xs font-medium italic">
                                <AlertTriangle size={14} className="shrink-0" /> Audit Note: {item.rejectionComment}
                             </div>
                          )}
                       </Card>
                    ))}
                </div>
            )}

            {/* Modals */}
            {rejectItem && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                  <Card className="w-full max-w-lg shadow-2xl rounded-[32px] overflow-hidden" noPadding title="Denial Certification">
                     <div className="p-8 space-y-6">
                        <div className="space-y-4">
                           <p className="text-sm font-bold text-muted-foreground italic">Specify the forensic reason for denying this resource entry. This note will be visible to operational staff.</p>
                           <textarea className="w-full p-4 bg-muted/30 border border-border rounded-2xl outline-none focus:border-rose-500 font-medium text-sm transition-all" rows={4} value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for denial..." />
                        </div>
                        <div className="flex gap-4">
                           <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setRejectItem(null)}>Abort</Button>
                           <Button className="flex-1 rounded-2xl py-6 bg-rose-500 hover:bg-rose-600 border-none shadow-glow font-black" onClick={confirmReject}>Commit Denial</Button>
                        </div>
                     </div>
                  </Card>
               </div>
            )}

            {editItem && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                  <Card className="w-full max-w-lg shadow-2xl rounded-[32px] overflow-hidden" noPadding title="Resource Modification">
                     <div className="p-8 space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Resource Title</label>
                              <input type="text" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Volume Balance</label>
                                 <input type="number" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-black text-sm" value={editQty} onChange={e => setEditQty(e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Price / Unit</label>
                                 <input type="number" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-black text-sm" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setEditItem(null)}>Discard</Button>
                           <Button className="flex-1 rounded-2xl py-6 shadow-glow font-black" onClick={confirmEdit}>Commit Changes</Button>
                        </div>
                     </div>
                  </Card>
               </div>
            )}
        </div>
    );
};

export default AdminStockPage;
