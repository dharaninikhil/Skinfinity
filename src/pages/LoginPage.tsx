import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles } from 'lucide-react';

type LoginPageProps = {
  onNavigate: (page: string) => void;
};

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [skinType, setSkinType] = useState<
    'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'other'
  >('normal');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName, skinType);
      } else {
        await signIn(email, password);
      }
      onNavigate('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Left - Visual / Promo */}
        <div
          className="hidden md:flex flex-col justify-center rounded-3xl p-10 bg-gradient-to-b from-rose-100 to-pink-50 shadow-2xl overflow-hidden relative"
          aria-hidden="true"
        >
          <div className="absolute -left-10 -top-10 w-56 h-56 bg-rose-200 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-pink-200 rounded-full opacity-20 blur-3xl" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-rose-700">Skinfinity</h3>
              <p className="text-sm text-rose-600">K-beauty curated for you</p>
            </div>
          </div>

          <h2 className="text-3xl font-light text-gray-900 mb-4">
            {isSignUp ? 'Start your glow journey' : 'Welcome back'}
          </h2>

          <p className="text-gray-700 mb-6 leading-relaxed">
            Discover authentic Korean skincare favorites, personalized recommendations, and exclusive
            bundles. Create an account to save your preferences and get tailored product picks.
          </p>

          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-rose-500">•</span>
              Handpicked K-beauty formulas
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-rose-500">•</span>
              Free shipping over $50
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-rose-500">•</span>
              Cruelty-free & certified
            </li>
          </ul>

          <div className="mt-auto pt-6">
            <img
              src="/assets/hero/glass-skin.webp"
              alt="Glass skin"
              className="rounded-xl w-full shadow-inner object-cover"
            />
          </div>
        </div>

        {/* Right - Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isSignUp ? 'Join Skinfinity — personalized skincare awaits' : 'Nice to see you again'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                {/* Full name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-gray-600 mb-2">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 transition"
                    placeholder="Jane Doe"
                  />
                </div>

                {/* Skin type */}
                <div>
                  <label htmlFor="skinType" className="block text-xs font-medium text-gray-600 mb-2">
                    Skin type
                  </label>
                  <div className="relative">
                    <select
                      id="skinType"
                      value={skinType}
                      onChange={(e) =>
                        setSkinType(
                          e.target.value as 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'other'
                        )
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition bg-white appearance-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="oily">Oily</option>
                      <option value="dry">Dry</option>
                      <option value="combination">Combination</option>
                      <option value="sensitive">Sensitive</option>
                      <option value="other">Other</option>
                    </select>

                    {/* small chevron */}
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      ▾
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 transition"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition disabled:opacity-60"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-3 my-4">
            <span className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          {/* alternative actions (social placeholders) */}
          <div className="flex gap-3">
            <button
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
              onClick={() => alert('Social login placeholder')}
            >
              Continue with Google
            </button>
            <button
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
              onClick={() => alert('Social login placeholder')}
            >
              Continue with Apple
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  className="text-rose-600 font-medium"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  className="text-rose-600 font-medium"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                >
                  Create one
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
