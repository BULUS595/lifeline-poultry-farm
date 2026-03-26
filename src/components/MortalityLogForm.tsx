import React, { useState } from 'react';
import { supabaseDataService } from '../services/supabaseService';
import type { MortalityLog } from '../types';
import { Button } from './ui';
import { Calendar, AlertTriangle, ShieldAlert, Hash, FileText, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface MortalityLogFormProps {
  farmId: string;
  workerId: string;
  workerName?: string;
  onSubmit?: (log: MortalityLog) => void;
  onCancel?: () => void;
}

export const MortalityLogForm: React.FC<MortalityLogFormProps> = ({
  farmId,
  workerId,
  workerName,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    count: 1,
    cause: 'unknown',
    batchId: '',
    notes: '',
    imageUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const causes = ['unknown', 'disease', 'injury', 'predator', 'accident', 'natural', 'heat_stress', 'cold_stress'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' ? parseInt(value, 10) : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const url = await supabaseDataService.uploadStockImage(file);
      if (url) setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError('Failed to upload evidence image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batchId) { setError('Batch ID is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const log = await supabaseDataService.addMortalityLog({
        farmId, workerId, workerName: workerName || 'Unknown Personnel',
        date: formData.date, count: formData.count, cause: formData.cause,
        batchId: formData.batchId, notes: formData.notes, imageUrl: formData.imageUrl,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSubmit?.(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record mortality');
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
          <CheckCircle2 size={18} /> Mortality event recorded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Event Date</label>
              <div className="relative group">
                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input type="date" name="date" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={formData.date} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Attrition Count</label>
              <div className="relative group">
                 <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-rose-500 transition-colors" size={18} />
                 <input type="number" name="count" min="1" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-rose-500 font-black text-sm text-rose-500" value={formData.count} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Primary Cause</label>
              <div className="relative group">
                 <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <select name="cause" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm appearance-none cursor-pointer" value={formData.cause} onChange={handleChange}>
                    {causes.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ')}</option>)}
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Flock / Batch ID</label>
              <div className="relative group">
                 <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input type="text" name="batchId" required placeholder="e.g. BATCH-202" className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm" value={formData.batchId} onChange={handleChange} />
              </div>
           </div>
           <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Evidence Attachment (Optional)</label>
              <div className="flex items-center gap-4">
                 <label className="flex-1 flex items-center justify-center gap-3 p-4 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Camera className="text-muted-foreground" size={20} />
                    <span className="text-xs font-bold text-muted-foreground">Upload Inspection Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 </label>
                 {formData.imageUrl && (
                    <div className="w-16 h-16 rounded-xl border border-border overflow-hidden shrink-0">
                       <img src={formData.imageUrl} className="w-full h-full object-cover" />
                    </div>
                 )}
              </div>
           </div>
           <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Incident Notes</label>
              <div className="relative group">
                 <FileText className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <textarea name="notes" rows={3} className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-medium text-sm" value={formData.notes} onChange={handleChange} placeholder="Describe the incident details..." />
              </div>
           </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1 rounded-2xl py-6 shadow-glow font-black tracking-tight bg-rose-500 hover:bg-rose-600 border-none" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Commit Incident Report'}</Button>
          {onCancel && <Button type="button" variant="outline" className="flex-1 rounded-2xl py-6" onClick={onCancel} disabled={loading}>Discard</Button>}
        </div>
      </form>
    </div>
  );
};

export default MortalityLogForm;
