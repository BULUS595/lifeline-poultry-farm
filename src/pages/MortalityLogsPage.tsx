import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Calendar,
  FileText,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  Activity,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { supabaseDataService, supabase } from '../services/supabaseService';
import { MortalityLogForm } from '../components/MortalityLogForm';
import type { MortalityLog } from '../types';
import styles from './MortalityLogsPage.module.css';

export const MortalityLogsPage: React.FC<{ farmId: string }> = ({ farmId }) => {
  const { user, isSuperAdmin, isManager } = useAuth();
  const [logs, setLogs] = useState<MortalityLog[]>([]);
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

      const data = await supabaseDataService.getMortalityLogs(farmId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setLogs(data as MortalityLog[]);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDelete = async (log: MortalityLog) => {
    if (!isSuperAdmin && !isManager) {
      alert('Access Denied: Only higher hierarchy (Admins/Managers) can authorize record deletion.');
      return;
    }

    if (!confirm('Authenticate Deletion: This action will be permanently logged in the audit trail. Proceed?')) return;

    try {
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        user_name: user?.name,
        farm_id: farmId,
        action: 'DELETED_MORTALITY_LOG',
        data_type: 'mortality',
        data_id: log.id,
        details: `AUTHORIZED DELETION: Mortality record of ${log.count} birds from ${log.date}`,
        previous_state: log,
        is_deleted: true,
        timestamp: new Date().toISOString()
      }]);

      await supabaseDataService.deleteMortalityLog(log.id);
      setLogs(logs.filter(l => l.id !== log.id));
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Integrity Error: Could not complete deletion sequence.');
    }
  };

  const handleFormSubmit = (log: MortalityLog) => {
    setLogs([log, ...logs] as MortalityLog[]);
    setShowForm(false);
  };

  const totalMortality = logs.reduce((sum, log) => sum + log.count, 0);

  return (
    <Layout title="Mortality Tracking">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Mortality <span style={{ color: 'var(--color-danger)' }}>Records</span></h1>
            <p className={styles.subtitle}>Analyzing attrition rates and incident reports.</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{ backgroundColor: showForm ? 'var(--color-secondary)' : 'var(--color-primary)', color: showForm ? 'var(--color-text)' : 'white' }}
          >
            {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> New Report</>}
          </button>
        </header>

        {showForm && (
          <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-primary)', animation: 'slideDown 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              <FileText size={20} />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Incident Entry</h2>
            </div>
            <MortalityLogForm
              farmId={farmId}
              workerId={user?.id || ''}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <div className={styles.statsRow}>
          <div className={styles.statCard} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Total Mortality</h3>
              <AlertTriangle size={18} color="var(--color-danger)" />
            </div>
            <p className={styles.statValue}>{totalMortality.toLocaleString()}</p>
            <span className={styles.statLabel}>BIRDS LOST (PERIOD)</span>
          </div>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Attrition Velocity</h3>
              <Activity size={18} color="var(--color-text-tertiary)" />
            </div>
            <p className={styles.statValue}>
              {logs.length > 0 ? (totalMortality / logs.length).toFixed(1) : '0'}
            </p>
            <span className={styles.statLabel}>AVG PER INCIDENT</span>
          </div>
          <div className={styles.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Incident Reports</h3>
              <ShieldAlert size={18} color="var(--color-text-tertiary)" />
            </div>
            <p className={styles.statValue}>{logs.length}</p>
            <span className={styles.statLabel}>TOTAL ENTRIES</span>
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
              <div key={i} className="card" style={{ height: '80px', animation: 'pulse 2s infinite' }}></div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="card text-center" style={{ padding: '5rem', opacity: 0.3 }}>
            <CheckCircle2 size={60} style={{ marginBottom: '1rem', color: 'var(--color-success)' }} />
            <p>No mortality events logged for this fiscal window.</p>
          </div>
        ) : (
          <div className={styles.logsTable}>
            <div className={styles.tableHeader}>
              <div>Log Date</div>
              <div style={{ textAlign: 'center' }}>Attrition Count</div>
              <div>Primary Cause</div>
              <div>Auditor Notes</div>
              <div style={{ textAlign: 'right' }}>Control</div>
            </div>
            <div className={styles.tableBody}>
              {logs.map(log => (
                <div key={log.id} className={styles.tableRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span className={styles.count}>{log.count}</span>
                    <div style={{ fontSize: '9px', fontWeight: 700, opacity: 0.5 }}>BIRDS</div>
                  </div>
                  <div>
                    <span className="badge badge-warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      {log.cause || 'UNSPECIFIED'}
                    </span>
                  </div>
                  <div className={styles.notes}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <Info size={12} style={{ marginTop: '2px' }} />
                      {log.notes || 'No supplemental data recorded.'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      className={styles.buttonDelete}
                      onClick={() => handleDelete(log)}
                      title="Authorize Deletion"
                    >
                      <Trash2 size={16} />
                    </button>
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

export default MortalityLogsPage;
