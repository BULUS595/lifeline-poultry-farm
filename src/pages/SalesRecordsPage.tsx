import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search, Download, TrendingUp, Calendar,
    Filter, X, User, ShoppingBag, MapPin, Receipt, Package, CheckCircle2,
    DollarSign, ArrowUpRight, ArrowDownRight, Printer, Clock, SearchIcon,
    ArrowUpDown,
    DownloadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type RetailSale, type StockItem } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const SalesRecordsPage: React.FC = () => {
    const { isSuperAdmin, isManager } = useAuth();
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [staffDict, setStaffDict] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payMethodFilter, setPayMethodFilter] = useState('');
    const [staffFilter, setStaffFilter] = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc'>('date_desc');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
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

    useEffect(() => { loadData(); }, [loadData]);

    const unrolledRecords = useMemo(() => {
        const records: any[] = [];
        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            const salespersonName = staffDict[sale.salespersonId] || 'Unknown Staff';
            let safeItems = Array.isArray(sale.items) ? sale.items : [];
            if (typeof sale.items === 'string') { try { safeItems = JSON.parse(sale.items); } catch(e) {} }
            safeItems.forEach(item => {
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
                    paymentStatus: 'Paid'
                });
            });
        });
        return records;
    }, [sales, stockItems, staffDict]);

    const filteredRecords = useMemo(() => {
        let result = unrolledRecords.filter(r => {
            const matchesSearch = (r.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (r.receiptNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStaff = staffFilter ? r.salespersonId === staffFilter : true;
            const matchesPay = payMethodFilter ? r.paymentMethod === payMethodFilter : true;
            let matchesDate = true;
            if (dateFrom) matchesDate = matchesDate && r.date >= new Date(dateFrom);
            if (dateTo) { const toDate = new Date(dateTo); toDate.setHours(23, 59, 59, 999); matchesDate = matchesDate && r.date <= toDate; }
            return matchesSearch && matchesStaff && matchesPay && matchesDate;
        });
        if (sortBy === 'date_desc') result.sort((a, b) => b.date.getTime() - a.date.getTime());
        else if (sortBy === 'date_asc') result.sort((a, b) => a.date.getTime() - b.date.getTime());
        else if (sortBy === 'amount_desc') result.sort((a, b) => b.totalAmount - a.totalAmount);
        return result;
    }, [unrolledRecords, searchTerm, staffFilter, payMethodFilter, dateFrom, dateTo, sortBy]);

    const stats = useMemo(() => {
        const revenue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
        const txCount = new Set(filteredRecords.map(r => r.receiptNumber)).size;
        const volume = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
        const today = new Date().toLocaleDateString();
        const todayRev = filteredRecords.filter(r => r.date.toLocaleDateString() === today).reduce((sum, r) => sum + r.totalAmount, 0);
        return { revenue, txCount, volume, todayRev };
    }, [filteredRecords]);

    const handleExportCSV = () => {
        if (filteredRecords.length === 0) return;
        const headers = ['Receipt', 'Date', 'Product', 'Qty', 'Price', 'Total', 'Payment', 'Staff'];
        const rows = filteredRecords.map(r => [r.receiptNumber, r.date.toLocaleString(), r.productName, r.quantity, r.unitPrice, r.totalAmount, r.paymentMethod, r.salespersonName]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const uniqueStaff = useMemo(() => {
        const ids = [...new Set(unrolledRecords.map(r => r.salespersonId))];
        return ids.map(id => ({ id, name: staffDict[id] || 'Unknown' }));
    }, [unrolledRecords, staffDict]);

    const isAdmin = isSuperAdmin || isManager;
    if (!isAdmin) return (
      <div className="h-[60vh] flex flex-col items-center justify-center opacity-50 space-y-4">
         <div className="p-6 bg-rose-500/10 rounded-full text-rose-500"><XCircle size={48} /></div>
         <h2 className="text-2xl font-black uppercase tracking-tight italic">Access Denied</h2>
         <p className="max-w-xs text-center font-medium">Only administrators can access the fiscal archives.</p>
      </div>
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic">Fiscal <span className="text-primary italic underline">Archives</span></h1>
                   <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Consolidated audit trail of all products sold</p>
                </div>
                <Button size="lg" className="rounded-2xl px-8 shadow-glow" onClick={handleExportCSV} leftIcon={DownloadCloud}>
                   Export Dataset
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                   { label: 'Dataset Revenue', value: stats.revenue, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
                   { label: 'Transactions', value: stats.txCount, icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                   { label: "Today's Yield", value: stats.todayRev, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                   { label: 'Volume Sold', value: stats.volume, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10', isNum: true }
                 ].map((stat, i) => (
                   <Card key={i} className="relative overflow-hidden group">
                      <div className="flex justify-between items-start">
                         <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}><stat.icon size={20} strokeWidth={2.5} /></div>
                         <div className="w-12 h-1 bg-muted/30 rounded-full" />
                      </div>
                      <div className="mt-5">
                         <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                         <h3 className="text-2xl font-black tracking-tighter mt-1">{stat.isNum ? '' : '₦'}{stat.value.toLocaleString()}</h3>
                      </div>
                   </Card>
                 ))}
            </div>

            {/* Filters */}
            <Card className="rounded-[40px] p-2" noPadding>
                <div className="p-4 flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full flex items-center gap-4">
                        <div className="relative flex-1">
                             <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                             <input type="text" placeholder="Search receipt or product..." className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium text-sm transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex bg-muted/50 p-1 rounded-2xl border border-border shrink-0">
                           <button onClick={() => setSortBy('date_desc')} className={`p-2 rounded-xl transition-all ${sortBy === 'date_desc' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}><ArrowUpDown size={18} /></button>
                           <button className="p-2 text-muted-foreground"><Filter size={18} /></button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        <input type="date" className="px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs font-bold outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <input type="date" className="px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs font-bold outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        <select className="px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs font-bold outline-none" value={payMethodFilter} onChange={e => setPayMethodFilter(e.target.value)}>
                            <option value="">All Tenders</option>
                            {['cash', 'transfer', 'pos'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                        </select>
                        <select className="px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs font-bold outline-none" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                            <option value="">All Personnel</option>
                            {uniqueStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Data Table */}
            <Card noPadding className="overflow-hidden rounded-[40px] border-border/50">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Transaction</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Product Detail</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Velocity</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fiscal Impact</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Authentication</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Personnel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="group hover:bg-muted/20 transition-all">
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg w-fit mb-1.5">#{record.receiptNumber}</span>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock size={12} />
                                                <span className="text-[10px] font-bold uppercase">{record.date.toLocaleDateString()} {record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted/40 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center shrink-0">
                                                {record.productImage ? <img src={record.productImage} className="w-full h-full object-cover" /> : <Package size={16} className="text-muted-foreground/30" />}
                                            </div>
                                            <span className="font-bold text-sm tracking-tight truncate max-w-[140px]">{record.productName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 text-center">
                                         <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border text-xs font-black italic">×{record.quantity}</span>
                                    </td>
                                    <td className="px-6">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black tracking-tighter italic">₦{record.totalAmount.toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest">₦{record.unitPrice.toLocaleString()} / UNIT</span>
                                        </div>
                                    </td>
                                    <td className="px-6">
                                        <div className="flex flex-col gap-1.5">
                                             <div className="flex items-center gap-1.5 text-emerald-500">
                                                <CheckCircle2 size={12} strokeWidth={3} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">VERIFIED</span>
                                             </div>
                                             <div className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border border-border w-fit ${record.paymentMethod === 'cash' ? 'text-emerald-600' : record.paymentMethod === 'pos' ? 'text-blue-600' : 'text-amber-600'}`}>
                                                {record.paymentMethod}
                                             </div>
                                        </div>
                                    </td>
                                    <td className="px-6 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-border flex items-center justify-center text-[10px] font-black uppercase">{record.salespersonName?.slice(0, 2)}</div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold leading-none">{record.salespersonName}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Served {record.customerName}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

import { XCircle, Wallet } from 'lucide-react';

export default SalesRecordsPage;
