import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2, XCircle, Package, Search, AlertTriangle,
    Trash2, RefreshCw, X, ShieldCheck, Edit3, ClipboardList,
    ShoppingBag, Banknote, Smartphone, CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem, type RetailSale } from '../types';
import styles from './AdminStockPage.module.css';

type Tab = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SALES_HISTORY' | 'OUT_OF_STOCK';

const PAY_ICONS: Record<string, React.ReactNode> = {
    cash: <Banknote size={12} />,
    transfer: <Smartphone size={12} />,
    pos: <CreditCard size={12} />,
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg: Record<string, { label: string; cls: string }> = {
        PENDING_APPROVAL: { label: 'Pending', cls: styles.badgePending },
        APPROVED: { label: 'Approved', cls: styles.badgeApproved },
        REJECTED: { label: 'Rejected', cls: styles.badgeRejected },
    };
    const c = cfg[status] || { label: status, cls: '' };
    return <span className={`${styles.badge} ${c.cls}`}>{c.label}</span>;
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

    // Edit modal
    const [editItem, setEditItem] = useState<StockItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editQty, setEditQty] = useState('');
    const [editPrice, setEditPrice] = useState('');

    // Reject modal
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
        const ch = supabase
            .channel('admin-stock-v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadStock)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadStock]);

    // Load sales when that tab is selected
    useEffect(() => {
        if (tab === 'SALES_HISTORY') loadSales();
    }, [tab, loadSales]);

    const filtered = useMemo(() =>
        items.filter(i =>
            (i.status === tab) &&
            i.name.toLowerCase().includes(search.toLowerCase())
        ), [items, tab, search]);

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

    if (!isSuperAdmin && !isManager) {
        return (
            <Layout title="Access Denied">
                <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--color-text-tertiary)' }}>
                    <ShieldCheck size={60} opacity={0.15} />
                    <h2 style={{ marginTop: '1.5rem' }}>Access Restricted</h2>
                    <p>Only Admins and Managers can view this page.</p>
                </div>
            </Layout>
        );
    }

    const approve = async (item: StockItem) => {
        if (!user) return;
        setApproveError(null);
        setActing(item.id);
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        } else {
            setApproveError(`Failed to approve "${item.name}". Check browser console for details.`);
        }
        setActing(null);
    };

    const openReject = (item: StockItem) => { setRejectItem(item); setRejectNote(''); };

    const confirmReject = async () => {
        if (!rejectItem || !user) return;
        setActing(rejectItem.id);
        const ok = await supabaseDataService.rejectStockItem(rejectItem.id, rejectNote.trim(), { id: user.id, name: user.name, role: user.role });
        if (ok) setItems(prev => prev.map(i => i.id === rejectItem.id ? { ...i, status: 'REJECTED', rejectionComment: rejectNote.trim() } : i));
        setRejectItem(null);
        setActing(null);
    };

    const openEdit = (item: StockItem) => {
        setEditItem(item);
        setEditName(item.name);
        setEditQty(String(item.quantity));
        setEditPrice(String(item.unitPrice));
    };

    const confirmEdit = async () => {
        if (!editItem || !user) return;
        setActing(editItem.id);
        
        const newQty = parseFloat(editQty);
        // Automatically determine if restocked
        const newStatus = (editItem.status === 'OUT_OF_STOCK' && newQty > 0) ? 'APPROVED' : editItem.status;

        const ok = await supabaseDataService.updateStockItem(editItem.id, {
            name: editName,
            quantity: newQty,
            unitPrice: parseFloat(editPrice),
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

    const TABS = [
        { id: 'PENDING_APPROVAL' as Tab, label: 'Pending', count: counts.PENDING_APPROVAL },
        { id: 'APPROVED' as Tab, label: 'Approved', count: counts.APPROVED },
        { id: 'OUT_OF_STOCK' as Tab, label: 'Out of Stock', count: counts.OUT_OF_STOCK, icon: <AlertTriangle size={13} color="var(--color-danger)" /> },
        { id: 'REJECTED' as Tab, label: 'Rejected', count: counts.REJECTED },
        { id: 'SALES_HISTORY' as Tab, label: 'Sold Goods History', count: sales.length, icon: <ShoppingBag size={13} /> },
    ];

    const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + (sale.totalPrice || 0), 0), [sales]);

    return (
        <Layout title="Stock Control">
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Admin <span style={{ color: 'var(--color-primary)' }}>Control</span></h1>
                        <p className={styles.sub}>Approve stock submissions · Review sales history</p>
                    </div>
                    <button className={styles.refreshBtn} onClick={tab === 'SALES_HISTORY' ? loadSales : loadStock} title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Error banner */}
                {approveError && (
                    <div className={styles.errorBanner}>
                        <span>{approveError}</span>
                        <button onClick={() => setApproveError(null)}><X size={14} /></button>
                    </div>
                )}

                {/* Tabs + Search */}
                <div className={styles.toolbar}>
                    <div className={styles.tabs}>
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.icon && t.icon}
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`${styles.tabCount} ${tab === t.id ? styles.tabCountActive : ''}`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder={tab === 'SALES_HISTORY' ? 'Search sales...' : 'Search items...'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── SALES HISTORY TAB ─────────────────────── */}
                {tab === 'SALES_HISTORY' ? (
                    <div className={styles.salesSection}>
                        {/* Revenue summary */}
                        <div className={styles.revenueSummary}>
                            <div className={styles.revenueCard}>
                                <span>Total Sales</span>
                                <strong>{sales.length}</strong>
                            </div>
                            <div className={styles.revenueCard}>
                                <span>Total Revenue</span>
                                <strong>₦{totalRevenue.toLocaleString()}</strong>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button 
                                onClick={() => window.location.href = '/admin/sales'} 
                                style={{ 
                                    display: 'flex', gap: '8px', alignItems: 'center', 
                                    background: 'var(--color-primary)', color: '#000', 
                                    padding: '8px 16px', borderRadius: '8px',
                                    fontWeight: 600, border: 'none', cursor: 'pointer',
                                    boxShadow: '0 4px 6px rgba(13, 222, 178, 0.2)'
                                }}
                            >
                                <ClipboardList size={18} />
                                Open Detailed Transactions Module
                            </button>
                        </div>

                        <div className={`${styles.tableWrap} card`} style={{ padding: 0, overflow: 'hidden' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Receipt #</th>
                                        <th>Date & Time</th>
                                        <th>Items Sold</th>
                                        <th>Payment</th>
                                        <th>Customer</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesLoading ? (
                                        <tr><td colSpan={6} style={{ padding: '2rem' }}><Skeleton height={40} borderRadius={10} /></td></tr>
                                    ) : filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className={styles.emptyCell}>
                                                <ShoppingBag size={36} opacity={0.12} />
                                                <p>No sales recorded yet</p>
                                            </td>
                                        </tr>
                                    ) : filteredSales.map(sale => (
                                        <tr key={sale.id} className={styles.row}>
                                            <td>
                                                <span className={styles.receiptNum}>#{sale.receiptNumber}</span>
                                            </td>
                                            <td className={styles.dateCell}>
                                                <span>{new Date(sale.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className={styles.timeText}>{new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td>
                                                <div className={styles.itemsList}>
                                                    {(() => {
                                                        let safeIts = Array.isArray(sale.items) ? sale.items : [];
                                                        if (typeof sale.items === 'string') {
                                                            try { safeIts = JSON.parse(sale.items); } catch(e) {}
                                                        }
                                                        return safeIts.map((it: any, idx: number) => (
                                                            <span key={idx} className={styles.soldItem}>
                                                                {it.name} ×{it.quantity}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.payBadge} ${styles[`pay_${sale.paymentMethod}`]}`}>
                                                    {PAY_ICONS[sale.paymentMethod] || null}
                                                    {sale.paymentMethod?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                {sale.customerName || 'Walk-in'}
                                            </td>
                                            <td>
                                                <strong style={{ color: 'var(--color-primary)', fontWeight: 900 }}>
                                                    ₦{(sale.totalPrice || 0).toLocaleString()}
                                                </strong>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ── STOCK MANAGEMENT TABS ───────────────── */
                    <div className={`${styles.tableWrap} card`} style={{ padding: 0, overflow: 'hidden' }}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Submitted By</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={7} style={{ padding: '2rem' }}><Skeleton height={40} borderRadius={10} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={styles.emptyCell}>
                                            <Package size={36} opacity={0.15} />
                                            <p>No {tab.replace('_', ' ').toLowerCase()} items</p>
                                        </td>
                                    </tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} className={`${styles.row} ${acting === item.id ? styles.rowActing : ''}`}>
                                        <td>
                                            <div className={styles.itemCell}>
                                                {item.imageUrl
                                                    ? <img src={item.imageUrl} alt={item.name} className={styles.thumb} onError={e => (e.currentTarget.style.display = 'none')} />
                                                    : <div className={styles.thumbPlaceholder}><Package size={16} /></div>
                                                }
                                                <strong>{item.name}</strong>
                                            </div>
                                        </td>
                                        <td>{item.quantity.toLocaleString()} <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{item.unit}</span></td>
                                        <td style={{ fontWeight: 800 }}>₦{item.unitPrice.toLocaleString()}</td>
                                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{item.submittedByName || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{new Date(item.lastUpdated).toLocaleDateString()}</td>
                                        <td><StatusBadge status={item.status} /></td>
                                        <td>
                                            <div className={styles.actions}>
                                                {item.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button
                                                            className={styles.btnApprove}
                                                            onClick={() => approve(item)}
                                                            disabled={acting === item.id}
                                                            title="Approve this stock"
                                                        >
                                                            {acting === item.id ? '...' : <><CheckCircle2 size={14} /> Approve</>}
                                                        </button>
                                                        <button
                                                            className={styles.btnReject}
                                                            onClick={() => openReject(item)}
                                                            disabled={acting === item.id}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button className={styles.btnEdit} onClick={() => openEdit(item)} title="Edit">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button className={styles.btnDelete} onClick={() => deleteItem(item)} title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* REJECT MODAL */}
            {rejectItem && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Reject "{rejectItem.name}"</h2>
                            <button onClick={() => setRejectItem(null)}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <label>Reason / Feedback for inventory staff</label>
                            <textarea
                                value={rejectNote}
                                onChange={e => setRejectNote(e.target.value)}
                                placeholder="e.g. Price too high, quantity mismatch..."
                                rows={3}
                            />
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn-outline" onClick={() => setRejectItem(null)}>Cancel</button>
                            <button
                                className="btn-primary"
                                style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                onClick={confirmReject}
                                disabled={acting !== null}
                            >
                                {acting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editItem && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Edit Stock Item</h2>
                            <button onClick={() => setEditItem(null)}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.editGrid}>
                                <div className={styles.field}>
                                    <label>Name</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>Quantity</label>
                                    <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} min="0" />
                                </div>
                                <div className={styles.field}>
                                    <label>Unit Price (₦)</label>
                                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} min="0" />
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn-outline" onClick={() => setEditItem(null)}>Cancel</button>
                            <button className="btn-primary" onClick={confirmEdit} disabled={acting !== null}>
                                {acting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AdminStockPage;
