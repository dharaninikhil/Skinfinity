// src/pages/CheckoutPage.tsx
//
// Checkout was a dead link: the navbar's mobile FAB and the cart's button both
// navigated to `checkout`, which matched no branch in App and rendered nothing.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Banknote, ChevronRight, CreditCard, Lock, ShoppingBag, Truck } from 'lucide-react';
import { Button, Spinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from '../hooks/useRoute';
import { DEFAULT_COUNTRY, computeTotals, validateAddress } from '../lib/checkout';
import { formatINR, toNumber } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo, productImage } from '../lib/images';
import { AppError, placeOrder, type ShippingAddress } from '../lib/supabase';

type AddressState = Record<keyof ShippingAddress, string>;

const EMPTY_ADDRESS: AddressState = {
  full_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: 'Telangana',
  postal_code: '',
  country: DEFAULT_COUNTRY,
};

const PAYMENT_METHODS = [
  {
    id: 'cod',
    label: 'Cash on delivery',
    detail: 'Pay the courier when your order arrives',
    icon: Banknote,
    available: true,
  },
  {
    id: 'prepaid',
    label: 'Card / UPI',
    detail: 'Enable a payment provider to accept prepaid orders',
    icon: CreditCard,
    available: false,
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { cartArray, subtotal, clearCart, refresh } = useCart();

  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  // Prefill from the account so returning customers checkout in seconds.
  useEffect(() => {
    setAddress((prev) => ({
      ...prev,
      full_name: prev.full_name || profile?.full_name || '',
      email: prev.email || user?.email || '',
      phone: prev.phone || profile?.phone || '',
    }));
  }, [profile?.full_name, profile?.phone, user?.email]);

  const totals = useMemo(
    () => computeTotals(cartArray.map(({ product, qty }) => ({ product, qty }))),
    [cartArray]
  );

  // Nothing to pay for — send the shopper back to the cart.
  useEffect(() => {
    if (cartArray.length === 0 && !placing) navigate('cart', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartArray.length, placing]);

  const setField = (field: keyof AddressState, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('login');
      return;
    }
    if (cartArray.length === 0) {
      toast('Your cart is empty.', 'error');
      navigate('cart');
      return;
    }

    const found = validateAddress(address);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast('Please correct the highlighted fields.', 'error');
      return;
    }

    setErrors({});
    setPlacing(true);

    try {
      const order = await placeOrder({
        userId: user.id,
        address: address as ShippingAddress,
        lines: cartArray.map(({ product, qty }) => ({ product_id: product.id, quantity: qty })),
        paymentMethod,
        notes: notes.trim() || null,
      });

      await clearCart();
      toast(`Order ${order.order_number ?? ''} placed successfully.`, 'success');
      navigate(`/order/${order.id}`, { replace: true });
    } catch (err) {
      if (err instanceof AppError && err.code === 'OUT_OF_STOCK') {
        toast(err.message, 'error');
        // Stock moved while the shopper was checking out — show the new numbers.
        await refresh();
      } else {
        toast(err instanceof Error ? err.message : 'Could not place your order.', 'error');
      }
      setPlacing(false);
    }
  };

  if (cartArray.length === 0 && !placing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Preparing checkout" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50">
      <nav aria-label="Breadcrumb" className="border-b border-gray-100 bg-white">
        <ol className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-3 text-xs text-gray-500 sm:px-6 lg:px-8">
          <li>
            <button type="button" onClick={() => navigate('home')} className="hover:text-rose-600">
              Home
            </button>
          </li>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <li>
            <button type="button" onClick={() => navigate('cart')} className="hover:text-rose-600">
              Cart
            </button>
          </li>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <li className="font-medium text-gray-700">Checkout</li>
        </ol>
      </nav>

      <form onSubmit={submit} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" noValidate>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="mt-1 text-sm text-gray-500">
          {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} · {formatINR(totals.total)}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* Contact */}
            <Fieldset title="Contact" step={1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="full_name"
                  label="Full name"
                  value={address.full_name}
                  error={errors.full_name}
                  onChange={(value) => setField('full_name', value)}
                  autoComplete="name"
                  required
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={address.email}
                  error={errors.email}
                  onChange={(value) => setField('email', value)}
                  autoComplete="email"
                  required
                />
                <Field
                  id="phone"
                  label="Mobile number"
                  type="tel"
                  value={address.phone}
                  error={errors.phone}
                  onChange={(value) => setField('phone', value)}
                  autoComplete="tel"
                  placeholder="9876543210"
                  required
                  className="sm:col-span-2"
                />
              </div>
            </Fieldset>

            {/* Shipping */}
            <Fieldset title="Shipping address" step={2}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="address_line1"
                  label="Address line 1"
                  value={address.address_line1}
                  error={errors.address_line1}
                  onChange={(value) => setField('address_line1', value)}
                  autoComplete="address-line1"
                  placeholder="Flat / house no., building, street"
                  required
                  className="sm:col-span-2"
                />
                <Field
                  id="address_line2"
                  label="Address line 2 (optional)"
                  value={address.address_line2}
                  onChange={(value) => setField('address_line2', value)}
                  autoComplete="address-line2"
                  placeholder="Area, landmark"
                  className="sm:col-span-2"
                />
                <Field
                  id="city"
                  label="City"
                  value={address.city}
                  error={errors.city}
                  onChange={(value) => setField('city', value)}
                  autoComplete="address-level2"
                  required
                />
                <Field
                  id="state"
                  label="State"
                  value={address.state}
                  error={errors.state}
                  onChange={(value) => setField('state', value)}
                  autoComplete="address-level1"
                  required
                />
                <Field
                  id="postal_code"
                  label="PIN code"
                  value={address.postal_code}
                  error={errors.postal_code}
                  onChange={(value) => setField('postal_code', value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="500034"
                  required
                />
                <Field
                  id="country"
                  label="Country"
                  value={address.country}
                  onChange={(value) => setField('country', value)}
                  autoComplete="country-name"
                />
              </div>
            </Fieldset>

            {/* Payment */}
            <Fieldset title="Payment" step={3}>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const selected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                        selected ? 'border-rose-300 bg-rose-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${method.available ? '' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selected}
                        disabled={!method.available}
                        onChange={() => setPaymentMethod(method.id)}
                        className="h-4 w-4 accent-rose-600"
                      />
                      <Icon className="h-5 w-5 text-rose-600" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-gray-900">{method.label}</span>
                        <span className="block text-xs text-gray-500">{method.detail}</span>
                      </span>
                      {!method.available && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                          Coming soon
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="mt-4">
                <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700">
                  Delivery notes (optional)
                </label>
                <textarea
                  id="order-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Gate code, preferred delivery window…"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>
            </Fieldset>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Your order</h2>

              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {cartArray.map(({ product, qty }) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                      <img
                        src={productImage(product)}
                        alt={product.name}
                        loading="lazy"
                        onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute -right-1 -top-1 rounded-full bg-gray-900 px-1.5 text-[10px] font-semibold text-white">
                        {qty}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{formatINR(product.price)} each</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-gray-900">
                      {formatINR(toNumber(product.price) * qty)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-gray-900">{formatINR(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600">
                  <dt>Shipping</dt>
                  <dd className="font-medium text-gray-900">
                    {totals.shipping === 0 ? 'Free' : formatINR(totals.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                  <dt className="font-semibold text-gray-900">Total</dt>
                  <dd className="font-semibold text-gray-900">{formatINR(totals.total)}</dd>
                </div>
              </dl>

              <Button type="submit" size="lg" className="mt-5 w-full" disabled={placing || cartArray.length === 0}>
                {placing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Placing your order…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Place order · {formatINR(totals.total)}
                  </>
                )}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
                <Truck className="h-3.5 w-3.5" />
                {subtotal >= 1499 ? 'Free delivery in 2–7 business days' : `Free delivery over ${formatINR(1499)}`}
              </p>

              <button
                type="button"
                onClick={() => navigate('cart')}
                className="mt-3 flex w-full items-center justify-center gap-1.5 text-center text-xs text-gray-500 underline-offset-2 hover:text-rose-600 hover:underline"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Back to cart
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

function Fieldset({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  required,
  placeholder,
  autoComplete,
  inputMode,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-300'
            : 'border-gray-200 focus:border-rose-400 focus:ring-rose-400'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
