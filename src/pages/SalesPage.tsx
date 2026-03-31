import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    X, RefreshCw, Banknote, Smartphone,
    CreditCard, Package, ArrowRight, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Input, Label, Modal } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote,    desc: 'Physical Payment' },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone,  desc: 'Bank Transfer' },
    { id: 'pos',      label: 'P.O.S',    Icon: CreditCard,  desc: 'Card Payment' },
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
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-120px)] lg:h-[calc(100vh-160px)] min-h-[500px] animate-slide-up pb-10">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col space-y-8 overflow-hidden px-2">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative w-full md:max-w-xl group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                        <Input
                            type="text"
                            placeholder="Search our catalog..."
                            className="pl-12 h-14 rounded-2xl border-border/40 bg-card font-medium shadow-sm transition-all focus:ring-4 focus:ring-primary/5"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="outline" size="icon" onClick={loadStock} className="rounded-xl w-12 h-12 bg-card border-border/40 shadow-sm">
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/admin/sales')} className="rounded-xl px-8 h-12 font-bold text-[10px] uppercase tracking-widest bg-muted/30 border border-border/20">
                             History Log
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={180} borderRadius={32} />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`
                                            group relative bg-card rounded-[32px] border-2 transition-all p-8 text-left hover:shadow-premium
                                            ${inCart > 0 ? 'border-primary ring-8 ring-primary/5 -translate-y-1' : 'border-border/40'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center overflow-hidden border border-border/20 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                                                 {item.imageUrl 
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    : <Package className="text-primary/20" size={24} />
                                                 }
                                            </div>
                                            {inCart > 0 && (
                                                <div className="bg-primary text-white text-[10px] font-black h-8 px-4 flex items-center justify-center rounded-xl shadow-glow">
                                                    {inCart} SELECTED
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mb-6">
                                            <h3 className="font-bold text-lg leading-tight truncate mb-1">{item.name}</h3>
                                            <p className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest">{item.quantity} {item.unit} available</p>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-6 border-t border-border/10">
                                            <span className="text-2xl font-black text-primary tabular-nums tracking-tighter">₦{item.unitPrice.toLocaleString()}</span>
                                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                <Plus size={18} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout Section */}
            <div className={`
                fixed inset-0 lg:static z-[60] lg:z-auto lg:w-[420px] flex flex-col bg-card lg:bg-transparent transition-all duration-500 transform
                ${isCartOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full lg:translate-y-0'}
            `}>
                <Card className="h-full flex flex-col rounded-t-[40px] lg:rounded-[40px] border-0 lg:border-2 border-border/40 shadow-premium bg-card overflow-hidden" noPadding>
                    <div className="p-10 border-b border-border/10 flex items-center justify-between bg-muted/5">
                        <div className="flex items-center gap-4">
                            <ShoppingCart className="text-primary" size={22} />
                            <h2 className="text-xl font-black uppercase tracking-tighter">Checkout</h2>
                        </div>
                        <button className="lg:hidden p-3 hover:bg-muted/50 rounded-2xl transition-colors" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 grayscale">
                                <ShoppingCart size={64} className="mb-6 stroke-1" />
                                <p className="font-bold text-sm uppercase tracking-widest">Cart is empty</p>
                            </div>
                        ) : cart.map(({ item, quantity }) => (
                            <div key={item.id} className="flex gap-5 p-5 bg-muted/10 border border-border/20 rounded-3xl group hover:border-primary/20 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-sm truncate uppercase tracking-tight">{item.name}</h3>
                                        <button onClick={() => updateQty(item.id, -quantity)} className="text-muted-foreground hover:text-rose-500 opacity-20 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <span className="text-xl font-black text-primary tabular-nums tracking-tighter">₦{(item.unitPrice * quantity).toLocaleString()}</span>
                                        <div className="flex items-center bg-card rounded-2xl border border-border/40 p-1.5 shadow-sm">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-colors"><Minus size={14} /></button>
                                            <span className="min-w-[40px] text-center font-bold text-sm tabular-nums">{quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-colors"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-10 border-t border-border/10 space-y-8 bg-muted/5">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Customer Name</Label>
                                <Input 
                                    className="h-14 rounded-2xl bg-card border-border/40 font-bold placeholder:opacity-20"
                                    placeholder="Optional"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Payment Method</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {PAY_METHODS.map(({ id, label, Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setPaymentMethod(id)}
                                            className={`
                                                flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all
                                                ${paymentMethod === id ? 'border-primary bg-primary text-white shadow-glow' : 'border-border/20 bg-card hover:bg-muted/30'}
                                            `}
                                        >
                                            <Icon size={20} />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-10 border-t border-border/20">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">Total Amount</span>
                                <span className="text-4xl font-black text-foreground tabular-nums tracking-tighter">₦{cartTotal.toLocaleString()}</span>
                            </div>
                            <Button
                                fullWidth
                                variant="primary"
                                className="h-20 rounded-[28px] text-xl font-black uppercase tracking-widest shadow-glow group"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                                isLoading={isProcessing}
                            >
                                <span className="mr-2">Checkout</span>
                                <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} strokeWidth={3} />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Receipt Modal */}
            <Modal
                isOpen={showReceipt && !!lastSale}
                onClose={() => setShowReceipt(false)}
                title="Sale Finalized"
                maxWidth="sm"
            >
                <div className="space-y-10 py-6 text-center animate-slide-up">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-glow">
                        <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Receipt ID</p>
                        <h4 className="text-3xl font-black tracking-tighter italic uppercase">{lastSale?.receiptNumber}</h4>
                    </div>

                    <div className="bg-card border border-border/40 p-8 rounded-[32px] text-left space-y-6 shadow-inner">
                        <div className="space-y-4">
                            {lastSale?.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="font-bold opacity-60 uppercase">{it.name} <span className="text-xs">×{it.quantity}</span></span>
                                    <span className="font-black tabular-nums">₦{it.total.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 border-t border-dashed border-border/40 flex justify-between items-center">
                            <span className="font-black text-[10px] uppercase tracking-widest opacity-40">Grand Total</span>
                            <span className="text-3xl font-black text-primary tabular-nums tracking-tighter">₦{lastSale?.totalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 rounded-2xl h-16 font-bold uppercase text-[10px] tracking-widest" onClick={() => window.print()}>
                            Print Receipt
                        </Button>
                        <Button className="flex-1 rounded-2xl h-16 shadow-lg font-bold uppercase text-[10px] tracking-widest" onClick={() => setShowReceipt(false)}>
                           Next Order
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesPage;
