import { NavLink, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import {
  LayoutDashboard, Mail, Smartphone, MessageSquare, Settings, Zap, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import { ProfileContext } from '../../App'

const nav = [
  { path: '/',         icon: LayoutDashboard, label: 'Dashboard font-bold' },
  { path: '/email',    icon: Mail,            label: 'Email' },
  { path: '/whatsapp', icon: Smartphone,      label: 'WhatsApp' },
  { path: '/sms',      icon: MessageSquare,   label: 'SMS Gateway' }, // Flat injection mapping to /sms route
  { path: '/settings', icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { profile, loading } = useContext(ProfileContext) || {}

  return (
    <aside className="sidebar-shell">
      {/* Logo */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={17} strokeWidth={2.5} />
        </div>
        <div>
          <p className="sidebar-brand-name">Neolix Hub</p>
          <p className="sidebar-brand-sub">LEAD OUTREACH</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Menu</p>
        {nav.map(({ path, icon: Icon, label }) => {
          const active = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={clsx('sidebar-link', active && 'sidebar-link-active')}
            >
              <span className={clsx('sidebar-link-bar', active && 'sidebar-link-bar-active')} />
              <Icon size={17} strokeWidth={1.8} className="sidebar-link-icon" />
              <span className="sidebar-link-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Profile strip */}
      <NavLink
        to="/settings"
        className={({ isActive }) => clsx('sidebar-profile', isActive && 'sidebar-profile-active')}
      >
        <div className="sidebar-avatar">
          {loading ? '…' : (profile?.full_name?.slice(0, 2).toUpperCase() || 'ME')}
        </div>
        <div className="sidebar-profile-info">
          <p className="sidebar-profile-name">
            {loading ? 'Loading…' : (profile?.full_name || 'Set up profile')}
          </p>
          <p className="sidebar-profile-sub">
            {profile?.company_name || 'Your company'}
          </p>
        </div>
        <ChevronRight size={14} className="sidebar-profile-chevron" />
      </NavLink>
    </aside>
  )
}