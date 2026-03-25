import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle2,
  Activity,
  ClipboardList,
  TrendingUp,
  Utensils,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { supabaseDataService } from '../services/supabaseService';
import { FeedingLogForm } from '../components/FeedingLogForm';
import type { FeedingLog } from '../types';
import styles from './FeedingLogsPage.module.css';

export const FeedingLogsPage: React.FC<{ farmId: string }> = ({ farmId }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const data = await supabaseDataService.getFeedingLogs(farmId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setLogs(data as FeedingLog[]);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFormSubmit = (log: FeedingLog) => {
    setLogs([log, ...logs] as FeedingLog[]);
    setShowForm(false);
  };

  const totalQuantity = logs.reduce((sum, log) => sum + log.quantity, 0);
  const avgPerFeeding = logs.length > 0 ? (totalQuantity / logs.length).toFixed(1) : '0';
  const feedTypes = [...new Set(logs.map(log => log.feedType))];

  return (
    <Layout title="Feeding Analytics">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Feeding <span style={{ color: 'var(--color-primary)' }}>Terminal</span></h1>
            <p className={styles.subtitle}>Analyzing nutritional deployment across farm sectors.</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add Log</>}
          </button>
        </header>

        {showForm && (
          <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-primary)', animation: 'slideDown 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              <ClipboardList size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>New Feeding Submission</h2>
            </div>
            <FeedingLogForm
              farmId={farmId}
              workerId={user?.id || ''}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Deployment Mass</h3>
              <Utensils size={18} color="var(--color-primary)" />
            </div>
            <p className={styles.statValue}>{totalQuantity.toLocaleString()}</p>
            <span className={styles.statLabel}>KG / UNITS (PERIOD)</span>
          </div>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Deployment Velocity</h3>
              <TrendingUp size={18} color="var(--color-primary)" />
            </div>
            <p className={styles.statValue}>{avgPerFeeding}</p>
            <span className={styles.statLabel}>AVG PER SESSION</span>
          </div>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Feed Diversification</h3>
              <Package size={18} color="var(--color-primary)" />
            </div>
            <p className={styles.statValue}>{feedTypes.length}</p>
            <span className={styles.statLabel}>UNIQUE SKUS USED</span>
          </div>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Session Count</h3>
              <Activity size={18} color="var(--color-primary)" />
            </div>
            <p className={styles.statValue}>{logs.length}</p>
            <span className={styles.statLabel}>TOTAL LOGS</span>
          </div>
        </div>

        <div className={styles.filterSection}>
          <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
          <label htmlFor="month-filter">FISCAL PERIOD SELECTOR</label>
          <input
            type="date"
            id="month-filter"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card" style={{ height: '80px', animation: 'pulse 1.5s infinite' }}></div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="card text-center" style={{ padding: '6rem', opacity: 0.3 }}>
            <CheckCircle2 size={64} style={{ marginBottom: '1rem', color: 'var(--color-success)' }} />
            <p>No deployment records found in the current archival window.</p>
          </div>
        ) : (
          <div className={styles.logsTable}>
            <div className={styles.tableHeader}>
              <div>Log Date</div>
              <div>Shift Time</div>
              <div>Deployment Qty</div>
              <div>Resource SKU</div>
              <div style={{ textAlign: 'right' }}>Verification</div>
            </div>
            <div className={styles.tableBody}>
              {logs.map(log => (
                <div key={log.id} className={styles.tableRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <Clock size={14} /> {log.time}
                  </div>
                  <div className={styles.quantity}>
                    {log.quantity.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{log.unit.toUpperCase()}</span>
                  </div>
                  <div className={styles.feedType}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={14} />
                      {log.feedType}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', maxWidth: '300px', marginLeft: 'auto' }}>
                    {log.notes || 'No supplemental shift data.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FeedingLogsPage;
