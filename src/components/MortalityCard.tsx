import React from 'react';
import { 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  User, 
  Calendar, 
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Card, Button, Badge } from './ui';
import { getStatusColor, getStatusLabel } from '../utils/statusHelpers';
import type { MortalityRecord } from '../types';

interface MortalityCardProps {
  record: MortalityRecord;
  isAdmin: boolean;
  canEdit: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (record: MortalityRecord) => void;
  isActing?: boolean;
}

export const MortalityCard: React.FC<MortalityCardProps> = ({
  record,
  isAdmin,
  canEdit,
  onApprove,
  onReject,
  onEdit,
  isActing = false,
}) => {
  const statusClass = getStatusColor(record.status);
  const statusLabel = getStatusLabel(record.status);

  return (
    <Card hoverable className="relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-sm p-0 rounded-[48px] shadow-premium" noPadding>
        <div className="p-8 pb-10">
            <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border border-border/30 bg-card/40 ${record.status === 'rejected' ? 'text-rose-500 shadow-glow' : record.status === 'approved' ? 'text-emerald-500 shadow-glow' : 'text-primary shadow-glow'}`}>
                    <Layers size={28} strokeWidth={2.5} />
                </div>
                <Badge variant={record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'danger' : 'warning'} className={`font-black text-[9px] uppercase tracking-widest px-4 py-2 ring-4 ring-background/50 italic shadow-sm h-fit ${statusClass}`}>
                   {statusLabel}
                </Badge>
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-40 italic">Terminal Incident Count</p>
                        <h3 className="text-4xl font-black tracking-tighter leading-none italic tabular-nums text-rose-500">{record.deathCount} <span className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Loss Node(s)</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/10 p-4 rounded-2xl border border-border/20 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                        <p className="text-[9px] font-black uppercase text-muted-foreground opacity-40 mb-1 italic">Source Batch</p>
                        <p className="text-sm font-black italic uppercase tracking-tighter">{record.batch}</p>
                    </div>
                    <div className="bg-muted/10 p-4 rounded-2xl border border-border/20 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                        <p className="text-[9px] font-black uppercase text-muted-foreground opacity-40 mb-1 italic">Sync Timestamp</p>
                        <p className="text-sm font-black italic tabular-nums">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="p-4 bg-muted/5 rounded-2xl border border-border/10">
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-40 mb-1 italic">Forensic Narration (Cause)</p>
                    <p className="text-xs font-black italic text-muted-foreground leading-relaxed leading-none">
                       {record.cause || 'NO AUDIT NARRATIVE RECORDED'}
                    </p>
                </div>

                {record.status === 'rejected' && record.rejectionReason && (
                   <div className="flex items-center gap-3 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                      <ShieldAlert size={16} className="text-rose-500 grow-0 shrink-0" strokeWidth={3} />
                      <p className="text-[10px] font-black italic text-rose-600 uppercase tracking-tight truncate grow overflow-hidden italic leading-relaxed">AUDIT FAIL: {record.rejectionReason}</p>
                   </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-border/20 flex flex-col gap-4">
                {isAdmin && record.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <Button variant="success" size="sm" className="rounded-[18px] h-12 text-[10px] font-black shadow-glow uppercase tracking-widest italic" onClick={() => onApprove?.(record.id)} isLoading={isActing} disabled={isActing}>
                           Authorize Node
                        </Button>
                        <Button variant="danger" size="sm" className="rounded-[18px] h-12 text-[10px] font-black uppercase tracking-widest italic" onClick={() => onReject?.(record.id)} isLoading={isActing} disabled={isActing}>
                            Deny Protocol
                        </Button>
                    </div>
                )}

                {canEdit && (record.status === 'pending' || record.status === 'rejected') && (
                    <Button variant="outline" size="sm" className="w-full rounded-[18px] h-12 text-[10px] font-black uppercase tracking-widest italic border-border/40 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => onEdit?.(record)}>
                       <Edit3 size={14} className="mr-2" strokeWidth={3} /> Reconsolidate Data
                    </Button>
                )}
                
                <div className="flex items-center gap-3 opacity-30 mt-2 px-1">
                    <User size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest italic truncate">{record.recordedByName || 'SYSTEM LOG'}</span>
                </div>
            </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
    </Card>
  );
};
