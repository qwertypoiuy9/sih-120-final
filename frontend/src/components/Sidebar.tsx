/**
 * Sidebar — collapsible navigation rail.
 * Brown-and-white industrial theme.
 *
 * Active item:  bg-[#8b5a2b] text-white shadow-md
 * Logo / icons: text-[#8b5a2b]
 * Hover:        hover:bg-[#8b5a2b]/8 hover:text-[#8b5a2b]
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Layers, Cable,
  Brain, FlaskConical, Cpu, Settings,
  AlertTriangle, History, FileText, Gauge,
  LogOut, Menu, X, Wifi, WifiOff,
} from 'lucide-react';
import { useDigitalTwinStore }          from '../store/digitalTwinStore';
import { useAuthStore }                 from '../store/authStore';
import { useSidebarStore }              from '../store/sidebarStore';
import { useTranslation }               from 'react-i18next';
import { useFilteredNotifications }     from '../store/notificationStore';

// Brown accent token — used throughout so one change updates everything
const BROWN = '#8b5a2b';

const MENU_ITEMS = [
  { subPath: 'overview',     icon: LayoutDashboard, labelKey: 'sidebar.overview'     },
  { subPath: 'live-data',    icon: Activity,        labelKey: 'sidebar.liveData'     },
  { subPath: 'reservoir',    icon: Layers,          labelKey: 'sidebar.reservoir'    },
  { subPath: 'wellbore',     icon: Cable,           labelKey: 'sidebar.wellbore'     },
  { subPath: 'ai-insights',  icon: Brain,           labelKey: 'sidebar.aiInsights'   },
  { subPath: 'simulation',   icon: FlaskConical,    labelKey: 'sidebar.simulation'   },
  { subPath: 'pump-control', icon: Cpu,             labelKey: 'sidebar.pumpControl'  },
  { subPath: 'css-control',  icon: Gauge,           labelKey: 'sidebar.cssControl'   },
  { subPath: 'optimization', icon: Settings,        labelKey: 'sidebar.optimization' },
  { subPath: 'alerts',       icon: AlertTriangle,   labelKey: 'sidebar.alerts'       },
  { subPath: 'history',      icon: History,         labelKey: 'sidebar.history'      },
  { subPath: 'reports',      icon: FileText,        labelKey: 'sidebar.reports'      },
] as const;

interface SidebarProps { wellId?: string }

export default function Sidebar({ wellId = 'well-14' }: SidebarProps) {
  const { t }              = useTranslation();
  const location           = useLocation();
  const navigate           = useNavigate();
  const { isConnected, isLoading } = useDigitalTwinStore();
  const { user, logout }   = useAuthStore();
  const { isExpanded, toggle } = useSidebarStore();
  const { unreadCount }    = useFilteredNotifications();

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-50 flex flex-col
        bg-white border-r border-stone-200 shadow-md
        transition-[width] duration-300 ease-in-out
        ${isExpanded ? 'w-64' : 'w-[72px]'}
      `}
    >
      {/* ── Header ── */}
      <div className="flex items-center h-16 px-4 border-b border-stone-200 flex-shrink-0">
        {/* Logo mark */}
        <div className={`
          flex items-center justify-center rounded-lg flex-shrink-0
          w-8 h-8 bg-[#8b5a2b]/10 border border-[#8b5a2b]/25
          transition-all duration-300
          ${isExpanded ? 'mr-3' : 'mx-auto'}
        `}>
          <Layers className="w-4 h-4" style={{ color: BROWN }} />
        </div>

        {/* Brand name */}
        <span
          className={`
            text-xs font-extrabold tracking-widest whitespace-nowrap
            overflow-hidden transition-all duration-300
            ${isExpanded ? 'w-full opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-2'}
          `}
          style={{ color: BROWN }}
        >
          BAGHEWALA
        </span>

        {/* Close button — visible only when expanded */}
        <button
          onClick={toggle}
          aria-label="Collapse sidebar"
          className={`
            flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
            text-stone-400 hover:bg-[#8b5a2b]/8 hover:text-[#8b5a2b]
            transition-all duration-200
            ${isExpanded ? 'ml-auto' : 'hidden'}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hamburger row when collapsed */}
      {!isExpanded && (
        <button
          onClick={toggle}
          aria-label="Expand sidebar"
          className="
            flex items-center justify-center h-10 w-full flex-shrink-0
            text-stone-400 hover:bg-[#8b5a2b]/8 hover:text-[#8b5a2b]
            transition-colors duration-200
          "
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        <ul className="space-y-0.5 px-2">
          {MENU_ITEMS.map(({ subPath, icon: Icon, labelKey }) => {
            const fullPath  = `/well/${wellId}/${subPath}`;
            const isActive  = location.pathname === fullPath || location.pathname.endsWith(`/${subPath}`);
            const isAlerts  = subPath === 'alerts';

            return (
              <li key={subPath}>
                <Link
                  to={fullPath}
                  title={isExpanded ? undefined : t(labelKey)}
                  className={`
                    relative flex items-center gap-3 rounded-lg
                    transition-all duration-200 select-none
                    ${isExpanded ? 'px-3 py-2.5' : 'justify-center py-2.5'}
                    ${isActive
                      ? 'text-white shadow-md'
                      : 'text-stone-500 hover:text-[#8b5a2b]'}
                  `}
                  style={isActive ? { backgroundColor: BROWN } : undefined}
                  // hover handled by Tailwind; active uses inline style for exact hex
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,90,43,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  }}
                >
                  {/* Active indicator bar on left edge */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r"
                      style={{ backgroundColor: '#6b4420' }}
                    />
                  )}

                  {/* Icon + alert badge */}
                  <span className="relative flex-shrink-0">
                    <Icon className="w-[18px] h-[18px]" />
                    {isAlerts && unreadCount > 0 && (
                      <span className="
                        absolute -top-1.5 -right-1.5
                        min-w-[14px] h-[14px] px-0.5
                        bg-red-500 rounded-full
                        flex items-center justify-center
                        text-[9px] font-bold text-white leading-none
                      ">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className={`
                      text-sm font-medium whitespace-nowrap
                      overflow-hidden transition-all duration-300
                      ${isExpanded
                        ? 'w-full opacity-100 translate-x-0'
                        : 'w-0 opacity-0 -translate-x-1 pointer-events-none'}
                    `}
                  >
                    {t(labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Footer: status + user + logout ── */}
      <div className="flex-shrink-0 border-t border-stone-200 px-2 py-3 space-y-1.5">
        {/* Connection status */}
        <div className={`
          flex items-center gap-2 rounded-lg px-3 py-1.5 bg-stone-50
          ${isExpanded ? '' : 'justify-center px-2'}
        `} title="Digital Twin API availability">
          <span className="relative flex-shrink-0">
            {isConnected
              ? <Wifi className="w-3.5 h-3.5 text-green" />
              : isLoading
                ? <Wifi className="w-3.5 h-3.5 text-stone-400" />
                : <WifiOff className="w-3.5 h-3.5 text-critical" />}
            {isConnected && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
            )}
          </span>
          <span className={`
            text-xs font-bold whitespace-nowrap overflow-hidden
            transition-all duration-300
            ${isConnected ? 'text-green' : isLoading ? 'text-stone-400' : 'text-critical'}
            ${isExpanded ? 'w-full opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-1 pointer-events-none'}
          `}>
            {isConnected ? 'API ONLINE' : isLoading ? 'CONNECTING' : 'API OFFLINE'}
          </span>
        </div>

        {/* User row — expanded only */}
        {isExpanded && user && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                         border text-[10px] font-bold text-white uppercase"
              style={{ backgroundColor: BROWN, borderColor: '#6b4420' }}
            >
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-stone-800 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider leading-tight">{user.role}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={isExpanded ? undefined : 'Logout'}
          className={`
            w-full flex items-center gap-3 rounded-lg
            text-stone-400 hover:text-red-600 hover:bg-red-50
            transition-all duration-200
            ${isExpanded ? 'px-3 py-2' : 'justify-center py-2'}
          `}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span className={`
            text-sm whitespace-nowrap overflow-hidden transition-all duration-300
            ${isExpanded ? 'w-full opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-1 pointer-events-none'}
          `}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
