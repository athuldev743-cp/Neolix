import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, MessageSquare, Users, Inbox, TrendingUp,
  Loader2, ArrowRight, Zap, CheckCircle, AlertCircle, Clock
} from 'lucide-react'
import { campaignApi, repliesApi, waApi } from '../services/api'
import { ProfileContext } from '../App'

function StatCard({ label, value, icon: Icon, color, loading, to }) {
  const content = (
    <div className={`card p-5 flex items-center gap-4 ${to ? 'card-hover' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
          {loading ? <span className="skeleton w-10 h-6 inline-block" /> : value}
        </p>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
      {to && <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500" />}
    </div>
  )
  return to ? <Link to={to} className="block group">{content}</Link> : content
}

export default function DashboardPage() {
  const { profile } = useContext(ProfileContext)
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [waStatus, setWaStatus] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [campRes, inboxRes, waRes] = await Promise.allSettled([
          campaignApi.list(),
          repliesApi.inbox('unread'),
          waApi.status(),
        ])

        const camps = campRes.status === 'fulfilled' ? campRes.value.data : []
        const inbox = inboxRes.status === 'fulfilled' ? inboxRes.value.data : []
        const wa    = waRes.status === 'fulfilled'    ? waRes.value.data  : {}

        setCampaigns(camps.slice(0, 5))
        setWaStatus(wa)

        const totalSent   = camps.reduce((s, c) => s + (c.sent || 0), 0)
        const totalLeads  = camps.reduce((s, c) => s + (c.total_leads || 0), 0)
        const running     = camps.filter(c => c.status === 'running').length
        setStats({ totalSent, totalLeads, running, unreadReplies: inbox.length, waConnected: wa.connected })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-4xl">
      {/* Greeting */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {name} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">Here's what's happening with your outreach today</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Emails sent"      value={stats?.totalSent?.toLocaleString() ?? '—'} icon={Send}         color="bg-blue-500"    loading={loading} to="/campaigns" />
        <StatCard label="Active campaigns" value={stats?.running ?? '—'}                      icon={TrendingUp}   color="bg-indigo-500"  loading={loading} to="/campaigns" />
        <StatCard label="Unread replies"   value={stats?.unreadReplies ?? '—'}                icon={Inbox}        color="bg-amber-500"   loading={loading} to="/replies" />
        <StatCard label="WhatsApp"
          value={waStatus?.connected ? 'Connected' : 'Offline'}
          icon={MessageSquare}
          color={waStatus?.connected ? 'bg-emerald-500' : 'bg-slate-400'}
          loading={loading}
          to="/whatsapp"
        />
      </div>

      {/* Profile completeness */}
      {profile && !profile.value_proposition && (
        <div className="msg-info mb-5">
          <Zap size={16} className="text-blue-500 flex-shrink-0" />
          <div>
            <span className="font-semibold">Complete your profile</span>
            {' '}— Add your value proposition and company tagline so AI can write better emails.
            {' '}<Link to="/settings" className="text-blue-700 underline font-semibold">Go to Settings →</Link>
          </div>
        </div>
      )}

      {/* Recent campaigns */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Recent Campaigns</p>
          <Link to="/campaigns" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Send size={28} className="mb-2 text-slate-200" />
            <p className="text-sm font-medium text-slate-600">No campaigns yet</p>
            <Link to="/campaigns" className="btn-primary btn-sm mt-3">
              <Send size={13} /> Create first campaign
            </Link>
          </div>
        )}

        {campaigns.map(c => {
          const pct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0
          const statusIcon = c.status === 'running' ? Clock : c.status === 'completed' ? CheckCircle : AlertCircle
          const statusColor = c.status === 'running' ? 'text-blue-500' : c.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'
          return (
            <Link to="/campaigns" key={c.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all">
              <statusIcon size={16} className={`flex-shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate mb-1">{c.name}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[120px]">
                    <div className="h-full bg-blue-400 rounded-full" style={{width:`${pct}%`}} />
                  </div>
                  <span className="text-xs text-slate-400">{pct}%</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-900">{c.sent.toLocaleString()} <span className="text-slate-400 font-normal">/ {c.total_leads.toLocaleString()}</span></p>
                <p className="text-xs text-slate-400">sent</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mt-5">
        {[
          { to: '/leads',     icon: Users,         label: 'Search Leads',         sub: '1M+ contacts',         color: 'bg-blue-50 border-blue-200' },
          { to: '/campaigns', icon: Send,           label: 'New Campaign',         sub: 'Email outreach',       color: 'bg-indigo-50 border-indigo-200' },
          { to: '/whatsapp',  icon: MessageSquare,  label: 'WhatsApp Outreach',    sub: 'Bulk WA campaigns',    color: 'bg-emerald-50 border-emerald-200' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all group ${a.color}`}>
            <a.icon size={20} className="text-slate-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">{a.label}</p>
              <p className="text-xs text-slate-500">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}