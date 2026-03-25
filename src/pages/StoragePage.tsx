import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    AlertTriangle,
    X,
    Package,
    Trash2,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    Camera,
    Paperclip,
    Send,
    Edit3,
    RefreshCw
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type StockItem } from '../types';
import styles from './StoragePage.module.css';

type FormData = {
    name: string;
    quantity: string;
    unitPrice: string;
    unit: string;
    minThreshold: string;
    imageUrl: string;
};

const EMPTY_FORM: FormData = { name: '', quantity: '', unitPrice: '', unit: 'units', minThreshold: '10', imageUrl: '' };

const StatusBadge = React.memo(({ status }: { status: string }) => {
    const map: Record<string, any> = {
        'PENDING_APPROVAL': { icon: <Clock size={12} />, label: 'Pending Approval', cls: styles.badgePending },
        'APPROVED': { icon: <CheckCircle2 size={12} />, label: 'Approved', cls: styles.badgeApproved },
        'REJECTED': { icon: <XCircle size={12} />, label: 'Rejected', cls: styles.badgeRejected },
    };
    const m = map[status] || { icon: <Clock size={12} />, label: status, cls: '' };
    return <span className={`${styles.statusBadge} ${m.cls}`}>{m.icon} {m.label}</span>;
});


export const StoragePage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const isAdminView = isSuperAdmin || isManager;
    const [filterStatus, setFilterStatus] = useState<'all' | string>(isAdminView ? 'PENDING_APPROVAL' : 'all');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await supabaseDataService.getAllStockItems('farm-1');
            if (!isAdminView) {
                setItems(data.filter(i => i.submittedBy === user?.id));
            } else {
                setItems(data);
            }
        } catch (err) {
            console.error('Stock load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdminView]);

    useEffect(() => {
        loadData();
        const channel = supabase
            .channel('storage-page-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    const openAddForm = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setSelectedFile(null);
        setShowForm(true);
    };

    /** Keep raw file in state for upload later */
    const handleImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) { setFormError('Please select an image file.'); return; }
        setSelectedFile(file);
        // show temp preview
        const reader = new FileReader();
        reader.onload = (e) => setForm(f => ({ ...f, imageUrl: e.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.name.trim()) { setFormError('Item name is required.'); return; }
        const qty = parseFloat(form.quantity);
        const price = parseFloat(form.unitPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('Quantity must be a positive number.'); return; }
        if (isNaN(price) || price <= 0) { setFormError('Unit price must be a positive number.'); return; }
        if (!form.imageUrl && !selectedFile && !editingItem) { setFormError('Product image is required.'); return; }

        setIsSubmitting(true);
        try {
            let uploadedUrl = editingItem?.imageUrl || '';
            if (selectedFile) {
                const newUrl = await supabaseDataService.uploadStockImage(selectedFile);
                if (newUrl) uploadedUrl = newUrl;
            }

            const payload = {
                name: form.name.trim(),
                quantity: qty,
                unitPrice: price,
                unit: form.unit || 'units',
                minThreshold: parseFloat(form.minThreshold) || 10,
                imageUrl: uploadedUrl,
                farmId: 'farm-1',
            };

            if (editingItem) {
                await supabaseDataService.updateStockItem(editingItem.id, payload, { id: user.id, name: user.name, role: user.role });
            } else {
                await supabaseDataService.submitStockItem(payload, user.id, user.name, user.role);
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            console.error(err);
            setFormError('Submission failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item: StockItem) => {
        if (!user) return;
        if (!confirm(`Permanently remove "${item.name}"? This action will be logged for Admin review.`)) return;
        const ok = await supabaseDataService.deleteStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.filter(i => i.id !== item.id));
        }
    };

    const handleApprove = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        if (!confirm(`Approve "${item.name}" for sale?`)) return;
        const ok = await supabaseDataService.approveStockItem(item.id, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'APPROVED' } : i));
        }
    };

    const handleReject = async (item: StockItem) => {
        if (!user || !isAdminView) return;
        const comment = prompt(`Reason for rejecting "${item.name}":`, 'Price too high');
        if (comment === null) return;
        const ok = await supabaseDataService.rejectStockItem(item.id, comment, { id: user.id, name: user.name, role: user.role });
        if (ok) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'REJECTED', rejectionComment: comment } : i));
        }
    };

    const handleOpenEdit = (item: StockItem) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            unit: item.unit,
            minThreshold: String(item.minThreshold),
            imageUrl: item.imageUrl || ''
        });
        setFormError('');
        setShowForm(true);
    };


    const filtered = useMemo(() => {
        return items.filter(i => {
            const matchSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchStatus = filterStatus === 'all' || i.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [items, debouncedSearch, filterStatus]);


    const counts = useMemo(() => ({
        PENDING_APPROVAL: items.filter(i => i.status === 'PENDING_APPROVAL').length,
        APPROVED: items.filter(i => i.status === 'APPROVED').length,
        REJECTED: items.filter(i => i.status === 'REJECTED').length,
    }), [items]);

    if (isLoading && items.length === 0) {
        return (
            <Layout title="Stock Submissions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Skeleton height={80} borderRadius={20} />
                    <Skeleton height={300} borderRadius={20} />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Stock Submissions">
            <div className={styles.container}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.titleArea}>
                        <h1>Stock <span style={{ color: 'var(--color-primary)' }}>Submissions</span></h1>
                        <p>
                            {isAdminView
                                ? 'All submitted stock items across all staff.'
                                : 'Submit new items for admin approval before they go live.'
                            }
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.refreshBtn} onClick={loadData}><RefreshCw size={18} /></button>
                        {!isAdminView && (
                            <button className="btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={openAddForm}>
                                <Plus size={18} /> Submit New Item
                            </button>
                        )}
                    </div>
                </header>

                {/* Summary Pills */}
                <div className={styles.summaryRow}>
                    {[
                        { key: 'all', label: 'All', count: items.length, color: 'var(--color-text-secondary)' },
                        { key: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL, color: 'var(--color-warning)' },
                        { key: 'APPROVED', label: 'Approved', count: counts.APPROVED, color: 'var(--color-success)' },
                        { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED, color: 'var(--color-danger)' },
                    ].map(pill => (
                        <button
                            key={pill.key}
                            className={`${styles.pill} ${filterStatus === pill.key ? styles.pillActive : ''}`}
                            onClick={() => setFilterStatus(pill.key as any)}
                            style={filterStatus === pill.key ? { borderColor: pill.color, color: pill.color } : {}}
                        >
                            <span className={styles.pillCount} style={filterStatus === pill.key ? { background: pill.color } : {}}>{pill.count}</span>
                            {pill.label}
                        </button>
                    ))}
                    <div className={styles.searchBar} style={{ marginLeft: 'auto' }}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className={`${styles.tableWrapper} card`} style={{ padding: 0, overflow: 'hidden' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty / Unit</th>
                                <th>Unit Price</th>
                                {isAdminView && <th>Submitted By</th>}
                                <th>Status</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdminView ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                                        <Package size={40} opacity={0.2} style={{ marginBottom: '12px' }} />
                                        <p>No submissions found.</p>
                                    </td>
                                </tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className={styles.tableRow}>
                                    <td>
                                        <div className={styles.itemCell}>
                                            {item.imageUrl
                                                ? <img src={item.imageUrl} alt={item.name} className={styles.itemThumb} />
                                                : <div className={styles.itemThumbPlaceholder}><Package size={18} /></div>
                                            }
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <strong>{item.name}</strong>
                                                {!isAdminView && <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>ID: {item.id.slice(0, 8)}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{item.quantity.toLocaleString()} <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>{item.unit}</span></td>
                                    <td>₦{item.unitPrice.toLocaleString()}</td>
                                    {isAdminView && <td style={{ fontSize: '13px' }}>{item.submittedByName || '—'}</td>}
                                    <td>
                                        <StatusBadge status={item.status} />
                                        {item.status === 'REJECTED' && item.rejectionComment && (
                                            <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px', maxWidth: '160px' }}>
                                                "{item.rejectionComment}"
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                        {new Date(item.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                                <>
                                                    <button className={styles.approveBtn} onClick={() => handleApprove(item)} title="Approve">
                                                        <CheckCircle2 size={15} />
                                                    </button>
                                                    <button className={styles.rejectBtn} onClick={() => handleReject(item)} title="Reject">
                                                        <XCircle size={15} />
                                                    </button>
                                                </>
                                            )}
                                            {isAdminView && (
                                                <button className={styles.editBtn} onClick={() => handleOpenEdit(item)} title="Edit">
                                                    <Edit3 size={15} />
                                                </button>
                                            )}
                                            {(isAdminView || (item.status === 'PENDING_APPROVAL' && item.submittedBy === user?.id)) && (
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(item)} title="Delete">
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Grid View */}
                <div className={styles.mobileGrid}>
                    {filtered.length === 0 ? (
                        <div className={styles.emptyMobile}>
                            <Package size={48} opacity={0.1} />
                            <p>No items found</p>
                        </div>
                    ) : filtered.map(item => (
                        <div key={item.id} className={styles.mobileCard}>
                            <div className={styles.mobileCardHeader}>
                                <div className={styles.itemCell}>
                                    {item.imageUrl
                                        ? <img src={item.imageUrl} alt={item.name} className={styles.itemThumb} />
                                        : <div className={styles.itemThumbPlaceholder}><Package size={18} /></div>
                                    }
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ fontSize: '16px' }}>{item.name}</strong>
                                        <div style={{ marginTop: '4px' }}><StatusBadge status={item.status} /></div>
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    {isAdminView && item.status === 'PENDING_APPROVAL' && (
                                        <>
                                            <button className={styles.approveBtn} onClick={() => handleApprove(item)} title="Approve">
                                                <CheckCircle2 size={15} />
                                            </button>
                                            <button className={styles.rejectBtn} onClick={() => handleReject(item)} title="Reject">
                                                <XCircle size={15} />
                                            </button>
                                        </>
                                    )}
                                    {isAdminView && (
                                        <button className={styles.editBtn} onClick={() => handleOpenEdit(item)} title="Edit">
                                            <Edit3 size={15} />
                                        </button>
                                    )}
                                    {(isAdminView || (item.status === 'PENDING_APPROVAL' && item.submittedBy === user?.id)) && (
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(item)} title="Delete">
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.mobileCardContent}>
                                <div className={styles.mobileCardLabel}>
                                    <span>Quantity</span>
                                    <span>{item.quantity} {item.unit}</span>
                                </div>
                                <div className={styles.mobileCardLabel}>
                                    <span>Unit Price</span>
                                    <span>₦{item.unitPrice.toLocaleString()}</span>
                                </div>
                                {isAdminView && (
                                    <div className={styles.mobileCardLabel} style={{ gridColumn: '1 / -1' }}>
                                        <span>Submitted By</span>
                                        <span>{item.submittedByName || 'Unknown Staff'}</span>
                                    </div>
                                )}
                                <div className={styles.mobileCardLabel} style={{ gridColumn: '1 / -1' }}>
                                    <span>Submitted Date</span>
                                    <span>{new Date(item.lastUpdated).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {item.status === 'REJECTED' && item.rejectionComment && (
                                <div className={styles.rejectionNotice}>
                                    <AlertTriangle size={14} />
                                    <span>Admin Feedback: "{item.rejectionComment}"</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>

            {/* Add / Edit Modal */}
            {showForm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingItem ? 'Edit Submission' : 'Submit New Stock Item'}</h2>
                            <button onClick={() => setShowForm(false)} className={styles.closeModal}><X size={22} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {formError && (
                                <div className={styles.formError}>
                                    <AlertTriangle size={16} /> {formError}
                                </div>
                            )}
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>ITEM NAME *</label>
                                    <input type="text" placeholder="e.g. Live Broiler Chicken" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>QUANTITY *</label>
                                    <input type="number" min="0" step="0.01" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>UNIT *</label>
                                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                        {['units', 'kg', 'g', 'crates', 'bags', 'birds', 'packs', 'litres'].map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>UNIT PRICE (₦) *</label>
                                    <input type="number" min="0" step="0.01" placeholder="0.00" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>LOW STOCK THRESHOLD</label>
                                    <input type="number" min="0" placeholder="10" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
                                </div>
                                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>PRODUCT PHOTO (Optional)</label>
                                    <div className={styles.imagePickerRow}>
                                        {/* Hidden file inputs */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                                        />
                                        <input
                                            ref={cameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                                        />
                                        {/* Attach button */}
                                        <button
                                            type="button"
                                            className={styles.imagePickerBtn}
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Attach photo from gallery"
                                        >
                                            <Paperclip size={16} />
                                            Attach Photo
                                        </button>
                                        {/* Camera button */}
                                        <button
                                            type="button"
                                            className={styles.imagePickerBtn}
                                            onClick={() => cameraInputRef.current?.click()}
                                            title="Snap photo with camera"
                                        >
                                            <Camera size={16} />
                                            Take Photo
                                        </button>
                                        {/* Clear button */}
                                        {form.imageUrl && (
                                            <button
                                                type="button"
                                                className={styles.imageClearBtn}
                                                onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                                                title="Remove photo"
                                            >
                                                <X size={14} /> Remove
                                            </button>
                                        )}
                                    </div>
                                    {form.imageUrl && (
                                        <div className={styles.imagePreviewWrap}>
                                            <img
                                                src={form.imageUrl}
                                                alt="Preview"
                                                className={styles.imagePreview}
                                                onError={e => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.submissionNotice}>
                                <Send size={16} />
                                <p>This item will be sent to the admin for review before it appears in the Sales Terminal.</p>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : <><Send size={16} /> {editingItem ? 'Update Submission' : 'Submit for Approval'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default StoragePage;
