import React, { useState } from 'react';
import { X, Sun, Moon, Maximize, Minimize, Check, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { theme, toggleTheme, accent, setAccent, density, setDensity } = useTheme();
    const { user, updateUser } = useAuth();
    const [userName, setUserName] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const accents: { name: string, value: any, color: string }[] = [
        { name: 'Teal', value: 'teal', color: '#1ABC9C' },
        { name: 'Blue', value: 'blue', color: '#3498DB' },
        { name: 'Indigo', value: 'indigo', color: '#6366f1' },
        { name: 'Emerald', value: 'emerald', color: '#10b981' },
        { name: 'Rose', value: 'rose', color: '#f43f5e' },
        { name: 'Amber', value: 'amber', color: '#f59e0b' },
    ];

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (userName !== user?.name) {
                await updateUser({ name: userName });
            }
            onClose();
        } catch (err) {
            console.error('Failed to update name:', err);
            alert('Encountered an error while attempting to update identity profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal} animate-scale`} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>System Preferences</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    {/* Identity Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Identity</h3>
                        <div className={styles.inputGroup}>
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your identity name..."
                            />
                        </div>
                    </div>

                    {/* Appearance Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Appearance</h3>

                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Theme Mode</span>
                                <span className={styles.settingDesc}>Switch between light and dark interface.</span>
                            </div>
                            <button className={styles.toggleBtn} onClick={toggleTheme}>
                                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                            </button>
                        </div>

                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Interface Density</span>
                                <span className={styles.settingDesc}>Choose how spacious the layout feels.</span>
                            </div>
                            <div className={styles.segmentControl}>
                                <button
                                    className={density === 'spacious' ? styles.active : ''}
                                    onClick={() => setDensity('spacious')}
                                >
                                    <Maximize size={16} /> Spacious
                                </button>
                                <button
                                    className={density === 'compact' ? styles.active : ''}
                                    onClick={() => setDensity('compact')}
                                >
                                    <Minimize size={16} /> Compact
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Accent Color Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Accent Color</h3>
                        <div className={styles.colorGrid}>
                            {accents.map(a => (
                                <button
                                    key={a.value}
                                    className={`${styles.colorOption} ${accent === a.value ? styles.activeColor : ''}`}
                                    style={{ '--option-color': a.color } as any}
                                    onClick={() => setAccent(a.value)}
                                    title={a.name}
                                >
                                    {accent === a.value && <Check size={16} color="#fff" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Apply Preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
};
