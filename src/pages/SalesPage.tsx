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
import { Modal, Input } from '../components/ui';

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
    const [search, setSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
    const [customerName, setCustomerName] = useState('');
    const [lastSale, setLastSale] = useState<RetailSale | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadStock = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getStockItems();
            setStock(data || []);
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => {
        loadStock();
        const ch = supabase.channel('sales-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock]);

    const updateQty = (item: StockItem, delta: number) => {
        setCart(prev => {
            const ex = prev.find(i => i.item.id === item.id);
            const currentQty = ex ? ex.quantity : 0;
            const newQty = Math.max(0, currentQty + delta);
            
            // Cannot exceed available stock
            if (newQty > item.quantity) return prev;
            
            if (newQty === 0) {
                return prev.filter(i => i.item.id !== item.id);
            }
            if (ex) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: newQty } : i);
            }
            return [...prev, { item, quantity: newQty }];
        });
    };

    const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.item.unitPrice * i.quantity, 0), [cart]);
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) return;
        setIsProcessing(true);
        const receiptNumber = `LX-${Math.random().toString(36).substring(7).toUpperCase()}`;
        const saleItems = cart.map(c => ({
            id: c.item.id, name: c.item.name,
            quantity: c.quantity, unitPrice: c.item.unitPrice,
            total: c.item.unitPrice * c.quantity,
        }));
        try {
            await supabaseDataService.recordRetailSale({
                receiptNumber, items: saleItems, totalPrice: cartTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer',
                salespersonId: user.id, farmId: '1',
            });
            setLastSale({
                id: receiptNumber, receiptNumber, items: saleItems,
                totalPrice: cartTotal, paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer',
                salespersonId: user.id, farmId: '1',
                createdAt: new Date().toISOString(),
            });
            setShowReceipt(true);
            setShowCheckout(false);
            setCart([]);
            setCustomerName('');
            loadStock();
        } catch (e: any) {
            alert(e.message || 'Checkout failed. Please try again.');
        } finally { setIsProcessing(false); }
    };

    const filtered = useMemo(() =>
        stock.filter(i =>
            (i.name || '').toLowerCase().includes(search.toLowerCase()) &&
            i.quantity > 0 && i.status === 'APPROVED'
        ), [stock, search]
    );

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Sales Point</h1>
                            <p className="text-sm text-muted-foreground">Select products and complete sales</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => navigate('/admin/sales')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-card border border-border/40 rounded-xl hover:bg-muted/20 transition-all text-foreground"
                    >
                        <History size={16} /> Sales History
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 h-11 rounded-xl bg-card border border-border/40 text-sm focus:outline-none focus:border-primary/50 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Items List */}
                <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} height={60} borderRadius={16} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 opacity-30 text-center">
                            <Package size={40} />
                            <p className="text-sm font-semibold">No products available for sale</p>
                        </div>
                    ) : (
                        filtered.map(item => {
                            const cartItem = cart.find(c => c.item.id === item.id);
                            const qtyInCart = cartItem?.quantity || 0;

                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-muted/5 transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-border/10">
                                            {item.imageUrl
                                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={22} /></div>
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground">{item.quantity} {item.unit} left</span>
                                                <span className="text-muted-foreground/40">·</span>
                                                <span className="text-sm font-bold text-primary">₦{item.unitPrice.toLocaleString()} / {item.unit.toLowerCase()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                        {qtyInCart === 0 ? (
                                            <button
                                                onClick={() => updateQty(item, 1)}
                                                className="px-6 py-2 bg-muted/30 hover:bg-primary/10 hover:text-primary text-sm font-bold rounded-xl transition-all"
                                            >
                                                Add
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 p-1 bg-muted/20 rounded-xl border border-border/30">
                                                <button
                                                    onClick={() => updateQty(item, -1)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-background hover:border-rose-400 hover:text-rose-500 shadow-sm transition-all"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-6 text-center text-sm font-bold">{qtyInCart}</span>
                                                <button
                                                    onClick={() => updateQty(item, 1)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-background hover:border-emerald-400 hover:text-emerald-500 shadow-sm transition-all"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Bottom Floating Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-30 flex justify-center animate-slide-up">
                    <div className="bg-foreground text-background shadow-2xl rounded-2xl p-4 flex items-center gap-6 w-full max-w-sm justify-between">
                        <div>
                            <p className="text-xs text-background/70 font-semibold mb-0.5">{cartCount} items</p>
                            <p className="text-xl font-black">₦{cartTotal.toLocaleString()}</p>
                        </div>
                        <button
                            onClick={() => setShowCheckout(true)}
                            className="bg-primary hover:bg-primary/90 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            <Modal isOpen={showCheckout} onClose={() => setShowCheckout(false)} title="Checkout Details" maxWidth="sm">
                <div className="py-2 space-y-6">
                    {/* Cart Summary inline */}
                    <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {cart.map(c => (
                            <div key={c.item.id} className="flex justify-between items-center text-sm p-3 bg-muted/10 rounded-xl">
                                <div>
                                    <p className="font-semibold">{c.item.name}</p>
                                    <p className="text-xs text-muted-foreground">{c.quantity} @ ₦{c.item.unitPrice.toLocaleString()}</p>
                                </div>
                                <p className="font-bold">₦{(c.quantity * c.item.unitPrice).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-2 border-t border-border/20">
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            <span className="text-primary">₦{cartTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold">Customer Name (Optional)</label>
                        <div className="flex items-center gap-2 h-12 px-3 bg-card border border-border/40 rounded-xl focus-within:border-primary/50 transition-all">
                            <User size={16} className="text-muted-foreground" />
                            <input
                                placeholder="Walk-in Customer"
                                className="flex-1 bg-transparent text-sm outline-none"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PAY_METHODS.map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setPaymentMethod(id)}
                                    className={`flex flex-col items-center justify-center py-3 gap-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                        paymentMethod === id ? 'bg-primary text-white border-primary' : 'bg-card border-border/30 hover:border-border/60 text-muted-foreground'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={() => setShowCheckout(false)}
                            className="flex-1 h-12 border border-border/40 font-bold rounded-xl hover:bg-muted/20"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing}
                            className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? 'Processing...' : `Pay ₦${cartTotal.toLocaleString()}`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Receipt Modal */}
            {showReceipt && lastSale && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white text-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-emerald-500 px-6 pt-7 pb-5 text-center text-white shrink-0">
                            <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={30} className="text-white" />
                            </div>
                            <h2 className="text-lg font-bold">Sale Complete!</h2>
                            <p className="text-emerald-100 text-xs mt-1">{lastSale.receiptNumber}</p>
                        </div>
                        <div id="printable-receipt" className="overflow-y-auto flex-1 p-5 space-y-4">
                            <div className="text-center pb-3 border-b border-dashed border-zinc-200">
                                <p className="font-black text-base uppercase tracking-tight">Life-Line Poultry</p>
                                <p className="text-xs text-zinc-400 mt-0.5">Official Sales Receipt</p>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500">
                                <div><p className="font-semibold text-zinc-800">{lastSale.customerName}</p><p>Customer</p></div>
                                <div className="text-right">
                                    <p className="font-semibold text-zinc-800">{new Date(lastSale.createdAt).toLocaleDateString()}</p>
                                    <p>{new Date(lastSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 py-3 border-y border-dashed border-zinc-200">
                                {lastSale.items.map((item, i) => (
                                    <div key={i} className="flex justify-between gap-3 text-sm">
                                        <div className="flex-1">
                                            <p className="font-semibold text-zinc-800 leading-tight">{item.name}</p>
                                            <p className="text-xs text-zinc-400">{item.quantity} × ₦{item.unitPrice.toLocaleString()}</p>
                                        </div>
                                        <p className="font-bold text-zinc-900 shrink-0">₦{item.total.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center bg-zinc-50 rounded-xl px-4 py-3">
                                <span className="font-bold text-sm">Total Paid</span>
                                <span className="text-xl font-black">₦{lastSale.totalPrice.toLocaleString()}</span>
                            </div>
                            <p className="text-center text-xs text-zinc-400 capitalize">Paid via {lastSale.paymentMethod}</p>
                            <p className="text-center text-xs text-zinc-400">Thank you for your purchase 🐓</p>
                        </div>
                        <div className="px-5 py-4 flex gap-3 border-t border-zinc-100 shrink-0">
                            <button onClick={() => window.print()} className="flex-1 h-11 flex items-center justify-center gap-2 border-2 border-zinc-200 hover:border-zinc-400 rounded-xl text-sm font-semibold text-zinc-700 transition-all active:scale-95"><Printer size={16} /> Print</button>
                            <button onClick={() => { setShowReceipt(false); setLastSale(null); }} className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary text-white rounded-xl text-sm font-bold transition-all active:scale-95"><RotateCcw size={15} /> New Sale</button>
                        </div>
                        <style dangerouslySetInnerHTML={{ __html: `@media print { body * { visibility: hidden; } #printable-receipt, #printable-receipt * { visibility: visible; } #printable-receipt { position: fixed; left: 0; top: 0; width: 100%; padding: 20px; }}` }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesPage;
