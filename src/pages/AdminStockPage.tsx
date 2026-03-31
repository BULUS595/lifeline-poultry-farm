import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2, XCircle, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3,
    ShoppingBag, Banknote, Smartphone, CreditCard,
    ArrowUpRight, TrendingUp, History,
    UserCheck, AlertCircle,
    ChevronDown,
    Zap,
    ShieldX,
    Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge, Modal, Input, Label, Select } from '../components/ui';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

const PAY_ICONS: Record<string, React.ReactNode> = {
    cash: <Banknote size={14} strokeWidth={2.5} />,
    transfer: <Smartphone size={14} strokeWidth={2.5} />,
    pos: <CreditCard size={14} strokeWidth={2.5} />,
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
      <div className="h-[70vh] flex flex-col items-center justify-center animate-slide-up px-6">
         <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
            <ShieldCheck size={48} strokeWidth={2.5} />
         </div>
         <div className="text-center space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none text-rose-500">Audit Node <span className="italic underline">Restricted</span></h2>
            <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Global inventory auditing is restricted to L3 management and auditing personnel only.</p>
         </div>
         <Button variant="secondary" className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
            Return to Operations
         </Button>
      </div>
    );

    const approve = async (item: StockItem) => {
        if (!user) return;
        setApproveError(null);
        setActing(item.id);
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        else setApproveError(`Failed to authorize "${item.name}" protocol`);
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
        if (!user || !confirm(`Permanently delete "${item.name}"? Forensic records will be updated.`)) return;
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
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0 text-primary underline underline-offset-8 decoration-primary/20 decoration-4">
                     Stock <span className="italic">Terminal</span>
                   </h1>
                   <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Global inventory authorization node</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-80 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-all group-focus-within:text-primary" size={20} strokeWidth={2.5} />
                      <Input type="text" placeholder="Scan identification markers..." className="pl-14 h-14 rounded-2xl border-border/40 bg-card/40 backdrop-blur-sm shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
                   </div>
                   <Button variant="outline" size="icon" onClick={loadStock} className="rounded-2xl w-14 h-14 bg-card/40 border-border/40 shadow-sm"><RefreshCw className={isLoading ? 'animate-spin' : ''} size={22} strokeWidth={2.5} /></Button>
                </div>
            </div>

            {/* Error banner */}
            {approveError && (
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex items-center justify-between text-rose-500 shadow-glow animate-shake">
                   <div className="flex items-center gap-4 font-black uppercase tracking-widest text-[11px] italic">
                       <ShieldX size={24} className="animate-pulse" /> {approveError}
                   </div>
                   <button onClick={() => setApproveError(null)} className="p-2 hover:bg-rose-500/10 rounded-xl transition-all"><X size={20} strokeWidth={3} /></button>
                </div>
            )}

            {/* Advanced Filters / Tabs */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 hide-scrollbar px-2">
                {[
                    { id: 'PENDING_APPROVAL', label: 'Vetting', count: counts.PENDING_APPROVAL, variant: 'warning' },
                    { id: 'APPROVED', label: 'Authorized', count: counts.APPROVED, variant: 'success' },
                    { id: 'OUT_OF_STOCK', label: 'Depleted', count: counts.OUT_OF_STOCK, variant: 'danger' },
                    { id: 'REJECTED', label: 'Denied', count: counts.REJECTED, variant: 'secondary' },
                    { id: 'SALES_HISTORY', label: 'Archives', count: sales.length, variant: 'default' },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`
                        flex items-center gap-4 px-8 py-4 rounded-[28px] whitespace-nowrap transition-all duration-300 font-extrabold text-[11px] uppercase tracking-[0.15em] border italic
                        ${tab === t.id ? 'bg-primary text-white border-primary shadow-glow scale-105 -translate-y-1' : 'bg-card/40 backdrop-blur-xl text-muted-foreground border-border/40 hover:border-primary/30'}
                    `}>
                        {t.label} 
                        {t.count > 0 && <span className={`px-2.5 py-1 rounded-xl text-[10px] shadow-sm tabular-nums ${tab === t.id ? 'bg-white/20' : 'bg-muted/10 border border-border/40'}`}>{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* Content Display */}
            <div className="min-h-[600px]">
                {tab === 'SALES_HISTORY' ? (
                    <div className="space-y-10 animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <Card className="bg-primary/5 border-primary/20 p-8 rounded-[48px] flex items-center gap-6 overflow-hidden relative group">
                              <div className="p-6 bg-primary/10 rounded-[32px] text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-glow"><TrendingUp size={32} strokeWidth={2.5} /></div>
                              <div className="relative z-10">
                                 <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] opacity-60 italic mb-2">Aggregate Revenue</p>
                                 <h3 className="text-4xl font-black tracking-tighter tabular-nums text-foreground italic">₦{sales.reduce((s, sale) => s + (sale.totalPrice || 0), 0).toLocaleString()}</h3>
                              </div>
                              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                           </Card>
                           <Card className="bg-blue-500/5 border-blue-500/20 p-8 rounded-[48px] flex items-center gap-6 overflow-hidden relative group">
                              <div className="p-6 bg-blue-500/10 rounded-[32px] text-blue-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-glow"><History size={32} strokeWidth={2.5} /></div>
                              <div className="relative z-10">
                                 <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] opacity-60 italic mb-2">Commerce Volume</p>
                                 <h3 className="text-4xl font-black tracking-tighter tabular-nums text-foreground italic">{sales.length} <span className="text-xs opacity-40 uppercase tracking-widest font-black">LOGS</span></h3>
                              </div>
                              <Button variant="ghost" className="ml-auto rounded-2xl w-14 h-14 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 active:scale-90" onClick={() => window.location.href='/admin/sales'}><ArrowUpRight size={24} strokeWidth={3} /></Button>
                              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
                           </Card>
                        </div>

                        <div className="space-y-6">
                           {salesLoading ? [1,2,3].map(i => <Skeleton key={i} height={120} borderRadius={32} />) : filteredSales.length === 0 ? (
                              <div className="py-28 text-center bg-muted/10 rounded-[48px] border-4 border-dashed border-border/40 opacity-40">
                                 <ShoppingBag size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                                 <h4 className="text-2xl font-black uppercase italic tracking-tighter">Zero commerce logs in current view</h4>
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-60">System stands ready for fiscal recovery</p>
                              </div>
                           ) : filteredSales.map(sale => (
                              <Card key={sale.id} className="group hover:border-primary/40 transition-all duration-500 p-0 overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm" noPadding>
                                 <div className="flex items-center gap-8 p-6 md:p-8">
                                    <div className="w-20 h-20 rounded-[32px] bg-muted/20 flex flex-col items-center justify-center shrink-0 border border-border/40 group-hover:scale-105 group-hover:rotate-2 transition-all duration-500 shadow-sm relative">
                                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">FISCAL</span>
                                       <span className="text-lg font-black tracking-tighter tabular-nums italic">#{sale.receiptNumber}</span>
                                       <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                          <div>
                                             <h4 className="font-black text-2xl tracking-tighter uppercase italic leading-none truncate pr-4">{sale.customerName || 'Standard Client'}</h4>
                                             <div className="flex items-center gap-3 mt-3">
                                                 <Clock size={12} strokeWidth={3} className="text-muted-foreground opacity-30" />
                                                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 tabular-nums italic">{new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                             </div>
                                          </div>
                                          <div className="text-right">
                                             <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-2.5 rounded-2xl border border-emerald-500/20 shadow-glow mb-2">
                                                 <span className="text-3xl font-black tracking-tighter tabular-nums text-emerald-500 italic">₦{(sale.totalPrice || 0).toLocaleString()}</span>
                                             </div>
                                             <div className="flex items-center gap-2 justify-end text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic">
                                                {PAY_ICONS[sale.paymentMethod]} {sale.paymentMethod} NODE
                                             </div>
                                          </div>
                                       </div>
                                       <div className="flex flex-wrap gap-3 mt-4 border-t border-border/20 pt-5">
                                          {(() => {
                                              let its = Array.isArray(sale.items) ? sale.items : [];
                                              if (typeof sale.items === 'string') { try { its = JSON.parse(sale.items); } catch(e) {} }
                                              return its.map((it: any, idx: number) => (
                                                  <Badge key={idx} variant="primary" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest tabular-nums italic shadow-sm bg-primary/10 border-primary/20">
                                                      {it.name} <span className="mx-2 opacity-30">|</span> ×{it.quantity}
                                                  </Badge>
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
                    <div className="space-y-6 animate-slide-up">
                        {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} height={120} borderRadius={32} />) : filtered.length === 0 ? (
                           <div className="py-28 text-center bg-muted/10 rounded-[48px] border-4 border-dashed border-border/40 opacity-40">
                              <Package size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                              <h4 className="text-2xl font-black uppercase italic tracking-tighter">Zero resource nodes in current queue</h4>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-60">System monitoring stable</p>
                           </div>
                        ) : filtered.map(item => (
                           <Card key={item.id} className={`group hover:border-primary/40 transition-all duration-500 p-0 overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm ${acting === item.id ? 'opacity-40 grayscale pointer-events-none' : ''}`} noPadding>
                              <div className="flex flex-col md:flex-row items-stretch gap-0">
                                 <div className="w-full md:w-56 h-48 md:h-auto overflow-hidden relative group-hover:md:w-64 transition-all duration-500">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground opacity-30"><Package size={48} strokeWidth={1.5} /></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    <div className="absolute top-4 left-4">
                                        <Badge variant={item.status === 'PENDING_APPROVAL' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'danger'} className="text-[9px] font-black uppercase tracking-widest shadow-lg px-3 py-1.5 ring-4 ring-background/20 backdrop-blur-md">
                                            {item.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                 </div>
                                 <div className="flex-1 p-8 flex flex-col justify-between relative">
                                    <div className="flex justify-between items-start mb-6">
                                       <div className="space-y-3">
                                          <h4 className="font-black text-3xl tracking-tighter uppercase italic leading-none pr-4">{item.name}</h4>
                                          <div className="flex items-center gap-3">
                                             <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-sm"><UserCheck size={14} strokeWidth={3} /></div>
                                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Vetted by: {item.submittedByName || 'GLOBAL-SYSTEM'}</span>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-3xl font-black tracking-tighter italic tabular-nums leading-none">₦{item.unitPrice.toLocaleString()} <span className="text-[10px] opacity-40 uppercase tracking-widest font-black block mt-2 text-right">Per Unit</span></p>
                                          <div className="flex items-center gap-3 justify-end mt-4">
                                              <Badge variant="outline" className="text-[11px] font-black uppercase tracking-tighter tabular-nums px-3 py-1.5 border-border/40 shadow-sm bg-background/40">
                                                {item.quantity} {item.unit.toUpperCase()} <span className="ml-2 opacity-30 italic">STOCK</span>
                                              </Badge>
                                          </div>
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-border/20">
                                       {item.status === 'PENDING_APPROVAL' && (
                                          <div className="flex items-center gap-4 flex-1">
                                             <Button size="lg" className="rounded-2xl h-14 bg-emerald-500 hover:bg-emerald-600 border-none px-10 shadow-glow font-black uppercase tracking-widest text-[11px] italic" leftIcon={CheckCircle2} onClick={() => approve(item)} isLoading={acting === item.id} disabled={!!acting}>Authorize Node</Button>
                                             <Button size="lg" variant="outline" className="rounded-2xl h-14 border-rose-500/50 text-rose-500 hover:bg-rose-500/10 px-8 font-black uppercase tracking-widest text-[10px]" leftIcon={ShieldX} onClick={() => { setRejectItem(item); setRejectNote(''); }} disabled={!!acting}>Deny Procedure</Button>
                                          </div>
                                       )}
                                       <div className="flex items-center gap-2 ml-auto group-hover:scale-110 transition-transform">
                                           <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl bg-card border-border/40 text-muted-foreground hover:text-primary transition-all shadow-sm" onClick={() => { setEditItem(item); setEditName(item.name); setEditQty(String(item.quantity)); setEditPrice(String(item.unitPrice)); }} disabled={!!acting}><Edit3 size={24} strokeWidth={2.5} /></Button>
                                           <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl bg-card border-border/40 text-muted-foreground hover:text-rose-500 transition-all shadow-sm" onClick={() => deleteItem(item)} isLoading={acting === item.id} disabled={!!acting}><Trash2 size={24} strokeWidth={2.5} /></Button>
                                       </div>
                                    </div>
                                    
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
                                 </div>
                              </div>
                              {item.rejectionComment && item.status === 'REJECTED' && (
                                 <div className="bg-rose-500/10 p-6 flex items-start gap-4 border-t border-rose-500/20 group-hover:bg-rose-500/20 transition-all">
                                    <ShieldX size={20} className="text-rose-500 animate-pulse shrink-0" strokeWidth={3} />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Forensic Audit Denial Note</p>
                                        <p className="text-xs font-black italic text-rose-500/80 leading-relaxed opacity-80">"{item.rejectionComment}"</p>
                                    </div>
                                 </div>
                              )}
                           </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Denial Protocol */}
            <Modal
                isOpen={!!rejectItem}
                onClose={() => setRejectItem(null)}
                title="Denial Certification Protocol"
                maxWidth="lg"
            >
                 <div className="space-y-10 py-2 animate-slide-up">
                    <div className="bg-rose-500/5 p-8 rounded-[40px] border-2 border-dashed border-rose-500/20 flex items-start gap-6">
                        <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20 shadow-glow">
                             <AlertTriangle size={24} className="text-rose-500 animate-pulse" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">Denial Impact Warning</h4>
                            <p className="text-xs font-black italic text-muted-foreground leading-relaxed opacity-60">
                                This action will permanently block the resource node from entering global circulation. Authorization requires a forensic justification entry below.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label htmlFor="audit-note">Forensic Auditor Denial Statement</Label>
                        <textarea 
                            id="audit-note"
                            className="w-full h-40 p-6 bg-card border-2 border-border/40 rounded-[32px] outline-none focus:border-rose-500/50 font-black text-sm transition-all focus:ring-8 focus:ring-rose-500/5 shadow-inner leading-relaxed custom-scrollbar" 
                            value={rejectNote} 
                            onChange={e => setRejectNote(e.target.value)} 
                            placeholder="Specify policy violation or forensic link error..." 
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6 pt-6">
                       <Button variant="outline" className="flex-1 rounded-3xl py-8 h-18 font-black uppercase tracking-widest text-[10px]" onClick={() => setRejectItem(null)}>Abort Denial</Button>
                       <Button className="flex-1 rounded-3xl py-8 h-18 bg-rose-500 hover:bg-rose-600 border-none shadow-glow font-black uppercase tracking-widest text-[11px] italic" onClick={confirmReject} isLoading={acting === (rejectItem?.id || 'rejecting')} disabled={!!acting}>
                          Commit Denial Protocol
                       </Button>
                    </div>
                 </div>
            </Modal>

            {/* Modal: Resource Modification */}
            <Modal
                isOpen={!!editItem}
                onClose={() => setEditItem(null)}
                title="Resource Modification Protocol"
                maxWidth="lg"
            >
                 <div className="space-y-10 py-2 animate-slide-up">
                    <div className="space-y-8">
                        <div className="space-y-2.5">
                           <Label htmlFor="res-title">Primary Resource Designation</Label>
                           <Input id="res-title" type="text" className="h-16 rounded-2xl bg-card border-border/40 font-black italic shadow-inner px-6" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-2.5">
                              <Label htmlFor="res-vol">Vetted Volume</Label>
                              <Input id="res-vol" type="number" className="h-16 rounded-2xl bg-card border-border/40 font-black shadow-inner px-6 tabular-nums" value={editQty} onChange={e => setEditQty(e.target.value)} />
                           </div>
                           <div className="space-y-2.5">
                              <Label htmlFor="res-price">Price Per Node (₦)</Label>
                              <Input id="res-price" type="number" className="h-16 rounded-2xl bg-card border-border/40 font-black shadow-inner px-6 tabular-nums text-primary" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6 pt-6">
                       <Button variant="outline" className="flex-1 rounded-3xl py-8 h-18 font-black uppercase tracking-widest text-[10px]" onClick={() => setEditItem(null)}>Discard Patch</Button>
                       <Button className="flex-1 rounded-3xl py-8 h-18 shadow-glow font-black uppercase tracking-widest text-[11px] italic" onClick={confirmEdit} isLoading={acting === (editItem?.id || 'editing')} disabled={!!acting}>
                          Commit System Update
                       </Button>
                    </div>
                 </div>
            </Modal>
        </div>
    );
};

export default AdminStockPage;
