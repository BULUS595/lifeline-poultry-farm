import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, Loader2, LayoutDashboard } from 'lucide-react';
import { Button, Card } from '../components/ui';

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
      setError(err?.message || 'Invalid credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden px-6">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow" />
      
      <div className="w-full max-w-md z-10 animate-slide-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 space-y-4">
             <div className="w-16 h-16 bg-primary/20 flex items-center justify-center rounded-[24px] border border-primary/30 shadow-glow animate-bounce-slow">
                <LayoutDashboard className="w-8 h-8 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase italic">
                    Life <span className="text-primary italic">Line</span>
                </h1>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 opacity-60">Farm Management Console</p>
              </div>
        </div>

        <Card className="bg-slate-900/50 backdrop-blur-xl border-white/10 shadow-2xl rounded-[40px] p-8 md:p-10" noPadding hoverable={false}>
          <form onSubmit={handleSubmit} className="space-y-8 p-4">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Personnel Access</h2>
                <p className="text-slate-400 text-xs font-medium italic opacity-70">Enter your secure credentials to continue</p>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Work Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="email"
                            placeholder="staff@lifeline.com"
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-medium text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading || isSuccess}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Access Key</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="password"
                            placeholder="••••••••••••"
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-medium text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading || isSuccess}
                            required
                        />
                    </div>
                </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              className={`py-8 rounded-2xl text-lg font-black transition-all duration-500 ${isSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : ''}`}
              disabled={isLoading || isSuccess}
              isLoading={isLoading}
            >
              {isSuccess ? (
                <div className="flex items-center gap-3">
                    <ShieldCheck size={24} strokeWidth={3} />
                    <span>Access Granted</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                    <LogIn size={20} strokeWidth={3} />
                    <span>Authorized Entry</span>
                </div>
              )}
            </Button>
          </form>
        </Card>

        <div className="mt-10 text-center space-y-4">
             <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Secure Session Protocol Active</span>
                <div className="w-1 h-1 bg-primary rounded-full" />
             </div>
             <p className="text-slate-600 text-[9px] uppercase font-bold max-w-[280px] mx-auto leading-relaxed opacity-50">
                Unauthorized access is strictly prohibited. All activities are monitored and logged.
             </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
