import React, { useState } from 'react';
import { 
  Globe, 
  Phone, 
  Building, 
  User, 
  Shield, 
  Calendar, 
  LogOut, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  ShieldAlert,
  Database,
  Trash2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal, Label } from '../components/ui';
import { supabaseDataService } from '../services/supabaseService';

export const ProfilePage: React.FC = () => {
  const { user, logout, getRoleLabel } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'TRANS' | 'INV'>('TRANS');
  const [step, setStep] = useState(1);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = resetType === 'TRANS' 
        ? await supabaseDataService.clearOperationalData()
        : await supabaseDataService.clearAllInventory();
        
      if (res.success) {
        alert(`${resetType === 'TRANS' ? 'Transaction' : 'Inventory'} records cleared successfully.`);
        setShowResetModal(false);
        setStep(1);
      } else {
        alert('Reset failed: ' + (res as any).message);
      }
    } catch (e) {
      console.error(e);
      alert('A critical error occurred durring the reset sequence.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-slide-up">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 w-full bg-slate-900 rounded-[40px] border-2 border-border/40 overflow-hidden relative shadow-lg">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-500/10" />
           <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
        
        <div className="absolute -bottom-12 left-10 flex flex-col md:flex-row items-center md:items-end gap-8">
           <div className="w-40 h-40 rounded-[32px] bg-card border-[8px] border-background shadow-premium flex items-center justify-center p-2 overflow-hidden relative">
             <div className="w-full h-full bg-primary/5 rounded-[24px] flex items-center justify-center border-2 border-primary/10">
                <User size={60} className="text-primary" strokeWidth={2.5} />
             </div>
           </div>
          
          <div className="mb-4 space-y-2 text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">{user?.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
               <Badge variant="primary" className="text-[10px] font-black uppercase tracking-widest px-4 h-8 shadow-sm">
                  {getRoleLabel()}
               </Badge>
               <div className="flex items-center gap-2 text-muted-foreground bg-muted/10 px-3 py-1 rounded-lg border border-border/20">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-glow animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Active</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-24 pt-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-[40px] border-border/40 shadow-premium p-0" noPadding>
            <div className="px-10 py-8 border-b border-border/20 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Account Profile</h2>
                <ShieldCheck size={20} className="text-primary" strokeWidth={3} />
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Full Name</Label>
                  <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20">
                     <p className="font-bold text-lg">{user?.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Role</Label>
                  <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20 flex items-center justify-between">
                    <p className="font-bold text-lg uppercase text-primary">{user?.role?.replace('_', ' ')}</p>
                    <Badge variant="success" className="h-6 px-3 text-[8px] font-bold uppercase">Verified</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                   <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Session</Label>
                   <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20 flex items-center gap-3">
                      <Calendar size={18} className="text-emerald-500" strokeWidth={2.5} />
                      <p className="font-bold text-lg uppercase tracking-tight">Active</p>
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Version</Label>
                   <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20">
                      <p className="font-bold text-lg uppercase tracking-tight">4.2.0 LAUNCH</p>
                   </div>
                </div>
              </div>
              <div className="pt-8 border-t border-border/10">
                 <Button variant="danger" size="lg" className="w-full md:w-auto rounded-2xl px-10 h-16 font-bold uppercase text-xs tracking-widest shadow-glow" onClick={logout}>
                    <LogOut className="mr-3 w-5 h-5" strokeWidth={3} /> Log Out
                 </Button>
              </div>
            </div>
          </Card>
          
          {user?.role === 'super_admin' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-rose-500/5 border-2 border-dashed border-rose-500/20 rounded-[40px] p-8 flex flex-col justify-between space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-rose-500/10 shadow-sm shrink-0">
                          <RefreshCw className="text-rose-500" size={20} strokeWidth={3} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black tracking-tighter uppercase leading-none text-rose-500">Reset Sales</h3>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1 opacity-50">Trans. only</p>
                       </div>
                    </div>
                    <Button variant="danger" className="w-full rounded-xl h-12 font-black uppercase text-[9px] shadow-sm" onClick={() => { setResetType('TRANS'); setShowResetModal(true); setStep(1); }}>
                       Clear Transactions
                    </Button>
                 </div>

                 <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-[40px] p-8 flex flex-col justify-between space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                          <Package className="text-primary" size={20} strokeWidth={3} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black tracking-tighter uppercase leading-none text-white">Empty Stocks</h3>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1 opacity-50">Catalog only</p>
                       </div>
                    </div>
                    <Button variant="secondary" className="w-full rounded-xl h-12 font-black uppercase text-[9px] shadow-sm bg-slate-800 border-slate-700" onClick={() => { setResetType('INV'); setShowResetModal(true); setStep(1); }}>
                       Wipe Inventory
                    </Button>
                 </div>
             </div>
          )}

          <div className="bg-slate-900 border-2 border-slate-800 rounded-[32px] p-8 flex items-center gap-6">
              <ShieldAlert size={28} className="text-primary shrink-0" strokeWidth={2.5} />
              <p className="text-xs font-bold italic text-slate-400 leading-relaxed opacity-60">
                Administrative actions are irreversible. Ensure you have backups of any required data before clearing.
              </p>
          </div>
        </div>

        <div className="space-y-10">
           <Card className="rounded-[40px] border-border/40 shadow-premium p-0" noPadding>
              <div className="p-8 border-b border-border/20 bg-muted/5 font-black uppercase tracking-tighter">Support & Site</div>
              <div className="p-8 space-y-6">
                 <a href="tel:09169598057" className="flex items-center p-4 rounded-2xl bg-muted/5 border border-border/20 group">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <Phone className="text-primary" size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase opacity-40">Tech Admin</p>
                      <p className="text-md font-black italic">0916 959 8057</p>
                    </div>
                 </a>
                 <div className="p-6 bg-slate-900 rounded-[28px] border-2 border-slate-800 space-y-4">
                     <div className="flex items-center gap-3">
                        <Zap className="text-primary" size={18} strokeWidth={3} />
                        <h3 className="font-black uppercase italic text-white">Azure Dev</h3>
                     </div>
                     <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-widest opacity-60 leading-relaxed">
                       ENTERPRISE FARM DIGITAL SOLUTIONS.
                     </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => { setShowResetModal(false); setStep(1); }}
        title="SYSTEM CLEARANCE"
        maxWidth="sm"
      >
        <div className="space-y-10 py-6 animate-slide-up">
           <div className={`w-20 h-20 rounded-[28px] border-2 flex items-center justify-center mx-auto shadow-glow ${resetType === 'TRANS' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-primary/10 border-primary/20 text-primary'}`}>
              {resetType === 'TRANS' ? <Trash2 size={40} strokeWidth={3} /> : <XCircle size={40} strokeWidth={3} />}
           </div>
           
           <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Confirm Wipe</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-4">
                 {resetType === 'TRANS' 
                   ? 'Delete all sales, expenses, and log history?' 
                   : 'Permanently delete all catalog products and inventory?'}
              </p>
           </div>

           <div className="bg-muted/10 p-5 rounded-3xl border border-border/10">
              {step === 1 ? (
                 <p className="text-xs font-bold leading-relaxed italic text-muted-foreground text-center opacity-60 px-2">
                    Action is final and cannot be recovered via terminal uplink.
                 </p>
              ) : (
                 <div className="flex items-center gap-4 text-rose-600 bg-rose-500/5 p-4 rounded-xl">
                    <AlertTriangle size={24} className="shrink-0" strokeWidth={3} />
                    <p className="text-[10px] font-black uppercase italic leading-tight">Verification required. This is the terminal step.</p>
                 </div>
              )}
           </div>

           <div className="flex gap-3">
              {step === 1 ? (
                 <>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase text-[9px]" onClick={() => setShowResetModal(false)}>Cancel</Button>
                    <Button variant="primary" className={`flex-1 h-12 rounded-xl font-black uppercase text-[9px] text-white shadow-glow ${resetType === 'TRANS' ? 'bg-rose-600' : 'bg-primary'}`} onClick={() => setStep(2)}>Confirm</Button>
                 </>
              ) : (
                 <>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase text-[9px]" onClick={() => { setShowResetModal(false); setStep(1); }}>Abort</Button>
                    <Button 
                        variant="primary" 
                        className={`flex-1 h-12 rounded-xl font-black uppercase text-[9px] text-white shadow-glow ${resetType === 'TRANS' ? 'bg-rose-600' : 'bg-primary'}`} 
                        onClick={handleReset} 
                        isLoading={isResetting}
                    >
                        Execute Wipe
                    </Button>
                 </>
              )}
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
