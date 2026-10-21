// src/pages/ProfilePage.tsx
import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Heart,
  LogOut,
  Mail,
  Package,
  Pencil,
  Save,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react';
import { Button, PageLoader, Spinner } from '../components/ui';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useNavigate } from '../hooks/useRoute';
import { formatDate, formatINR } from '../lib/format';
import { fetchOrders, type Order, type SkinType } from '../lib/supabase';

const SKIN_TYPES: Array<{ value: SkinType; label: string }> = [
  { value: '', label: 'Prefer not to say' },
  { value: 'normal', label: 'Normal' },
  { value: 'oily', label: 'Oily' },
  { value: 'dry', label: 'Dry' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'other', label: 'Other' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut } = useAuth();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [skinType, setSkinType] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Seed the editable fields whenever the profile loads or the user changes.
  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setSkinType(profile?.skin_type ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setOrdersLoading(false);
      return;
    }

    let active = true;

    (async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const rows = await fetchOrders(user.id);
        if (active) setOrders(rows);
      } catch (err) {
        if (active) setOrdersError(err instanceof Error ? err.message : 'Could not load your orders.');
      } finally {
        if (active) setOrdersLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), skin_type: skinType || null, phone: phone.trim() || null });
      setEditing(false);
      toast('Profile updated.', 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast('Signed out.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not sign out.', 'error');
    }
    navigate('home');
  };

  if (!user) return <PageLoader label="Loading your profile" />;

  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="bg-gray-50/50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-10 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-xl font-bold text-rose-600">
              {initials || <UserIcon className="h-9 w-9" />}
            </span>
            <h1 className="mt-4 text-2xl font-light text-white">{profile?.full_name || 'Your profile'}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-rose-100">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
            {profile?.skin_type && (
              <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white capitalize backdrop-blur">
                {profile.skin_type} skin
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatTile label="In cart" value={totalItems} icon={<ShoppingBag className="h-4 w-4" />} onClick={() => navigate('cart')} />
            <StatTile label="Saved" value={wishlistCount} icon={<Heart className="h-4 w-4" />} onClick={() => navigate('wishlist')} />
            <StatTile label="Orders" value={orders.length} icon={<Package className="h-4 w-4" />} onClick={() => navigate('orders')} />
          </div>
        </div>

        {/* Details */}
        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-900">Profile information</h2>
            {editing ? (
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>

          {formError && (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {formError}
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-gray-700">
                Full name
              </label>
              {editing ? (
                <input
                  id="profile-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              ) : (
                <Readonly id="profile-name" value={profile?.full_name} />
              )}
            </div>

            <div>
              <label htmlFor="profile-skin" className="mb-2 block text-sm font-medium text-gray-700">
                Skin type
              </label>
              {editing ? (
                <select
                  id="profile-skin"
                  value={skinType}
                  onChange={(event) => setSkinType(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  {SKIN_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Readonly id="profile-skin" value={profile?.skin_type} />
              )}
            </div>

            <div>
              <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-gray-700">
                Mobile number
              </label>
              {editing ? (
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="9876543210"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              ) : (
                <Readonly id="profile-phone" value={profile?.phone} />
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Email address</span>
              <Readonly id="profile-email" value={user.email} />
              <p className="mt-1 text-xs text-gray-400">
                Contact support to change the email on your account.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <Button variant="ghost" className="text-red-600" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </section>

        {/* Orders */}
        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-900">Recent orders</h2>
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('orders')}
                className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:underline"
              >
                View all <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading orders" />
            </div>
          ) : ordersError ? (
            <p className="py-8 text-center text-sm text-gray-500">{ordersError}</p>
          ) : recentOrders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-200" />
              <p className="mt-3 text-gray-600">No orders yet</p>
              <Button className="mt-4" onClick={() => navigate('new')}>
                Start shopping
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-gray-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{order.order_number}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDate(order.created_at)} · {(order.items ?? []).length} item
                        {(order.items ?? []).length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-semibold text-gray-900">{formatINR(order.total)}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-4 py-5 text-sm transition hover:bg-rose-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <span className="text-rose-500">{icon}</span>
      <span className="font-semibold text-gray-900">{value}</span>
      <span className="text-gray-500">{label}</span>
    </button>
  );
}

function Readonly({ id, value }: { id: string; value?: string | null }) {
  return (
    <p id={id} className="rounded-lg bg-gray-50 px-4 py-3 text-sm capitalize text-gray-900">
      {value?.trim() ? value : 'Not set'}
    </p>
  );
}
