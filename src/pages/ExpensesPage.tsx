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
  Send,
  ShieldCheck,
  ChevronDown,
  Zap,
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
      console.error('Fiscal link error:', error);
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
      console.error('Voucher submission error:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!isManager && !isSuperAdmin && !isAccountant) return;
    try {
      const { error } = await supabase.from('expenses').update({ status: 'approved', approved_by: user?.id }).eq('id', id);
      if (error) throw error;
      setExpenses(expenses.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    } catch (error) {
      console.error('Voucher authorization failure:', error);
    }
  };

  const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
    feed: { label: 'Feed Logistics', icon: History, color: 'text-primary' },
    chicks: { label: 'Livestock Node', icon: Activity, color: 'text-blue-500' },
    salaries: { label: 'Staff Payroll', icon: CreditCard, color: 'text-emerald-500' },
    medicine: { label: 'Bio-Security', icon: TrendingDown, color: 'text-rose-500' },
    maintenance: { label: 'Infrastructure', icon: Building2, color: 'text-amber-500' },
    utilities: { label: 'Grid Services', icon: Activity, color: 'text-indigo-500' },
    transport: { label: 'Global Logistics', icon: ArrowUpRight, color: 'text-slate-500' },
    other: { label: 'Operational HQ', icon: Banknote, color: 'text-primary' }
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
          <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Fiscal Hub <span className="text-rose-500 italic underline">Restricted</span></h2>
          <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Expenditure auditing is restricted to authorized financial officers with L3 clearance.</p>
       </div>
       <Button variant="secondary" className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
          Return to Operations
       </Button>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
             Expenditure <span className="text-primary italic underline underline-offset-8 decoration-4">Ledger</span>
           </h1>
           <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">System-wide disbursement and voucher tracking</p>
        </div>
        <Button size="lg" className="rounded-3xl px-10 py-8 text-lg shadow-glow font-black uppercase tracking-tight italic" onClick={() => setShowAddModal(true)}>
           <Plus className="mr-3 w-6 h-6" strokeWidth={3} /> Record Disbursement
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 overflow-hidden" noPadding>
             <div className="p-8 pb-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Wallet size={28} strokeWidth={2.5} />
                    </div>
                    <Badge variant="success" className="font-black text-[9px] uppercase tracking-widest px-3 py-1.5 ring-4 ring-background/50 italic opacity-80">Finalized Outflow</Badge>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">Aggregate Authorized Capital</p>
                    <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums shrink-0">₦{totalSpent.toLocaleString()}</h3>
                 </div>
             </div>
             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
          </Card>
          
          <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 overflow-hidden" noPadding>
             <div className="p-8 pb-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 ${pendingCount > 0 ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20 shadow-glow' : 'bg-muted/10 text-muted-foreground'}`}>
                      <Clock size={28} strokeWidth={2.5} />
                    </div>
                    {pendingCount > 0 && (
                      <Badge variant="danger" className="font-black text-[9px] uppercase tracking-widest px-3 py-1.5 ring-4 ring-background/50 italic">Immediate Action Required</Badge>
                    )}
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40 shrink-0">Pending Fiscal Vouchers</p>
                    <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums shrink-0">
                      {pendingCount} <span className="text-xs font-black uppercase tracking-widest opacity-40 ml-2">Open Nodes</span>
                    </h3>
                 </div>
             </div>
             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-700" />
          </Card>
      </div>

      {/* Main Ledger Table */}
      <Card noPadding className="overflow-hidden rounded-[48px] border-border/40 bg-card/40 backdrop-blur-sm shadow-premium">
         <div className="px-10 py-12 flex justify-between items-end border-b border-border/20">
            <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter italic text-foreground leading-none">Operational Disbursements</h3>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 mt-3 italic">Verified audit-ready expenditure trail</p>
            </div>
            <div className="flex items-center gap-3">
               <Button variant="outline" size="icon" className="w-12 h-12 rounded-xl bg-background/50 border-border/40 shadow-sm" onClick={loadExpenses}><RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} strokeWidth={2.5} /></Button>
            </div>
         </div>
         
         <div className="overflow-x-auto min-h-[500px] custom-scrollbar">
            <table className="w-full text-left border-collapse data-table-mobile-cards">
               <thead>
                  <tr className="bg-muted/10 border-b border-border/20">
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Posting Date</th>
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Category Matrix</th>
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Disbursement Node</th>
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Debit Total</th>
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap text-center">Protocol Status</th>
                     <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right whitespace-nowrap">Authorization</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/10">
                  {isLoading ? (
                      [1, 2, 3, 4, 5].map(i => <tr key={i}><td colSpan={6} className="px-10 py-6"><Skeleton height={60} borderRadius={24} /></td></tr>)
                  ) : expenses.length === 0 ? (
                      <tr>
                         <td colSpan={6} className="py-28 text-center opacity-40">
                            <Receipt size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter px-4">Zero fiscal records detected</h4>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 opacity-60 italic">System stand-by for voucher entry</p>
                         </td>
                      </tr>
                  ) : (
                      expenses.map((expense) => {
                          const cat = categoryLabels[expense.category] || categoryLabels.other;
                          const CatIcon = cat.icon;
                          return (
                             <tr key={expense.id} className="group hover:bg-primary/5 transition-all duration-300">
                                <td className="px-10 py-8" data-label="Posting Date">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-border/30 bg-card shadow-sm group-hover:scale-110 transition-transform ${cat.color.replace('text', 'bg').replace('-500', '/10')}`}>
                                          <CatIcon size={20} strokeWidth={2.5} className={cat.color} />
                                      </div>
                                      <div className="flex flex-col">
                                         <span className="text-xs font-black uppercase tracking-widest tabular-nums italic text-foreground leading-none">{new Date(expense.date).toLocaleDateString()}</span>
                                         <span className="text-[9px] font-black uppercase text-muted-foreground opacity-40 mt-1">Logged by {(expense as any).recorded_by_name?.split(' ')[0] || (expense as any).recordedByName?.split(' ')[0] || 'System'}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-8" data-label="Category Matrix">
                                   <Badge variant="primary" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest italic shadow-sm hover:scale-105 transition-all cursor-default grow-0 whitespace-nowrap`}>
                                      {cat.label}
                                   </Badge>
                                </td>
                                <td className="px-10 py-8 min-w-[200px]" data-label="Disbursement Node">
                                   <div className="flex flex-col space-y-2">
                                      <span className="font-black text-lg tracking-tighter uppercase italic leading-none truncate max-w-[250px]">{expense.vendor || 'CASH PROC-NODE'}</span>
                                      <span className="text-[10px] font-black text-muted-foreground opacity-40 truncate max-w-[250px] italic">"{(expense.description || 'No audit narrative').substring(0, 50)}..."</span>
                                   </div>
                                </td>
                                <td className="px-10 py-8" data-label="Debit Total">
                                   <div className="flex items-center gap-3">
                                      <span className="text-3xl font-black text-rose-500 tracking-tighter italic tabular-nums group-hover:scale-110 transition-transform origin-left">₦{expense.amount.toLocaleString()}</span>
                                   </div>
                                </td>
                                <td className="px-10 py-8 text-center" data-label="Protocol Status">
                                   <Badge variant={expense.status === 'approved' ? 'success' : 'danger'} className="uppercase tracking-widest font-black text-[9px] italic h-8 px-4 ring-2 ring-background shadow-sm">
                                      {expense.status}
                                   </Badge>
                                </td>
                                <td className="px-10 py-8 text-right" data-label="Authorization">
                                   {expense.status === 'pending' && (isManager || isSuperAdmin || isAccountant) ? (
                                      <Button variant="primary" size="lg" className="rounded-2xl font-black uppercase tracking-widest text-[9px] h-12 px-6 shadow-glow hover:scale-105 active:scale-95" onClick={() => handleApprove(expense.id)} leftIcon={CheckCircle2}>Authorize Node</Button>
                                   ) : expense.status === 'approved' ? (
                                      <div className="flex flex-col items-end opacity-40 pr-4">
                                          <ShieldCheck size={20} className="text-emerald-500 mb-1" strokeWidth={3} />
                                          <span className="text-[9px] font-black uppercase tracking-widest">Audit Verified</span>
                                      </div>
                                   ) : (
                                       <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-20 pr-4 italic">Action restricted</div>
                                   )}
                                </td>
                             </tr>
                          );
                      })
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Modal: Disbursement Voucher Form */}
      <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Disbursement Voucher Protocol"
          maxWidth="xl"
      >
        <form onSubmit={handleAddExpense} className="space-y-10 py-2 animate-slide-up">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-amount">Voucher Capital Amount (₦)</Label>
                 <div className="relative group">
                    <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={24} strokeWidth={2.5} />
                    <Input id="vouch-amount" type="number" required className="pl-16 h-20 rounded-[32px] bg-card border-none shadow-inner font-black text-4xl tracking-tighter text-primary" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                 </div>
              </div>
              
              <div className="space-y-3">
                 <Label htmlFor="vouch-cat">Fiscal Operational Class</Label>
                 <div className="relative group">
                    <Select id="vouch-cat" className="h-16 rounded-2xl bg-card border-border/40 font-black italic shadow-sm pl-6" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}>
                       {Object.entries(categoryLabels).map(([val, { label }]) => <option key={val} value={val}>{label.toUpperCase()} PROTOCOL</option>)}
                    </Select>
                 </div>
              </div>
              
              <div className="space-y-3">
                 <Label htmlFor="vouch-date">Transaction Timestamp (Node Date)</Label>
                 <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                    <Input id="vouch-date" type="date" className="pl-14 h-16 rounded-2xl bg-card border-border/40 font-black italic uppercase tracking-tighter shadow-sm" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                 </div>
              </div>
              
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-payee">Payee / Target Operational Entity</Label>
                 <div className="relative group">
                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                    <Input id="vouch-payee" type="text" required className="pl-16 h-16 rounded-2xl bg-card border-border/40 font-black italic shadow-inner tracking-tight" placeholder="Designate procurement entity or vendor..." value={newExpense.vendor} onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })} />
                 </div>
              </div>
              
              <div className="space-y-3 md:col-span-2">
                 <Label htmlFor="vouch-narr">Forensic Audit Narrative (Purpose)</Label>
                 <textarea 
                    id="vouch-narr"
                    rows={4} 
                    className="w-full p-6 bg-card border-2 border-border/40 rounded-[32px] outline-none focus:border-primary/50 font-black text-sm transition-all focus:ring-8 focus:ring-primary/5 shadow-inner leading-relaxed custom-scrollbar placeholder:italic" 
                    placeholder="Provide detailed justification for this disbursement node..." 
                    value={newExpense.description} 
                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} 
                />
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <Button variant="outline" className="flex-1 rounded-3xl py-8 h-18 font-black uppercase tracking-widest text-[10px]" onClick={() => setShowAddModal(false)}>Discard Voucher</Button>
              <Button type="submit" className="flex-1 rounded-3xl py-8 h-18 shadow-glow font-black uppercase tracking-tight text-lg italic text-white" leftIcon={Send}>
                 <Zap size={20} className="mr-3" fill="currentColor" /> Finalize Disbursement Node
              </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

import { RefreshCw } from 'lucide-react';

export default ExpensesPage;
