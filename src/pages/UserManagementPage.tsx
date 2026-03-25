/* eslint-disable @typescript-eslint/no-explicit-any */
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
    Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { adminService } from '../services/adminService';
import type { User } from '../types';
import styles from './UserManagementPage.module.css';

export const UserManagementPage: React.FC = () => {
    const { user, isSuperAdmin, getRoleLabel } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
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
            setError(err?.message || 'Failed to authenticate and retrieve system users.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setSelectedUserId(null);
        setFormData({ name: '', email: '', password: '', role: 'worker' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (targetUser: User) => {
        setIsEditMode(true);
        setSelectedUserId(targetUser.id);
        setFormData({
            name: targetUser.name,
            email: targetUser.email,
            password: '', // Password not editable directly here for security
            role: targetUser.role,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (targetUser: User) => {
        if (targetUser.id === user?.id) {
            alert("Administrative restriction: You cannot delete your own session account.");
            return;
        }
        const confirmDelete = window.confirm(`Permanently remove ${targetUser.name} from the system? This action is logged.`);
        if (!confirmDelete) return;

        try {
            await adminService.deleteUser(targetUser.id);
            setUsers(users.filter(u => u.id !== targetUser.id));
        } catch (err: any) {
            alert(`Resource Error: ${err?.message || 'Unknown collision'}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditMode && selectedUserId) {
                await adminService.updateUser(selectedUserId, {
                    name: formData.name,
                    role: formData.role,
                });
                setUsers(users.map(u => u.id === selectedUserId ? { ...u, name: formData.name, role: formData.role as any } : u));
            } else {
                const newUser = await adminService.createUser({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password || undefined,
                    role: formData.role,
                });
                setUsers([newUser, ...users]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            alert(`Execution Error: ${err?.message || 'Transaction failed'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <Layout title="Permissions Locked">
                <div className="card text-center" style={{ padding: '5rem 2rem' }}>
                    <Shield size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
                    <h2>Unauthorized Access</h2>
                    <p>Access to the personnel database is restricted to the Super Admin role.</p>
                </div>
            </Layout>
        );
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout title="Personnel Management">
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>Operational <span style={{ color: 'var(--color-primary)' }}>Staffing</span></h1>
                        <p className={styles.subtitle}>Directory showing personnel members • Authorized as {getRoleLabel()}</p>
                    </div>
                    <button className="btn-primary" onClick={handleOpenCreate} style={{ height: '48px', padding: '0 32px' }}>
                        <UserPlus size={18} /> Provision User
                    </button>
                </header>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: 'var(--color-secondary)',
                        padding: '0 16px',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                        width: '380px',
                        height: '48px'
                    }}>
                        <Search size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Find staff by identifier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text)', outline: 'none', flex: 1, fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                        <ShieldCheck size={14} /> Global Records: <strong style={{ color: 'var(--color-text)' }}>{users.length}</strong>
                    </div>
                </div>

                {error ? (
                    <div className="card" style={{ borderColor: 'var(--color-danger)', borderStyle: 'dashed' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-danger)' }}>
                            <AlertCircle size={20} />
                            <p style={{ margin: 0 }}>{error}</p>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="card" style={{ height: '80px', animation: 'pulse 2s infinite' }}></div>
                        ))}
                    </div>
                ) : (
                    <div className={`${styles.tableCard} card`}>
                        <div className={styles.tableHeader}>
                            <div>Staff Profile</div>
                            <div>Internal Email</div>
                            <div>Tier Role</div>
                            <div>Created</div>
                            <div style={{ textAlign: 'right' }}>Controls</div>
                        </div>
                        <div className={styles.tableBody}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ padding: '5rem', textAlign: 'center', opacity: 0.3 }}>
                                    <Users size={60} style={{ marginBottom: '1rem' }} />
                                    <p>No active user profiles found.</p>
                                </div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u.id} className={styles.tableRow}>
                                        <div className={styles.colName}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                                <UserCircle size={22} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800 }}>{u.name}</div>
                                                {u.id === user?.id && <span className={styles.badgeYou}>CURRENT ACCOUNT</span>}
                                            </div>
                                        </div>
                                        <div className={styles.colEmail}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={12} style={{ opacity: 0.5 }} /> {u.email}
                                            </div>
                                        </div>
                                        <div className={styles.colRole}>
                                            <span className={`${styles.badge} ${styles['badge-' + u.role?.split('_')?.pop()]}`}>
                                                {getRoleLabel(u.role)}
                                            </span>
                                        </div>
                                        <div className={styles.colDate}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={12} style={{ opacity: 0.5 }} /> {new Date(u.createdAt || new Date()).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button className={styles.editBtn} onClick={() => handleOpenEdit(u)} title="Edit Profile">
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(u)}
                                                disabled={u.id === user?.id}
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL */}
                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                                    {isEditMode ? 'Modify Staff Record' : 'Provision New Identity'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label><UserCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Full Identity Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Silas Okon"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                {!isEditMode && (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label><Mail size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Operational Email</label>
                                            <input
                                                type="email"
                                                placeholder="user@lifeline.com"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label><Key size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Initial Access Key</label>
                                            <input
                                                type="password"
                                                placeholder="Min 6 characters"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <div className={styles.formGroup}>
                                    <label><Shield size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Functional Priority Level</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    >
                                        <option value="super_admin">SUPER ADMIN (Full Access)</option>
                                        <option value="manager">MANAGER (Analytics & Staff)</option>
                                        <option value="sales_staff">SALES STAFF (Terminal Only)</option>
                                        <option value="inventory_staff">INVENTORY STAFF (Stock Only)</option>
                                        <option value="accountant">ACCOUNTANT (Financials)</option>
                                        <option value="auditor">AUDITOR (Read-only Logs)</option>
                                        <option value="worker">OPERATIONAL STAFF (Limited)</option>
                                    </select>
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={isSaving}
                                        style={{ width: '100%' }}
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={isSaving}
                                        style={{ width: '100%' }}
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <>Commit Changes <CheckCircle2 size={18} /></>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default UserManagementPage;
