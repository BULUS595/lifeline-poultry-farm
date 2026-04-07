import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    Banknote, Smartphone, CreditCard, Package,
    History, User, X, Printer, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Skeleton } from '../components/Skeleton';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone },
    { id: 'pos',      label: 'P.O.S',   Icon: CreditCard },
] as const;

type PayMethod = 'cash' | 'transfer' | 'pos';

export const SalesPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stock, setStock] = useState<StockItem[]>([]);
    const [cart, setCart] = useState<Array<{ item: StockItem; quantity: number }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
    const [customerName, setCustomerName] = useState('');
    const [lastSale, setLastSale] = useState<RetailSale | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [cartOpen, setCartOpen] = useState(false);

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
        const ch = supabase.channel('sales-v2')
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
        if (window.innerWidth < 1024) setCartOpen(true);
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev =>
            prev.map(i => {
                if (i.item.id !== id) return i;
                const nq = Math.max(0, i.quantity + delta);
                const s = stock.find(s => s.id === id);
                if (s && nq > s.quantity) return i;
                return { ...i, quantity: nq };
            }).filter(i => i.quantity > 0)
        );
    };

    const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.item.id !== id));

    const cartTotal = useMemo(() =>
        cart.reduce((s, i) => s + i.item.unitPrice * i.quantity, 0), [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) return;
        setIsProcessing(true);
        const receiptNumber = `LX-${Math.random().toString(36).substring(7).toUpperCase()}`;
        const saleItems = cart.map(c => ({
            id: c.item.id,
            name: c.item.name,
            quantity: c.quantity,
            unitPrice: c.item.unitPrice,
            total: c.item.unitPrice * c.quantity,
        }));

        try {
            await supabaseDataService.recordRetailSale({
                receiptNumber,
                items: saleItems,
                totalPrice: cartTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer',
                salespersonId: user.id,
                farmId: '1',
            });

            // Build receipt locally — guarantees all fields present regardless of RPC response shape
            const builtSale: RetailSale = {
                id: receiptNumber,
                receiptNumber,
                items: saleItems,
                totalPrice: cartTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer',
                salespersonId: user.id,
                farmId: '1',
                createdAt: new Date().toISOString(),
            };
            setLastSale(builtSale);
            setShowReceipt(true);
            setCart([]);
            setCustomerName('');
            setCartOpen(false);
            loadStock();
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Something went wrong during checkout.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredStock = useMemo(() =>
        stock.filter(i =>
            (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
            i.quantity > 0 &&
            i.status === 'APPROVED'
        ),
        [stock, searchTerm]
    );

    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="min-h-screen bg-background">
            {/* ── Top bar ── */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/20 px-4 py-3 flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <ShoppingCart size={18} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none">Sales Point</h1>
                        <p className="text-xs text-muted-foreground">Select items to add to cart</p>
                    </div>
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <input
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 h-9 rounded-xl bg-card border border-border/40 text-sm focus:outline-none focus:border-primary/50 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => navigate('/admin/sales')}
                    className="p-2 rounded-xl border border-border/30 hover:bg-muted/10 transition-all text-muted-foreground"
                    title="Sales History"
                >
                    <History size={18} />
                </button>

                {/* Mobile cart toggle */}
                <button
                    onClick={() => setCartOpen(true)}
                    className="lg:hidden relative p-2 rounded-xl bg-primary text-white"
                >
                    <ShoppingCart size={18} />
                    {cartCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex h-[calc(100vh-57px)]">

                {/* ── Product Grid ── */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <Skeleton key={i} height={160} borderRadius={24} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30 py-20">
                            <Package size={56} className="stroke-1" />
                            <p className="text-sm font-semibold text-center">No approved products available</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`
                                            relative p-4 rounded-2xl border-2 text-left transition-all active:scale-95
                                            ${inCart > 0
                                                ? 'border-primary bg-primary/5 shadow-md'
                                                : 'border-border/30 bg-card hover:border-primary/40 hover:shadow-md'}
                                        `}
                                    >
                                        {/* Cart badge */}
                                        {inCart > 0 && (
                                            <span className="absolute top-2 right-2 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                                                {inCart}
                                            </span>
                                        )}

                                        {/* Product Image */}
                                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-900 mb-3">
                                            {item.imageUrl
                                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-primary/15"><Package size={32} /></div>
                                            }
                                        </div>

                                        <p className="font-bold text-sm leading-tight truncate mb-1">{item.name}</p>
                                        <p className="text-xs text-muted-foreground mb-2">{item.quantity} {item.unit} left</p>
                                        <p className="text-primary font-black text-base">₦{item.unitPrice.toLocaleString()}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Cart Panel ── */}
                <div className={`
                    fixed inset-0 z-50 lg:static lg:z-auto lg:w-80 xl:w-96 flex-shrink-0
                    flex flex-col bg-card border-l border-border/30 shadow-2xl lg:shadow-none
                    transition-transform duration-300
                    ${cartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    {/* Cart header */}
                    <div className="p-5 border-b border-border/20 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-base">Order Summary</h2>
                            <p className="text-xs text-muted-foreground">{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</p>
                        </div>
                        <button onClick={() => setCartOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-muted/20">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Cart items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20 py-16">
                                <ShoppingCart size={48} className="stroke-1" />
                                <p className="text-sm font-semibold text-center">Cart is empty</p>
                                <p className="text-xs text-center">Tap a product to add it</p>
                            </div>
                        ) : cart.map(({ item, quantity }) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-xl group">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                                    {item.imageUrl
                                        ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={18} /></div>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{item.name}</p>
                                    <p className="text-xs text-primary font-bold">₦{(item.unitPrice * quantity).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => updateQty(item.id, -1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border/30 hover:border-rose-400 hover:text-rose-500 transition-all text-sm font-bold"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-6 text-center text-sm font-bold">{quantity}</span>
                                    <button
                                        onClick={() => updateQty(item.id, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border/30 hover:border-emerald-400 hover:text-emerald-500 transition-all text-sm font-bold"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all text-muted-foreground ml-1"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Checkout footer */}
                    <div className="p-4 border-t border-border/20 space-y-4">
                        {/* Customer name */}
                        <div className="flex items-center gap-2 h-11 px-3 bg-muted/10 border border-border/30 rounded-xl">
                            <User size={15} className="text-muted-foreground shrink-0" />
                            <input
                                placeholder="Customer name (optional)"
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>

                        {/* Payment method */}
                        <div className="grid grid-cols-3 gap-2">
                            {PAY_METHODS.map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setPaymentMethod(id)}
                                    className={`
                                        flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all
                                        ${paymentMethod === id
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border/30 bg-background hover:border-primary/40 text-muted-foreground'}
                                    `}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Total + Checkout button */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm text-muted-foreground font-medium">Total</span>
                                <span className="text-2xl font-black text-foreground">₦{cartTotal.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0 || isProcessing}
                                className="w-full h-13 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
                            >
                                {isProcessing
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                                    : <><CheckCircle2 size={18} /> Complete Sale</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Receipt Modal ── */}
            {showReceipt && lastSale && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white text-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
                        {/* Success header */}
                        <div className="bg-emerald-500 px-6 pt-8 pb-6 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl font-bold">Payment Successful</h2>
                            <p className="text-emerald-100 text-sm mt-1">{lastSale.receiptNumber}</p>
                        </div>

                        {/* Receipt body */}
                        <div id="printable-receipt" className="p-6 space-y-4">
                            {/* Farm name */}
                            <div className="text-center pb-4 border-b border-dashed border-zinc-200">
                                <p className="font-black text-lg uppercase tracking-tight">Life-Line Poultry</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Official Sales Receipt</p>
                            </div>

                            {/* Meta */}
                            <div className="flex justify-between text-xs text-zinc-500">
                                <div>
                                    <p className="font-semibold text-zinc-800">{lastSale.customerName}</p>
                                    <p>Customer</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-zinc-800">{new Date(lastSale.createdAt).toLocaleDateString()}</p>
                                    <p>{new Date(lastSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2.5 py-3 border-y border-dashed border-zinc-200">
                                {lastSale.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-start gap-2 text-sm">
                                        <div className="flex-1">
                                            <p className="font-semibold text-zinc-800 leading-tight">{item.name}</p>
                                            <p className="text-xs text-zinc-400">{item.quantity} × ₦{item.unitPrice.toLocaleString()}</p>
                                        </div>
                                        <p className="font-bold text-zinc-900 shrink-0">₦{item.total.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center bg-zinc-50 rounded-xl px-4 py-3">
                                <span className="font-bold text-sm uppercase tracking-wide">Total Paid</span>
                                <span className="text-xl font-black">₦{lastSale.totalPrice.toLocaleString()}</span>
                            </div>
                            <p className="text-center text-xs text-zinc-400 capitalize">Paid via {lastSale.paymentMethod}</p>
                            <p className="text-center text-xs text-zinc-400 pb-1">Thank you for your purchase 🐓</p>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 h-11 flex items-center justify-center gap-2 border-2 border-zinc-200 hover:border-zinc-400 rounded-xl text-sm font-semibold text-zinc-700 transition-all"
                            >
                                <Printer size={16} /> Print
                            </button>
                            <button
                                onClick={() => { setShowReceipt(false); setLastSale(null); }}
                                className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all"
                            >
                                <RotateCcw size={16} /> New Sale
                            </button>
                        </div>

                        <style dangerouslySetInnerHTML={{ __html: `
                            @media print {
                                body * { visibility: hidden; }
                                #printable-receipt, #printable-receipt * { visibility: visible; }
                                #printable-receipt { position: fixed; left: 0; top: 0; width: 100%; }
                            }
                        ` }} />
                    </div>
                </div>
            )}

            {/* Mobile cart overlay backdrop */}
            {cartOpen && (
                <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setCartOpen(false)} />
            )}
        </div>
    );
};

export default SalesPage;
