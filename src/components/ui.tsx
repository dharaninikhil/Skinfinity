// src/components/ui.tsx
// Small shared primitives so pages stop re-implementing spinners and empty states.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Spinner({ label = 'Loading...', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`} role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-page loading state. */
export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-20 text-center ${className}`}>
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h2>
      {description && <div className="mt-2 max-w-md text-sm text-gray-600">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className = '',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'disabled' | 'className'>) {
  const variants: Record<string, string> = {
    primary: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-500',
    secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:text-gray-400',
    ghost: 'text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Discount pill, e.g. `-20%`. Returns null when there is no discount. */
export function DiscountBadge({ price, compareAt }: { price?: number | string | null; compareAt?: number | string | null }) {
  const current = Number(price ?? 0);
  const was = Number(compareAt ?? 0);
  if (!current || !was || was <= current) return null;
  const pct = Math.round(((was - current) / was) * 100);
  if (pct <= 0) return null;
  return (
    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">-{pct}%</span>
  );
}
