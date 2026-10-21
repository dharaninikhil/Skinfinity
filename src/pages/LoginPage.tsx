// src/pages/LoginPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Mail, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';
import { googleOAuthEnabled, useAuth, type SkinType } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from '../hooks/useRoute';
import { fallbackTo, HERO_IMAGE } from '../lib/images';

const SKIN_TYPES: Array<{ value: SkinType; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'oily', label: 'Oily' },
  { value: 'dry', label: 'Dry' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'other', label: 'Not sure yet' },
];

const PERKS = [
  'Handpicked K-beauty formulas, verified authentic',
  'Wishlist and cart synced across your devices',
  'Free shipping on orders over ₹1,499',
];

type LoginPageProps = {
  /** Where to send the shopper after a successful sign-in. */
  redirectTo?: string;
};

export default function LoginPage({ redirectTo }: LoginPageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, sendPasswordReset, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [skinType, setSkinType] = useState<SkinType>('normal');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // A signed-in shopper has no business on this page.
  useEffect(() => {
    if (user) navigate(redirectTo ?? 'profile', { replace: true });
  }, [navigate, redirectTo, user]);

  const switchMode = (next: typeof mode) => {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        await sendPasswordReset(email);
        setNotice(`If an account exists for ${email}, a reset link is on its way.`);
        setMode('signin');
        return;
      }

      if (mode === 'signup') {
        const result = await signUp(email, password, fullName, skinType);
        if (result.needsEmailConfirmation) {
          setNotice(`We sent a confirmation link to ${email}. Open it, then sign in here.`);
          setMode('signin');
          return;
        }
        toast('Welcome to Skinfinity!', 'success');
        navigate(redirectTo ?? 'home', { replace: true });
        return;
      }

      await signIn(email, password);
      toast('Signed in.', 'success');
      navigate(redirectTo ?? 'home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setLoading(false);
    }
  };

  const heading =
    mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  const subheading =
    mode === 'signup'
      ? 'Tell us your skin type and we will tailor the shelf to you.'
      : mode === 'reset'
        ? 'Enter your email and we will send you a reset link.'
        : 'Sign in to sync your cart, wishlist and orders.';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-rose-50 to-white p-4 sm:p-6">
      <div className="grid w-full max-w-5xl items-stretch gap-8 md:grid-cols-2">
        {/* Promo panel */}
        <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-b from-rose-100 to-pink-50 p-10 shadow-xl md:flex md:flex-col md:justify-center">
          <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-rose-200 opacity-30 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-pink-200 opacity-30 blur-3xl" />

          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70">
                <Sparkles className="h-6 w-6 text-rose-600" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-rose-700">Skinfinity</p>
                <p className="text-sm text-rose-600">K-beauty, curated for you</p>
              </div>
            </div>

            <h2 className="text-3xl font-light text-gray-900">
              {mode === 'signup' ? 'Start your glow journey' : 'Good to see you again'}
            </h2>

            <p className="mt-4 leading-relaxed text-gray-700">
              Authentic Korean skincare favourites, personalised recommendations and routines that
              actually fit your skin.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-8 overflow-hidden rounded-2xl shadow-inner">
              <img
                src={HERO_IMAGE}
                alt="Glass skin model"
                loading="lazy"
                onError={fallbackTo('/assets/hero/glass-skin.webp')}
                className="h-40 w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center rounded-3xl bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500">
              <Sparkles className="h-8 w-8 text-white" />
            </span>
            <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
            <p className="mt-1 text-sm text-gray-600">{subheading}</p>
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-gray-600">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-medium text-gray-600">Skin type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIN_TYPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSkinType(option.value)}
                        aria-pressed={skinType === option.value}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                          skinType === option.value
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-600">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : mode === 'reset'
                    ? 'Send reset link'
                    : 'Sign in'}
            </Button>
          </form>

          {googleOAuthEnabled && mode !== 'reset' && (
            <>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <Button variant="secondary" className="w-full" onClick={() => void handleGoogle()} disabled={loading}>
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button type="button" className="font-medium text-rose-600 hover:underline" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Skinfinity?{' '}
                <button type="button" className="font-medium text-rose-600 hover:underline" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </>
            )}
          </div>

          {redirectTo && redirectTo !== '/' && (
            <button
              type="button"
              onClick={() => navigate(redirectTo)}
              className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-rose-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to where you were
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
