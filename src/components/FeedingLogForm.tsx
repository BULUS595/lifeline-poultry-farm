import React, { useState } from 'react';
import { supabaseDataService } from '../services/supabaseService';
import type { FeedingLog } from '../types';
import styles from './FeedingLogForm.module.css';

interface FeedingLogFormProps {
  farmId: string;
  workerId: string;
  onSubmit?: (log: FeedingLog) => void;
  onCancel?: () => void;
}

export const FeedingLogForm: React.FC<FeedingLogFormProps> = ({
  farmId,
  workerId,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    quantity: 50,
    unit: 'kg',
    feedType: 'Standard Mix',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const feedTypes = [
    'Standard Mix',
    'Premium Mix',
    'Starter Feed',
    'Grower Feed',
    'Layer Feed',
    'Broiler Feed',
    'Special Diet',
    'Supplements',
  ];

  const units = ['kg', 'lbs', 'bags', 'liters'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const log = await supabaseDataService.addFeedingLog({
        farmId,
        workerId,
        date: formData.date,
        time: formData.time,
        quantity: formData.quantity,
        unit: formData.unit as 'kg' | 'lbs' | 'bags' | 'liters',
        feedType: formData.feedType,
        notes: formData.notes,
      });

      setSuccess(true);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        quantity: 50,
        unit: 'kg',
        feedType: 'Standard Mix',
        notes: '',
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      onSubmit?.(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feeding log');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Record Feeding</h2>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>✓ Feeding log recorded successfully!</div>}

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
          <label htmlFor="time">Time</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="0.1"
              step="0.1"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
            >
              {units.map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedType">Feed Type</label>
          <select
            id="feedType"
            name="feedType"
            value={formData.feedType}
            onChange={handleChange}
            required
          >
            {feedTypes.map(type => (
              <option key={type} value={type}>
                {type}
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
            placeholder="Any observations about feeding..."
          />
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
            {loading ? 'Recording...' : 'Record Feeding'}
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

export default FeedingLogForm;
