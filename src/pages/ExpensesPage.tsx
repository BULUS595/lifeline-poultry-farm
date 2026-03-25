import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { Layout } from '../components/Layout';
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
  CreditCard
} from 'lucide-react';
import type { Expense } from '../types';
import styles from './ExpensesPage.module.css';

export const ExpensesPage: React.FC = () => {
  const { user, isAccountant, isManager, isSuperAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data as Expense[] || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

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

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;

      // Log Activity
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        user_name: user.name,
        farm_id: 'farm-1',
        action: 'CREATED_EXPENSE',
        data_type: 'expense',
        data_id: data.id,
        details: `AUTHORIZED: Expense of ₦${expenseData.amount.toLocaleString()} for ${expenseData.category}`,
        timestamp: new Date().toISOString()
      }]);

      // Map back to camelCase local state if DB was snake_case
      const mapped: Expense = {
        id: data.id,
        farmId: data.farm_id,
        category: data.category,
        description: data.description,
        vendor: data.vendor,
        date: data.date,
        amount: data.amount,
        recordedBy: data.recorded_by,
        recordedByName: data.recorded_by_name,
        status: data.status,
        createdAt: data.created_at
      };

      setExpenses([mapped, ...expenses]);
      setShowAddModal(false);
      setNewExpense({
        amount: '',
        category: 'feed',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to authorize expense record.');
    }
  };

  const handleApprove = async (id: string) => {
    if (!isManager && !isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved', approved_by: user?.id })
        .eq('id', id);

      if (error) throw error;

      setExpenses(expenses.map(e => e.id === id ? { ...e, status: 'approved' } : e));

      // Log Activity
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        user_name: user?.name,
        farm_id: 'farm-1',
        action: 'APPROVED_EXPENSE',
        data_type: 'expense',
        data_id: id,
        details: `Expense approved by ${user?.name}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    feed: { label: 'Feed Procurement', icon: <Package size={14} /> },
    chicks: { label: 'Livestock/Chicks', icon: <Activity size={14} /> },
    salaries: { label: 'Personnel Salaries', icon: <CreditCard size={14} /> },
    medicine: { label: 'Biologicals/Medicine', icon: <TrendingDown size={14} /> },
    maintenance: { label: 'Asset Maintenance', icon: <Activity size={14} /> },
    utilities: { label: 'Power & Utilities', icon: <Activity size={14} /> },
    transport: { label: 'Logistics/Transport', icon: <ArrowUpRight size={14} /> },
    other: { label: 'Operating Expenses', icon: <Banknote size={14} /> }
  };

  const totalSpent = expenses.reduce((sum, e) => e.status === 'approved' ? sum + e.amount : sum, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const canView = isAccountant || isManager || isSuperAdmin;

  if (!canView) {
    return (
      <Layout title="Expense Resticted">
        <div className="card text-center" style={{ padding: '5rem 2rem' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
          <h2>Financial Access Restricted</h2>
          <p>Authorization is required to view the consolidated expense ledger.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Expense Audit Terminal">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Expense <span style={{ color: 'var(--color-primary)' }}>Ledger</span></h1>
            <p>Consolidated tracking of all operational expenditures.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ height: '48px', padding: '0 32px' }}>
            <Plus size={18} /> Record Disbursement
          </button>
        </header>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} card`} style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className={styles.statIcon}><Wallet size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Total Approved Outflow</span>
              <span className={styles.statValue}>₦{totalSpent.toLocaleString()}</span>
            </div>
          </div>
          <div className={`${styles.statCard} card`} style={{ borderStyle: pendingCount > 0 ? 'dashed' : 'solid', borderColor: pendingCount > 0 ? 'var(--color-warning)' : 'var(--color-border)' }}>
            <div className={`${styles.statIcon} ${styles.pending}`}><Clock size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Awaiting Authorization</span>
              <span className={styles.statValue}>{pendingCount} <small style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>VOCS</small></span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Posting Date</th>
                  <th>Categorization</th>
                  <th>Entity / Purpose</th>
                  <th>Debit Amount</th>
                  <th>Authentication</th>
                  <th style={{ textAlign: 'right' }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td style={{ color: 'var(--color-text-tertiary)' }}>
                      <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.5 }} />
                      {new Date(expense.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div className={styles.categoryBadge}>
                        {categoryLabels[expense.category]?.icon}
                        {categoryLabels[expense.category]?.label || expense.category}
                      </div>
                    </td>
                    <td>
                      <div className={styles.vendorInfo}>
                        <strong>{expense.vendor || 'CASH PROCUREMENT'}</strong>
                        <span>{expense.description}</span>
                      </div>
                    </td>
                    <td className={styles.amount}>₦{expense.amount.toLocaleString()}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[expense.status]}`}>
                        {expense.status === 'approved' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {expense.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {expense.status === 'pending' && (isManager || isSuperAdmin) && (
                        <button className={styles.approveBtn} onClick={() => handleApprove(expense.id)}>
                          Approve Voucher
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '5rem', opacity: 0.3 }}>
                      <Receipt size={60} style={{ marginBottom: '1rem' }} />
                      <p>No expense records detected in the current ledger.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ margin: 0 }}>Expense Voucher Entry</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddExpense} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Voucher Amount (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Operating Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                >
                  {Object.entries(categoryLabels).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Payee / Vendor</label>
                <input
                  type="text"
                  value={newExpense.vendor}
                  onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  placeholder="e.g., Premier Feed Mills LTD"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Transaction Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Audit Narrative / Notes</label>
                <textarea
                  rows={3}
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Brief context for this disbursement..."
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Abort</button>
                <button type="submit" className="btn-primary">Finalize Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

const Package = ({ size }: { size: number }) => <PackageIcon size={size} />;
import { Package as PackageIcon } from 'lucide-react';

export default ExpensesPage;
