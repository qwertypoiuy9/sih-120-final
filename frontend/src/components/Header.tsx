/**
 * Header — TopNav (light theme, refactored layout).
 *
 * Outermost wrapper is exactly:
 *   flex items-center justify-between w-full h-16 px-4
 *   bg-white border-b border-stone-200 shrink-0
 *
 * Three flat flex groups — Left · Center · Right — prevent any overlap.
 * No overflow / scroll / h-screen on the bar itself.
 */

import {
  Bell, User, Clock, Wifi, WifiOff,
  CheckCheck, X, Globe,
} from 'lucide-react';
import { useDigitalTwinStore }          from '../store/digitalTwinStore';
import { useFilteredNotifications, NotifType } from '../store/notificationStore';
import { useAuthStore }                 from '../store/authStore';
import { useState, useEffect, useRef } from 'react';
import { useTranslation }               from 'react-i18next';
import i18n, { LANGUAGES }              from '../i18n';

// ── Notification visual tokens ────────────────────────────────────────────────
const TYPE_STYLE: Record<NotifType, {
  border: string; bg: string; dot: string; label: string;
}> = {
  critical: { border: 'border-red-400/60', bg: 'bg-red-50',   dot: 'bg-red-500', label: 'CRITICAL' },
  warning:  { border: 'border-amber/60',   bg: 'bg-amber-50', dot: 'bg-amber',   label: 'WARNING'  },
  info:     { border: 'border-stone-300',  bg: 'bg-stone-50', dot: 'bg-stone-400', label: 'INFO'   },
};

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Header() {
  const { t }                = useTranslation();
  const { well, isConnected } = useDigitalTwinStore();
  const user                 = useAuthStore((s) => s.user);
  const { filtered, unreadCount, markAllRead, markAsRead } = useFilteredNotifications();

  const [now,      setNow]      = useState(new Date());
  const [bellOpen, setBellOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    // ── Outermost wrapper — EXACTLY as specified, nothing else ───────────────
    <header className="flex items-center justify-between w-full h-16 px-4 bg-white border-b border-stone-200 shrink-0">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT — field identity
          Shrinks freely; truncate keeps text from overflowing into neighbours
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-4 min-w-0">

        {/* Primary title — always visible */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-bold text-stone-900 truncate leading-tight">
            {t('nav.fieldName')}
          </h1>
          <p className="text-xs text-stone-500 truncate leading-tight">
            WELL&nbsp;{well.name}
          </p>
        </div>

        {/* Divider + secondary text — hidden below xl */}
        <div className="hidden xl:flex items-center gap-3">
          <div className="h-7 w-px bg-stone-200" />
          <div className="flex flex-col min-w-0">
            <p className="text-xs text-stone-500 truncate leading-tight max-w-[180px]">
              {well.location}
            </p>
            <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#8b5a2b' }}>
              {t('nav.digitalTwin')}&nbsp;●&nbsp;
              {isConnected ? t('nav.online') : t('nav.offline')}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CENTER — sensor status + clock
          Hidden below lg so it never crushes the left or right groups
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-6 shrink-0">

        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isConnected
            ? <Wifi    className="w-3.5 h-3.5 text-green shrink-0" />
            : <WifiOff className="w-3.5 h-3.5 text-red-500 shrink-0" />}
          <span className="text-xs text-stone-500 whitespace-nowrap">
            Digital Twin API:&nbsp;
            <span className={`font-semibold ${isConnected ? 'text-green' : 'text-red-500'}`}>
              ●&nbsp;{isConnected ? t('nav.connected') : t('nav.disconnected')}
            </span>
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-stone-200 shrink-0" />

        {/* Clock */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="text-xs text-stone-500 font-mono whitespace-nowrap">
            {now.toLocaleTimeString()}
          </span>
        </div>

        {/* Data mode badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500 whitespace-nowrap">{t('nav.dataMode')}:</span>
          <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#8b5a2b' }}>
            {t('nav.simulation')}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT — language switcher · bell · user
          shrink-0 so it never collapses
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-4 shrink-0">

        {/* ── Language switcher ──────────────────────────────────────────── */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => { setLangOpen((o) => !o); setBellOpen(false); }}
            aria-label={t('nav.language')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-bold transition-colors"
            style={{ color: '#8b5a2b' }}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>{currentLang.label}</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white border border-stone-200 rounded-xl shadow-xl min-w-[168px] py-2 overflow-hidden">
              <p className="text-xs text-stone-400 px-3 pb-2 border-b border-stone-100">
                {t('nav.language')}
              </p>
              {LANGUAGES.map((lang) => {
                const active = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors whitespace-nowrap
                      ${active ? 'font-bold bg-stone-50' : 'text-stone-700 hover:bg-stone-50'}`}
                    style={active ? { color: '#8b5a2b' } : undefined}
                  >
                    <span>{lang.full}</span>
                    <span className="text-xs font-mono opacity-60 ml-4">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Notification bell ──────────────────────────────────────────── */}
        <div ref={bellRef} className="relative shrink-0">
          <button
            onClick={() => { setBellOpen((o) => !o); setLangOpen(false); }}
            aria-label={t('nav.notifications')}
            className="relative p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Bell
              className="w-5 h-5 transition-colors"
              style={{ color: bellOpen ? '#8b5a2b' : '#6b7280' }}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {bellOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white border border-stone-200 rounded-xl shadow-xl w-80 max-h-[480px] flex flex-col overflow-hidden">
              {/* Dropdown header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
                <span className="text-sm font-bold text-stone-900">
                  {t('nav.notifications')}
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs bg-red-50 text-red-500 border border-red-200 rounded-full px-2 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      title={t('nav.markAllRead')}
                      className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors whitespace-nowrap"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('nav.markAllRead')}</span>
                    </button>
                  )}
                  <button onClick={() => setBellOpen(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Alert list */}
              <div className="overflow-y-auto flex-1 divide-y divide-stone-100 scrollbar-hide">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">{t('nav.noAlerts')}</p>
                  </div>
                ) : (
                  filtered.map((alert) => {
                    const s = TYPE_STYLE[alert.type];
                    return (
                      <button
                        key={alert.id}
                        onClick={() => markAsRead(alert.id)}
                        className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${s.border} ${alert.isRead ? 'opacity-50 hover:opacity-70' : `${s.bg} hover:opacity-90`}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {!alert.isRead && (
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${s.dot}`} />
                            )}
                            <p className="text-xs text-stone-800 leading-snug line-clamp-2 min-w-0">
                              {alert.message}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 whitespace-nowrap ${s.dot.replace('bg-', 'text-')}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-stone-400 font-mono">{alert.wellId || 'system'}</span>
                          <span className="text-[10px] text-stone-400">{relativeTime(alert.timestamp)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User badge ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Avatar — copper-brown bg, white text */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white uppercase"
            style={{ backgroundColor: '#8b5a2b' }}
          >
            {user?.name?.charAt(0) ?? <User className="w-3.5 h-3.5" />}
          </div>
          {/* Name — truncated, hidden on small screens */}
          <span className="hidden md:block text-sm text-stone-700 font-medium truncate max-w-[140px]">
            {user?.name ?? t('nav.engineer')}
          </span>
        </div>

      </div>
    </header>
  );
}
