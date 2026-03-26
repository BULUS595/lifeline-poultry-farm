import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import {
  Plus,
  Wallet,
  Clock,
  X,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  TrendingDown,
  Banknote,
  Activity,
  CreditCard,
  Building2,
  History,
} from 'lucide-react';
import type { Expense } from '../types';
import { Card, Button, Badge } from '../components/ui';

export const ExpensesPage: React.FC = () => {
  const { user, isAccountant, isManager, isSuperAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'feed' as Expense['category'],
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0]
  });

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      setExpenses(data as Expense[] || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const expenseData = {
        farm_id: 'farm-1',
        category: newExpense.category,
        description: newExpense.description,
        vendor: newExpense.vendor,
        date: newExpense.date,
        amount: parseFloat(newExpense.amount),
        recorded_by: user.id,
        recorded_by_name: user.name,
        status: (isManager || isSuperAdmin) ? 'approved' : 'pending',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
      if (error) throw error;

      await loadExpenses();
      setShowAddModal(false);
      setNewExpense({ amount: '', category: 'feed', description: '', vendor: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!isManager && !isSuperAdmin) return;
    try {
      const { error } = await supabase.from('expenses').update({ status: 'approved', approved_by: user?.id }).eq('id', id);
      if (error) throw error;
      setExpenses(expenses.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const categoryLabels: Record<string, { label: string; icon: any }> = {
    feed: { label: 'Feed Procurement', icon: History },
    chicks: { label: 'Livestock/Chicks', icon: Activity },
    salaries: { label: 'Personnel Salaries', icon: CreditCard },
    medicine: { label: 'Biologicals', icon: TrendingDown },
    maintenance: { label: 'Maintenance', icon: Activity },
    utilities: { label: 'Utilities', icon: Activity },
    transport: { label: 'Logistics', icon: ArrowUpRight },
    other: { label: 'Operations', icon: Banknote }
  };

  const totalSpent = expenses.reduce((sum, e) => e.status === 'approved' ? sum + e.amount : sum, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const canView = isAccountant || isManager || isSuperAdmin;
  if (!canView) return (
    <div className="h-[60vh] flex flex-col items-center justify-center opacity-50 space-y-4">
       <div className="p-6 bg-rose-500/10 rounded-full text-rose-500"><AlertCircle size={48} /></div>
       <h2 className="text-2xl font-black uppercase tracking-tight italic">Restricted Ledger</h2>
       <p className="max-w-xs text-center font-medium">Authorization required for disbursement auditing.</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic">Expenditure <span className="text-primary italic underline">Ledger</span></h1>
           <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Consolidated tracking of all operational disbursements</p>
        </div>
        <Button size="lg" className="rounded-2xl px-8 shadow-glow" onClick={() => setShowAddModal(true)} leftIcon={Plus}>
           Record Disbursement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card hoverable className="relative overflow-hidden group">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Wallet size={24} /></div>
                <Badge variant="success">Total Outflow</Badge>
             </div>
             <div className="mt-5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aggregate Approved</p>
                <h3 className="text-3xl font-black tracking-tighter mt-1">₦{totalSpent.toLocaleString()}</h3>
             </div>
          </Card>
          <Card hoverable className="relative overflow-hidden group">
             <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl ${pendingCount > 0 ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                   <Clock size={24} />
                </div>
                {pendingCount > 0 && <Badge variant="warning">Action Required</Badge>}
             </div>
             <div className="mt-5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pending Vouchers</p>
                <h3 className="text-3xl font-black tracking-tighter mt-1">{pendingCount} <span className="text-sm font-bold opacity-40 italic">Open Tickets</span></h3>
             </div>
          </Card>
      </div>

      {/* Table */}
      <Card title="Operational Disbursements" subtitle="Audit-ready operational ledger" noPadding className="overflow-hidden">
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-muted/30 border-b border-border">
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Posting Date</th>
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Category</th>
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity & Purpose</th>
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Debit Amount</th>
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Control</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/50">
                  {expenses.map((expense) => {
                     const CatIcon = categoryLabels[expense.category]?.icon || Banknote;
                     return (
                        <tr key={expense.id} className="group hover:bg-muted/20 transition-all">
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <Calendar size={14} className="text-muted-foreground" />
                                 <span className="font-bold whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2 bg-muted/40 w-fit px-3 py-1.5 rounded-xl border border-border/50">
                                 <CatIcon size={12} className="text-primary" />
                                 <span className="text-[10px] font-black uppercase tracking-[0.05em]">{categoryLabels[expense.category]?.label || expense.category}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="font-black text-sm tracking-tight">{expense.vendor || 'CASH PROCUREMENT'}</span>
                                 <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{expense.description}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className="text-lg font-black text-rose-500 tracking-tighter italic">₦{expense.amount.toLocaleString()}</span>
                           </td>
                           <td className="px-6 py-5">
                              <Badge variant={expense.status === 'approved' ? 'success' : 'warning'}>
                                 {expense.status.toUpperCase()}
                              </Badge>
                           </td>
                           <td className="px-6 py-5 text-right">
                              {expense.status === 'pending' && (isManager || isSuperAdmin) && (
                                 <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => handleApprove(expense.id)} leftIcon={CheckCircle2}>Authorize</Button>
                              )}
                           </td>
                        </tr>
                     );
                  })}
                  {expenses.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-20 text-center opacity-20">
                           <Receipt size={64} className="mx-auto mb-2" />
                           <p className="text-xs font-black uppercase tracking-widest italic">No record history found</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <Card className="w-full max-w-xl shadow-2xl rounded-[32px] overflow-hidden" noPadding title="Disbursement Voucher">
            <form onSubmit={handleAddExpense} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Voucher Amount (₦)</label>
                    <div className="relative group">
                       <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                       <input type="number" required className="w-full pl-12 pr-4 py-4 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-black text-xl tracking-tighter" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Operating Category</label>
                    <select className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}>
                       {Object.entries(categoryLabels).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Transaction Date</label>
                    <input type="date" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                 </div>
                 <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payee / Vendor</label>
                    <div className="relative group">
                       <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                       <input type="text" className="w-full pl-12 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium" placeholder="Procurement entity name" value={newExpense.vendor} onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })} />
                    </div>
                 </div>
                 <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Audit Narrative</label>
                    <textarea rows={3} className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium text-sm" placeholder="Purpose for this disbursement..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                 <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setShowAddModal(false)}>Discard</Button>
                 <Button type="submit" className="flex-1 rounded-2xl py-6 shadow-glow font-black tracking-tight" leftIcon={Send}>Finalize Voucher</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

import { Send } from 'lucide-react';

export default ExpensesPage;
