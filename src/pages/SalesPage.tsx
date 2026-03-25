import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ShoppingCart, Search, Plus, Minus, CheckCircle2,
    Printer, X, RefreshCw, ChevronDown, Banknote, Smartphone,
    CreditCard, Package, ClipboardList, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import styles from './SalesPage.module.css';

const PAY_METHODS = [
    { id: 'cash',     label: 'Cash',     Icon: Banknote,    desc: 'Receive physical cash' },
    { id: 'transfer', label: 'Transfer', Icon: Smartphone,  desc: 'Bank / App transfer' },
    { id: 'pos',      label: 'P.O.S',    Icon: CreditCard,  desc: 'Card machine payment' },
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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1100);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 1100);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

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
                        const mapped = { id: u.id, name: u.name, quantity: u.quantity, unitPrice: u.unit_price, unit: u.unit || 'units', minThreshold: u.min_threshold || 0, status: u.status, imageUrl: u.image_url, submittedBy: u.submitted_by || '', submittedByName: u.submitted_by_name, rejectionComment: u.rejection_comment, farmId: u.farm_id, lastUpdated: u.last_updated };
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
                farmId: '',
            });
            if (result) {
                setLastSale(result);
                setShowReceipt(true);
                setCart([]);
                setCustomerName('');
            } else {
                alert('Sale failed — please try again.');
            }
        } catch (e: any) {
            console.error('Checkout failed:', e);
            const msg = e.message || '';
            if (msg.includes('Not enough stock') || msg.includes('Item')) {
                // Surface the exact PostgreSQL exception about stock limits
                alert(msg);
            } else {
                alert('An error occurred during checkout. Please check your connection.');
            }
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
        <Layout title="Sales Terminal">
            <div className={styles.terminal}>
                {/* ── LEFT: Product catalog ─────────────────── */}
                <div className={styles.catalog}>
                    <div className={styles.catalogHeader}>
                        <div className={styles.searchBox}>
                            <Search size={18} />
                            <input
                                id="sales-search"
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoComplete="off"
                            />
                            {searchTerm && <button className={styles.clearSearch} onClick={() => setSearchTerm('')}><X size={14} /></button>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={styles.iconBtn} onClick={loadStock} title="Refresh stock"><RefreshCw size={18} /></button>
                            {(user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'auditor') && (
                                <button 
                                    className={`${styles.iconBtn} ${styles.historyBtn}`} 
                                    onClick={() => window.location.href = '/admin/sales'} 
                                    title="Sold Goods History"
                                    style={{ width: 'auto', padding: '0 12px', gap: '6px', color: 'var(--color-primary)', background: 'rgba(13, 222, 178, 0.1)' }}
                                >
                                    <ClipboardList size={16} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>History</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className={styles.loadingGrid}>
                            {Array(6).fill(0).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Package size={56} opacity={0.12} />
                            <p>No products available</p>
                            <span>Approved items will appear here</span>
                        </div>
                    ) : (
                        <div className={styles.productGrid}>
                            {filteredStock.map(item => {
                                const inCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                                const isLow = item.quantity <= item.minThreshold;
                                return (
                                    <button
                                        key={item.id}
                                        id={`product-${item.id}`}
                                        className={`${styles.productCard} ${inCart > 0 ? styles.productCardActive : ''}`}
                                        onClick={() => addToCart(item)}
                                    >
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} className={styles.productImg} onError={e => (e.currentTarget.style.display = 'none')} />
                                            : <div className={styles.productImgPlaceholder}><Package size={28} /></div>
                                        }
                                        {inCart > 0 && <div className={styles.inCartBadge}>{inCart}</div>}
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>{item.name}</span>
                                            <span className={styles.productPrice}>₦{item.unitPrice.toLocaleString()}</span>
                                            <span className={`${styles.productStock} ${isLow ? styles.productStockLow : ''}`}>
                                                {item.quantity} {item.unit} left
                                            </span>
                                        </div>
                                        <div className={styles.addBtn}><Plus size={16} /></div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Basket + Checkout ──────────────── */}
                <div className={`${styles.basket} ${isCartOpen ? styles.basketOpen : ''}`}>
                    {/* Basket header — toggles on mobile */}
                    <div
                        id="basket-header"
                        className={styles.basketHeader}
                        onClick={() => isMobile && setIsCartOpen(o => !o)}
                    >
                        <div className={styles.basketTitleRow}>
                            <ShoppingCart size={18} />
                            <span>Sales Basket</span>
                        </div>
                        <div className={styles.basketMeta}>
                            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
                            {isMobile && (
                                <ChevronDown
                                    size={18}
                                    style={{ transition: 'transform 0.3s', transform: isCartOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Cart items */}
                    <div className={styles.cartList}>
                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <ShoppingCart size={44} opacity={0.08} />
                                <p>Basket is empty</p>
                                <span>Tap a product to add</span>
                            </div>
                        ) : cart.map(({ item, quantity }) => (
                            <div key={item.id} className={styles.cartRow}>
                                <div className={styles.cartRowLeft}>
                                    <span className={styles.cartItemName}>{item.name}</span>
                                    <span className={styles.cartItemUnit}>₦{item.unitPrice.toLocaleString()} / {item.unit}</span>
                                </div>
                                <div className={styles.cartRowRight}>
                                    <span className={styles.cartItemTotal}>₦{(item.unitPrice * quantity).toLocaleString()}</span>
                                    <div className={styles.qtyControls}>
                                        <button className={styles.qtyBtn} onClick={() => updateQty(item.id, -1)}><Minus size={12} /></button>
                                        <span className={styles.qtyNum}>{quantity}</span>
                                        <button className={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}><Plus size={12} /></button>
                                    </div>
                                    <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)} title="Remove"><X size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Checkout form */}
                    <div className={styles.checkoutSection}>
                        {/* Customer */}
                        <div className={styles.formField}>
                            <label htmlFor="customer-name">Customer (optional)</label>
                            <input
                                id="customer-name"
                                type="text"
                                placeholder="Walk-in / Customer name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>

                        {/* Payment method */}
                        <div className={styles.paySection}>
                            <p className={styles.payLabel}>PAYMENT METHOD</p>
                            <div className={styles.payOptions}>
                                {PAY_METHODS.map(({ id, label, Icon }) => (
                                    <button
                                        key={id}
                                        id={`pay-${id}`}
                                        className={`${styles.payBtn} ${paymentMethod === id ? styles.payBtnActive : ''}`}
                                        onClick={() => setPaymentMethod(id)}
                                    >
                                        <Icon size={18} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className={styles.payMethodInfo}>
                                <activePay.Icon size={14} />
                                <span>{activePay.desc}</span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className={styles.totalRow}>
                            <div className={styles.totalLeft}>
                                <span>Grand Total</span>
                                <span className={styles.totalItems}>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                            </div>
                            <strong className={styles.totalAmount}>₦{cartTotal.toLocaleString()}</strong>
                        </div>

                        {/* Finalize button */}
                        <button
                            id="finalize-sale-btn"
                            className={styles.finalizeBtn}
                            disabled={cart.length === 0 || isProcessing}
                            onClick={handleCheckout}
                        >
                            {isProcessing ? (
                                <><div className={styles.spinner} /> Processing...</>
                            ) : (
                                <><Zap size={18} /> Finalize Sale · {activePay.label}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Receipt Modal ─────────────────────────────── */}
            {showReceipt && lastSale && (
                <div className={styles.overlay}>
                    <div className={styles.receiptModal}>
                        <div className={styles.receiptModalHeader}>
                            <div className={styles.receiptSuccess}>
                                <CheckCircle2 size={28} />
                                <div>
                                    <h2>Payment Received</h2>
                                    <p>{activePay.label} · {lastSale.receiptNumber}</p>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setShowReceipt(false)}><X size={20} /></button>
                        </div>

                        <div id="printable-receipt" ref={receiptRef} className={styles.receiptBody}>
                            <div className={styles.receiptTop}>
                                <div className={styles.receiptBrand}>LIFELINE</div>
                                <div className={styles.receiptDate}>{new Date(lastSale.createdAt).toLocaleString()}</div>
                            </div>

                            {lastSale.customerName && lastSale.customerName !== 'Walk-in' && (
                                <div className={styles.receiptCustomer}>Customer: <strong>{lastSale.customerName}</strong></div>
                            )}

                            <div className={styles.receiptItems}>
                                {lastSale.items.map((it, idx) => (
                                    <div key={idx} className={styles.receiptItem}>
                                        <div className={styles.receiptItemLeft}>
                                            <strong>{it.name}</strong>
                                            <span>{it.quantity} × ₦{it.unitPrice.toLocaleString()}</span>
                                        </div>
                                        <span className={styles.receiptItemTotal}>₦{it.total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.receiptFooterBox}>
                                <div className={styles.receiptRow}>
                                    <span>Payment via</span>
                                    <span className={styles.receiptPayTag}>{lastSale.paymentMethod.toUpperCase()}</span>
                                </div>
                                <div className={`${styles.receiptRow} ${styles.receiptTotalRow}`}>
                                    <span>TOTAL</span>
                                    <strong>₦{lastSale.totalPrice.toLocaleString()}</strong>
                                </div>
                                <div className={styles.receiptThank}>
                                    <p>Served by: {user?.name}</p>
                                    <p>Thank you for your patronage 🙏</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.receiptActions}>
                            <button className={styles.printBtn} onClick={() => window.print()}>
                                <Printer size={16} /> Print Receipt
                            </button>
                            <button className={styles.doneBtn} onClick={() => setShowReceipt(false)}>
                                <CheckCircle2 size={16} /> Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SalesPage;
