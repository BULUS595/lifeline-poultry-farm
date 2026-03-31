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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal, Label } from '../components/ui';
import { supabaseDataService } from '../services/supabaseService';

export const ProfilePage: React.FC = () => {
  const { user, logout, getRoleLabel } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [step, setStep] = useState(1);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await supabaseDataService.clearOperationalData();
      if (res.success) {
        alert('System Reset Complete. All records have been cleared for launch.');
        setShowResetModal(false);
        setStep(1);
      } else {
        alert('Reset failed: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('A critical error occurred during reset.');
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
                  <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Access Level</Label>
                  <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20 flex items-center gap-3">
                     <Shield size={18} className="text-primary" strokeWidth={2.5} />
                     <p className="font-bold text-lg uppercase">
                        {user?.role === 'super_admin' ? 'Administrator' : 'Standard User'}
                     </p>
                  </div>
                </div>
                <div className="space-y-2">
                   <Label className="ml-1 opacity-40 uppercase text-[9px] font-bold tracking-widest">Session</Label>
                   <div className="px-5 py-4 bg-muted/5 rounded-[20px] border border-border/20 flex items-center gap-3">
                      <Calendar size={18} className="text-emerald-500" strokeWidth={2.5} />
                      <p className="font-bold text-lg uppercase tracking-tight">Active</p>
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
             <div className="bg-rose-500/5 border-2 border-dashed border-rose-500/20 rounded-[40px] p-10 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-sm shrink-0">
                         <Database className="text-rose-500" size={32} strokeWidth={3} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tighter uppercase leading-none text-rose-500">System Reset</h3>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-50">Clear all transactional records</p>
                      </div>
                   </div>
                   <Button variant="danger" className="w-full md:w-auto rounded-xl h-14 px-8 font-black uppercase text-xs shadow-lg" onClick={() => setShowResetModal(true)}>
                      <RefreshCw size={18} className="mr-3" strokeWidth={3} /> Start Reset
                   </Button>
                </div>
                <p className="text-xs font-bold text-rose-700/60 leading-relaxed italic px-2">
                   * This will delete all sales, mortality, feeding, and activity logs. Inventory items are kept.
                </p>
             </div>
          )}

          <div className="bg-slate-900 border-2 border-slate-800 rounded-[32px] p-8 flex items-center gap-6">
              <ShieldAlert size={28} className="text-primary shrink-0" strokeWidth={2.5} />
              <p className="text-xs font-bold italic text-slate-400 leading-relaxed opacity-60">
                All changes are logged. Sign out when finished with your administrative tasks.
              </p>
          </div>
        </div>

        <div className="space-y-10">
           <Card className="rounded-[40px] border-border/40 shadow-premium p-0" noPadding>
              <div className="p-8 border-b border-border/20 bg-muted/5">
                 <h3 className="text-xl font-black uppercase tracking-tighter">Support & Hub</h3>
              </div>
              <div className="p-8 space-y-6">
                 <a href="tel:09169598057" className="flex items-center p-5 rounded-2xl bg-muted/5 border border-border/20 group">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                     <Phone className="text-primary" size={20} strokeWidth={2.5} />
                   </div>
                   <div>
                     <p className="text-[9px] font-bold uppercase opacity-40 mb-0.5">Admin Support</p>
                     <p className="text-lg font-black italic">0916 959 8057</p>
                   </div>
                 </a>
                 <a href="https://azure-website-gray.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center p-5 rounded-2xl bg-muted/5 border border-border/20 group">
                   <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                     <Globe className="text-emerald-500" size={20} strokeWidth={2.5} />
                   </div>
                   <div>
                     <p className="text-[9px] font-bold uppercase opacity-40 mb-0.5">Developer Site</p>
                     <p className="text-lg font-black italic">azure-dev.team</p>
                   </div>
                 </a>
                 <div className="p-6 bg-slate-900 rounded-[28px] border-2 border-slate-800 space-y-4">
                     <div className="flex items-center gap-3">
                        <Zap className="text-primary" size={18} strokeWidth={3} />
                        <h3 className="font-black uppercase italic text-white">Azure Dev</h3>
                     </div>
                     <p className="text-[10px] text-slate-400 font-bold italic uppercase tracking-widest opacity-60">
                       Enterprise farm management & digital solutions.
                     </p>
                     <div className="flex gap-2">
                        <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500 px-3">VER 4.2.0</Badge>
                     </div>
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
           <div className="w-20 h-20 bg-rose-500/10 rounded-[28px] border-2 border-rose-500/20 flex items-center justify-center mx-auto text-rose-600 shadow-glow shadow-rose-600/10">
              <Trash2 size={40} strokeWidth={3} />
           </div>
           
           <div className="text-center space-y-3">
              <h3 className="text-3xl font-black tracking-tighter italic uppercase">Security Reset</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-4 text-center">Clear data logs to prepare for business launch.</p>
           </div>

           <div className="bg-muted/10 p-6 rounded-3xl border border-rose-500/10">
              {step === 1 ? (
                 <p className="text-sm font-bold leading-relaxed italic text-muted-foreground text-center">
                    This will delete all sales, expenses, mortality, and activity records. Are you sure?
                 </p>
              ) : (
                 <div className="flex items-center gap-4 text-rose-600 bg-rose-500/5 p-4 rounded-xl">
                    <AlertTriangle size={28} className="shrink-0" strokeWidth={3} />
                    <p className="text-xs font-black uppercase italic leading-tight">This is the final confirmation. Action cannot be undone.</p>
                 </div>
              )}
           </div>

           <div className="flex gap-4">
              {step === 1 ? (
                 <>
                    <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold uppercase text-xs" onClick={() => setShowResetModal(false)}>Cancel</Button>
                    <Button variant="primary" className="flex-1 h-14 rounded-xl font-black uppercase text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-glow" onClick={() => setStep(2)}>Verify</Button>
                 </>
              ) : (
                 <>
                    <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold uppercase text-xs" onClick={() => { setShowResetModal(false); setStep(1); }}>Abort</Button>
                    <Button 
                        variant="primary" 
                        className="flex-1 h-14 rounded-xl font-black uppercase text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-glow shadow-rose-600/20" 
                        onClick={handleReset} 
                        isLoading={isResetting}
                    >
                        Execute Reset
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
