import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none gap-2';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-110 hover:shadow-primary/20',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border-2 border-border bg-transparent hover:bg-accent hover:border-primary/30',
    ghost: 'bg-transparent hover:bg-accent text-accent-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-110 shadow-sm hover:shadow-destructive/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs h-9',
    md: 'px-6 py-2.5 text-sm h-11',
    lg: 'px-8 py-3.5 text-base h-13',
    icon: 'p-2.5 w-11 h-11',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {LeftIcon && <LeftIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} strokeWidth={2.5} />}
          {children}
          {RightIcon && <RightIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} strokeWidth={2.5} />}
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
      bg-card text-card-foreground rounded-2xl border border-border shadow-soft overflow-hidden
      ${hoverable ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30' : ''}
      ${className}
    `}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
          {title && <h3 className="font-semibold text-lg leading-tight tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-6'}`}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-border/50 bg-muted/10">
          {footer}
        </div>
      )}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'danger' | 'default' | 'outline' | 'primary';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = '',
}) => {
  const styles: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    error:   'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    danger:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    info:    'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    default: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    outline: 'bg-transparent text-foreground border-border',
    primary: 'bg-primary/10 text-primary border-primary/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${styles[variant] ?? styles.neutral} ${className}`}>
      {children}
    </span>
  );
};
