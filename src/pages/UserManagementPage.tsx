import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    Calendar,
    X,
    CheckCircle2,
    Search,
    AlertCircle,
    UserCircle,
    Key,
    ShieldCheck,
    Edit2,
    Loader2,
    Lock,
    UserCheck,
    BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import type { User } from '../types';
import { Card, Button, Badge } from '../components/ui';

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

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await adminService.getAllUsers();
            setUsers(data as User[]);
        } catch (err: any) {
            setError(err?.message || 'Failed to retrieve system users');
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
        if (!window.confirm(`Permanently revoke access for ${targetUser.name}?`)) return;
        try {
            await adminService.deleteUser(targetUser.id);
            setUsers(users.filter(u => u.id !== targetUser.id));
        } catch (err: any) {
            alert(err?.message || 'Deletion failed');
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
            alert(err?.message || 'Transaction failed');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isSuperAdmin) return (
      <div className="h-[60vh] flex flex-col items-center justify-center opacity-50 space-y-4">
         <div className="p-6 bg-rose-500/10 rounded-full text-rose-500"><Shield size={48} /></div>
         <h2 className="text-2xl font-black uppercase tracking-tight italic">Root Restricted</h2>
         <p className="max-w-xs text-center font-medium">User provisioning is restricted to the global super administrator.</p>
      </div>
    );

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase italic">Identity <span className="text-primary italic underline">Vault</span></h1>
                   <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest opacity-60">Provision and manage farm operational personnel</p>
                </div>
                <Button size="lg" className="rounded-2xl px-8 shadow-glow" onClick={handleOpenCreate} leftIcon={UserPlus}>
                   Provision Access
                </Button>
            </div>

            {/* Subheader / Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                 <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input type="text" placeholder="Find staff member..." className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>
                 <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <ShieldCheck size={14} className="text-primary" /> Active Profiles: {users.length}
                 </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isLoading ? (
                    [1,2,3,4].map(i => <Card key={i} className="h-32 animate-pulse opacity-50" />)
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-20">
                       <Users size={80} strokeWidth={1} className="mx-auto mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest italic">No personnel records detected</p>
                    </div>
                ) : (
                    filteredUsers.map(u => (
                        <Card key={u.id} className="relative group hover:border-primary/30 transition-all overflow-hidden" noPadding>
                            <div className="p-6 flex items-start gap-5">
                                <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                                   <UserCircle size={32} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                   <div className="flex justify-between items-start">
                                      <div>
                                         <h3 className="font-extrabold text-lg tracking-tight leading-none">{u.name}</h3>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-60 italic">{u.email}</p>
                                      </div>
                                      <Badge variant={u.role === 'super_admin' ? 'success' : 'default'} className="font-black text-[9px] uppercase tracking-widest">
                                         {getRoleLabel(u.role)}
                                      </Badge>
                                   </div>
                                   <div className="flex items-center gap-6 pt-2">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                         <Calendar size={12} />
                                         <span className="text-[9px] font-bold uppercase">{new Date(u.createdAt || '').toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-emerald-500">
                                         <UserCheck size={12} />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Active Access</span>
                                      </div>
                                   </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 p-2 flex justify-end gap-2 border-t border-border/50">
                               <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary"><Edit2 size={14} /></Button>
                               {u.id !== user?.id && (
                                 <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></Button>
                               )}
                            </div>
                            {u.id === user?.id && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-[40px] flex items-center justify-center text-primary pl-4 pb-4"><BadgeCheck size={16} /></div>}
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                    <Card className="w-full max-w-lg shadow-2xl rounded-[32px] overflow-hidden" noPadding title={isEditMode ? 'Modify Personnel' : 'Provision Identity'}>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Identity Name</label>
                                   <div className="relative group">
                                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                      <input type="text" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Silas Okon" />
                                   </div>
                                </div>
                                
                                {!isEditMode && (
                                  <>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Operational Email</label>
                                       <div className="relative group">
                                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                          <input type="email" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="staff@lifeline.com" />
                                       </div>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Secure Passkey</label>
                                       <div className="relative group">
                                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                          <input type="password" required className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm transition-all" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                                       </div>
                                    </div>
                                  </>
                                )}

                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Security Clearance Role</label>
                                   <div className="relative group">
                                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                      <select className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:border-primary font-bold text-sm appearance-none cursor-pointer transition-all" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                          <option value="super_admin">ROOT (Full System Access)</option>
                                          <option value="manager">MANAGER (Ops & Analytics)</option>
                                          <option value="sales_staff">SALES TERMINAL (Vending)</option>
                                          <option value="inventory_staff">STORAGE CLERK (Stock)</option>
                                          <option value="accountant">FISCAL AUDITOR (Finance)</option>
                                          <option value="worker">OPERATIONAL (Limited)</option>
                                      </select>
                                   </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                               <Button variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setIsModalOpen(false)}>Abort</Button>
                               <Button type="submit" className="flex-1 rounded-2xl py-6 shadow-glow" disabled={isSaving} leftIcon={isSaving ? Loader2 : CheckCircle2}>{isSaving ? 'Processing...' : 'Provision Access'}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
