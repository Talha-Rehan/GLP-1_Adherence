import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import {
  LayoutDashboard, Users, UserCircle, PieChart, TrendingDown,
  DollarSign, Calculator, Settings, ChevronLeft, ChevronRight,
  Activity, Building2, Stethoscope,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',                icon: LayoutDashboard, label: 'Executive Summary'       },
  { to: '/patients',        icon: Users,            label: 'Patient Risk Panel'      },
  { to: '/segments',        icon: PieChart,         label: 'Segment Explorer'        },
  { to: '/survival',        icon: TrendingDown,     label: 'Survival Analysis'       },
  { to: '/cost',            icon: DollarSign,       label: 'Cost-Effectiveness'      },
  { to: '/budget',          icon: Calculator,       label: 'Budget Simulator'        },
  { to: '/settings',        icon: Settings,         label: 'Settings & Data Info'    },
];

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { role, setRole, isInsurer } = useRole();
  const location = useLocation();

  const pageTitle = NAV_ITEMS.find(n => n.to === location.pathname)?.label ?? 'GLP-1 Platform';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0"
        style={{
          width: collapsed ? 68 : 240,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-[60px] flex-shrink-0 border-b border-white/10">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--color-primary-light)' }}>
            <Activity size={16} color="white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <div className="text-white font-display text-sm font-semibold leading-tight">GLP-1</div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase">Analytics</div>
            </div>
          )}
        </div>

        {/* Role toggle */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 rounded-lg overflow-hidden animate-fade-in"
               style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] text-white/30 uppercase tracking-widest px-3 pt-2 pb-1">Active Role</div>
            <div className="flex p-1 gap-1">
              {[
                { id: 'case_manager', icon: Stethoscope, label: 'Clinician' },
                { id: 'insurer',      icon: Building2,   label: 'Insurer'   },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setRole(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={{
                    background: role === id ? 'var(--color-primary-light)' : 'transparent',
                    color: role === id ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Section: Overview */}
          {!collapsed && <div className="text-[10px] text-white/25 uppercase tracking-widest px-3 pt-3 pb-1">Overview</div>}
          {NAV_ITEMS.slice(0, 2).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}>
              <Icon size={17} className="nav-icon flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in truncate">{label}</span>}
            </NavLink>
          ))}

          {/* Section: Analytics */}
          {!collapsed && <div className="text-[10px] text-white/25 uppercase tracking-widest px-3 pt-4 pb-1">Analytics</div>}
          {NAV_ITEMS.slice(2, 5).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}>
              <Icon size={17} className="nav-icon flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in truncate">{label}</span>}
            </NavLink>
          ))}

          {/* Section: Finance — insurer gets badge */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 pt-4 pb-1">
              <div className="text-[10px] text-white/25 uppercase tracking-widest">Financial</div>
              {isInsurer && <div className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">Primary</div>}
            </div>
          )}
          {NAV_ITEMS.slice(5, 7).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}>
              <Icon size={17} className="nav-icon flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in truncate">{label}</span>}
            </NavLink>
          ))}

          {/* Settings */}
          {!collapsed && <div className="text-[10px] text-white/25 uppercase tracking-widest px-3 pt-4 pb-1">System</div>}
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Settings' : undefined}>
            <Settings size={17} className="nav-icon flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in">Settings & Data Info</span>}
          </NavLink>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center h-9 rounded-lg text-white/40 hover:text-white hover:bg-white/08 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span className="ml-2 text-xs animate-fade-in">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topnav */}
        <header className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ height: 60, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="font-display text-lg text-gray-800 leading-tight">{pageTitle}</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">GLP-1 Adherence & Cost Intelligence Platform</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Role indicator pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                 style={{ background: isInsurer ? '#E3F2FD' : '#E8F5E9', color: isInsurer ? '#1B4F8A' : '#2E7D32' }}>
              {isInsurer ? <Building2 size={12} /> : <Stethoscope size={12} />}
              {isInsurer ? 'Insurer View' : 'Clinician View'}
            </div>
            {/* Data freshness */}
            <div className="text-xs text-gray-400">
              Data as of <span className="font-medium text-gray-600">May 2026</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
