import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    Printer, X, RefreshCw, Banknote, Smartphone,
    CreditCard, Package, ClipboardList, Zap, Trash2,
    User as UserIcon,
    ChevronRight,
    ArrowRight,
    ShieldCheck,
    History,
    FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge, Input, Label, Modal } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote,    desc: 'Physical Node' },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone,  desc: 'Bank Node' },
    { id: 'pos',      label: 'P.O.S',    Icon: CreditCard,  desc: 'Card Node' },
] as const;

type PayMethod = 'cash' | 'transfer' | 'pos';

export const SalesPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [cart, setCart] = useState<Array<{ item: StockItem; quantity: number }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
    const [customerName, setCustomerName] = useState('');
    const [lastSale, setLastSale] = useState<RetailSale | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadStock = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getStockItems();
            setStock(data);
        } catch (e) {
            console.error('Terminal stock link fail:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('sales-terminal-sync-v4')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const u = payload.new as any;
                    setStock(prev => {
                        if (u.status !== 'APPROVED' || u.quantity <= 0) return prev.filter(i => i.id !== u.id);
                        const mapped = { 
                            id: u.id, 
                            name: u.name, 
                            quantity: u.quantity, 
                            unitPrice: u.unit_price, 
                            unit: u.unit || 'units', 
                            minThreshold: u.min_threshold || 0, 
                            status: u.status, 
                            imageUrl: u.image_url, 
                            submittedBy: u.submitted_by || '', 
                            submittedByName: u.submitted_by_name, 
                            rejection_comment: u.rejection_comment, 
                            farmId: u.farm_id, 
                            lastUpdated: u.last_updated 
                        };
                        const exists = prev.find(i => i.id === u.id);
                        return exists ? prev.map(i => i.id === u.id ? mapped : i) : [...prev, mapped];
                    });
                } else if (payload.eventType === 'INSERT') {
                    const n = payload.new as any;
                    if (n.status === 'APPROVED') loadStock();
                } else if (payload.eventType === 'DELETE') {
                    setStock(prev => prev.filter(i => i.id !== payload.old.id));
                }
            }).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock]);

    const addToCart = (item: StockItem) => {
        if (item.quantity <= 0) return;
        setCart(prev => {
            const ex = prev.find(i => i.item.id === item.id);
            if (ex) {
                if (ex.quantity >= item.quantity) return prev;
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
        if (window.innerWidth < 1024) setIsCartOpen(true);
    };

    const removeFromCart = (id: string) => setCart(p => p.filter(i => i.item.id !== id));

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.item.id !== id) return i;
            const nq = Math.max(0, i.quantity + delta);
            const s = stock.find(s => s.id === id);
            if (s && nq > s.quantity) return i;
            return { ...i, quantity: nq };
        }).filter(i => i.quantity > 0));
    };

    const cartTotal = useMemo(() =>
        cart.reduce((s, i) => s + i.item.unitPrice * i.quantity, 0), [cart]);

    const cartCount = useMemo(() =>
        cart.reduce((s, i) => s + i.quantity, 0), [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) return;
        setIsProcessing(true);
        const receiptNumber = `LX-${Date.now().toString().slice(-8).toUpperCase()}`;
        try {
            const result = await supabaseDataService.recordRetailSale({
                receiptNumber,
                items: cart.map(c => ({ 
                    id: c.item.id, 
                    name: c.item.name, 
                    quantity: c.quantity, 
                    unitPrice: c.item.unitPrice, 
                    total: c.item.unitPrice * c.quantity 
                })),
                totalPrice: cartTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Direct Client',
                salespersonId: user.id,
                farmId: '1',
            });
            if (result) {
                setLastSale(result);
                setShowReceipt(true);
                setCart([]);
                setCustomerName('');
                setIsCartOpen(false);
            }
        } catch (e: any) {
            console.error('Checkout failed:', e);
            alert(e.message || 'Sale failed — system link error.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredStock = useMemo(() =>
        stock.filter(i =>
            (i.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) &&
            i.quantity > 0 && i.status === 'APPROVED'
        ), [stock, debouncedSearch]);

    return (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 h-[calc(100vh-120px)] lg:h-[calc(100vh-160px)] min-h-[500px] animate-slide-up pb-10">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col space-y-10 overflow-hidden px-2">
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="relative w-full md:max-w-xl group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-500" size={24} strokeWidth={3} />
                        <Input
                            type="text"
                            placeholder="Scan product identifiers or search SKU catalog..."
                            className="pl-16 py-7 h-16 rounded-[28px] shadow-sm border-border/40 bg-card/40 backdrop-blur-xl text-lg font-black italic tracking-tight"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-90 transition-all p-2 bg-muted/20 rounded-xl">
                                <X size={20} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button variant="outline" size="icon" onClick={loadStock} className="rounded-3xl w-16 h-16 bg-card/40 border-border/40 shadow-sm">
                            <RefreshCw size={26} className={isLoading ? 'animate-spin' : ''} strokeWidth={3} />
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/admin/sales')} className="rounded-3xl px-10 h-16 gap-3 bg-muted/40 font-black uppercase tracking-[0.2em] text-[11px] border border-border/40 shadow-sm">
                             <History size={22} strokeWidth={3} />
                             <span className="hidden sm:inline">Archives</span>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar pb-32 lg:pb-10">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={260} borderRadius={48} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-muted/5 rounded-[56px] border-4 border-dashed border-border/40 opacity-40">
                            <Package size={140} strokeWidth={1} className="mb-8 opacity-20" />
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Operational Catalog Empty</h3>
                            <p className="max-w-md mx-auto text-xs font-black text-muted-foreground opacity-60 mt-4 uppercase tracking-[0.3em] leading-relaxed italic">Restock authorization or system synchronization required to initialize retail nodes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                const isLow = item.quantity <= item.minThreshold;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`
                                            group relative bg-card/60 backdrop-blur-xl rounded-[48px] border-4 transition-all duration-500 p-8 text-left shadow-premium
                                            ${inCart > 0 ? 'border-primary ring-8 ring-primary/5 -translate-y-3 scale-[1.02]' : 'border-border/40 hover:border-primary/40 hover:-translate-y-2'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="w-20 h-20 bg-card rounded-[28px] flex items-center justify-center overflow-hidden border-2 border-border/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 shadow-sm relative">
                                                 {item.imageUrl 
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    : <Package className="text-primary/20" size={32} strokeWidth={2.5} />
                                                 }
                                                 <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                                            </div>
                                            {inCart > 0 && (
                                                <Badge variant="primary" className="px-6 py-2.5 rounded-2xl text-[13px] font-black ring-8 ring-background/80 shadow-glow italic animate-shake">
                                                    ×{inCart}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <h3 className="font-black text-2xl tracking-tighter truncate mb-2 uppercase italic leading-none">{item.name}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 mb-8 italic">LL-NODE-{item.id.slice(0, 6).toUpperCase()}</p>
                                        
                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 italic">Standard Yield</span>
                                                <span className="text-4xl font-black text-primary tracking-tighter leading-none italic tabular-nums">₦{item.unitPrice.toLocaleString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-2 px-3 py-1 rounded-lg w-fit ml-auto ${isLow ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500 opacity-60'}`}>
                                                    {isLow ? 'CRITICAL-STOCK' : 'AUTHENTICATED'}
                                                </span>
                                                <span className="text-xs font-black tabular-nums opacity-60 italic">{item.quantity} {item.unit.toUpperCase()} REMAINING</span>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute -bottom-2 -right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-10">
                                            <div className="bg-primary text-white w-14 h-14 rounded-2xl shadow-glow flex items-center justify-center scale-110 border-4 border-background">
                                                <Plus size={24} strokeWidth={4} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Sidebar Section */}
            <div className={`
                fixed inset-0 lg:static z-[60] lg:z-auto lg:w-[500px] flex flex-col bg-card lg:bg-transparent transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) transform px-2 lg:px-0
                ${isCartOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full lg:translate-y-0'}
            `}>
                <Card className="h-full flex flex-col rounded-t-[56px] lg:rounded-[56px] border-0 lg:border-4 border-border/40 shadow-premium bg-card/60 backdrop-blur-3xl overflow-hidden relative" noPadding>
                    <div className="p-10 border-b border-border/20 bg-muted/5 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-[28px] border-2 border-primary/20 shadow-glow flex items-center justify-center relative overflow-hidden group">
                                <ShoppingCart className="text-primary group-hover:scale-110 transition-transform" size={28} strokeWidth={3} />
                                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Commerce Node</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 mt-3 italic">Autonomous Terminal v2.5.0</p>
                            </div>
                        </div>
                        <button className="lg:hidden w-14 h-14 flex items-center justify-center bg-muted/20 hover:bg-muted/40 rounded-2xl transition-all active:scale-90" onClick={() => setIsCartOpen(false)}>
                            <X size={28} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
                                <div className="w-32 h-32 bg-muted/10 rounded-[48px] flex items-center justify-center border-4 border-dashed border-border/40 mb-8 animate-pulse-slow">
                                    <ShoppingCart size={50} className="text-muted-foreground/30" strokeWidth={1} />
                                </div>
                                <h4 className="font-black uppercase tracking-tighter text-2xl leading-none">Scanning Commerce Node...</h4>
                                <span className="text-[11px] uppercase font-black tracking-[0.3em] mt-4 opacity-60 italic">No retail links established in current queue</span>
                            </div>
                        ) : cart.map(({ item, quantity }) => (
                            <div key={item.id} className="flex gap-6 p-7 bg-card/60 border-2 border-border/30 group hover:border-primary/40 transition-all duration-500 rounded-[36px] shadow-sm hover:translate-x-3 relative overflow-hidden">
                                <div className="flex-1 min-w-0 relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary px-3 italic">LL-{item.id.slice(0, 4).toUpperCase()}</Badge>
                                        <h3 className="font-black text-lg tracking-tighter uppercase italic truncate">{item.name}</h3>
                                    </div>
                                    <div className="mt-5 flex items-end justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Unit Finalized</span>
                                            <span className="text-2xl font-black tracking-tighter text-primary italic tabular-nums leading-none">₦{(item.unitPrice * quantity).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center bg-background/50 border-2 border-border/30 rounded-[22px] shadow-sm overflow-hidden p-1.5 gap-2 scale-110">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-10 h-10 flex items-center justify-center hover:bg-primary hover:text-white rounded-[14px] active:scale-75 transition-all outline-none"><Minus size={14} strokeWidth={4} /></button>
                                            <span className="min-w-[40px] text-center text-lg font-black tabular-nums italic">{quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-primary hover:text-white rounded-[14px] active:scale-75 transition-all outline-none"><Plus size={14} strokeWidth={4} /></button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 opacity-40 group-hover:opacity-100">
                                    <Trash2 size={18} strokeWidth={2.5} />
                                </button>
                                <div className="absolute inset-0 bg-primary/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 pointer-events-none" />
                            </div>
                        ))}
                    </div>

                    <div className="p-10 bg-card/80 border-t border-border/20 space-y-10 group/checkout pb-12">
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="ml-2 opacity-40 uppercase tracking-widest text-[11px] font-black italic">Identity Authentication</Label>
                                <div className="relative group/input">
                                    <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-all group-focus-within/input:text-primary" size={22} strokeWidth={3} />
                                    <Input 
                                        type="text" 
                                        placeholder="Direct Client Identification Label"
                                        className="pl-16 h-18 rounded-[24px] bg-background shadow-inner font-black italic text-lg tracking-tight border-border/40"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="ml-2 opacity-40 uppercase tracking-widest text-[11px] font-black italic">Payment Protocol Node</Label>
                                <div className="grid grid-cols-3 gap-5">
                                    {PAY_METHODS.map(({ id, label, Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setPaymentMethod(id)}
                                            className={`
                                                flex flex-col items-center gap-3 py-6 rounded-[32px] border-4 transition-all duration-500 relative overflow-hidden group/btn
                                                ${paymentMethod === id ? 'border-primary bg-primary text-white shadow-glow scale-105 -translate-y-1' : 'border-border/30 bg-background/50 hover:border-primary/30'}
                                            `}
                                        >
                                            <Icon size={24} strokeWidth={3} className={`relative z-10 transition-transform duration-500 group-hover/btn:scale-110 ${paymentMethod === id ? 'animate-bounce-slow' : 'opacity-40'}`} />
                                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] relative z-10 italic ${paymentMethod === id ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
                                            {paymentMethod === id && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-border/20 space-y-8">
                            <div className="flex justify-between items-end px-2">
                                <div className="space-y-3">
                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic flex items-center gap-3">
                                        <ShieldCheck size={14} className="text-primary" strokeWidth={3} />
                                        Subtotal Vetted ({cartCount} units)
                                    </span>
                                    <p className="text-5xl font-black tracking-tighter leading-none italic tabular-nums text-foreground group-hover/checkout:text-primary transition-all">₦{cartTotal.toLocaleString()}</p>
                                </div>
                                <div className="w-20 h-20 bg-primary/10 rounded-[32px] border-2 border-primary/20 shadow-glow flex items-center justify-center animate-pulse-slow">
                                    <Zap className="text-primary" size={36} fill="currentColor" strokeWidth={2} />
                                </div>
                            </div>
                            <Button
                                fullWidth
                                variant="primary"
                                className="h-24 rounded-[36px] text-2xl tracking-tighter font-black shadow-glow uppercase italic relative overflow-hidden group/auth"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                                isLoading={isProcessing}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    Authorize Fiscal Node <ArrowRight size={28} className="group-hover/auth:translate-x-3 transition-transform duration-500" strokeWidth={3} />
                                </span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-active:translate-y-0 transition-transform duration-300" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Receipt Modal: Forensic Detail */}
            <Modal
                isOpen={showReceipt && !!lastSale}
                onClose={() => setShowReceipt(false)}
                title="Transaction Authorized Successfully"
                maxWidth="sm"
            >
                <div className="space-y-10 py-4 animate-slide-up">
                    <div className="relative">
                        <div className="w-32 h-32 bg-primary/10 rounded-[40px] flex items-center justify-center mx-auto border-4 border-primary/20 shadow-glow relative z-10 animate-bounce-slow">
                            <CheckCircle2 size={56} strokeWidth={3} className="text-primary" />
                        </div>
                        <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-50 opacity-40 animate-pulse" />
                    </div>
                    
                    <div className="text-center space-y-3">
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-40 leading-none">Forensic Archive Reference</p>
                        <h4 className="text-3xl font-black tracking-widest italic uppercase tabular-nums">{lastSale?.receiptNumber}</h4>
                    </div>

                    <Card className="bg-muted/5 border-2 border-border/30 rounded-[36px] overflow-hidden p-0" noPadding>
                        <div className="p-8 border-b border-border/20 flex items-center gap-4">
                            <div className="p-2.5 bg-background rounded-xl text-primary border border-border/40 shrink-0"><FileText size={18} strokeWidth={2.5} /></div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">Voucher Items Detail</span>
                        </div>
                        <div className="p-8 space-y-6 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {lastSale?.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-start group">
                                    <div className="flex-1 pr-6">
                                        <p className="font-black uppercase tracking-tighter text-[15px] italic mb-1 leading-none transition-colors group-hover:text-primary">{it.name}</p>
                                        <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest tabular-nums italic">{it.quantity} UNITS × ₦{it.unitPrice.toLocaleString()}</span>
                                    </div>
                                    <span className="font-black tabular-nums tracking-tighter text-lg leading-none italic">₦{it.total.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 border-t-4 border-dashed border-border/40 bg-card flex flex-col gap-6">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mb-1">Fiscal Settlement</span>
                                <span className="text-4xl font-black tracking-tighter text-primary italic leading-none tabular-nums">₦{lastSale?.totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between bg-background p-4 rounded-2xl border border-border/20">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border/40 shadow-sm">
                                        {PAY_METHODS.find(p => p.id === lastSale?.paymentMethod)?.Icon && (
                                            <div className="text-primary font-black italic uppercase"><Zap size={20} fill="currentColor" /></div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Tender Node</span>
                                        <span className="text-xs font-black uppercase italic">{lastSale?.paymentMethod} AUTH</span>
                                    </div>
                                 </div>
                                 <Badge variant="success" className="h-8 px-4 text-[9px] font-black uppercase tracking-[0.2em] italic shadow-sm ring-4 ring-background">Finalized</Badge>
                            </div>
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <Button variant="outline" className="flex-1 rounded-[28px] py-8 h-18 font-black uppercase tracking-[0.15em] text-[10px] italic border-border/40 bg-card/40" onClick={() => window.print()}>
                            <Printer size={20} className="mr-3" strokeWidth={3} /> Global Print
                        </Button>
                        <Button className="flex-1 rounded-[28px] py-8 h-18 font-black uppercase tracking-[0.2em] text-[11px] italic shadow-glow bg-primary text-white" onClick={() => setShowReceipt(false)}>
                           Reset Cycle <ChevronRight size={20} className="ml-2" strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesPage;
