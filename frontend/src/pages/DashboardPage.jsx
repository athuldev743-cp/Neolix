import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, Smartphone, Send, Inbox, MessageSquare,
  ArrowRight, Loader2, Zap, WifiOff, Plus, Layers
} from 'lucide-react'
import { campaignApi, repliesApi, waApi, API, smsApi, omniApi } from '../services/api'
import { ProfileContext } from '../App'
import OmniCampaignCreate from '../components/OmniCampaignCreate'

// ── helpers ──────────────────────────────────────────────────────────────────

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
        {stats.map(s => <StatRow key={s.label} {...s} loading={loading} />)}
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

const STATUS_STYLES = {
  running:    'bg-green-50 text-green-700',
  completed:  'bg-blue-50 text-blue-700',
  generating: 'bg-amber-50 text-amber-700',
  failed:     'bg-red-50 text-red-700',
}

const STAGE_MAP = { 0: '1 / 3', 3: '2 / 3', 6: '3 / 3' }

function OmniCampaignRow({ c }) {
  const statusStyle = STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-600'
  const stage = STAGE_MAP[c.current_day] ?? '1 / 3'
  const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-100 rounded-xl mb-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {(c.channels || []).map(ch => (
            <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{ch}</span>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5">
          <span className="text-xs text-slate-400"><span className="text-slate-600 font-medium">{c.total_leads}</span> leads</span>
          <span className="text-xs text-slate-400">Stage <span className="text-slate-600 font-medium">{stage}</span></span>
          <span className="text-xs text-slate-400">{date}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 ml-3 shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle}`}>{c.status}</span>
      </div>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { profile } = useContext(ProfileContext)
  const [loading, setLoading] = useState(true)
  const [dashView, setDashView] = useState('summary')
  const [emailStats, setEmail] = useState({})
  const [waStats, setWA] = useState({})
  const [waConnected, setWACon] = useState(false)
  const [smsStats, setSmsStats] = useState({})
  const [omniCampaigns, setOmniCampaigns] = useState([])
  const [omniLoading, setOmniLoading] = useState(true)

  const fetchDashboardMetrics = async () => {
    try {
      const [campRes, inboxRes, sentRes, waRes, waListRes, smsRes] = await Promise.allSettled([
        campaignApi.list(),
        repliesApi.inbox('unread'),
        repliesApi.inbox('responded'),
        waApi.status(),
        waApi.campaignList(),
        API.get('/sms/queue-status'),
      ])

      const camps = campRes.status === 'fulfilled' ? campRes.value.data : []
      const unread = inboxRes.status === 'fulfilled' ? inboxRes.value.data : []
      const replied = sentRes.status === 'fulfilled' ? sentRes.value.data : []
      const totalSent = camps.reduce((s, c) => s + (c.sent || 0), 0)
      const totalFailed = camps.reduce((s, c) => s + (c.failed || 0), 0)
      const running = camps.filter(c => c.status === 'running').length
      setEmail({ totalSent, totalFailed, running, unread: unread.length, replied: replied.length, campaigns: camps.length })

      const wa = waRes.status === 'fulfilled' ? waRes.value.data : {}
      const waCamp = waListRes.status === 'fulfilled' ? waListRes.value.data : []
      const waSent = waCamp.reduce((s, c) => s + (c.sent || 0), 0)
      setWACon(wa.connected || false)
      setWA({ connected: wa.connected, campaigns: waCamp.length, sent: waSent })

      const sms = smsRes.status === 'fulfilled' ? smsRes.value.data : {}
      setSmsStats({
        pending: sms.pending_count || 0,
        processing: sms.processing_count || 0,
        sentToday: sms.sent_today || 0,
        dailyLimit: sms.daily_limit || 150,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchOmniCampaigns = async () => {
    try {
      const res = await omniApi.list()
      setOmniCampaigns(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setOmniLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardMetrics()
    fetchOmniCampaigns()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || ''

  if (dashView === 'create_omni') {
    return (
      <div className="max-w-5xl mx-auto p-2">
        <OmniCampaignCreate
          onBack={() => setDashView('summary')}
          onDone={() => { setDashView('summary'); fetchDashboardMetrics(); fetchOmniCampaigns() }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your outreach overview</p>
        </div>
        <button
          onClick={() => setDashView('create_omni')}
          className="btn-primary text-xs font-black shadow-xs py-2 px-3.5 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0"
        >
          <Plus size={15} strokeWidth={2.5} /> Launch 9-Day Omni Campaign
        </button>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ChannelCard icon={Mail} title="Email" color="bg-blue-50 text-blue-700" to="/email" loading={loading}
          stats={[{ label: 'Total sent', value: emailStats?.totalSent }]}
          connectionEl={<span className="badge-blue text-xs">{emailStats?.running > 0 ? `${emailStats.running} running` : 'Ready'}</span>} />
        <ChannelCard icon={Smartphone} title="WhatsApp" color="bg-emerald-50 text-emerald-700" to="/whatsapp" loading={loading}
          stats={[{ label: 'Messages sent', value: waStats?.sent }]}
          connectionEl={waConnected ? <span className="badge-green">Live</span> : <span className="badge-gray">Offline</span>} />
        <ChannelCard icon={Smartphone} title="SMS Gateway" color="bg-violet-50 text-violet-700" to="/sms" loading={loading}
          stats={[{ label: 'Sent today', value: smsStats?.sentToday }, { label: 'Pending', value: smsStats?.pending }]}
          connectionEl={<span className="badge-gray text-xs">Android</span>} />
      </div>

      {/* Omni campaigns list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Omni campaigns</p>
            {!omniLoading && (
              <span className="text-xs text-slate-400">({omniCampaigns.length})</span>
            )}
          </div>
          <button
            onClick={() => setDashView('create_omni')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {omniLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : omniCampaigns.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-400">
            No omni campaigns yet — launch one above
          </div>
        ) : (
          omniCampaigns.map(c => <OmniCampaignRow key={c.id} c={c} />)
        )}
      </div>
    </div>
  )
}

export default DashboardPage