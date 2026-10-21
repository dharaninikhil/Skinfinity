// src/components/OrderStatusBadge.tsx
import type { OrderStatus } from '../lib/supabase';

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  shipped: { label: 'Shipped', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  delivered: { label: 'Delivered', className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-red-200' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const style = STYLES[status] ?? STYLES.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.className}`}
    >
      {style.label}
    </span>
  );
}
