import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    LogOut,
    PieChart,
    ClipboardList,
    Utensils,
    Wallet,
    History,
    ShoppingCart,
    Package,
    ShieldCheck,
    Briefcase,
    TrendingUp,
    ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import styles from './AppSidebar.module.css';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    name: string;
    icon: React.ReactNode;
    path: string;
    roles: string[];
    badge?: number;
}

export const AppSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout, getRoleLabel } = useAuth();
    const { counts } = useNotifications();

    const sections = [
        {
            title: 'Core Hub',
            items: [
                {
                    name: 'Dashboard',
                    icon: <LayoutDashboard size={20} />,
                    path: '/dashboard',
                    roles: ['super_admin', 'admin', 'manager']
                },
                {
                    name: 'Sales Terminal',
                    icon: <ShoppingCart size={20} />,
                    path: '/sales',
                    roles: ['super_admin', 'admin', 'manager', 'sales_staff', 'sales'],
                    badge: counts.newApproved,
                },
                {
                    name: 'Stock Submissions',
                    icon: <Package size={20} />,
                    path: '/stock',
                    roles: ['super_admin', 'admin', 'manager', 'inventory_staff', 'inventory_officer'],
                    badge: counts.pendingFeedback,
                },
                {
                    name: 'Analytics',
                    icon: <PieChart size={20} />,
                    path: `/farms/dummy/analytics`,
                    roles: ['super_admin', 'admin', 'manager']
                },
                {
                    name: 'Profit/Loss',
                    icon: <TrendingUp size={20} />,
                    path: `/farms/dummy/analytics`,
                    roles: ['super_admin', 'admin', 'manager']
                },
            ] as NavItem[]
        },
        {
            title: 'Reporting',
            items: [
                {
                    name: 'Mortality Logs',
                    icon: <ClipboardList size={20} />,
                    path: `/farms/dummy/mortality-logs`,
                    roles: ['super_admin', 'admin', 'manager', 'inventory_staff', 'inventory_officer']
                },
                {
                    name: 'Feeding Logs',
                    icon: <Utensils size={20} />,
                    path: `/farms/dummy/feeding-logs`,
                    roles: ['super_admin', 'admin', 'manager', 'inventory_staff', 'inventory_officer']
                },
                {
                    name: 'Expenses',
                    icon: <Wallet size={20} />,
                    path: `/farms/dummy/expenses`,
                    roles: ['super_admin', 'admin', 'manager']
                },
            ] as NavItem[]
        },
        {
            title: 'Administration',
            items: [
                {
                    name: 'Stock Approval',
                    icon: <ClipboardCheck size={20} />,
                    path: '/admin/stock',
                    roles: ['super_admin', 'admin', 'manager'],
                    badge: counts.pendingApproval,
                },
                {
                    name: 'Sold Goods',
                    icon: <Wallet size={20} />,
                    path: '/admin/sales',
                    roles: ['super_admin', 'admin', 'manager']
                },
                {
                    name: 'Users / Staff',
                    icon: <Users size={20} />,
                    path: '/admin/users',
                    roles: ['super_admin', 'admin']
                },
                {
                    name: 'System Monitor',
                    icon: <History size={20} />,
                    path: '/admin/activity',
                    roles: ['super_admin', 'admin', 'manager', 'auditor']
                },
                {
                    name: 'Developer Profile',
                    icon: <Briefcase size={20} />,
                    path: '/profile',
                    roles: ['super_admin', 'admin', 'manager', 'accountant', 'auditor', 'sales_staff', 'sales', 'inventory_staff', 'inventory_officer', 'worker', 'staff']
                },
            ] as NavItem[]
        }
    ];

    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>🐔</div>
                    <div className={styles.logoTextWrapper}>
                        <span className={styles.logoText}>Lifeline</span>
                        <span className={styles.logoVersion}>Operational Suite</span>
                    </div>
                </div>
            </div>

            <div className={styles.scrollArea}>
                <div className={styles.profileSummary}>
                    <div className={styles.profileDetails}>
                        <span className={styles.profileName}>{user?.name || 'Identity Unknown'}</span>
                        <div className={styles.roleBadge}>
                            <Briefcase size={10} />
                            <span>{getRoleLabel()}</span>
                        </div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {sections.map((section, sidx) => {
                        const visibleItems = section.items.filter(item => {
                            if (!user) return false;
                            return item.roles.includes(user.role);
                        });

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={sidx} className={styles.navSection}>
                                <h3 className={styles.sectionTitle}>{section.title}</h3>
                                <ul className={styles.navList}>
                                    {visibleItems.map((item) => (
                                        <li key={item.name} className={styles.navItem}>
                                            <NavLink
                                                to={item.path}
                                                className={({ isActive }) =>
                                                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                                                }
                                                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                            >
                                                <span className={styles.navIcon}>{item.icon}</span>
                                                <span className={styles.navText}>{item.name}</span>
                                                {/* Badge — only show if > 0 */}
                                                {item.badge !== undefined && item.badge > 0 && (
                                                    <span className={styles.navBadge}>
                                                        {item.badge > 99 ? '99+' : item.badge}
                                                    </span>
                                                )}
                                                <div className={styles.activeIndicator} />
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </nav>
            </div>

            <div className={styles.sidebarFooter}>
                <div className={styles.footerInner}>
                    <button className={styles.footerLink} onClick={logout}>
                        <LogOut size={18} />
                        <span>Sign out</span>
                    </button>
                    <div className={styles.systemBadge}>
                        <ShieldCheck size={12} />
                        <span>v2.4 SECURED</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
