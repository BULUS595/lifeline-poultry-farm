import React from 'react';
import { 
  Globe, 
  Phone, 
  Building, 
  ExternalLink, 
  User, 
  Shield, 
  Calendar, 
  LogOut, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  ChevronRight,
  ShieldAlert,
  Fingerprint,
  Users,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/ui';

export const ProfilePage: React.FC = () => {
  const { user, logout, getRoleLabel } = useAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-slide-up">
      {/* Profile Header Hero */}
      <div className="relative group">
        <div className="h-64 w-full bg-slate-900 rounded-[48px] border-4 border-border/40 overflow-hidden relative shadow-premium">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-emerald-500/20 opacity-60 group-hover:scale-110 transition-transform duration-1000" />
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
           <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>
        
        <div className="absolute -bottom-16 left-12 flex flex-col md:flex-row items-center md:items-end gap-10">
          <div className="relative">
             <div className="w-44 h-44 rounded-[48px] bg-card border-[12px] border-background shadow-premium flex items-center justify-center p-3 overflow-hidden relative group-hover:scale-105 transition-all duration-500">
               <div className="w-full h-full bg-primary/10 rounded-[36px] flex items-center justify-center border-4 border-primary/20 relative overflow-hidden">
                 <User size={80} className="text-primary group-hover:scale-110 transition-transform duration-500" strokeWidth={2.5} />
                 <div className="absolute inset-0 bg-primary/5 animate-pulse" />
               </div>
             </div>
             <div className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-glow border-4 border-background group-hover:rotate-12 transition-all">
                <ShieldCheck size={24} strokeWidth={3} />
             </div>
          </div>
          
          <div className="mb-6 space-y-3 text-center md:text-left">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none drop-shadow-sm">{user?.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <Badge variant="primary" className="text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2 shadow-glow italic bg-primary/20 border-primary/40">
                  <Fingerprint size={14} className="mr-2 inline" strokeWidth={3} />
                  {getRoleLabel()}
               </Badge>
               <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 px-4 py-1.5 rounded-xl border border-border/40">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-glow animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Node-Active</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-32 pt-16">
        {/* Left Column: Essential Identity */}
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-[48px] bg-card/40 backdrop-blur-xl border-border/40 shadow-premium p-0 overflow-hidden" noPadding>
            <div className="px-10 py-8 border-b border-border/20 bg-muted/5 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary"><Terminal size={20} strokeWidth={3} /></div>
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">Identity Vault</h2>
               </div>
               <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest opacity-40 border-border/40">SECURE-LEVEL-L3</Badge>
            </div>
            
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <Label className="ml-1 opacity-40">Forensic Identity Mark</Label>
                  <div className="px-6 py-5 bg-background shadow-inner rounded-[24px] border border-border/30 group hover:border-primary/30 transition-all">
                     <p className="text-lg font-black tracking-tight uppercase italic">{user?.name}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="ml-1 opacity-40">Operational Designation</Label>
                  <div className="px-6 py-5 bg-background shadow-inner rounded-[24px] border border-border/30 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <p className="text-lg font-black tracking-tight uppercase italic text-primary">{user?.role?.replace('_', ' ')}</p>
                    <Badge variant="success" className="h-6 px-3 text-[9px] font-black uppercase italic shadow-sm">Verified</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="ml-1 opacity-40">Authorization Protocol</Label>
                  <div className="px-6 py-5 bg-background shadow-inner rounded-[24px] border border-border/30 flex items-center gap-4 group hover:border-primary/30 transition-all">
                     <div className="p-2 bg-primary/5 rounded-lg text-primary"><Shield size={20} strokeWidth={2.5} /></div>
                     <p className="text-lg font-black tracking-tighter uppercase italic">
                        {user?.role === 'super_admin' ? 'Root Restricted' : 'Global Operations'}
                     </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                   <Label className="ml-1 opacity-40">Vetted Since Date</Label>
                   <div className="px-6 py-5 bg-background shadow-inner rounded-[24px] border border-border/30 flex items-center gap-4 group hover:border-primary/30 transition-all">
                      <div className="p-2 bg-emerald-500/5 rounded-lg text-emerald-500"><Calendar size={20} strokeWidth={2.5} /></div>
                      <p className="text-lg font-black tracking-tighter uppercase italic tabular-nums">March 25, 2026</p>
                   </div>
                </div>
              </div>
              
              <div className="mt-12 pt-10 border-t border-border/20 flex flex-col md:flex-row gap-6">
                 <Button variant="danger" size="lg" className="flex-1 rounded-3xl py-8 text-lg font-black tracking-tighter italic shadow-glow group overflow-hidden relative" onClick={logout}>
                    <span className="relative z-10 flex items-center justify-center">
                       <LogOut className="mr-4 w-6 h-6 group-hover:-translate-x-2 transition-transform duration-300" strokeWidth={3} /> 
                       Log Out of Terminal
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                 </Button>
                 <Button variant="outline" size="lg" className="flex-1 rounded-3xl py-8 text-[11px] font-black tracking-[0.2em] uppercase bg-card/40 border-border/40 hover:bg-card">
                    System Synchronization
                 </Button>
              </div>
            </div>
          </Card>
          
          {/* Security Alert Badge */}
          <div className="bg-rose-500/5 border-2 border-dashed border-rose-500/20 rounded-[32px] p-8 flex items-start gap-6 group hover:bg-rose-500/10 transition-all duration-500">
              <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20 shadow-glow group-hover:scale-110 transition-transform duration-500">
                  <ShieldAlert size={28} className="text-rose-500 animate-pulse" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">Operational Integrity Protocol</h4>
                  <p className="text-sm font-black italic text-muted-foreground leading-relaxed opacity-60">
                    Your account is currently utilized as a primary authentication node. All activities recorded within this terminal session are forensic-logged for audit purposes. Ensure terminal is exited securely after use.
                  </p>
              </div>
          </div>
        </div>

        {/* Right Column: Support & Infrastructure */}
        <div className="space-y-10">
           <Card className="rounded-[44px] bg-card/40 backdrop-blur-xl border-border/40 shadow-premium p-0" noPadding>
              <div className="p-10 space-y-10">
                 <div>
                    <h3 className="text-xl font-black tracking-tighter uppercase italic">Control Center</h3>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40 mt-1 italic">Dedicated developer support infrastructure</p>
                 </div>
                 
                 <div className="space-y-4">
                   <a 
                     href="tel:09169598057" 
                     className="flex items-center p-6 rounded-[32px] bg-background border-2 border-border/20 hover:border-primary/50 transition-all group shadow-sm relative overflow-hidden"
                   >
                     <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mr-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm relative z-10">
                       <Phone className="text-primary" size={24} strokeWidth={2.5} />
                     </div>
                     <div className="flex-1 relative z-10">
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40 mb-1">Direct Comms</p>
                       <p className="text-lg font-black italic tabular-nums tracking-tight">0916 959 8057</p>
                     </div>
                     <div className="p-2 border border-border/40 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all relative z-10">
                        <ChevronRight size={18} strokeWidth={3} />
                     </div>
                     <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                   </a>

                   <a 
                     href="https://azure-website-gray.vercel.app" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center p-6 rounded-[32px] bg-background border-2 border-border/20 hover:border-primary/50 transition-all group shadow-sm relative overflow-hidden"
                   >
                     <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mr-6 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-sm relative z-10">
                       <Globe className="text-emerald-500" size={24} strokeWidth={2.5} />
                     </div>
                     <div className="flex-1 relative z-10">
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40 mb-1">Global Portal</p>
                       <p className="text-lg font-black italic tracking-tighter">azure-dev.team</p>
                     </div>
                     <div className="p-2 border border-border/40 rounded-lg group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all relative z-10">
                        <ExternalLink size={18} strokeWidth={3} />
                     </div>
                     <div className="absolute inset-0 bg-emerald-500/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                   </a>
                 </div>
                 
                 <div className="p-8 bg-slate-900 rounded-[36px] border-4 border-slate-800 shadow-xl space-y-5 relative overflow-hidden group">
                     <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                           <Building className="text-primary" size={20} strokeWidth={3} />
                        </div>
                        <h3 className="font-black tracking-tighter uppercase italic text-white text-lg">Azure Dev <span className="text-primary italic">Node</span></h3>
                     </div>
                     <p className="text-[10px] text-slate-400 font-black leading-relaxed italic uppercase tracking-widest relative z-10 opacity-70">
                       "Spearheading digital sovereignty through localized farm intelligence and clean architecture."
                     </p>
                     <div className="flex items-center gap-4 pt-2 relative z-10">
                        <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500 font-black tracking-widest px-3">VER V.4.0.1</Badge>
                        <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500 font-black tracking-widest px-3">EST. 2024</Badge>
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                 </div>
              </div>
           </Card>

           <Card className="rounded-[40px] bg-emerald-500/5 border-emerald-500/20 p-8 shadow-sm flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-sm"><Zap size={24} strokeWidth={3} /></div>
              <div>
                 <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest italic leading-none mb-1">System Efficiency</p>
                 <h4 className="text-xl font-black italic tracking-tighter text-foreground">Peak Operations</h4>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
