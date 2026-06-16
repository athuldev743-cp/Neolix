import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, Smartphone, Send, Inbox, MessageSquare,
  ArrowRight, Loader2, Zap, WifiOff, Plus
} from 'lucide-react'
import { campaignApi, repliesApi, waApi, API, smsApi } from '../services/api'
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

function DashboardPage() {
  const { profile } = useContext(ProfileContext)
  const [loading, setLoading] = useState(true)
  const [dashView, setDashView] = useState('summary')
  const [emailStats, setEmail] = useState({})
  const [waStats, setWA] = useState({})
  const [waConnected, setWACon] = useState(false)
  const [smsStats, setSmsStats] = useState({})

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
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="text-sm text-slate-400 mt-1">Your outreach overview</p>
        </div>
        <button onClick={() => setDashView('create_omni')} className="btn-primary text-xs font-black shadow-xs py-2 px-3.5 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0">
          <Plus size={15} strokeWidth={2.5} /> Launch 9-Day Omni Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ChannelCard icon={Mail} title="Email" color="bg-blue-50 text-blue-700" to="/email" loading={loading} stats={[{label: 'Total sent', value: emailStats?.totalSent}]} connectionEl={<span className="badge-blue text-xs">{emailStats?.running > 0 ? `${emailStats.running} running` : 'Ready'}</span>} />
        <ChannelCard icon={Smartphone} title="WhatsApp" color="bg-emerald-50 text-emerald-700" to="/whatsapp" loading={loading} stats={[{label: 'Messages sent', value: waStats?.sent}]} connectionEl={waConnected ? <span className="badge-green">Live</span> : <span className="badge-gray">Offline</span>} />
        <ChannelCard icon={Smartphone} title="SMS Gateway" color="bg-violet-50 text-violet-700" to="/sms" loading={loading} stats={[{label: 'Sent today', value: smsStats?.sentToday}, {label: 'Pending', value: smsStats?.pending}]} connectionEl={<span className="badge-gray text-xs">Android</span>} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {/* ... your shortcut Link cards ... */}
      </div>
    </div>
  )
}

export default DashboardPage