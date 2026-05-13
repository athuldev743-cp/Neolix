import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { profileApi, healthApi } from '../services/api'
import PageHeader from '../components/layout/PageHeader'
import {
  Users, ScanLine, Send, Settings, ArrowRight,
  CheckCircle2, Clock, Zap, User, Database, Wifi
} from 'lucide-react'

const MODULE_CARDS = [
  {
    module: 'M1', label: 'Core Foundation',  status: 'live',
    icon: Zap,   color: 'neon-blue',
    desc: 'Profile, settings, API shell',
    path: '/profile', cta: 'Open Profile',
  },
  {
    module: 'M2', label: 'Lead Management', status: 'next',
    icon: Users,  color: 'neon-green',
    desc: 'Aiven PG · search · CSV · bulk paste',
    path: '/leads', cta: 'Coming next',
  },
  {
    module: 'M3', label: 'Card Scanner',   status: 'planned',
    icon: ScanLine, color: 'neon-amber',
    desc: 'Tesseract OCR · drag-drop · Vision API',
    path: '/scanner', cta: 'Planned',
  },
  {
    module: 'M4', label: 'Outreach Engine', status: 'planned',
    icon: Send,  color: 'neon-violet',
    desc: 'AI email · WhatsApp · SMTP · Baileys',
    path: '/outreach', cta: 'Planned',
  },
  {
    module: 'M5', label: 'Settings & Stats', status: 'planned',
    icon: Settings, color: 'text-slate-400',
    desc: 'SMTP config · WA session · analytics',
    path: '/settings', cta: 'Planned',
  },
]

export default function DashboardPage() {
  const [profile, setProfile]     = useState(null)
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    profileApi.get().then(r => setProfile(r.data)).catch(() => {})
    healthApi.check()
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'))
  }, [])

  const profileComplete = profile && profile.full_name && profile.company_name

  return (
    <div className="animate-slide-up">
      <PageHeader
        badge="Neolix Hub"
        title="Command Centre"
        subtitle="Build your outreach engine module by module."
      />

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <StatusChip
          icon={Wifi}
          label="API"
          value={apiStatus === 'online' ? 'Connected' : apiStatus === 'checking' ? 'Checking…' : 'Offline'}
          ok={apiStatus === 'online'}
        />
        <StatusChip
          icon={Database}
          label="MongoDB"
          value={profile !== null ? 'Connected' : 'Waiting'}
          ok={profile !== null}
        />
        <StatusChip
          icon={User}
          label="Profile"
          value={profileComplete ? 'Complete' : 'Incomplete'}
          ok={profileComplete}
          href="/profile"
        />
      </div>

      {/* Profile alert if empty */}
      {!profileComplete && (
        <Link to="/profile" className="block card border-neon-blue/20 p-4 mb-8 hover:border-neon-blue/40 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-neon-blue" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">Set up your profile to get started</p>
              <p className="text-xs text-ink-300 mt-0.5">Your name, company and value proposition will be injected into every AI-generated message</p>
            </div>
            <ArrowRight size={16} className="text-ink-400 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_CARDS.map(card => <ModuleCard key={card.module} {...card} />)}
      </div>

      {/* How it works */}
      <div className="mt-10 card p-6">
        <p className="text-sm font-semibold text-slate-200 mb-4">How Neolix Hub works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-ink-300">
          <FlowStep n={1} title="Build your profile" desc="Your name, company, tone and pitch are stored in MongoDB and used as context for every message." color="neon-blue" />
          <FlowStep n={2} title="Search & select leads" desc="Query 1M+ leads in Aiven PostgreSQL using full-text + regex \y search. Pick who to reach out to." color="neon-green" />
          <FlowStep n={3} title="Generate & send" desc="The Outreach Engine combines your profile + lead data → AI writes a personalised email or WhatsApp." color="neon-violet" />
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ module, label, status, icon: Icon, color, desc, path, cta }) {
  const isLive    = status === 'live'
  const isNext    = status === 'next'
  const isPlanned = status === 'planned'

  const content = (
    <div className={`card p-5 flex flex-col gap-4 transition-all duration-200 h-full
      ${isLive ? 'hover:border-white/15 hover:-translate-y-0.5 cursor-pointer' : 'opacity-60'}
    `}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center`}>
          <Icon size={18} className={`text-${color}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-ink-300">{module}</span>
          {isLive    && <span className="badge bg-neon-green/10 text-neon-green border border-neon-green/20"><span className="glow-dot bg-neon-green" />Live</span>}
          {isNext    && <span className="badge bg-neon-amber/10 text-neon-amber border border-neon-amber/20"><Clock size={9} />Next</span>}
          {isPlanned && <span className="badge bg-white/5 text-ink-300 border border-white/8">Planned</span>}
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-200 mb-1">{label}</p>
        <p className="text-xs text-ink-300 leading-relaxed">{desc}</p>
      </div>

      <div className="flex items-center gap-1 text-xs font-medium text-ink-300 group-hover:text-slate-300 transition-colors">
        {isLive ? <><span className={`text-${color}`}>{cta}</span> <ArrowRight size={12} className={`text-${color}`} /></> : cta}
      </div>
    </div>
  )

  return isLive ? (
    <Link to={path} className="group block h-full">{content}</Link>
  ) : (
    <div className="h-full">{content}</div>
  )
}

function StatusChip({ icon: Icon, label, value, ok, href }) {
  const chip = (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors
      ${ok ? 'bg-neon-green/5 border-neon-green/20 text-neon-green' : 'bg-white/4 border-white/8 text-ink-300'}
    `}>
      <Icon size={12} />
      <span className="text-ink-300">{label}</span>
      <span className={ok ? 'text-neon-green' : 'text-ink-400'}>{value}</span>
    </div>
  )
  return href ? <Link to={href}>{chip}</Link> : chip
}

function FlowStep({ n, title, desc, color }) {
  return (
    <div className="flex gap-3">
      <div className={`w-6 h-6 rounded-full bg-${color}/10 border border-${color}/20 flex items-center justify-center text-[10px] font-bold text-${color} flex-shrink-0 mt-0.5`}>
        {n}
      </div>
      <div>
        <p className="text-slate-300 font-medium text-xs mb-1">{title}</p>
        <p className="leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}