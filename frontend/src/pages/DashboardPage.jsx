import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, Smartphone, Send, Inbox, MessageSquare,
  ArrowRight, Loader2, Zap, WifiOff, Plus
} from 'lucide-react'
import { campaignApi, repliesApi, waApi } from '../services/api'
import { ProfileContext } from '../App'
import OmniCampaignCreate from '../components/OmniCampaignCreate'

function StatRow({ label, value, color = 'text-slate-800', loading }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      {loading
        ? <div className="skeleton w-10 h-4" />
        : <span className={`text-sm font-bold ${color}`}>{value ?? '—'}</span>
      }
    </div>
  )
}

function ChannelCard({ icon: Icon, title, color, to, loading, stats, connectionEl }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 ${color}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center">
            <Icon size={19} />
          </div>
          <p className="font-bold text-base">{title}</p>
        </div>
        {connectionEl}
      </div>

      <div className="px-5 py-1">
        {stats.map(s => (
          <StatRow key={s.label} {...s} loading={loading} />
        ))}
      </div>

      <div className="px-5 py-3 border-t border-slate-100">
        <Link to={to} className="flex items-center justify-between text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
          Open {title}
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useContext(ProfileContext)
  const [loading, setLoading]   = useState(true)
  const [emailStats, setEmail]  = useState(null)
  const [waStats, setWA]        = useState(null)
  const [waConnected, setWACon] = useState(false)
  
  // ✅ Added Dashboard layout view orchestration states
  const [dashView, setDashView] = useState('summary') // summary | create_omni

  const fetchDashboardMetrics = async () => {
    try {
      const [campRes, inboxRes, sentRes, waRes, waListRes] = await Promise.allSettled([
        campaignApi.list(),
        repliesApi.inbox('unread'),
        repliesApi.inbox('responded'),
        waApi.status(),
        waApi.campaignList(),
      ])

      const camps    = campRes.status    === 'fulfilled' ? campRes.value.data    : []
      const unread   = inboxRes.status   === 'fulfilled' ? inboxRes.value.data   : []
      const replied  = sentRes.status    === 'fulfilled' ? sentRes.value.data    : []
      const totalSent   = camps.reduce((s, c) => s + (c.sent   || 0), 0)
      const totalFailed = camps.reduce((s, c) => s + (c.failed || 0), 0)
      const running     = camps.filter(c => c.status === 'running').length
      setEmail({ totalSent, totalFailed, running, unread: unread.length, replied: replied.length, campaigns: camps.length })

      const wa     = waRes.status    === 'fulfilled' ? waRes.value.data    : {}
      const waCamp = waListRes.status === 'fulfilled' ? waListRes.value.data : []
      const waSent = waCamp.reduce((s, c) => s + (c.sent || 0), 0)
      setWACon(wa.connected || false)
      setWA({ connected: wa.connected, campaigns: waCamp.length, sent: waSent })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardMetrics()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || ''

  if (dashView === 'create_omni') {
    return (
      <div className="max-w-5xl mx-auto p-2">
        <OmniCampaignCreate onBack={() => setDashView('summary')} onDone={() => { setDashView('summary'); fetchDashboardMetrics(); }} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Upper Title Header Panel with Global Action Triggers */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your outreach overview</p>
        </div>
        
        {/* ✅ Global Omnichannel Campaign Launch Button */}
        <button onClick={() => setDashView('create_omni')} className="btn-primary text-xs font-black shadow-xs py-2 px-3.5 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0">
          <Plus size={15} strokeWidth={2.5} /> Launch 9-Day Omni Campaign
        </button>
      </div>

      {!loading && profile && !profile.value_proposition && (
        <div className="msg-info mb-6">
          <Zap size={16} className="text-blue-500 flex-shrink-0" />
          <span>
            Complete your <Link to="/settings" className="font-semibold underline">Settings</Link>
            {' '}— add your value proposition so AI writes better messages.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChannelCard
          icon={Mail}
          title="Email"
          color="bg-blue-50 text-blue-700"
          to="/email"
          loading={loading}
          connectionEl={
            <span className="badge-blue text-xs">
              {emailStats?.running > 0 ? `${emailStats.running} running` : 'Ready'}
            </span>
          }
          stats={[
            { label: 'Total sent',    value: emailStats?.totalSent?.toLocaleString(), color: 'text-slate-800' },
            { label: 'Unread replies',value: emailStats?.unread,   color: emailStats?.unread > 0 ? 'text-amber-600' : 'text-slate-800' },
            { label: 'Replied',       value: emailStats?.replied,  color: 'text-emerald-600' },
            { label: 'Campaigns',     value: emailStats?.campaigns, color: 'text-slate-800' },
          ]}
        />

        <ChannelCard
          icon={Smartphone}
          title="WhatsApp"
          color="bg-emerald-50 text-emerald-700"
          to="/whatsapp"
          loading={loading}
          connectionEl={
            waConnected
              ? <span className="badge-green flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              : <span className="badge-gray flex items-center gap-1.5">
                  <WifiOff size={11} /> Offline
                </span>
          }
          stats={[
            { label: 'Messages sent', value: waStats?.sent?.toLocaleString(), color: 'text-slate-800' },
            { label: 'Campaigns',     value: waStats?.campaigns, color: 'text-slate-800' },
            { label: 'Connection',    value: waConnected ? 'Connected' : 'Disconnected', color: waConnected ? 'text-emerald-600' : 'text-red-500' },
          ]}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link to="/email" className="card-hover p-4 flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <Send size={17} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">New Email Campaign</p>
            <p className="text-xs text-slate-400">AI-personalised outreach</p>
          </div>
          <ArrowRight size={15} className="text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
        </Link>

        <Link to="/whatsapp" className="card-hover p-4 flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={17} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">New WA Campaign</p>
            <p className="text-xs text-slate-400">Bulk WhatsApp outreach</p>
          </div>
          <ArrowRight size={15} className="text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
        </Link>
      </div>
    </div>
  )
}