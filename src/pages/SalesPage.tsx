import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    X, RefreshCw, Banknote, Smartphone,
    CreditCard, Package, ArrowRight, Trash2,
    History, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Input, Label, Modal } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone },
    { id: 'pos',      label: 'P.O.S',    Icon: CreditCard },
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
            setStock(data || []);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('sales-live-sync-v10')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock)
            .subscribe();
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

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) return;
        setIsProcessing(true);
        const receiptNumber = `LX-${Math.random().toString(36).substring(7).toUpperCase()}`;
        try {
            const result = await supabaseDataService.recordRetailSale({
                receiptNumber,
                items: cart.map(c => ({ 
                    id: c.item.id, name: c.item.name, quantity: c.quantity, unitPrice: c.item.unitPrice, total: c.item.unitPrice * c.quantity 
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
            console.error(e);
            alert(e.message || 'Error occurred during checkout.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredStock = useMemo(() =>
        stock.filter(i => (i.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) && i.quantity > 0 && i.status === 'APPROVED'
        ), [stock, debouncedSearch]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-slide-up pb-5">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
                <div className="flex items-center gap-4 px-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            placeholder="Find products..."
                            className="pl-11 h-12 bg-card border-border/30 rounded-2xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/sales')} className="w-12 h-12 rounded-2xl bg-card">
                        <History size={18} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={140} borderRadius={24} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Package size={60} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest text-center">No items available for sale</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                return (
                                    <button key={item.id} onClick={() => addToCart(item)} className={`
                                        p-4 rounded-3xl border-2 transition-all text-left bg-card group
                                        ${inCart > 0 ? 'border-primary ring-4 ring-primary/5' : 'border-border/10 hover:border-border/40'}
                                    `}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 bg-slate-900 rounded-xl overflow-hidden border border-border/10">
                                                {item.imageUrl 
                                                  ? <img src={item.imageUrl} className="w-full h-full object-cover" />
                                                  : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={16} /></div>
                                                }
                                            </div>
                                            {inCart > 0 && <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{inCart}</span>}
                                        </div>
                                        <h4 className="font-bold text-sm truncate uppercase tracking-tight">{item.name}</h4>
                                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-border/5">
                                           <span className="text-primary font-black text-lg tabular-nums tracking-tighter">₦{item.unitPrice.toLocaleString()}</span>
                                           <span className="text-[8px] font-bold text-muted-foreground opacity-40 uppercase">{item.quantity} Left</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar POS */}
            <div className={`
                fixed inset-0 lg:static z-[60] lg:w-[380px] flex flex-col bg-card lg:border-2 border-border/30 rounded-[40px] shadow-premium transition-all duration-300 transform
                ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}>
                <div className="p-6 border-b border-border/10 flex justify-between items-center bg-muted/5">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="text-primary" size={20} />
                        <h2 className="text-lg font-black uppercase tracking-tighter">Order Cart</h2>
                    </div>
                    <button className="lg:hidden" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 grayscale">
                            <ShoppingCart size={48} className="mb-4" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-center">Empty Order</p>
                        </div>
                    ) : cart.map(({ item, quantity }) => (
                        <div key={item.id} className="flex gap-4 p-4 bg-muted/10 rounded-2xl items-center">
                            <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-xs uppercase truncate mb-1">{item.name}</h5>
                                <span className="text-primary font-black text-sm tracking-tighter whitespace-nowrap">₦{(item.unitPrice * quantity).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 bg-card p-1.5 rounded-xl border border-border/20 shadow-sm shrink-0">
                                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg"><Minus size={12} /></button>
                                <span className="w-6 text-center text-xs font-bold tabular-nums">{quantity}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg"><Plus size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 border-t border-border/10 space-y-6 bg-muted/5">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-border/10 pb-4 mb-4">
                           <div className="p-2 bg-muted/20 rounded-xl"><User size={16} /></div>
                           <Input placeholder="Direct Client" className="h-10 border-0 bg-transparent font-bold p-0 text-sm focus:ring-0 placeholder:opacity-30" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                        </div>

                        <div className="flex gap-2">
                            {PAY_METHODS.map(({ id, label, Icon }) => (
                                <button key={id} onClick={() => setPaymentMethod(id)} className={`
                                    flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all
                                    ${paymentMethod === id ? 'border-primary bg-primary text-white shadow-glow' : 'border-border/10 bg-card hover:bg-muted/30 opacity-60'}
                                `}>
                                    <Icon size={16} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/10 space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Grand Total</span>
                            <span className="text-3xl font-black tabular-nums tracking-tighter">₦{cartTotal.toLocaleString()}</span>
                        </div>
                        <Button
                            fullWidth
                            className="h-16 rounded-[24px] text-sm font-black uppercase tracking-widest shadow-glow group bg-primary hover:bg-primary-hover text-white"
                            disabled={cart.length === 0 || isProcessing}
                            onClick={handleCheckout}
                            isLoading={isProcessing}
                        >
                            Finalize Order <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Receipt Popup */}
            <Modal isOpen={showReceipt && !!lastSale} onClose={() => setShowReceipt(false)} title="SALE COMPLETED" maxWidth="sm">
                <div className="space-y-8 py-4 text-center animate-slide-up">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[28px] border-2 border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 shadow-glow">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Transaction Receipt</p>
                        <h4 className="text-2xl font-black tracking-tighter uppercase italic">{lastSale?.receiptNumber}</h4>
                    </div>
                    <div className="bg-card border-2 border-border/10 p-6 rounded-[32px] text-left space-y-4 shadow-inner">
                        {lastSale?.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                                <span className="font-bold opacity-70 uppercase">{it.name} ×{it.quantity}</span>
                                <span className="font-black tabular-nums">₦{it.total.toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="pt-4 border-t border-dashed border-border/20 flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase tracking-widest opacity-40">Total Paid</span>
                            <span className="text-2xl font-black text-primary tabular-nums tracking-tighter">₦{lastSale?.totalPrice.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 rounded-xl h-14 font-bold uppercase text-[9px] tracking-widest" onClick={() => window.print()}>Print</Button>
                        <Button className="flex-1 rounded-xl h-14 font-bold uppercase text-[9px] tracking-widest bg-primary text-white shadow-glow" onClick={() => setShowReceipt(false)}>Close</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesPage;
