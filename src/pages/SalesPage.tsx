import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    X, Banknote, Smartphone,
    CreditCard, Package, ArrowRight,
    History, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import { Button, Input, Modal, Badge } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import { ReceiptCard } from '../components/ReceiptCard';

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
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 animate-slide-up pb-20">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col space-y-8 overflow-hidden bg-background/50 rounded-[40px] p-2 lg:p-6 lg:border border-border/20">
                {/* Header with Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 px-4 pt-4 lg:pt-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">POS <span className="text-primary italic">Terminal</span></h1>
                        <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest opacity-40 italic">Inventory disbursement system</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <Input
                                placeholder="Find products to sell..."
                                className="pl-13 h-14 bg-card border-border/40 rounded-[20px] shadow-inner font-bold"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => navigate('/admin/sales')} className="w-14 h-14 rounded-2xl bg-card border-border/40 shadow-sm hover:scale-105 active:scale-95 transition-all">
                            <History size={20} />
                        </Button>
                    </div>
                </div>

                {/* Stock Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar px-4 lg:px-2">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={180} borderRadius={32} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                            <Package size={80} className="mb-6 stroke-1" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center italic">No items available for sale</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                return (
                                    <button 
                                        key={item.id} 
                                        onClick={() => addToCart(item)} 
                                        className={`
                                            p-6 rounded-[32px] border-2 transition-all text-left bg-card group relative
                                            ${inCart > 0 
                                                ? 'border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(var(--primary-rgb),0.3)] ring-4 ring-primary/5' 
                                                : 'border-border/30 hover:border-primary/40 hover:translate-y-[-4px] hover:shadow-lg'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="w-16 h-16 bg-slate-900 rounded-[20px] overflow-hidden border border-border/10 shadow-sm transition-transform group-hover:scale-110">
                                                {item.imageUrl 
                                                  ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                  : <div className="w-full h-full flex items-center justify-center text-primary/20"><Package size={24} /></div>
                                                }
                                            </div>
                                            {inCart > 0 && (
                                                <Badge variant="primary" className="text-[10px] font-black px-3 py-1 rounded-full shadow-glow animate-bounce-subtle">
                                                    {inCart}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <h4 className="font-black text-sm uppercase tracking-tight text-foreground group-hover:text-primary transition-colors truncate">{item.name}</h4>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 tracking-wider">UNIT: {item.unit}</p>
                                        </div>

                                        <div className="flex justify-between items-end mt-6 pt-6 border-t border-border/10">
                                           <div className="flex flex-col">
                                               <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 mb-1">Unit Price</span>
                                               <span className="text-primary font-black text-xl tabular-nums tracking-tighter leading-none">₦{item.unitPrice.toLocaleString()}</span>
                                           </div>
                                           <div className="text-right">
                                               <span className="px-2 py-0.5 rounded-lg bg-muted text-[8px] font-black text-muted-foreground uppercase tracking-widest">{item.quantity} Left</span>
                                           </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar POS - Cart Section */}
            <div className={`
                fixed inset-0 lg:static z-[60] lg:w-[420px] flex flex-col bg-card lg:border border-border/30 rounded-[40px] shadow-2xl lg:shadow-premium transition-all duration-500 transform
                ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}>
                {/* Cart Header */}
                <div className="p-8 border-b border-border/10 flex justify-between items-center bg-muted/5 rounded-t-[40px]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <ShoppingCart size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Order Cart</h2>
                            <p className="text-[9px] font-bold uppercase text-muted-foreground opacity-40 tracking-widest">Current selection: {cart.length} items</p>
                        </div>
                    </div>
                    <button 
                        className="lg:hidden p-3 bg-muted/20 hover:bg-muted/40 rounded-2xl transition-all" 
                        onClick={() => setIsCartOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                            <div className="w-24 h-24 bg-muted rounded-[32px] flex items-center justify-center mb-6">
                                <ShoppingCart size={48} className="stroke-1" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">Your cart is currently empty</p>
                        </div>
                    ) : cart.map(({ item, quantity }) => (
                        <div key={item.id} className="group flex gap-5 p-5 bg-muted/5 hover:bg-muted/10 rounded-3xl items-center border border-transparent hover:border-border/20 transition-all">
                            <div className="w-14 h-14 bg-card rounded-2xl overflow-hidden border border-border/10 flex-shrink-0">
                                {item.imageUrl 
                                  ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center opacity-20"><Package size={18} /></div>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="font-black text-xs uppercase truncate mb-1.5 group-hover:text-primary transition-colors">{item.name}</h5>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary font-black text-base tracking-tighter tabular-nums">₦{(item.unitPrice * quantity).toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground opacity-30 italic">(@ ₦{item.unitPrice.toLocaleString()})</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-background p-1.5 rounded-2xl border border-border/20 shadow-inner shrink-0">
                                <button 
                                    onClick={() => updateQty(item.id, -1)} 
                                    className="w-10 h-10 flex items-center justify-center hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90"
                                >
                                    <Minus size={14} strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center text-sm font-black tabular-nums">{quantity}</span>
                                <button 
                                    onClick={() => updateQty(item.id, 1)} 
                                    className="w-10 h-10 flex items-center justify-center hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-90"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary & Checkout Section */}
                <div className="p-10 border-t border-border/10 space-y-8 bg-muted/5 rounded-b-[40px]">
                    <div className="space-y-6">
                        {/* Customer & Payment Method */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 bg-background/50 p-4 rounded-2xl border border-border/10">
                                <div className="p-2.5 bg-muted rounded-xl text-muted-foreground"><User size={18} /></div>
                                <Input 
                                    placeholder="Enter Customer Name" 
                                    className="h-10 border-0 bg-transparent font-black p-0 text-sm focus:ring-0 placeholder:opacity-30 placeholder:italic" 
                                    value={customerName} 
                                    onChange={e => setCustomerName(e.target.value)} 
                                />
                            </div>

                            <div className="flex gap-4">
                                {PAY_METHODS.map(({ id, label, Icon }) => (
                                    <button 
                                        key={id} 
                                        onClick={() => setPaymentMethod(id)} 
                                        className={`
                                            flex-1 flex flex-col items-center gap-2 py-4 rounded-[24px] border-2 transition-all
                                            ${paymentMethod === id 
                                                ? 'border-primary bg-primary text-white shadow-glow' 
                                                : 'border-border/10 bg-card hover:bg-muted/10 opacity-70'}
                                        `}
                                    >
                                        <Icon size={18} strokeWidth={paymentMethod === id ? 3 : 2} />
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border/10 space-y-6">
                        <div className="flex justify-between items-end px-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">Total Payable</span>
                                <span className="text-4xl font-black tabular-nums tracking-tighter text-foreground italic">₦{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {cart.length} Items Selected
                            </div>
                        </div>
                        
                        <Button
                            fullWidth
                            className="h-20 rounded-[32px] text-[11px] font-black uppercase tracking-[0.2em] shadow-glow group bg-primary hover:bg-primary/90 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4"
                            disabled={cart.length === 0 || isProcessing}
                            onClick={handleCheckout}
                            isLoading={isProcessing}
                        >
                            Finalize Order <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" size={20} strokeWidth={4} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            <Modal isOpen={showReceipt && !!lastSale} onClose={() => setShowReceipt(false)} title="SUCCESSFUL TRANSACTION" maxWidth="md">
                <div className="space-y-10 py-10 animate-slide-up flex flex-col items-center bg-background rounded-[40px]">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-[32px] flex items-center justify-center shadow-glow mb-2 animate-bounce-subtle no-print">
                        <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                    
                    <div className="text-center px-10">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Order Confirmed</h3>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">Payment processed successfully</p>
                    </div>

                    <div className="w-full px-6">
                       {lastSale && <ReceiptCard sale={lastSale} />}
                    </div>

                    <div className="flex gap-4 w-full max-w-[440px] px-8 no-print pt-4">
                        <Button 
                            variant="outline" 
                            className="flex-1 rounded-[24px] h-16 font-black uppercase text-[10px] tracking-widest border-2 hover:bg-muted transition-all active:scale-95" 
                            onClick={() => window.print()}
                        >
                             Print Slip
                        </Button>
                        <Button 
                            className="flex-1 rounded-[24px] h-16 font-black uppercase text-[10px] tracking-widest bg-slate-900 text-white shadow-xl transition-all active:scale-95 transform hover:scale-105" 
                            onClick={() => setShowReceipt(false)}
                        >
                            New Sale
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesPage;
