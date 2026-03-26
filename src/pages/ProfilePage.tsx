import React from 'react';
import { Globe, Phone, Building, ExternalLink, User, Shield, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/ui';

export const ProfilePage: React.FC = () => {
  const { user, logout, getRoleLabel } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="relative">
        <div className="h-48 w-full bg-gradient-to-r from-primary/30 to-emerald-500/20 rounded-[40px] border border-primary/20" />
        <div className="absolute -bottom-12 left-10 flex items-end gap-6">
          <div className="w-32 h-32 rounded-[40px] bg-card border-8 border-background shadow-xl flex items-center justify-center p-2 overflow-hidden">
            <div className="w-full h-full bg-primary/20 rounded-[32px] flex items-center justify-center">
              <User size={64} className="text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">{user?.name}</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60 flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              {getRoleLabel()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20 pt-10">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Account Details" subtitle="Your secure system identity" className="rounded-[40px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</span>
                <p className="text-lg font-extrabold px-5 py-4 bg-muted/30 rounded-2xl border border-border/50">{user?.name}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Assigned Role</span>
                <div className="px-5 py-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center justify-between">
                  <p className="text-lg font-extrabold capitalize">{user?.role?.replace('_', ' ')}</p>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Access Level</span>
                <p className="text-lg font-extrabold px-5 py-4 bg-muted/30 rounded-2xl border border-border/50 uppercase tracking-tighter flex items-center gap-3">
                   <Shield size={18} className="text-primary" /> {user?.role === 'super_admin' ? 'Restricted Root' : 'Standard Operations'}
                </p>
              </div>
              <div className="space-y-1.5">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Status Since</span>
                 <p className="text-lg font-extrabold px-5 py-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center gap-3">
                    <Calendar size={18} className="text-primary" /> Mar 25, 2026
                 </p>
              </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-border/50">
               <Button variant="danger" size="lg" className="rounded-2xl px-10 py-8 text-lg font-black tracking-tighter shadow-glow" onClick={logout} leftIcon={LogOut}>
                  Sign Out of Console
               </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
           <Card title="Support Center" subtitle="Contact development team" className="rounded-[40px]">
              <div className="space-y-4">
                <a 
                  href="tel:09169598057" 
                  className="flex items-center p-5 rounded-3xl bg-muted/20 border border-border/50 hover:border-primary transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                    <Phone className="text-primary" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Immediate Help</p>
                    <p className="text-sm font-black italic">0916 959 8057</p>
                  </div>
                </a>

                <a 
                  href="https://azure-website-gray.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-5 rounded-3xl bg-muted/20 border border-border/50 hover:border-primary transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                    <Globe className="text-primary" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Web Portal</p>
                    <p className="text-sm font-black italic">azure-dev.team</p>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-all" />
                </a>
              </div>
              
              <div className="mt-10 p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3">
                     <Building className="text-primary" />
                     <h3 className="font-black tracking-tighter uppercase italic">Azure Dev Team</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">"Driving excellence through specialized farm management solutions and clean architecture."</p>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
