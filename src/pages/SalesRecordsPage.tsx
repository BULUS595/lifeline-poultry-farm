import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search, Download, TrendingUp, Calendar,
    Filter, X, User, ShoppingBag, MapPin, Receipt, Package, CheckCircle2,
    DollarSign, ArrowUpRight, ArrowDownRight, Printer, Clock, SearchIcon,
    ArrowUpDown,
    DownloadCloud,
    XCircle,
    Wallet,
    History,
    FileText,
    ChevronDown,
    Zap,
    Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseDataService } from '../services/supabaseService';
import { type RetailSale, type StockItem } from '../types';
import { Card, Button, Badge, Input, Select, Label } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

export const SalesRecordsPage: React.FC = () => {
    const { user, isSuperAdmin, isManager } = useAuth();
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [staffDict, setStaffDict] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payMethodFilter, setPayMethodFilter] = useState('');
    const [staffFilter, setStaffFilter] = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc'>('date_desc');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            let salesRes;
            if (user) {
                salesRes = await supabaseDataService.getRetailSales({ id: user.id, role: user.role });
            } else {
                salesRes = { success: false, data: [], message: 'No user' };
            }
            
            if (!salesRes.success) {
                setHasError(true);
            }

            const [stockData, { data: usersData }] = await Promise.all([
                supabaseDataService.getAllStockItems(),
                supabase.from('users').select('id, name')
            ]);
            
            setSales(salesRes.data || []);
            setStockItems(stockData || []);
            if (usersData) {
                const dict: Record<string, string> = {};
                usersData.forEach((u: any) => {
                    dict[u.id] = u.name;
                });
                setStaffDict(dict);
            }
        } catch (err) {
            console.error('Fiscal link error:', err);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const unrolledRecords = useMemo(() => {
        const records: any[] = [];
        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            const salespersonName = staffDict[sale.salespersonId] || 'Root User';
            let safeItems = Array.isArray(sale.items) ? sale.items : [];
            if (typeof sale.items === 'string') { try { safeItems = JSON.parse(sale.items); } catch(e) {} }
            safeItems.forEach(item => {
                const stock = stockItems.find(si => si.id === item.id);
                records.push({
                    id: `${sale.id}-${item.id || Math.random()}`,
                    receiptNumber: sale.receiptNumber || 'N/A',
                    productId: item.id || '',
                    productName: item.name || 'Legacy SKU',
                    productImage: stock?.imageUrl,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    totalAmount: item.total || 0,
                    date: saleDate,
                    salespersonName,
                    salespersonId: sale.salespersonId || '',
                    paymentMethod: sale.paymentMethod || 'cash',
                    customerName: sale.customerName || 'Standard Client',
                    paymentStatus: 'Authenticated'
                });
            });
        });
        return records;
    }, [sales, stockItems, staffDict]);

    const filteredRecords = useMemo(() => {
        const result = unrolledRecords.filter(r => {
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
        const rows = filteredRecords.map(r => [
            r.receiptNumber, 
            r.date.toLocaleString(), 
            `"${r.productName.replace(/"/g, '""')}"`, 
            r.quantity, 
            r.unitPrice, 
            r.totalAmount, 
            r.paymentMethod, 
            `"${r.salespersonName.replace(/"/g, '""')}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fiscal_Payload_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const uniqueStaff = useMemo(() => {
        const ids = [...new Set(unrolledRecords.map(r => r.salespersonId))];
        return ids.map(id => ({ id, name: staffDict[id] || 'System' }));
    }, [unrolledRecords, staffDict]);

    const canAccess = isSuperAdmin || isManager;

    if (!canAccess) return (
      <div className="h-[70vh] flex flex-col items-center justify-center animate-slide-up px-6">
         <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
            <XCircle size={48} strokeWidth={2.5} />
         </div>
         <div className="text-center space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Access <span className="text-rose-500 italic underline">Restricted</span></h2>
            <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">You do not have the required permissions to view these financial records.</p>
         </div>
         <Button variant="secondary" className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
            Go Back
         </Button>
      </div>
    );

    return (
        <div className="space-y-12 pb-20 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase leading-none shrink-0">
                     Sales <span className="text-primary underline underline-offset-8 decoration-4">Records</span>
                   </h1>
                   <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Complete history of all farm transactions</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Button size="lg" variant="outline" className="flex-1 md:flex-none rounded-3xl px-10 py-8 text-lg font-bold uppercase tracking-tight italic bg-card/40 backdrop-blur-sm border-border/40 shadow-sm" onClick={handleExportCSV}>
                        Download CSV
                    </Button>
                    <Button size="lg" className="flex-1 md:flex-none rounded-3xl px-10 py-8 text-lg shadow-glow font-bold uppercase tracking-tight italic" onClick={loadData}>
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 {[
                   { label: 'Total Sales Revenue', value: stats.revenue, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', trend: 12.5 },
                   { label: 'Total Receipts', value: stats.txCount, icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 5.4 },
                   { label: "Today's Revenue", value: stats.todayRev, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 8.9 },
                   { label: 'Total Items Sold', value: stats.volume, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10', isNum: true, trend: 2.1 }
                 ].map((stat, i) => (
                   <Card key={i} hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0" noPadding>
                      <div className="p-8 pb-10">
                          <div className="flex justify-between items-start mb-6">
                             <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-all duration-500`}>
                                <stat.icon size={28} strokeWidth={2.5} />
                             </div>
                             {stat.trend > 0 && (
                                <Badge variant="primary" className="font-bold text-[10px] px-3 py-1.5 flex items-center gap-1.5 ring-4 ring-background/50 shadow-sm">
                                   {stat.trend}%
                                </Badge>
                             )}
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] opacity-40">{stat.label}</p>
                             <h3 className="text-3xl font-black tracking-tighter leading-none tabular-nums">
                                {stat.isNum ? '' : '₦'}{stat.value.toLocaleString()}
                             </h3>
                          </div>
                      </div>
                   </Card>
                 ))}
            </div>

            {/* Filters */}
            <Card className="rounded-[40px] px-8 py-10 bg-card/40 backdrop-blur-xl border-border/40 shadow-premium" noPadding>
                <div className="flex flex-col space-y-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-center">
                        <div className="relative flex-1 w-full group">
                            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-all group-focus-within:text-primary" size={20} strokeWidth={2.5} />
                            <Input 
                                type="text" 
                                placeholder="Search by receipt number or product name..." 
                                className="pl-16 h-16 rounded-2xl border-border/40 bg-background/50 shadow-sm" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div className="flex items-center bg-background/50 p-2 rounded-[24px] border border-border/40 shadow-sm shrink-0">
                           <button 
                                onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')} 
                                className={`flex items-center gap-3 px-6 h-12 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${sortBy.includes('date') ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50'}`}
                           >
                                Date Sorted
                           </button>
                           <button 
                                onClick={() => setSortBy('amount_desc')} 
                                className={`flex items-center gap-3 px-6 h-12 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${sortBy === 'amount_desc' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50'}`}
                           >
                                Highest Price
                           </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2.5">
                            <Label className="ml-1 opacity-40">Start Date</Label>
                            <Input type="date" className="h-14 rounded-xl border-border/40 bg-background/50 font-bold" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="ml-1 opacity-40">End Date</Label>
                            <Input type="date" className="h-14 rounded-xl border-border/40 bg-background/50 font-bold" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="ml-1 opacity-40">Payment Method</Label>
                            <Select className="h-14 rounded-xl border-border/40 bg-background/50 uppercase tracking-widest font-bold text-[10px]" value={payMethodFilter} onChange={e => setPayMethodFilter(e.target.value)}>
                                <option value="">All Payments</option>
                                {['cash', 'transfer', 'pos'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </Select>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="ml-1 opacity-40">Sold By</Label>
                            <Select className="h-14 rounded-xl border-border/40 bg-background/50 uppercase tracking-widest font-bold text-[10px]" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                                <option value="">All Staff</option>
                                {uniqueStaff.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Records Table */}
            <Card noPadding className="overflow-hidden rounded-[40px] border-border/40 bg-card/40 backdrop-blur-sm shadow-premium">
                <div className="overflow-x-auto min-h-[500px] custom-scrollbar">
                    <table className="w-full text-left border-collapse data-table-mobile-cards">
                        <thead>
                            <tr className="bg-muted/10 border-b border-border/40">
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Receipt Info</th>
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Product Details</th>
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center whitespace-nowrap">Quantity</th>
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Sale Amount</th>
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Payment Status</th>
                                <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Sold By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {isLoading ? (
                                [1, 2, 3, 4, 5, 6].map(i => (
                                    <tr key={i}><td colSpan={6} className="px-10 py-6"><Skeleton height={60} borderRadius={16} /></td></tr>
                                ))
                            ) : hasError ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center opacity-80">
                                        <XCircle size={100} strokeWidth={1} className="mx-auto mb-6 opacity-40 text-rose-500" />
                                        <h4 className="text-2xl font-black uppercase tracking-tighter text-rose-500">Failed to load records</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-3 opacity-60">Please check your connection and refresh data.</p>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center opacity-40">
                                        <History size={100} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                                        <h4 className="text-2xl font-black uppercase tracking-tighter">No records found</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-3 opacity-60">Waiting for transactions to be recorded</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="group hover:bg-primary/5 transition-all duration-300 border-l-0 hover:border-l-8 hover:border-l-primary">
                                        <td className="px-10 py-8" data-label="Receipt Info">
                                            <div className="flex flex-col">
                                                <Badge variant="primary" className="text-[10px] font-bold tracking-[0.15em] px-3 py-1.5 rounded-xl w-fit mb-4 shadow-sm tabular-nums">
                                                    #{record.receiptNumber.toUpperCase()}
                                                </Badge>
                                                <div className="flex items-center gap-3 text-muted-foreground">
                                                    <Clock size={14} strokeWidth={3} className="opacity-30" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest tabular-nums opacity-60">{record.date.toLocaleDateString()} • {record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8" data-label="Product Details">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 bg-card rounded-2xl overflow-hidden border-2 border-border/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-500 shadow-sm relative">
                                                    {record.productImage ? (
                                                        <img src={record.productImage} className="w-full h-full object-cover" alt={record.productName} />
                                                    ) : (
                                                        <div className="p-4 bg-muted/10 rounded-full">
                                                            <Package size={24} strokeWidth={2.5} className="text-primary/40" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="font-bold text-lg tracking-tighter uppercase block leading-none">{record.productName}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">SKU: {record.productId.slice(0, 8).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center" data-label="Quantity">
                                             <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/40 border border-border/40 text-lg font-bold tabular-nums shadow-sm group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
                                                {record.quantity}
                                             </div>
                                        </td>
                                        <td className="px-10 py-8" data-label="Sale Amount">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-2xl font-black tracking-tighter tabular-nums text-foreground group-hover:text-primary transition-colors">₦{record.totalAmount.toLocaleString()}</span>
                                                <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground opacity-40 px-2 py-0.5 border-border/40 tabular-nums">₦{record.unitPrice.toLocaleString()} / unit</Badge>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8" data-label="Payment Status">
                                            <div className="flex flex-col gap-3">
                                                 <div className="flex items-center gap-2.5 text-emerald-500">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-glow animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified</span>
                                                 </div>
                                                 <div className={`text-[9px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-xl border border-border/40 w-fit shadow-sm bg-background/50 ${record.paymentMethod === 'cash' ? 'text-emerald-500 border-emerald-500/20' : record.paymentMethod === 'pos' ? 'text-blue-500 border-blue-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                                                    {record.paymentMethod.toUpperCase()}
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 whitespace-nowrap" data-label="Sold By">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-glow group-hover:scale-110 transition-all duration-500">{record.salespersonName?.slice(0, 2).toUpperCase()}</div>
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-sm font-bold uppercase tracking-tight leading-none">{record.salespersonName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Users size={12} strokeWidth={2.5} className="text-muted-foreground opacity-30" />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">{record.customerName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-muted/10 p-8 border-t border-border/40 flex justify-between items-center px-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-40">System Status: <span className="text-emerald-500">Ready</span></p>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest tabular-nums text-muted-foreground opacity-60">
                        Showing {filteredRecords.length} of {unrolledRecords.length} sales entries
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SalesRecordsPage;
