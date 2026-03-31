export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20';
    case 'rejected': return 'bg-rose-500/15 text-rose-600 border-rose-500/20';
    case 'pending': return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
    default: return 'bg-slate-500/15 text-slate-600 border-slate-500/20';
  }
};

export const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
        case 'approved': return 'VERIFIED NODE';
        case 'rejected': return 'DENIED PROTOCOL';
        case 'pending': return 'AWAITING AUDIT';
        default: return status.toUpperCase();
    }
};
