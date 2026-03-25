import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err: any) {
      const errorMessage = err?.message || 'Authentication failed. Please check your credentials or contact the administrator.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginBox} animate-fade-in`}>
        <header className={styles.logoArea}>
          <div className={styles.iconCircle}>
            <ShieldCheck size={32} className={styles.pulse} />
          </div>
          <div className={styles.brand}>
            <h1>Lifeline <span className={styles.accent}>System</span></h1>
            <p>Authorized Farm Personnel Access Only</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={`${styles.errorAlert} animate-shake`}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Work Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.fieldIcon} />
              <input
                id="email"
                type="email"
                placeholder="name@lifeline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isSuccess}
                required
                autoFocus
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Access Key</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.fieldIcon} />
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                required
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={`${styles.submitBtn} ${isSuccess ? styles.successBtn : ''}`}
              disabled={isLoading || isSuccess}
            >
              {isSuccess ? (
                <>Identity Verified <ShieldCheck size={20} /></>
              ) : isLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
              ) : (
                <>Authorize Entry <LogIn size={20} /></>
              )}
            </button>
          </div>
        </form>

        <div className={styles.securityNote}>
          <p>All sessions are monitored and logged for security and compliance purposes.</p>
        </div>
      </div>

      <div className={styles.versionTag}>
        Build v4.2.0-secure.lifeline
      </div>
    </div>
  );
};

export default LoginPage;
