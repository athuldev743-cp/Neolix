import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, ScanLine, Send, Settings, Zap, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const modules = [
  { path: '/',          icon: LayoutDashboard, label: 'Dashboard',   module: 'M1', color: 'text-neon-blue'  },
  { path: '/leads',     icon: Users,           label: 'Leads',        module: 'M2', color: 'text-neon-green', soon: true },
  { path: '/scanner',   icon: ScanLine,        label: 'Card Scanner', module: 'M3', color: 'text-neon-amber', soon: true },
  { path: '/outreach',  icon: Send,            label: 'Outreach',     module: 'M4', color: 'text-neon-violet', soon: true },
  { path: '/settings',  icon: Settings,        label: 'Settings',     module: 'M5', color: 'text-slate-400', soon: true },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-ink-900 border-r border-white/5 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center">
            <Zap size={16} className="text-neon-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-none">Neolix Hub</p>
            <p className="text-[10px] text-ink-300 mt-0.5 tracking-wide">LEAD OUTREACH</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mb-3">Modules</p>

        {modules.map(({ path, icon: Icon, label, module, color, soon }) => {
          const active = location.pathname === path

          return (
            <NavLink
              key={path}
              to={soon ? '#' : path}
              onClick={e => soon && e.preventDefault()}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-white/8 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/4',
                soon && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Active indicator */}
              <span className={clsx(
                'w-0.5 h-4 rounded-full -ml-0.5 transition-all duration-150',
                active ? 'bg-neon-blue opacity-100' : 'opacity-0'
              )} />

              <Icon size={17} className={active ? color : 'text-inherit'} />
              <span className="flex-1 font-medium">{label}</span>

              {/* Module badge */}
              <span className={clsx(
                'text-[10px] font-mono px-1.5 py-0.5 rounded-md border transition-all duration-150',
                active
                  ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
                  : 'bg-white/4 border-white/8 text-ink-300'
              )}>
                {module}
              </span>

              {soon && (
                <span className="text-[9px] bg-ink-600 text-ink-300 px-1.5 py-0.5 rounded font-medium">
                  SOON
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Profile quick-view at bottom */}
      <ProfileStrip />
    </aside>
  )
}

function ProfileStrip() {
  const { profile } = useProfileSnap()

  return (
    <NavLink
      to="/profile"
      className={({ isActive }) => clsx(
        'mx-3 mb-4 p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 group',
        isActive
          ? 'bg-white/6 border-white/10'
          : 'border-white/5 hover:bg-white/4 hover:border-white/10'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue/30 to-neon-violet/30 border border-white/10 flex items-center justify-center text-xs font-semibold text-slate-200 flex-shrink-0">
        {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'ME'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate leading-none mb-0.5">
          {profile?.full_name || 'Set up profile'}
        </p>
        <p className="text-[10px] text-ink-300 truncate">
          {profile?.company_name || 'Your company'}
        </p>
      </div>
      <ChevronRight size={14} className="text-ink-400 group-hover:text-slate-300 transition-colors flex-shrink-0" />
    </NavLink>
  )
}

// Mini hook to get profile name for sidebar
function useProfileSnap() {
  const [profile, setProfile] = window.__useProfileSnap?.() ?? [null, () => {}]
  return { profile }
}