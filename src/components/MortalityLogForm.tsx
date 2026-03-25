import React, { useState } from 'react';
import { supabaseDataService } from '../services/supabaseService';
import type { MortalityLog } from '../types';
import styles from './MortalityLogForm.module.css';

interface MortalityLogFormProps {
  farmId: string;
  workerId: string;
  onSubmit?: (log: MortalityLog) => void;
  onCancel?: () => void;
}

export const MortalityLogForm: React.FC<MortalityLogFormProps> = ({
  farmId,
  workerId,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    count: 1,
    cause: 'unknown',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const causes = [
    'unknown',
    'disease',
    'injury',
    'predator',
    'accident',
    'natural',
    'heat_stress',
    'cold_stress',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const log = await supabaseDataService.addMortalityLog({
        farmId,
        workerId,
        date: formData.date,
        count: formData.count,
        cause: formData.cause,
        notes: formData.notes,
      });

      setSuccess(true);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        count: 1,
        cause: 'unknown',
        notes: '',
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      onSubmit?.(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mortality log');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Record Mortality</h2>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>✓ Mortality log recorded successfully!</div>}

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
          <label htmlFor="count">Number of Birds</label>
          <input
            type="number"
            id="count"
            name="count"
            min="1"
            value={formData.count}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cause">Cause</label>
          <select
            id="cause"
            name="cause"
            value={formData.cause}
            onChange={handleChange}
            required
          >
            {causes.map(cause => (
              <option key={cause} value={cause}>
                {cause.charAt(0).toUpperCase() + cause.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional details..."
          />
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
            {loading ? 'Recording...' : 'Record Mortality'}
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

export default MortalityLogForm;
