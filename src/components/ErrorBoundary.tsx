import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
          <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-glow mb-8 animate-bounce-slow">
            <AlertCircle size={48} strokeWidth={2.5} />
          </div>
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none text-rose-500">
              System <span className="italic underline">Fault</span>
            </h2>
            <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] leading-relaxed opacity-60">
              A critical view error paralyzed the interface. We've logged this event. Please reset the session to recover.
            </p>
            {this.state.error && (
               <div className="mt-4 p-4 bg-black/40 border border-border/40 rounded-xl text-left overflow-x-auto text-[10px] text-rose-300 font-mono opacity-80">
                  {this.state.error.message}
               </div>
            )}
          </div>
          <Button 
            variant="secondary" 
            className="mt-8 rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[11px]" 
            onClick={() => window.location.reload()}
            leftIcon={RefreshCw}
          >
            Reboot Interface
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
