import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    History,
    Search,
    User as UserIcon,
    Clock,
    TrendingDown,
    Trash2,
    Eye,
    X,
    Database,
    ShoppingCart,
    Package,
    Wallet,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseService';
import { type ActivityLog as ActivityLogType } from '../types';
import styles from './ActivityLogsPage.module.css';

export const ActivityLogsPage: React.FC = () => {
    const { isSuperAdmin, isManager, isAuditor } = useAuth();
    const [logs, setLogs] = useState<ActivityLogType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState<ActivityLogType | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);


    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select(`
                    id,
                    userId:user_id,
                    userName:user_name,
                    farmId:farm_id,
                    action,
                    dataType:data_type,
                    dataId:data_id,
                    details,
                    previousState:previous_state,
                    isDeleted:is_deleted,
                    timestamp
                `)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data as ActivityLogType[] || []);
        } catch (err) {
            console.error('Activity logs fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const getActionIcon = (log: ActivityLogType) => {
        if (log.isDeleted) return <Trash2 size={18} />;

        switch (log.dataType) {
            case 'sale': return <ShoppingCart size={18} />;
            case 'storage': return <Package size={18} />;
            case 'expense': return <Wallet size={18} />;
            case 'user': return <UserIcon size={18} />;
            case 'mortality': return <TrendingDown size={18} />;
            default: return <Database size={18} />;
        }
    };

    const getActionLabel = (action: string) => {
        return action.replace(/_/g, ' ').toLowerCase();
    };

    if (!isSuperAdmin && !isManager && !isAuditor) {
        return (
            <Layout title="Activity Logs Restricted">
                <div className="card text-center" style={{ padding: '5rem 2rem' }}>
                    <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
                    <h2>Access Denied</h2>
                    <p>Only system administrators, managers, and authorized auditors can view the comprehensive activity terminal.</p>
                </div>
            </Layout>
        );
    }

    const filteredLogs = useMemo(() => logs.filter(log =>
        log.action?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.userName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.dataType?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [logs, debouncedSearch]);


    return (
        <Layout title="Audit Terminal">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h1>System Audit <span style={{ color: 'var(--color-primary)' }}>Trail</span></h1>
                        <p>Forensic tracking of all operational transactions and configuration changes.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.searchBar}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Filter by keyword, user, or entity..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className={styles.filterBtn} onClick={loadLogs} title="Refresh Logs">
                            <History size={18} />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} height={80} borderRadius={20} />
                        ))}
                    </div>
                ) : (
                    <div className={`${styles.logsContainer} card`}>
                        {filteredLogs.length === 0 ? (
                            <div style={{ padding: '5rem', textAlign: 'center', opacity: 0.3 }}>
                                <History size={60} style={{ marginBottom: '1rem' }} />
                                <p>No matching audit records located in current cache.</p>
                            </div>
                        ) : (
                            <div className={styles.logsList}>
                                {filteredLogs.map((log: ActivityLogType) => (
                                    <div key={log.id} className={`${styles.logCard} ${log.isDeleted ? styles.deletedLog : ''}`}>
                                        <div className={styles.logLeft}>
                                            <div className={`${styles.typeBadge} ${log.isDeleted ? styles.deleteBadge : styles[log.dataType]}`}>
                                                {getActionIcon(log)}
                                            </div>
                                            <div className={styles.logContent}>
                                                <div className={styles.logAction}>
                                                    <span className={styles.userName}>{log.userName || 'System Processor'}</span>
                                                    <span className={styles.actionText}>
                                                        {log.isDeleted ? 'permanently removed ' : 'executed '}
                                                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{getActionLabel(log.action)}</span>
                                                    </span>
                                                    <span className={`${styles.dataType} ${styles[log.dataType]}`}>
                                                        {log.dataType}
                                                    </span>
                                                </div>
                                                <div className={styles.logMeta}>
                                                    <Clock size={12} />
                                                    <span>{new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    {log.details && (
                                                        <>
                                                            <span className={styles.dot}>•</span>
                                                            <span className={styles.detailsText}>{log.details}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.logRight}>
                                            <button className={styles.detailsBtn} onClick={() => setSelectedLog(log)}>
                                                <Eye size={16} /> INSPECT
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedLog && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Database size={20} style={{ color: 'var(--color-primary)' }} />
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Transaction Payload Details</h2>
                            </div>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.logSummary}>
                                <div className={styles.summaryItem}>
                                    <label>Action ID</label>
                                    <span>#{selectedLog.id.slice(0, 8)}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <label>Operator</label>
                                    <span>{selectedLog.userName}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <label>Entity Class</label>
                                    <span style={{ textTransform: 'uppercase' }}>{selectedLog.dataType}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <label>Timestamp</label>
                                    <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                                </div>
                            </div>

                            {selectedLog.previousState ? (
                                <div className={styles.stateContainer}>
                                    <h3>Data State Snapshot</h3>
                                    <pre className={styles.payload}>
                                        {JSON.stringify(selectedLog.previousState, null, 2)}
                                    </pre>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-secondary)', borderRadius: 'var(--radius-xl)', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                                    No complex state captured for this event.
                                </div>
                            )}

                            {selectedLog.details && (
                                <div className={styles.detailsBox}>
                                    <h3>Audit Narrative</h3>
                                    <p>{selectedLog.details}</p>
                                </div>
                            )}

                            {selectedLog.isDeleted && (
                                <div className={styles.deleteWarning}>
                                    <Trash2 size={24} />
                                    <div>
                                        <h4>SOFT-DELETION ALERT</h4>
                                        <p>This record was marked for deletion by the operator. The system has preserved the original data object above as a forensic snapshot.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
                            <button className="btn-primary" onClick={() => setSelectedLog(null)}>CLOSE TERMINAL</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ActivityLogsPage;
