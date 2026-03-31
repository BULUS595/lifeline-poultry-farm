import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import {
  Plus,
  Wallet,
  Clock,
  Receipt,
  Banknote,
  Building2,
  ShieldCheck,
  RefreshCw,
  Activity,
  CreditCard,
  TrendingDown,
  ArrowUpRight,
  History
} from 'lucide-react';
import type { Expense } from '../types';
import { Card, Button, Badge, Modal, Input, Label, Select } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

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
      console.error('Expense link error:', error);
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

      const { error } = await supabase.from('expenses').insert([expenseData]);
      if (error) throw error;

      await loadExpenses();
      setShowAddModal(false);
      setNewExpense({ amount: '', category: 'feed', description: '', vendor: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Expense entry error:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!isManager && !isSuperAdmin && !isAccountant) return;
    try {
      const { error } = await supabase.from('expenses').update({ status: 'approved', approved_by: user?.id }).eq('id', id);
      if (error) throw error;
      setExpenses(expenses.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    } catch (error) {
      console.error('Approval failure:', error);
    }
  };

  const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
    feed: { label: 'Feed & Water', icon: History, color: 'text-primary' },
    chicks: { label: 'Livestock', icon: Activity, color: 'text-blue-500' },
    salaries: { label: 'Salaries', icon: CreditCard, color: 'text-emerald-500' },
    medicine: { label: 'Medication', icon: TrendingDown, color: 'text-rose-500' },
    maintenance: { label: 'Maintenance', icon: Building2, color: 'text-amber-500' },
    utilities: { label: 'Utilities', icon: Activity, color: 'text-indigo-500' },
    transport: { label: 'Transport', icon: ArrowUpRight, color: 'text-slate-500' },
    other: { label: 'Other', icon: Banknote, color: 'text-primary' }
  };

  const totalSpent = expenses.reduce((sum, e) => e.status === 'approved' ? sum + e.amount : sum, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const canView = isAccountant || isManager || isSuperAdmin;
  if (!canView) return (
    <div className="h-[70vh] flex flex-col items-center justify-center animate-slide-up px-6">
       <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
          <ShieldCheck size={48} strokeWidth={2.5} />
       </div>
       <div className="text-center space-y-4">
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Access <span className="text-rose-500 italic underline">Restricted</span></h2>
          <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Expense management is restricted to authorized financial officers.</p>
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
             Farm <span className="text-primary underline underline-offset-8 decoration-4">Expenses</span>
           </h1>
           <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">Track and manage all farm payments and costs</p>
        </div>
        <Button size="lg" className="rounded-3xl px-10 py-8 text-lg shadow-glow font-bold uppercase tracking-tight italic" onClick={() => setShowAddModal(true)}>
           <Plus className="mr-3 w-6 h-6" strokeWidth={3} /> Record Expense
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0" noPadding>
             <div className="p-8 pb-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-all duration-500">
                      <Wallet size={28} strokeWidth={2.5} />
                    </div>
                    <Badge variant="success" className="font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 ring-4 ring-background/50 opacity-80">Total Spent</Badge>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">Total Approved Expenses</p>
                    <h3 className="text-4xl font-black tracking-tighter leading-none tabular-nums">₦{totalSpent.toLocaleString()}</h3>
                 </div>
             </div>
          </Card>
          
          <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0" noPadding>
             <div className="p-8 pb-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl group-hover:scale-110 transition-all duration-500 ${pendingCount > 0 ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20 shadow-glow' : 'bg-muted/10 text-muted-foreground'}`}>
                      <Clock size={28} strokeWidth={2.5} />
                    </div>
                    {pendingCount > 0 && (
                      <Badge variant="danger" className="font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 ring-4 ring-background/50">Needs Approval</Badge>
                    )}
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">Pending Approvals</p>
                    <h3 className="text-4xl font-black tracking-tighter leading-none tabular-nums">
                      {pendingCount} <span className="text-xs font-bold uppercase tracking-widest opacity-40 ml-2">Awaiting Review</span>
                    </h3>
                 </div>
             </div>
          </Card>
      </div>

      <Card noPadding className="overflow-hidden rounded-[48px] border-border/40 bg-card/40 backdrop-blur-sm shadow-premium">
         <div className="px-10 py-12 flex justify-between items-end border-b border-border/20">
            <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Expense History</h3>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-40 mt-3">List of all recorded farm costs</p>
            </div>
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl bg-background/50 border-border/40 shadow-sm" onClick={loadExpenses}>
               <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} strokeWidth={2.5} />
            </Button>
         </div>
         
         <div className="overflow-x-auto min-h-[500px] custom-scrollbar">
            <table className="w-full text-left border-collapse data-table-mobile-cards">
               <thead>
                  <tr className="bg-muted/10 border-b border-border/20">
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Date</th>
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Category</th>
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Vendor & Description</th>
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Amount</th>
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center whitespace-nowrap">Status</th>
                     <th className="px-10 py-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-right whitespace-nowrap">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/10">
                  {isLoading ? (
                      [1, 2, 3, 4, 5].map(i => <tr key={i}><td colSpan={6} className="px-10 py-6"><Skeleton height={60} borderRadius={24} /></td></tr>)
                  ) : expenses.length === 0 ? (
                      <tr>
                         <td colSpan={6} className="py-28 text-center opacity-40">
                            <Receipt size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                            <h4 className="text-2xl font-black uppercase tracking-tighter">No records</h4>
                         </td>
                      </tr>
                  ) : (
                      expenses.map((expense) => {
                          const cat = categoryLabels[expense.category] || categoryLabels.other;
                          const CatIcon = cat.icon;
                          return (
                             <tr key={expense.id} className="group hover:bg-primary/5 transition-all duration-300">
                                <td className="px-10 py-8" data-label="Date">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-border/30 bg-card shadow-sm group-hover:scale-110 transition-transform ${cat.color.replace('text', 'bg').replace('-500', '/10')}`}>
                                          <CatIcon size={20} strokeWidth={2.5} className={cat.color} />
                                      </div>
                                      <span className="text-xs font-bold uppercase tracking-widest tabular-nums">{new Date(expense.date).toLocaleDateString()}</span>
                                   </div>
                                </td>
                                <td className="px-10 py-8" data-label="Category">
                                   <Badge variant="primary" className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest">{cat.label}</Badge>
                                </td>
                                <td className="px-10 py-8 min-w-[200px]" data-label="Vendor">
                                   <div className="flex flex-col space-y-1">
                                      <span className="font-bold text-lg tracking-tighter uppercase leading-none truncate max-w-[250px]">{expense.vendor || 'CASH'}</span>
                                      <span className="text-[10px] font-bold text-muted-foreground opacity-40 truncate max-w-[250px] italic">{expense.description}</span>
                                   </div>
                                </td>
                                <td className="px-10 py-8" data-label="Amount">
                                   <span className="text-3xl font-black text-rose-500 tracking-tighter tabular-nums">₦{expense.amount.toLocaleString()}</span>
                                </td>
                                <td className="px-10 py-8 text-center" data-label="Status">
                                   <Badge variant={expense.status === 'approved' ? 'success' : 'danger'} className="uppercase tracking-widest font-black text-[9px] h-8 px-4">
                                      {expense.status}
                                   </Badge>
                                </td>
                                <td className="px-10 py-8 text-right" data-label="Actions">
                                   {expense.status === 'pending' && (isManager || isSuperAdmin || isAccountant) ? (
                                      <Button variant="primary" className="rounded-2xl font-bold uppercase tracking-widest text-[9px] h-12 px-6 shadow-glow" onClick={() => handleApprove(expense.id)}>Approve</Button>
                                   ) : expense.status === 'approved' ? (
                                      <ShieldCheck size={20} className="text-emerald-500 ml-auto" strokeWidth={3} />
                                   ) : null}
                                </td>
                             </tr>
                          );
                      })
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Record New Expense"
          maxWidth="xl"
      >
        <form onSubmit={handleAddExpense} className="space-y-10 py-2 animate-slide-up">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-amount">Amount (₦)</Label>
                 <Input id="vouch-amount" type="number" required className="h-16 rounded-2xl bg-card border-none shadow-inner font-black text-3xl tracking-tighter text-primary" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div className="space-y-3">
                 <Label htmlFor="vouch-cat">Category</Label>
                 <Select id="vouch-cat" className="h-14 rounded-xl bg-card border-border/40 font-bold shadow-sm pl-6" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}>
                    {Object.entries(categoryLabels).map(([val, { label }]) => <option key={val} value={val}>{label.toUpperCase()}</option>)}
                 </Select>
              </div>
              <div className="space-y-3">
                 <Label htmlFor="vouch-date">Date</Label>
                 <Input id="vouch-date" type="date" className="h-14 rounded-xl bg-card border-border/40 font-bold shadow-sm" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
              </div>
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-payee">Vendor / Payee</Label>
                 <Input id="vouch-payee" type="text" required className="h-14 rounded-xl bg-card border-border/40 font-bold shadow-inner" placeholder="Who was paid?" value={newExpense.vendor} onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })} />
              </div>
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-narr">Description</Label>
                 <textarea id="vouch-narr" rows={4} className="w-full p-6 bg-card border-2 border-border/40 rounded-[32px] outline-none font-bold text-sm shadow-inner" placeholder="Why was this money spent?" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
              </div>
           </div>
           <div className="flex gap-6 pt-6">
              <Button variant="outline" className="flex-1 rounded-2xl py-6 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 rounded-2xl py-6 shadow-glow font-bold uppercase tracking-tight text-white">Save Expense</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
