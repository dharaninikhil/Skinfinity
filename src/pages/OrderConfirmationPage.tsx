// src/pages/OrderConfirmationPage.tsx
import { useEffect, useState } from 'react';
import { CheckCircle2, Package, PartyPopper } from 'lucide-react';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useRoute';
import { formatDate, formatINR, toNumber } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo } from '../lib/images';
import { fetchOrderById, isSupabaseConfigured, type Order } from '../lib/supabase';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

export default function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guests can read demo orders when no backend is configured.
  const canQuery = Boolean(user?.id) || !isSupabaseConfigured;

  useEffect(() => {
    if (!canQuery || !orderId) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await fetchOrderById(user?.id ?? '', orderId);
        if (!active) return;
        setOrder(found);
        if (!found) setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load this order.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [canQuery, orderId, user?.id]);

  if (loading) return <PageLoader label="Loading your order" />;

  if (error) {
    return (
      <EmptyState
        icon={<Package className="h-10 w-10" />}
        title="We could not load this order"
        description={error}
        action={<Button onClick={() => navigate('orders')}>View your orders</Button>}
      />
    );
  }

  if (!order) {
    return (
      <EmptyState
        icon={<Package className="h-10 w-10" />}
        title="Order not found"
        description="This order does not exist, or it belongs to a different account."
        action={
          <div className="flex gap-3">
            <Button onClick={() => navigate('orders')}>View your orders</Button>
            <Button variant="secondary" onClick={() => navigate('home')}>
              Back to home
            </Button>
          </div>
        }
      />
    );
  }

  const items = order.items ?? [];

  return (
    <div className="bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </span>

          <h1 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">Thank you for your order!</h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-gray-600">
            <PartyPopper className="h-4 w-4 text-rose-500" />
            We have emailed a confirmation to {order.email}.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-gray-50 p-4 text-left sm:grid-cols-4">
            <Meta label="Order number" value={order.order_number} />
            <Meta label="Placed on" value={formatDate(order.created_at)} />
            <Meta label="Total" value={formatINR(order.total)} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Status</dt>
              <dd className="mt-1">
                <OrderStatusBadge status={order.status} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Items */}
        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {items.length} item{items.length === 1 ? '' : 's'}
          </h2>

          <ul className="mt-4 divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                  <img
                    src={item.image_url || PRODUCT_PLACEHOLDER}
                    alt={item.product_name}
                    loading="lazy"
                    onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.product_slug ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${encodeURIComponent(item.product_slug as string)}`)}
                        className="hover:text-rose-700"
                      >
                        {item.product_name}
                      </button>
                    ) : (
                      item.product_name
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} × {formatINR(item.unit_price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatINR(toNumber(item.unit_price) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <Row label="Subtotal" value={formatINR(order.subtotal)} />
            <Row label="Shipping" value={toNumber(order.shipping_fee) === 0 ? 'Free' : formatINR(order.shipping_fee)} />
            {toNumber(order.discount) > 0 && <Row label="Discount" value={`− ${formatINR(order.discount)}`} />}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
              <dt>Total paid</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Shipping */}
        <section className="mt-8 grid gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Shipping to</h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-gray-600">
              {order.full_name}
              <br />
              {order.address_line1}
              {order.address_line2 ? (
                <>
                  <br />
                  {order.address_line2}
                </>
              ) : null}
              <br />
              {order.city}, {order.state} {order.postal_code}
              <br />
              {order.country}
              {order.phone ? (
                <>
                  <br />
                  {order.phone}
                </>
              ) : null}
            </address>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">Payment</h2>
            <p className="mt-2 text-sm text-gray-600">
              {order.payment_method === 'cod' ? 'Cash on delivery' : order.payment_method}
            </p>
            {order.notes && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">Delivery notes</h3>
                <p className="mt-1 text-sm text-gray-600">{order.notes}</p>
              </>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate('orders')}>View all orders</Button>
          <Button variant="secondary" onClick={() => navigate('home')}>
            Continue shopping
          </Button>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-gray-900">{value || '—'}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <dt>{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
