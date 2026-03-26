import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    Printer, X, RefreshCw, ChevronDown, Banknote, Smartphone,
    CreditCard, Package, ClipboardList, Zap, ArrowLeft, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Card, Button, Badge } from '../components/ui';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote,    desc: 'Physical Cash' },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone,  desc: 'Bank Transfer' },
    { id: 'pos',      label: 'P.O.S',    Icon: CreditCard,  desc: 'Card Payment' },
] as const;

type PayMethod = 'cash' | 'transfer' | 'pos';

export const SalesPage: React.FC = () => {
    const { user } = useAuth();
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
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 280);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadStock = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getStockItems();
            setStock(data);
        } catch (e) {
            console.error('Stock load fail:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('sales-terminal-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const u = payload.new as any;
                    setStock(prev => {
                        if (u.status !== 'APPROVED' || u.quantity <= 0) return prev.filter(i => i.id !== u.id);
                        const exists = prev.find(i => i.id === u.id);
                        const mapped = { id: u.id, name: u.name, quantity: u.quantity, unitPrice: u.unit_price, unit: u.unit || 'units', minThreshold: u.min_threshold || 0, status: u.status, imageUrl: u.image_url, submittedBy: u.submitted_by || '', submittedByName: u.submitted_by_name, rejection_comment: u.rejection_comment, farmId: u.farm_id, lastUpdated: u.last_updated };
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
        const receiptNumber = `LL-${Date.now().toString().slice(-8)}`;
        try {
            const result = await supabaseDataService.recordRetailSale({
                receiptNumber,
                items: cart.map(c => ({ id: c.item.id, name: c.item.name, quantity: c.quantity, unitPrice: c.item.unitPrice, total: c.item.unitPrice * c.quantity })),
                totalPrice: cartTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in',
                salespersonId: user.id,
                farmId: '1', // Default farm ID
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
            alert(e.message || 'Sale failed — please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredStock = useMemo(() =>
        stock.filter(i =>
            i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
            i.quantity > 0 && i.status === 'APPROVED'
        ), [stock, debouncedSearch]);

    const activePay = PAY_METHODS.find(p => p.id === paymentMethod)!;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full max-h-[calc(100vh-140px)] min-h-[600px]">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-12 pr-12 py-3.5 bg-card border-2 border-border rounded-2xl focus:border-primary outline-none transition-all font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="outline" size="icon" onClick={loadStock} className="rounded-2xl">
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                        <Button variant="secondary" onClick={() => window.location.href = '/admin/sales'} className="rounded-2xl px-6 gap-2">
                             <ClipboardList size={18} />
                             <span className="hidden sm:inline">History</span>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={180} borderRadius={24} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                            <Package size={80} strokeWidth={1} className="mb-4" />
                            <h3 className="text-xl font-bold">No products found</h3>
                            <p className="max-w-xs mx-auto text-sm">Verify that inventory items are approved and in stock.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                const isLow = item.quantity <= item.minThreshold;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`
                                            group relative bg-card rounded-3xl border-2 transition-all duration-300 p-5 text-left
                                            ${inCart > 0 ? 'border-primary shadow-lg shadow-primary/10 -translate-y-1' : 'border-border hover:border-primary/30 hover:shadow-soft hover:-translate-y-0.5'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-14 h-14 bg-muted/30 rounded-2xl flex items-center justify-center overflow-hidden border border-border/50">
                                                 {item.imageUrl 
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    : <Package className="text-muted-foreground/40" size={24} />
                                                 }
                                            </div>
                                            {inCart > 0 && <Badge variant="info" className="px-3 py-1 rounded-full text-sm font-black">×{inCart}</Badge>}
                                        </div>
                                        
                                        <h3 className="font-extrabold text-lg tracking-tight truncate mb-1">{item.name}</h3>
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-2xl font-black text-primary tracking-tighter">₦{item.unitPrice.toLocaleString()}</span>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black uppercase tracking-widest block ${isLow ? 'text-rose-500' : 'text-muted-foreground opacity-60'}`}>
                                                    {isLow ? 'Low Stock' : 'Available'}
                                                </span>
                                                <span className="text-xs font-bold">{item.quantity} {item.unit}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute bottom-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                            <div className="bg-primary text-white p-2 rounded-xl shadow-glow">
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

            {/* Cart Section */}
            <div className={`
                fixed inset-0 lg:static z-[60] lg:z-auto lg:w-96 flex flex-col bg-card lg:bg-transparent transition-all duration-500
                ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}>
                <Card className="h-full flex flex-col rounded-none lg:rounded-3xl border-0 lg:border border-border shadow-2xl lg:shadow-soft overflow-hidden" noPadding>
                    <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <ShoppingCart className="text-primary" size={20} />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Checkout</h2>
                        </div>
                        <button className="lg:hidden p-2 hover:bg-muted rounded-full" onClick={() => setIsCartOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                                <ShoppingCart size={64} strokeWidth={1} className="mb-4" />
                                <p className="font-bold">Your basket is empty</p>
                                <span className="text-xs">Add products to start a sale</span>
                            </div>
                        ) : cart.map(({ item, quantity }) => (
                            <div key={item.id} className="flex gap-4 p-4 bg-muted/5 rounded-2xl border border-border/40 group hover:border-primary/20 transition-all">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">₦{item.unitPrice.toLocaleString()} / {item.unit}</p>
                                    <p className="text-sm font-black text-primary mt-2">₦{(item.unitPrice * quantity).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end justify-between">
                                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-lg transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="flex items-center bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                        <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-muted active:scale-90 transition-all"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-xs font-black">{quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-muted active:scale-90 transition-all"><Plus size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-card border-t border-border space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customer Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Walk-in Customer"
                                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:border-primary outline-none transition-all text-sm font-medium"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAY_METHODS.map(({ id, label, Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setPaymentMethod(id)}
                                            className={`
                                                flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all
                                                ${paymentMethod === id ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10' : 'border-border hover:bg-muted'}
                                            `}
                                        >
                                            <Icon size={18} strokeWidth={2.5} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-muted-foreground">Subtotal ({cartCount} items)</span>
                                    <p className="text-3xl font-black tracking-tighter">₦{cartTotal.toLocaleString()}</p>
                                </div>
                                <Zap className="text-primary animate-pulse mb-1" size={24} />
                            </div>
                            <Button
                                fullWidth
                                size="lg"
                                className="py-7 rounded-2xl text-lg tracking-tight font-black shadow-glow"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                                isLoading={isProcessing}
                            >
                                Complete Purchase
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Mobile Fab for Cart */}
            <div className={`fixed bottom-24 right-6 z-40 lg:hidden transition-transform duration-300 ${isCartOpen ? 'scale-0' : 'scale-100'}`}>
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="w-16 h-16 bg-primary text-white rounded-2xl shadow-glow flex items-center justify-center relative active:scale-90 transition-transform"
                >
                    <ShoppingCart size={28} strokeWidth={2.5} />
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-rose-500 text-white w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border-4 border-background shadow-lg">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Receipt Modal */}
            {showReceipt && lastSale && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl rounded-[32px] border-2 border-primary/20 p-0 overflow-hidden" noPadding>
                        <div className="bg-primary p-8 text-white text-center space-y-4">
                            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-2 animate-bounce-slow">
                                <CheckCircle2 size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Sale Success!</h2>
                            <p className="text-white/80 font-medium">Receipt {lastSale.receiptNumber}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                {lastSale.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-bold">{it.name}</p>
                                            <span className="text-xs text-muted-foreground">{it.quantity} × ₦{it.unitPrice.toLocaleString()}</span>
                                        </div>
                                        <span className="font-black tabular-nums">₦{it.total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="h-[1px] bg-border border-dashed border-b " />
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xl font-bold">Total Paid</span>
                                <span className="text-3xl font-black tracking-tighter text-primary">₦{lastSale.totalPrice.toLocaleString()}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <Button variant="outline" className="rounded-2xl py-6" onClick={() => window.print()}>
                                    <Printer size={18} className="mr-2" /> Print
                                </Button>
                                <Button className="rounded-2xl py-6" onClick={() => setShowReceipt(false)}>
                                    Finish
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SalesPage;
