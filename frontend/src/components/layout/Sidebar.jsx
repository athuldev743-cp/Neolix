import { NavLink } from 'react-router-dom'
import { useContext } from 'react'
import {
  LayoutDashboard, Users, ScanLine, Send, Settings, Zap, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import { ProfileContext } from '../../App'

const modules = [
  { path: '/',         icon: LayoutDashboard, label: 'Dashboard',    module: 'M1' },
  { path: '/leads',    icon: Users,           label: 'Leads',        module: 'M2' },
  { path: '/scanner',  icon: ScanLine,        label: 'Card Scanner', module: 'M3' },
  { path: '/outreach', icon: Send,            label: 'Outreach',     module: 'M4' },
  { path: '/settings', icon: Settings,        label: 'Settings',     module: 'M5' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar-shell">
      {/* ── Logo ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={17} strokeWidth={2.5} />
        </div>
        <div>
          <p className="sidebar-brand-name">Neolix Hub</p>
          <p className="sidebar-brand-sub">LEAD OUTREACH</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Modules</p>

        {modules.map(({ path, icon: Icon, label, module }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'sidebar-link-active')
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx('sidebar-link-bar', isActive && 'sidebar-link-bar-active')} />
                <Icon size={17} strokeWidth={1.8} className="sidebar-link-icon" />
                <span className="sidebar-link-label">{label}</span>
                <span className={clsx('sidebar-module-badge', isActive && 'sidebar-module-badge-active')}>
                  {module}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Profile footer ── */}
      <ProfileStrip />
    </aside>
  )
}

function ProfileStrip() {
  // ✅ Fixed: use ProfileContext instead of broken window.__useProfileSnap
  const { profile, loading } = useContext(ProfileContext)

  const initials = profile?.full_name
    ? profile.full_name.slice(0, 2).toUpperCase()
    : profile?.company_name
      ? profile.company_name.slice(0, 2).toUpperCase()
      : 'ME'

  return (
    <NavLink
      to="/profile"
      className={({ isActive }) =>
        clsx('sidebar-profile', isActive && 'sidebar-profile-active')
      }
    >
      <div className="sidebar-avatar">{loading ? '…' : initials}</div>
      <div className="sidebar-profile-info">
        <p className="sidebar-profile-name">
          {loading ? 'Loading…' : (profile?.full_name || 'Set up profile')}
        </p>
        <p className="sidebar-profile-sub">
          {loading ? '' : (profile?.company_name || 'Your company')}
        </p>
      </div>
      <ChevronRight size={14} className="sidebar-profile-chevron" />
    </NavLink>
  )
}