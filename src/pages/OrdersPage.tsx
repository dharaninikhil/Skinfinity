// src/pages/OrdersPage.tsx
import { useEffect, useState } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useRoute';
import { formatDate, formatINR } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo } from '../lib/images';
import { fetchOrders, isSupabaseConfigured, type Order } from '../lib/supabase';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guests can read demo orders when no backend is configured.
  const canQuery = Boolean(user?.id) || !isSupabaseConfigured;

  useEffect(() => {
    if (!canQuery) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchOrders(user?.id ?? '');
        if (active) setOrders(rows);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your orders.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [canQuery, user?.id]);

  if (loading) return <PageLoader label="Loading your orders" />;

  if (error) {
    return (
      <EmptyState
        icon={<Package className="h-10 w-10" />}
        title="We could not load your orders"
        description={error}
        action={<Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>}
      />
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="No orders yet"
        description="When you place an order it will appear here with tracking and invoices."
        action={<Button onClick={() => navigate('new')}>Start shopping</Button>}
      />
    );
  }

  return (
    <div className="bg-gray-50/50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Your orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          {orders.length} order{orders.length === 1 ? '' : 's'}
          {user?.email ? ` placed with ${user.email}` : ''}
        </p>

        <ul className="mt-8 space-y-4">
          {orders.map((order) => {
            const items = order.items ?? [];
            const preview = items.slice(0, 4);

            return (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/order/${order.id}`)}
                  className="w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Placed {formatDate(order.created_at)} · {items.length} item
                        {items.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="font-semibold text-gray-900">{formatINR(order.total)}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {preview.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      {preview.map((item) => (
                        <div
                          key={item.id}
                          className="h-12 w-12 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100"
                          title={`${item.product_name} × ${item.quantity}`}
                        >
                          <img
                            src={item.image_url || PRODUCT_PLACEHOLDER}
                            alt={item.product_name}
                            loading="lazy"
                            onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                      {items.length > preview.length && (
                        <span className="ml-1 text-xs text-gray-500">+{items.length - preview.length} more</span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
