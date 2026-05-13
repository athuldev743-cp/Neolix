import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Send, MessageSquare, Zap,
  ChevronRight, Settings, Smartphone
} from 'lucide-react'
import clsx from 'clsx'
import { useContext } from 'react'
import { ProfileContext } from '../../App'

const nav = [
  { path: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
  { path: '/leads',     icon: Users,           label: 'Leads'      },
  { path: '/campaigns', icon: Send,            label: 'Campaigns'  },
  { path: '/replies',   icon: MessageSquare,   label: 'Replies'    },
  { path: '/whatsapp',  icon: Smartphone,      label: 'WhatsApp'   },
  { path: '/settings',  icon: Settings,        label: 'Settings'   },
]

export default function Sidebar() {
  const location = useLocation()
  const { profile } = useContext(ProfileContext) || {}

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-surface-200 flex flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Neolix</p>
            <p className="text-[10px] text-surface-400 mt-0.5 tracking-widest uppercase font-medium">Outreach Hub</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mb-2">Menu</p>
        {nav.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path))
          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-surface-500 hover:text-gray-800 hover:bg-surface-50 font-medium'
              )}
            >
              <Icon
                size={17}
                className={clsx(active ? 'text-brand-600' : 'text-surface-400')}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Profile strip */}
      <NavLink
        to="/settings"
        className={({ isActive }) => clsx(
          'mx-3 mb-4 p-3 rounded-xl border flex items-center gap-2.5 group transition-all duration-150',
          isActive
            ? 'bg-brand-50 border-brand-200'
            : 'border-surface-200 hover:bg-surface-50 hover:border-surface-300'
        )}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate leading-none mb-0.5">
            {profile?.full_name || 'Set up profile'}
          </p>
          <p className="text-[10px] text-surface-400 truncate">
            {profile?.company_name || 'Your company'}
          </p>
        </div>
        <ChevronRight size={13} className="text-surface-300 group-hover:text-surface-500 flex-shrink-0" />
      </NavLink>
    </aside>
  )
}