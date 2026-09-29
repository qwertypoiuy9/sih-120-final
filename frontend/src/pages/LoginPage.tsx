/**
 * LoginPage — split-screen layout.
 *
 * LEFT  (hidden on mobile, visible md+)
 *   Full-height pumpjack-at-sunset photograph with a semi-transparent
 *   overlay card showing the product name and tagline.
 *
 *   Image file: src/assets/oilfield-sunset.jpg
 *   → Save the pumpjack sunset photograph there.
 *   Until the file exists, a warm gradient (matching the photo palette)
 *   is shown as a CSS fallback.
 *
 * RIGHT
 *   White login card — consistent with the rest of the light theme.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../store/authStore';
import { Layers } from 'lucide-react';
import { useUserManagementStore } from '../store/userManagementStore';

/**
 * Hero image — place the pumpjack sunset photo at frontend/public/oilfield-sunset.jpg
 * The warm gradient below is the CSS fallback while the file is absent.
 */
const HERO_IMAGE = '/oilfield-sunset.jpg';

// ---------------------------------------------------------------------------
// Hardcoded supervisor (never managed via the UI).
// All incharge accounts are managed dynamically via userManagementStore.
// ---------------------------------------------------------------------------
const SUPERVISOR_RECORD = {
  password: 'supervisor123',
  user: {
    email:          'supervisor@oil.com',
    name:           'Field Supervisor',
    role:           'supervisor',
    assignedWellId: '',
    token:          'mock-jwt-supervisor-token',
  } as AuthUser,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);
  // Dynamic incharge accounts managed by the supervisor
  const findByCredentials = useUserManagementStore((s) => s.findByCredentials);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const emailNorm = email.toLowerCase().trim();

    // 1. Check hardcoded supervisor
    if (
      emailNorm === 'supervisor@oil.com' &&
      password === SUPERVISOR_RECORD.password
    ) {
      login(SUPERVISOR_RECORD.user);
      navigate('/supervisor', { replace: true });
      setLoading(false);
      return;
    }

    // 2. Check dynamic incharge accounts from userManagementStore
    const managed = findByCredentials(emailNorm, password);
    if (managed) {
      login({
        email:          managed.email,
        name:           managed.name,
        role:           'incharge',
        assignedWellId: managed.assignedWellId,
        token:          `mock-jwt-${managed.id}`,
      });
      navigate(`/well/${managed.assignedWellId}/overview`, { replace: true });
      setLoading(false);
      return;
    }

    setError('Invalid email or password.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT — pumpjack hero image  (hidden on mobile)
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden"
        style={{
          /*
           * Two background layers:
           *   1. The photograph — loaded from /public/oilfield-sunset.jpg
           *   2. Warm sunset gradient — shown if image is missing / loading
           * CSS renders the first layer on top; if the image 404s the
           * gradient is still fully visible.
           */
          backgroundImage: [
            `url(${HERO_IMAGE})`,
            'linear-gradient(135deg, #7c1d0a 0%, #b83510 20%, #d4520a 40%, #e8820a 60%, #f0a830 80%, #c06018 100%)',
          ].join(', '),
          backgroundSize:     'cover, cover',
          backgroundPosition: 'center 60%, center',
          backgroundRepeat:   'no-repeat, no-repeat',
        }}
      >
        {/* Dark scrim — makes overlay text readable without hiding the photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Bottom-left overlay card */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
          <div className="max-w-lg">
            {/* Pill badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
              bg-white/15 backdrop-blur-sm border border-white/25 text-white/90
              text-xs font-semibold tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              DIGITAL TWIN PLATFORM
            </span>

            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
              Baghewala<br />
              <span className="text-orange-300">Heavy Oil Field</span>
            </h2>

            <p className="text-white/75 text-sm lg:text-base leading-relaxed mb-6 max-w-sm">
              A digital-twin demo with simulated well telemetry, reservoir
              modeling, and rule-based operating insights.
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Demo Wells', value: '6' },
                { label: 'Field Sensors', value: '0' },
                { label: 'Insights Model', value: 'DEMO' },
              ].map(({ label, value }) => (
                <div key={label}
                  className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <p className="text-lg font-bold text-white leading-none">{value}</p>
                  <p className="text-xs text-white/65 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top-left logo mark on the image panel */}
        <div className="absolute top-6 left-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm border border-white/25
            flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold tracking-widest text-sm">BAGHEWALA</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT — login form
          ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center
        bg-[#faf8f5] px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile-only brand header */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
              bg-white border border-stone-200 shadow-md mb-3">
              <Layers className="w-7 h-7 text-[#8b5a2b]" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 tracking-widest">BAGHEWALA</h1>
            <p className="text-muted text-xs mt-1">Digital Twin Operations Platform</p>
          </div>

          {/* Form heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-900">Welcome back</h2>
            <p className="text-muted text-sm mt-1">Sign in to your operations account</p>
          </div>

          {/* ── Card ── */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-7">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 tracking-wide uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="user@oil.com"
                  className="
                    w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3
                    text-sm text-stone-900 placeholder-stone-400
                    focus:outline-none focus:border-[#8b5a2b]/60
                    focus:ring-2 focus:ring-[#8b5a2b]/12
                    transition-colors
                  "
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="
                    w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3
                    text-sm text-stone-900 placeholder-stone-400
                    focus:outline-none focus:border-[#8b5a2b]/60
                    focus:ring-2 focus:ring-[#8b5a2b]/12
                    transition-colors
                  "
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full py-3 rounded-xl font-bold tracking-widest text-sm
                  bg-[#8b5a2b] hover:bg-[#7a4f26] text-white
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 shadow-sm mt-1
                "
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AUTHENTICATING…
                  </>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-stone-100 space-y-2">
              <p className="text-[11px] text-muted text-center mb-3 tracking-wider font-semibold uppercase">
                Demo Credentials
              </p>
              <button
                type="button"
                onClick={() => { setEmail('supervisor@oil.com'); setPassword('supervisor123'); setError(''); }}
                className="
                  w-full flex items-center justify-between px-4 py-2.5
                  bg-stone-50 hover:bg-[#8b5a2b]/5
                  border border-stone-200 hover:border-[#8b5a2b]/30
                  rounded-xl transition-colors group
                "
              >
                <span className="text-xs font-bold text-[#8b5a2b]">Supervisor</span>
                <span className="text-xs text-muted group-hover:text-stone-700 font-mono transition-colors">
                  supervisor@oil.com
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('incharge14@oil.com'); setPassword('incharge123'); setError(''); }}
                className="
                  w-full flex items-center justify-between px-4 py-2.5
                  bg-stone-50 hover:bg-[#8b5a2b]/5
                  border border-stone-200 hover:border-[#8b5a2b]/30
                  rounded-xl transition-colors group
                "
              >
                <span className="text-xs font-bold text-[#8b5a2b]">Incharge (BW-14)</span>
                <span className="text-xs text-muted group-hover:text-stone-700 font-mono transition-colors">
                  incharge14@oil.com
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted mt-6">
            Baghewala Heavy Oil Field · Rajasthan, India
          </p>
        </div>
      </div>

    </div>
  );
}
