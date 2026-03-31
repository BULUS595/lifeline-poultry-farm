import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  History, 
  ChevronRight,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mortalityService } from '../../services/mortalityService';
import type { MortalityRecord } from '../../types';
import { MortalityCard } from '../../components/MortalityCard';
import { Card, Button, Input, Modal, Label, Badge } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';

type FormData = {
  date: string;
  batch: string;
  deathCount: string;
  cause: string;
};

const EMPTY_FORM: FormData = {
  date: new Date().toISOString().split('T')[0],
  batch: '',
  deathCount: '',
  cause: '',
};

export const MortalityPage: React.FC = () => {
  const { user, isAdmin, isInventory } = useAuth();
  const [records, setRecords] = useState<MortalityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [actingRecordId, setActingRecordId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MortalityRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  const loadRecords = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await mortalityService.getRecords('farm-1');
      if (isAdmin) {
        setRecords(data);
      } else {
        setRecords(data.filter(r => r.recordedBy === user.id));
      }
    } catch (err) {
      console.error('Load records failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.batch.trim()) { setFormError('Batch identifier is required.'); return; }
    const count = parseInt(form.deathCount);
    if (isNaN(count) || count < 0) { setFormError('Valid death count is required.'); return; }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingRecord) {
        await mortalityService.updateRecord(editingRecord.id, {
          date: form.date,
          batch: form.batch,
          deathCount: count,
          cause: form.cause,
          status: 'pending' // Resubmitting after rejection or edit sets it back to pending
        });
      } else {
        await mortalityService.createRecord({
          farmId: 'farm-1',
          date: form.date,
          batch: form.batch,
          deathCount: count,
          cause: form.cause,
          recordedBy: user.id,
          recordedByName: user.name,
        });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingRecord(null);
      loadRecords();
    } catch (err: any) {
      setFormError(err.message || 'Transmission failure — protocol aborted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActingRecordId(id);
    try {
      await mortalityService.updateRecord(id, { status: 'approved' });
      loadRecords();
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setActingRecordId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Specify Audit Rejection Reason:');
    if (reason === null) return;
    setActingRecordId(id);
    try {
      await mortalityService.updateRecord(id, { status: 'rejected', rejectionReason: reason });
      loadRecords();
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setActingRecordId(null);
    }
  };

  const handleEdit = (record: MortalityRecord) => {
    setEditingRecord(record);
    setForm({
      date: record.date.split('T')[0],
      batch: record.batch,
      deathCount: String(record.deathCount),
      cause: record.cause,
    });
    setShowForm(true);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.batch.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.cause.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, filterStatus]);

  return (
    <div className="space-y-16 pb-20 animate-slide-up">
      <div className="flex flex-col md:flex-row gap-10 md:items-end justify-between px-2">
        <div>
           <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none shrink-0">
             Attrition <span className="text-rose-500 italic underline underline-offset-8 decoration-rose-500/20 decoration-4">Terminal</span>
           </h1>
           <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] mt-4 opacity-40 italic">Mortality Management and Forensic Data Consolidation</p>
        </div>
        {isInventory && (
            <Button size="lg" className="rounded-[32px] px-12 py-10 text-xl shadow-glow font-black uppercase tracking-tight italic bg-rose-500 text-white hover:scale-105 active:scale-95 transition-all shadow-rose-500/20" onClick={() => { setEditingRecord(null); setForm(EMPTY_FORM); setShowForm(true); }}>
                <Plus className="mr-4 w-7 h-7" strokeWidth={4} /> Record Mortality
            </Button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-8 justify-between items-center bg-card/40 backdrop-blur-3xl p-8 rounded-[48px] border-4 border-border/40 shadow-premium overflow-hidden relative">
        <div className="flex bg-muted/20 p-2.5 rounded-[28px] w-full xl:w-auto overflow-x-auto custom-scrollbar border-2 border-border/20">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`
                    px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 italic
                    ${filterStatus === s ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                `}
            >
                {s === 'all' ? 'Universal Sync' : s.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="relative w-full xl:w-[450px] group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300" size={24} strokeWidth={3} />
            <Input 
                type="text" 
                placeholder="Scan forensic markers or batches..." 
                className="pl-16 pr-8 py-7 h-16 rounded-[24px] border-border/40 bg-card/60 font-black italic shadow-inner tracking-tight text-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={380} borderRadius={48} />)
        ) : filteredRecords.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-muted/10 rounded-[64px] border-4 border-dashed border-border/40 opacity-40">
                <History size={120} strokeWidth={1} className="mx-auto mb-8 opacity-20" />
                <h3 className="text-3xl font-black uppercase italic tracking-tighter px-4">No Attrition Nodes Located</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 max-w-sm mx-auto opacity-60 leading-relaxed italic">System synchronization verified. No active lethality anomalies recorded in current sector.</p>
            </div>
        ) : (
            filteredRecords.map(record => (
                <MortalityCard 
                    key={record.id} 
                    record={record} 
                    isAdmin={isAdmin}
                    canEdit={isInventory && (record.status === 'pending' || record.status === 'rejected')}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={handleEdit}
                    isActing={actingRecordId === record.id}
                />
            ))
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingRecord ? "Edit Forensic Record" : "New Mortality Initialization"}
        maxWidth="xl"
      >
        <div className="space-y-10 py-4 animate-slide-up">
            {formError && (
                <div className="p-6 bg-rose-500/10 border-4 border-dashed border-rose-500/20 rounded-[32px] flex items-center gap-6 text-rose-600 text-[11px] font-black uppercase tracking-widest animate-shake leading-relaxed shadow-lg">
                    <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-glow"><AlertCircle size={24} strokeWidth={3} /></div> {formError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <Label className="ml-2">Incident Timestamp</Label>
                    <Input type="date" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-4">
                    <Label className="ml-2">Batch/Node Identifier</Label>
                    <Input type="text" placeholder="e.g. LL-PEN-04" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tracking-tight" value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
                </div>
                <div className="space-y-4">
                    <Label className="ml-2">Lethality Count</Label>
                    <Input type="number" placeholder="0" className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tabular-nums text-rose-500 text-2xl" value={form.deathCount} onChange={e => setForm(f => ({ ...f, deathCount: e.target.value }))} />
                </div>
                <div className="space-y-4 md:col-span-2">
                    <Label className="ml-2">Forensic Narrative (Cause)</Label>
                    <Input type="text" placeholder="Specify potential causative factors or observations..." className="h-16 rounded-[24px] bg-background border-border/40 font-black italic shadow-inner text-lg tracking-tight" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 pt-10">
                <Button variant="outline" className="flex-1 rounded-[32px] py-10 h-20 font-black uppercase tracking-widest text-[11px] italic border-border/40" onClick={() => setShowForm(false)}>Abort Record</Button>
                <Button className="flex-1 rounded-[32px] py-10 h-20 shadow-glow font-black uppercase tracking-widest text-[12px] italic bg-rose-500 text-white shadow-rose-500/30" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={Zap}>
                    {editingRecord ? 'Finalize Reconsolidation' : 'Initialize Protocol'} <ArrowRight size={20} className="ml-2" strokeWidth={3} />
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default MortalityPage;
