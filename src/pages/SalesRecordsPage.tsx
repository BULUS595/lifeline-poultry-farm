import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search, Download, TrendingUp, Calendar,
    Filter, X, User, ShoppingBag, MapPin, Receipt, Package, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type RetailSale, type StockItem } from '../types';
import styles from './SalesRecordsPage.module.css';

export const SalesRecordsPage: React.FC = () => {
    const { isSuperAdmin, isManager } = useAuth();
    
    // Data states
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [staffDict, setStaffDict] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payMethodFilter, setPayMethodFilter] = useState('');
    const [staffFilter, setStaffFilter] = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc'>('date_desc');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch sales, stock images, and users in parallel
            const [salesData, stockData, { data: usersData }] = await Promise.all([
                supabaseDataService.getRetailSales(),
                supabaseDataService.getAllStockItems(),
                supabase.from('users').select('id, name')
            ]);
            
            setSales(salesData);
            setStockItems(stockData);
            
            if (usersData) {
                const sDict: Record<string, string> = {};
                usersData.forEach(u => sDict[u.id] = u.name);
                setStaffDict(sDict);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Ensure only Admins can view this route.
    if (!isSuperAdmin && !isManager) {
        return (
            <Layout title="Unauthorized">
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
                    <h2>Unauthorized Access</h2>
                    <p>You do not have permission to view the Sales Records module.</p>
                </div>
            </Layout>
        );
    }

    // Unroll transactions into individual item-level records for the table
    // A single receipt may contain 3 products. This makes 3 rows, matching user requirement:
    // "Transaction ID, Product Name, Product Image, Quantity Sold..."
    const unrolledRecords = useMemo(() => {
        const records: any[] = [];
        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            const salespersonName = staffDict[sale.salespersonId] || 'Unknown Staff';
            
            let safeItems = Array.isArray(sale.items) ? sale.items : [];
            if (typeof sale.items === 'string') {
                try { safeItems = JSON.parse(sale.items); } catch(e) {}
            }

            safeItems.forEach(item => {
                // Find image url
                const stock = stockItems.find(si => si.id === item.id);
                
                records.push({
                    id: `${sale.id}-${item.id || Math.random()}`,
                    receiptNumber: sale.receiptNumber || 'N/A',
                    productId: item.id || '',
                    productName: item.name || 'Unknown Item',
                    productImage: stock?.imageUrl,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    totalAmount: item.total || 0,
                    date: saleDate,
                    salespersonName,
                    salespersonId: sale.salespersonId || '',
                    paymentMethod: sale.paymentMethod || 'cash',
                    customerName: sale.customerName || 'Walk-in',
                    // Assuming all completed retail_sales are Paid.
                    paymentStatus: 'Paid'
                });
            });
        });
        return records;
    }, [sales, stockItems, staffDict]);

    const filteredRecords = useMemo(() => {
        let result = unrolledRecords.filter(r => {
            const safeName = r.productName || '';
            const safeReceipt = r.receiptNumber || '';
            
            const matchesSearch = 
                safeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                safeReceipt.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStaff = staffFilter ? r.salespersonId === staffFilter : true;
            const matchesPay = payMethodFilter ? r.paymentMethod === payMethodFilter : true;
            
            let matchesDate = true;
            if (dateFrom) matchesDate = matchesDate && r.date >= new Date(dateFrom);
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && r.date <= toDate;
            }
            
            return matchesSearch && matchesStaff && matchesPay && matchesDate;
        });

        if (sortBy === 'date_desc') result.sort((a, b) => b.date.getTime() - a.date.getTime());
        else if (sortBy === 'date_asc') result.sort((a, b) => a.date.getTime() - b.date.getTime());
        else if (sortBy === 'amount_desc') result.sort((a, b) => b.totalAmount - a.totalAmount);

        return result;
    }, [unrolledRecords, searchTerm, staffFilter, payMethodFilter, dateFrom, dateTo, sortBy]);

    // STATS
    const totalRevenue = useMemo(() => filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0), [filteredRecords]);
    const totalItemsSold = useMemo(() => filteredRecords.reduce((sum, r) => sum + r.quantity, 0), [filteredRecords]);
    
    // Distinct transactions count in filtered subset
    const totalTransactions = useMemo(() => new Set(filteredRecords.map(r => r.receiptNumber)).size, [filteredRecords]);
    
    const todaysSales = useMemo(() => {
        const todayStr = new Date().toLocaleDateString();
        return filteredRecords
            .filter(r => r.date.toLocaleDateString() === todayStr)
            .reduce((sum, r) => sum + r.totalAmount, 0);
    }, [filteredRecords]);

    const handleExportCSV = () => {
        if (filteredRecords.length === 0) return alert('No data to export.');
        const headers = ['Receipt #', 'Date & Time', 'Product', 'Qty', 'Unit Price', 'Total', 'Payment', 'Status', 'Customer', 'Staff'];
        const rows = filteredRecords.map(r => [
            r.receiptNumber || 'N/A',
            `${r.date.toLocaleDateString()} ${r.date.toLocaleTimeString()}`,
            `"${(r.productName || '').replace(/"/g, '""')}"`,
            r.quantity,
            r.unitPrice,
            r.totalAmount,
            (r.paymentMethod || 'cash').toUpperCase(),
            r.paymentStatus,
            `"${(r.customerName || '').replace(/"/g, '""')}"`,
            `"${(r.salespersonName || '').replace(/"/g, '""')}"`
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales_Records_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Extract unique staff lists for dropdown
    const uniqueStaff = useMemo(() => {
        const ids = [...new Set(unrolledRecords.map(r => r.salespersonId))];
        return ids.map(id => ({ id, name: staffDict[id] || 'Unknown' }));
    }, [unrolledRecords, staffDict]);

    return (
        <Layout title="Transactions">
            <div className={styles.page}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.title}>Sales <span style={{ color: 'var(--color-primary)' }}>Records</span></h1>
                        <p className={styles.subtitle}>Detailed history of all products sold across the farm.</p>
                    </div>
                    <button className={styles.exportBtn} onClick={handleExportCSV}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                {/* SUMMARY STATS */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(26, 188, 156, 0.1)', color: 'var(--color-primary)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Filtered Revenue</span>
                            <strong>₦{totalRevenue.toLocaleString()}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Receipt size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Transactions</span>
                            <strong>{totalTransactions}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <Calendar size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Today's Sales</span>
                            <strong>₦{todaysSales.toLocaleString()}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <ShoppingBag size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Items Sold</span>
                            <strong>{totalItemsSold.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>

                {/* FILTERS SECTION (Sticky Header logic done via CSS) */}
                <div className={styles.filtersSection}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search product or receipt..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className={styles.clearBtn}><X size={14} /></button>}
                    </div>
                    
                    <div className={styles.filterGroup}>
                        <label>From:</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={styles.filterInput} />
                    </div>
                    
                    <div className={styles.filterGroup}>
                        <label>To:</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={styles.filterInput} />
                    </div>

                    <div className={styles.filterGroup}>
                        <select className={styles.filterSelect} value={payMethodFilter} onChange={e => setPayMethodFilter(e.target.value)}>
                            <option value="">All Payment Types</option>
                            <option value="cash">Cash</option>
                            <option value="transfer">Transfer</option>
                            <option value="pos">P.O.S</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <select className={styles.filterSelect} value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                            <option value="">All Staff</option>
                            {uniqueStaff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                            <option value="date_desc">Latest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="amount_desc">Amount (High to Low)</option>
                        </select>
                    </div>
                </div>

                {/* TABLE SECTION */}
                <div className={`${styles.tableWrap} card`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Transaction</th>
                                <th>Product</th>
                                <th>Price & Qty</th>
                                <th>Total Amt</th>
                                <th>Staff & Customer</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)' }}>Loading records...</p>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        <Filter size={40} opacity={0.15} />
                                        <p>No transactions found matching your criteria</p>
                                    </td>
                                </tr>
                            ) : filteredRecords.map((record) => (
                                <tr key={record.id} className={styles.row}>
                                    <td className={styles.txCell}>
                                        <div className={styles.receiptTag}>#{record.receiptNumber}</div>
                                        <span className={styles.txDate}>{record.date.toLocaleDateString()}</span>
                                        <span className={styles.txTime}>{record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    
                                    <td>
                                        <div className={styles.productCell}>
                                            {record.productImage ? (
                                                <img src={record.productImage} className={styles.productImg} alt="" />
                                            ) : (
                                                <div className={styles.productImgPlaceholder}><Package size={16} /></div>
                                            )}
                                            <span className={styles.productName}>{record.productName}</span>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <div className={styles.qtyCell}>
                                            <span className={styles.unitPrice}>₦{record.unitPrice.toLocaleString()}</span>
                                            <span className={styles.qtyTag}>× {record.quantity}</span>
                                        </div>
                                    </td>
                                    
                                    <td className={styles.totalCell}>
                                        ₦{record.totalAmount.toLocaleString()}
                                    </td>
                                    
                                    <td>
                                        <div className={styles.peopleCell}>
                                            <div className={styles.personRow} title="Staff">
                                                <User size={12} /> {record.salespersonName}
                                            </div>
                                            <div className={styles.personRow} title="Customer" style={{ color: 'var(--color-text-tertiary)' }}>
                                                <MapPin size={12} /> {record.customerName}
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <div className={styles.statusCell}>
                                            <span className={styles.payStatusBadge}>
                                                <CheckCircle2 size={12} /> {record.paymentStatus}
                                            </span>
                                            <span className={`${styles.payMethodBadge} ${styles['pay_' + (record.paymentMethod || 'cash')]}`}>
                                                {(record.paymentMethod || 'cash').toUpperCase()}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </Layout>
    );
};

export default SalesRecordsPage;
