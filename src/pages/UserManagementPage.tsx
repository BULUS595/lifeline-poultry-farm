import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    Calendar,
    Search,
    UserCircle,
    ShieldCheck,
    Edit2,
    Loader2,
    Lock,
    BadgeCheck,
    CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import type { User } from '../types';
import { Card, Button, Badge, Modal, Input, Label, Select } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

export const UserManagementPage: React.FC = () => {
    const { user, isSuperAdmin, getRoleLabel } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'worker' as string,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [actingUserId, setActingUserId] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await adminService.getAllUsers();
            setUsers(data as User[]);
        } catch (err: any) {
            setError(err?.message || 'Terminal link to identity vault failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setSelectedUserId(null);
        setFormData({ name: '', email: '', password: '', role: 'worker' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (targetUser: User) => {
        setIsEditMode(true);
        setSelectedUserId(targetUser.id);
        setFormData({ name: targetUser.name, email: targetUser.email, password: '', role: targetUser.role });
        setIsModalOpen(true);
    };

    const handleDelete = async (targetUser: User) => {
        if (targetUser.id === user?.id) return;
        if (!window.confirm(`Permanently revoke access for ${targetUser.name}? Security clearance will be terminated.`)) return;
        setActingUserId(targetUser.id);
        try {
            await adminService.deleteUser(targetUser.id);
            setUsers(users.filter(u => u.id !== targetUser.id));
        } catch (err: any) {
            alert(err?.message || 'Access termination failed — link error.');
        } finally {
            setActingUserId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditMode && selectedUserId) {
                await adminService.updateUser(selectedUserId, { name: formData.name, role: formData.role });
                setUsers(users.map(u => u.id === selectedUserId ? { ...u, name: formData.name, role: formData.role as any } : u));
            } else {
                const newUser = await adminService.createUser({ name: formData.name, email: formData.email, password: formData.password || undefined, role: formData.role });
                setUsers([newUser, ...users]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            alert(err?.message || 'Provisioning protocol failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isSuperAdmin) return (
      <div className="h-[70vh] flex flex-col items-center justify-center animate-slide-up px-6">
         <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
            <Lock size={48} strokeWidth={2.5} />
         </div>
         <div className="text-center space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Root Clearance <span className="text-rose-500 italic underline">Required</span></h2>
            <p className="max-w-md font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">Identity vault management is restricted to global super administrators only.</p>
         </div>
         <Button variant="secondary" className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" onClick={() => window.history.back()}>
            Return to Operations
         </Button>
      </div>
    );

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-20 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end px-2">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none shrink-0">
                     Identity <span className="text-primary italic underline underline-offset-8 decoration-4">Vault</span>
                   </h1>
                   <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-3 opacity-40">System-wide personnel provisioning</p>
                </div>
                <Button size="lg" className="rounded-3xl px-10 py-8 text-lg shadow-glow font-black uppercase tracking-tight italic" onClick={handleOpenCreate}>
                   <UserPlus className="mr-3 w-6 h-6" strokeWidth={3} /> Authorize New Staff
                </Button>
            </div>

            {/* Subheader / Search */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-card/40 backdrop-blur-xl p-6 rounded-[40px] border border-border/40 shadow-premium">
                 <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} strokeWidth={2.5} />
                    <Input type="text" placeholder="Scan identification records..." className="pl-14 pr-6 py-4 rounded-2xl border-border/40 shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>
                 <div className="flex items-center gap-4 bg-primary/5 px-6 py-4 rounded-2xl border border-primary/20 text-[10px] font-black uppercase tracking-[0.15em] text-primary shadow-glow">
                    <ShieldCheck size={18} strokeWidth={2.5} className="animate-pulse" />
                    Authorized Operational Profiles: {users.length}
                 </div>
            </div>

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {isLoading ? (
                    [1,2,3,4].map(i => <Skeleton key={i} height={180} borderRadius={32} />)
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full py-28 text-center bg-muted/10 rounded-[48px] border-4 border-dashed border-border/40 opacity-40">
                       <Users size={120} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                       <h3 className="text-2xl font-black uppercase italic tracking-tighter px-4">Zero identities registered in vault</h3>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 max-w-sm mx-auto opacity-60">System stands ready for new personnel provisioning</p>
                    </div>
                ) : (
                    filteredUsers.map(u => (
                        <Card key={u.id} className="relative group hover:border-primary/40 transition-all duration-500 overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm p-0" noPadding>
                            <div className="p-8 flex items-start gap-6">
                                <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-primary/20 shadow-glow relative">
                                   <UserCircle size={40} strokeWidth={2.5} />
                                   {u.id === user?.id && (
                                       <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg ring-4 ring-background animate-pulse">
                                           <BadgeCheck size={14} strokeWidth={3} />
                                       </div>
                                   )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-4">
                                   <div className="flex justify-between items-start gap-4">
                                      <div className="min-w-0">
                                         <h3 className="font-black text-2xl tracking-tighter leading-none italic uppercase truncate">{u.name}</h3>
                                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2 opacity-40 italic truncate">{u.email}</p>
                                      </div>
                                      <Badge variant={u.role === 'super_admin' ? 'success' : 'primary'} className="font-black text-[9px] uppercase tracking-widest shrink-0 px-3 py-1.5 shadow-sm">
                                         {getRoleLabel(u.role)}
                                      </Badge>
                                   </div>
                                   <div className="flex items-center gap-6 pt-4 border-t border-border/40">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                         <Calendar size={14} strokeWidth={2.5} />
                                         <span className="text-[10px] font-black uppercase tracking-widest opacity-60 tabular-nums">Provisioned: {new Date(u.createdAt || '').toLocaleDateString()}</span>
                                      </div>
                                      <div className={`flex items-center gap-2 ${u.id === user?.id ? 'text-emerald-500' : 'text-primary'}`}>
                                         <ShieldCheck size={14} strokeWidth={2.5} />
                                         <span className="text-[10px] font-black uppercase tracking-widest leading-none">Security Active</span>
                                      </div>
                                   </div>
                                </div>
                            </div>
                            <div className="bg-muted/10 p-4 px-8 flex justify-end gap-3 border-t border-border/40 group-hover:bg-primary/5 transition-colors">
                               <Button variant="outline" size="icon" onClick={() => handleOpenEdit(u)} className="h-12 w-12 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/30"><Edit2 size={18} strokeWidth={2.5} /></Button>
                               {u.id !== user?.id && (
                                 <Button variant="outline" size="icon" onClick={() => handleDelete(u)} className="h-12 w-12 rounded-xl text-muted-foreground hover:text-rose-500 hover:border-rose-500/30" isLoading={actingUserId === u.id} disabled={!!actingUserId}><Trash2 size={18} strokeWidth={2.5} /></Button>
                               )}
                            </div>
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700 pointer-events-none" />
                        </Card>
                    ))
                )}
            </div>

            {/* Modal Provisioning Form */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? 'Modify Personnel Credentials' : 'Provision System Identity'}
                maxWidth="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-10 py-2">
                    <div className="space-y-6">
                        <div className="space-y-2.5">
                           <Label htmlFor="staff-name">Identity Full Name</Label>
                           <div className="relative group">
                              <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                              <Input id="staff-name" type="text" required className="pl-14 h-15 rounded-2xl" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Enter personnel designation" />
                           </div>
                        </div>
                        
                        {!isEditMode && (
                          <>
                            <div className="space-y-2.5">
                               <Label htmlFor="staff-email">Operational Channel (Email)</Label>
                               <div className="relative group">
                                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                                  <Input id="staff-email" type="email" required className="pl-14 h-15 rounded-2xl" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="staff@lifeline.system" />
                               </div>
                            </div>
                            <div className="space-y-2.5">
                               <Label htmlFor="staff-pass">Secure Authorization Passkey</Label>
                               <div className="relative group">
                                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                                  <Input id="staff-pass" type="password" required className="pl-14 h-15 rounded-2xl" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••••••" />
                               </div>
                            </div>
                          </>
                        )}

                        <div className="space-y-2.5">
                           <Label htmlFor="staff-role">Security Clearance Clearance Level</Label>
                           <div className="relative group">
                              <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                              <Select id="staff-role" className="pl-14 h-15 rounded-2xl cursor-pointer" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                  <option value="super_admin">ROOT SECURITY (GLOBAL ACCESS)</option>
                                  <option value="manager">MGR-X (OPS & ANALYSIS)</option>
                                  <option value="sales_staff">TER-V (SALES VENDING)</option>
                                  <option value="inventory_staff">LOG-S (STORAGE CLERK)</option>
                                  <option value="accountant">FIS-A (FISCAL AUDITOR)</option>
                                  <option value="worker">STAFF (LIMITED ACCESS)</option>
                              </Select>
                           </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-6">
                       <Button variant="outline" className="flex-1 rounded-3xl py-8 h-18 font-black uppercase tracking-widest text-[10px]" onClick={() => setIsModalOpen(false)}>Abort Protocol</Button>
                       <Button type="submit" className="flex-1 rounded-3xl py-8 h-18 shadow-glow font-black uppercase tracking-widest text-[11px] italic" disabled={isSaving} leftIcon={isSaving ? Loader2 : CheckCircle2}>
                          {isSaving ? 'Processing...' : (isEditMode ? 'Authorize Update' : 'Initialize Provisioning')}
                       </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagementPage;
