import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-black rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none gap-2.5 uppercase tracking-tight italic';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-glow',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5 border border-border/40 shadow-sm',
    outline: 'border-2 border-border/60 bg-transparent hover:bg-accent/50 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm',
    ghost: 'bg-transparent hover:bg-accent text-accent-foreground rounded-xl',
    danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-rose-500/30',
    success: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-emerald-500/30',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs h-10',
    md: 'px-6 py-3 text-sm h-12',
    lg: 'px-10 py-5 text-lg h-16 rounded-3xl',
    icon: 'p-3 w-12 h-12 rounded-xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {LeftIcon && <LeftIcon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={3} />}
          <span className="relative z-10">{children}</span>
          {RightIcon && <RightIcon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={3} />}
        </>
      )}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  noPadding?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  footer,
  noPadding = false,
  hoverable = true,
}) => {
  return (
    <div className={`
      bg-card/60 backdrop-blur-xl text-card-foreground border border-border/40 shadow-premium overflow-hidden
      ${hoverable ? 'transition-all duration-700 hover:shadow-soft hover:-translate-y-2 hover:border-primary/20 hover:bg-card/80' : ''}
      ${className}
    `}>
      {(title || subtitle) && (
        <div className="px-10 py-8 border-b border-border/20 bg-muted/5">
          {title && <h3 className="font-black text-2xl tracking-tighter uppercase italic leading-tight">{title}</h3>}
          {subtitle && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-3 opacity-40 italic">{subtitle}</p>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-10'}`}>
        {children}
      </div>
      {footer && (
        <div className="px-10 py-6 border-t border-border/20 bg-muted/5">
          {footer}
        </div>
      )}
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`input-modern hover:border-primary/30 focus:shadow-glow transition-all duration-300 font-black italic tracking-tight placeholder:opacity-30 ${className}`} {...props} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = '', ...props }) => (
  <select className={`input-modern appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.5rem_center] bg-no-repeat pr-12 hover:border-primary/30 transition-all font-black italic tracking-tighter ${className}`} {...props}>
    {children}
  </select>
);

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', ...props }) => (
  <label className={`block text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 ml-2 italic opacity-60 ${className}`} {...props} />
);

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'danger' | 'default' | 'outline' | 'primary' | 'black';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = '',
}) => {
  const styles: Record<string, string> = {
    success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    warning: 'bg-amber-500/15 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    error:   'bg-rose-500/15 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    danger:  'bg-rose-500/15 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    info:    'bg-sky-500/15 text-sky-500 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
    neutral: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
    default: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
    outline: 'bg-transparent text-foreground border-border/60 backdrop-blur-sm',
    primary: 'bg-primary/20 text-primary border-primary/30 shadow-glow',
    black:   'bg-slate-900 text-white border-slate-800 shadow-xl',
  };

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border italic transition-all duration-300 hover:scale-105 ${styles[variant] ?? styles.neutral} ${className}`}>
      {children}
    </span>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 animate-fade-in overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose} />
      <div 
        ref={modalRef}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-card/90 backdrop-blur-2xl border-4 border-border/40 rounded-[56px] shadow-premium overflow-hidden animate-slide-up flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between px-10 py-8 border-b border-border/20 bg-muted/5 shrink-0">
          <div>
             <h3 className="text-2xl font-black tracking-tighter uppercase italic leading-none">{title}</h3>
             <div className="flex items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">Secure Protocol Layer-3</span>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-14 h-14 flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all active:scale-90 border-2 border-border/20"
          >
            <X className="w-8 h-8" strokeWidth={3} />
          </button>
        </div>
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-10 py-8 border-t border-border/20 bg-muted/5 flex items-center justify-end gap-6 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
