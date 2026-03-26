import React, { useState } from 'react';
import { supabaseDataService } from '../services/supabaseService';
import type { FeedingLog } from '../types';
import { Button } from './ui';
import { Calendar, Clock, Utensils, Package, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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
    'Standard Mix', 'Premium Mix', 'Starter Feed', 'Grower Feed',
    'Layer Feed', 'Broiler Feed', 'Special Diet', 'Supplements',
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
        farmId, workerId, date: formData.date, time: formData.time,
        quantity: formData.quantity, unit: formData.unit as any,
        feedType: formData.feedType, notes: formData.notes,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSubmit?.(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feeding log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm font-bold italic">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm font-bold italic">
          <CheckCircle2 size={18} /> Feeding log recorded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Date</label>
              <div className="relative group">
                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input type="date" name="date" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={formData.date} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Time</label>
              <div className="relative group">
                 <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input type="time" name="time" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={formData.time} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Quantity</label>
              <div className="relative group">
                 <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input type="number" name="quantity" min="0.1" step="0.1" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-black text-sm" value={formData.quantity} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Measurement Unit</label>
              <select name="unit" required className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm appearance-none cursor-pointer" value={formData.unit} onChange={handleChange}>
                 {units.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
           </div>
           <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Resource SKU (Feed Type)</label>
              <div className="relative group">
                 <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <select name="feedType" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm appearance-none cursor-pointer" value={formData.feedType} onChange={handleChange}>
                    {feedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
              </div>
           </div>
           <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Observation Narrative</label>
              <div className="relative group">
                 <FileText className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <textarea name="notes" rows={3} className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium text-sm" value={formData.notes} onChange={handleChange} placeholder="Any specific observations..." />
              </div>
           </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1 rounded-2xl py-6 shadow-glow font-black tracking-tight" disabled={loading}>{loading ? 'Recording...' : 'Commit Data'}</Button>
          {onCancel && <Button type="button" variant="outline" className="flex-1 rounded-2xl py-6" onClick={onCancel} disabled={loading}>Discard</Button>}
        </div>
      </form>
    </div>
  );
};

export default FeedingLogForm;
