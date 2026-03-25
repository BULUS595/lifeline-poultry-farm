/**
 * NotificationContext.tsx
 * Real-time notifications and counts for each role.
 */
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { supabase } from '../services/supabaseService';
import { useAuth } from './AuthContext';

export interface StockNotification {
    id: string;
    stock_item_id: string;
    recipient_role: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationCounts {
    pendingApproval: number;
    pendingFeedback: number;
    newApproved: number;
}

interface NotificationContextType {
    notifications: StockNotification[];
    counts: NotificationCounts;
    markAsRead: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<StockNotification[]>([]);
    const [counts, setCounts] = useState<NotificationCounts>({
        pendingApproval: 0,
        pendingFeedback: 0,
        newApproved: 0,
    });

    const refresh = useCallback(async () => {
        if (!user) return;

        try {
            // Map legacy and new role values to catch all notifications
            const rolesToMatch = [];
            if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager') {
                rolesToMatch.push('admin', 'super_admin', 'manager');
            }
            if (user.role === 'inventory_officer' || user.role === 'inventory_staff') {
                rolesToMatch.push('inventory_officer', 'inventory_staff');
            }
            if (user.role === 'sales' || user.role === 'sales_staff') {
                rolesToMatch.push('sales', 'sales_staff');
            }
            if (rolesToMatch.length === 0) rolesToMatch.push((user.role || '').toLowerCase());

            const { data, error } = await supabase
                .from('stock_notifications')
                .select('*')
                .in('recipient_role', rolesToMatch)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) {
                setNotifications(data);

                // Calculate counts for unread (case-insensitive for robustness)
                const unread = data.filter(n => !n.is_read);
                setCounts({
                    pendingApproval: unread.filter(n => n.message.toLowerCase().includes('submitted')).length,
                    pendingFeedback: unread.filter(n => n.message.toLowerCase().includes('rejected')).length,
                    newApproved: unread.filter(n => n.message.toLowerCase().includes('available')).length,
                });
            }
        } catch (err) {
            console.error('[NotificationContext] refresh error:', err);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        refresh();

        const channel = supabase
            .channel(`stock-notifs-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_notifications' }, () => {
                refresh();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, refresh]);

    const markAsRead = async (id: string) => {
        await supabase
            .from('stock_notifications')
            .update({ is_read: true })
            .eq('id', id);
        refresh();
    };

    const clearAll = async () => {
        if (!user) return;
        const rolesToMatch = [];
        if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager') {
            rolesToMatch.push('admin', 'super_admin', 'manager');
        }
        if (user.role === 'inventory_officer' || user.role === 'inventory_staff') {
            rolesToMatch.push('inventory_officer', 'inventory_staff');
        }
        if (user.role === 'sales' || user.role === 'sales_staff') {
            rolesToMatch.push('sales', 'sales_staff');
        }
        if (rolesToMatch.length === 0) rolesToMatch.push((user.role || '').toLowerCase());

        await supabase
            .from('stock_notifications')
            .update({ is_read: true })
            .in('recipient_role', rolesToMatch);
        refresh();
    };

    return (
        <NotificationContext.Provider value={{ notifications, counts, markAsRead, clearAll, refresh }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};
