import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Label } from '../components/ui';

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
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-xl overflow-hidden animate-slide-up border border-border/50">
        <div className="p-8 sm:p-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Life<span className="text-primary ml-1">Line</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm font-medium">
              Welcome back. Please sign in to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary" size={20} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-12 h-14 rounded-2xl bg-background border-border/60 transition-all focus:ring-2 focus:ring-primary/20 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isSuccess}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary" size={20} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 h-14 rounded-2xl bg-background border-border/60 transition-all focus:ring-2 focus:ring-primary/20 text-base"
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
              className={`h-14 mt-8 rounded-2xl text-base font-bold transition-all shadow-md ${
                isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : ''
              }`}
              disabled={isLoading || isSuccess}
              isLoading={isLoading}
              variant={isSuccess ? 'success' : 'primary'}
            >
              {isSuccess ? 'Signed In Successfully' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
