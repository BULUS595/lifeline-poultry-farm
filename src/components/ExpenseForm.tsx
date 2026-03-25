import React, { useState } from 'react';
import { supabaseDataService } from '../services/supabaseService';
import type { Expense } from '../types';
import styles from './ExpenseForm.module.css';

interface ExpenseFormProps {
  farmId: string;
  userId: string;
  onSubmit?: (expense: Expense) => void;
  onCancel?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  farmId,
  userId,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'feed',
    amount: 0,
    description: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const categories = [
    { value: 'feed', label: 'Feed & Nutrition' },
    { value: 'medicine', label: 'Medicine & Vaccines' },
    { value: 'equipment', label: 'Equipment & Tools' },
    { value: 'labor', label: 'Labour Costs' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance & Repairs' },
    { value: 'transport', label: 'Transport & Logistics' },
    { value: 'other', label: 'Other' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const expenseData = {
        farmId,
        date: formData.date,
        category: formData.category as any,
        amount: formData.amount,
        description: formData.description || formData.notes || '',
        status: 'pending' as const,
        recordedByName: 'Authorized Staff', // Or pass down real name
        recordedBy: userId,
      };

      const expense = await supabaseDataService.addExpense(expenseData);

      setSuccess(true);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'feed',
        amount: 0,
        description: '',
        notes: '',
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      onSubmit?.(expense);
    } catch (err: any) {
      setError(err?.message || 'Failed to add expense');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Record Expense</h2>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>✓ Expense recorded successfully!</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount">Amount</label>
          <div className={styles.amountInput}>
            <span className={styles.currency}>₦</span>
            <input
              type="number"
              id="amount"
              name="amount"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.amount || ''}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            name="description"
            placeholder="Brief description of expense"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional details..."
          />
        </div>

        <div className={styles.amountSummary}>
          <span>Total Amount:</span>
          <span className={styles.amount}>₦{formData.amount.toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</span>
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
            {loading ? 'Recording...' : 'Record Expense'}
          </button>
          {onCancel && (
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
