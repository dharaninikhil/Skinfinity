// src/components/Footer.tsx
// Site-wide footer. Previously this markup lived inside HomePage only, so the
// cart, profile and category pages ended without any navigation or legal links.
import { useState, type FormEvent, type ReactNode } from 'react';
import { Instagram, Facebook, Mail, Sparkles } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { useNavigate } from '../hooks/useRoute';
import { subscribeNewsletter } from '../lib/supabase';
import { dedupeKey } from '../lib/format';

const CARE_LINKS: Array<{ label: string; to: string }> = [
  { label: 'Help & FAQs', to: 'help' },
  { label: 'Shipping', to: 'shipping' },
  { label: 'Returns & Refunds', to: 'returns' },
  { label: 'Contact us', to: 'contact' },
];

const LEGAL_LINKS: Array<{ label: string; to: string }> = [
  { label: 'Terms of service', to: 'terms' },
  { label: 'Privacy policy', to: 'privacy' },
];

export default function Footer() {
  const navigate = useNavigate();
  const { categories } = useCatalog();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;

    setStatus('saving');
    try {
      await subscribeNewsletter(value);
      setStatus('done');
      setMessage('You are on the list — welcome to Skinfinity.');
      setEmail('');
    } catch (err) {
      // Keep the UX graceful when Supabase is unreachable or unconfigured.
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const shopCategories = categories.filter((c) => dedupeKey(c.slug ?? c.name) !== 'new').slice(0, 6);

  return (
    <footer className="mt-auto bg-gray-900 text-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <button
              type="button"
              onClick={() => navigate('home')}
              className="mb-3 inline-flex items-center gap-2 text-xl font-bold italic tracking-wide text-white focus:outline-none"
            >
              <Sparkles className="h-5 w-5 text-rose-400" />
              SKINFINITY
            </button>
            <p className="text-sm leading-relaxed text-gray-400">
              Curated Korean skincare, conscious ingredients and simple routines for healthy, glowing skin.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <SocialLink
                label="Instagram"
                href="https://instagram.com"
                icon={<Instagram className="h-5 w-5" />}
              />
              <SocialLink label="Facebook" href="https://facebook.com" icon={<Facebook className="h-5 w-5" />} />
              <SocialLink label="Email us" href="mailto:hello@skinfinity.example" icon={<Mail className="h-5 w-5" />} />
            </div>
          </div>

          {/* Shop */}
          <nav aria-label="Shop">
            <h2 className="mb-3 text-sm font-semibold text-white">Shop</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <FooterLink onClick={() => navigate('new')}>New arrivals</FooterLink>
              </li>
              {shopCategories.map((category) => (
                <li key={category.id}>
                  <FooterLink onClick={() => navigate(`category-${category.slug ?? category.name}`)}>
                    {category.name}
                  </FooterLink>
                </li>
              ))}
              {shopCategories.length === 0 && (
                <>
                  <li>
                    <FooterLink onClick={() => navigate('category-cleanser')}>Cleansers</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => navigate('category-moisturizer')}>Moisturizers</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => navigate('category-sunscreen')}>Sunscreens</FooterLink>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {/* Care */}
          <nav aria-label="Customer care">
            <h2 className="mb-3 text-sm font-semibold text-white">Customer care</h2>
            <ul className="space-y-2 text-sm">
              {CARE_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterLink onClick={() => navigate(link.to)}>{link.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink onClick={() => navigate('orders')}>Track your order</FooterLink>
              </li>
            </ul>
          </nav>

          {/* Newsletter */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">Join the newsletter</h2>
            <p className="mb-3 text-sm text-gray-400">Get 10% off your first order and early access to new drops.</p>

            <form onSubmit={handleSubscribe} className="flex gap-2" noValidate>
              <label htmlFor="footer-newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={status === 'saving'}
                className="shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {status === 'saving' ? 'Saving…' : 'Subscribe'}
              </button>
            </form>

            {status === 'done' && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
            {status === 'error' && <p className="mt-2 text-sm text-rose-300">{message}</p>}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-6 text-sm text-gray-500 md:flex-row">
          <p>© {new Date().getFullYear()} Skinfinity. All rights reserved.</p>

          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <FooterLink key={link.to} onClick={() => navigate(link.to)}>
                {link.label}
              </FooterLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-gray-400 transition hover:text-white focus:outline-none focus-visible:underline"
    >
      {children}
    </button>
  );
}

function SocialLink({ label, href, icon }: { label: string; href: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="rounded-full bg-gray-800 p-2 text-gray-300 transition hover:bg-rose-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      {icon}
    </a>
  );
}
