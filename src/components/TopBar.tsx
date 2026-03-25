import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Menu,
    User as UserIcon,
    LifeBuoy,
    LogOut,
    ChevronDown,
    Sun,
    Moon,
    Settings as SettingsIcon,
    AlertCircle,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { SettingsModal } from './SettingsModal';
import styles from './TopBar.module.css';

interface TopBarProps {
    onMenuToggle: () => void;
    title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, title = 'Dashboard' }) => {
    const { user, logout, getRoleLabel } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { notifications, markAsRead, clearAll } = useNotifications();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotifClick = (id: string, path?: string) => {
        markAsRead(id);
        setIsNotifOpen(false);
        if (path) navigate(path);
    };

    const getNotifIcon = (message: string) => {
        if (message.includes('Approved')) return <CheckCircle2 size={16} color="var(--color-success)" />;
        if (message.includes('Rejected')) return <XCircle size={16} color="var(--color-danger)" />;
        return <AlertCircle size={16} color="var(--color-primary)" />;
    };

    return (
        <header className={styles.topBar}>
            <div className={styles.topBarLeft}>
                <button className={styles.menuToggle} onClick={onMenuToggle} aria-label="Toggle Menu">
                    <Menu size={22} />
                </button>
                <div className={styles.titleWrapper}>
                    <h1 className={styles.barTitle}>{title}</h1>
                </div>
            </div>

            <div className={styles.topBarRight}>
                <button
                    className={styles.iconBtn}
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label="Settings"
                >
                    <SettingsIcon size={20} />
                </button>

                <button
                    className={styles.iconBtn}
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className={styles.notifContainer} ref={notifRef}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </button>

                    {isNotifOpen && (
                        <div className={styles.notifDropdown}>
                            <div className={styles.notifHeader}>
                                <h3>Alert Center</h3>
                                {unreadCount > 0 && <button className={styles.clearBtn} onClick={clearAll}>Clear All</button>}
                            </div>
                            <div className={styles.notifList}>
                                {notifications.length > 0 ? (
                                    notifications.map(n => (
                                        <button
                                            key={n.id}
                                            className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ''}`}
                                            onClick={() => handleNotifClick(n.id)}
                                        >
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {getNotifIcon(n.message)}
                                                <div style={{ flex: 1 }}>
                                                    <div className={styles.notifMsg}>{n.message}</div>
                                                    <div className={styles.notifTime}>
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className={styles.notifEmpty}>
                                        <Bell size={40} opacity={0.1} />
                                        <p>Nothing waiting for attention</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.userProfile} ref={profileRef}>
                    <button
                        className={styles.profileBtn}
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        <div className={styles.avatar}>
                            {user?.name?.charAt(0) || <UserIcon size={18} />}
                        </div>
                        <div className={styles.userMeta}>
                            <span className={styles.metaTitle}>{user?.name || 'Authorized Staff'}</span>
                            <span className={styles.metaSubtitle}>{getRoleLabel()}</span>
                        </div>
                        <ChevronDown size={14} className={`${isProfileOpen ? styles.rotate : ''}`} />
                    </button>

                    {isProfileOpen && (
                        <div className={styles.dropdown}>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{user?.name}</div>
                                <div className={styles.userRole}>{getRoleLabel()}</div>
                            </div>
                            <div className={styles.divider}></div>
                            <button className={styles.dropdownItem} onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }}>
                                <SettingsIcon size={16} /> Identity Settings
                            </button>
                            <button className={styles.dropdownItem} onClick={() => alert('Infrastructure Support: Our technical response team has been notified. We will reach out via your registered internal email if further diagnostic data is required.')}>
                                <LifeBuoy size={16} /> Tech Response
                            </button>
                            <div className={styles.divider}></div>
                            <button onClick={logout} className={`${styles.dropdownItem} ${styles.logoutText}`}>
                                <LogOut size={16} /> System Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </header>
    );
};
