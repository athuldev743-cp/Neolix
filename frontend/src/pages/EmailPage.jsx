import { useState, useEffect, useRef } from 'react'
import {
  Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, repliesApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = { running:'badge-blue', completed:'badge-green', queued:'badge-gray', failed:'badge-red', paused:'badge-orange' }

function timeAgo(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════

// ── Campaign list ─────────────────────────────────────────
function CampaignList({ onCreate, onDetail }) {
  const [camps, setCamps]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await campaignApi.list(); setCamps(data) }
    catch { toast.error('Failed to load campaigns') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Email Campaigns</h2>
          <p className="text-sm text-slate-400 mt-0.5">AI-personalised outreach via SMTP</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={16} /></button>
          <button onClick={onCreate} className="btn-primary"><Plus size={16} /> New Campaign</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>}

      {!loading && camps.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
          <Send size={36} className="mb-3 text-slate-200" />
          <p className="font-medium text-slate-600 mb-1">No campaigns yet</p>
          <p className="text-sm mb-4">Create your first email outreach campaign</p>
          <button onClick={onCreate} className="btn-primary"><Plus size={15} /> New Campaign</button>
        </div>
      )}

      <div className="space-y-3">
        {camps.map(c => {
          const pct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0
          return (
            <div key={c.id} onClick={() => onDetail(c.id)} className="card-hover p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <span className={statusBadge[c.status] || 'badge-gray'}>{c.status?.toUpperCase()}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'} · {c.daily_limit}/day
                </p>
                <div className="h-1.5 bg-slate-100 rounded-full w-40">
                  <div className="h-full bg-blue-400 rounded-full transition-all" style={{width:`${pct}%`}} />
                </div>
              </div>
              <div className="flex gap-5 text-right flex-shrink-0">
                <div><p className="text-xl font-bold text-slate-900">{c.total_leads.toLocaleString()}</p><p className="text-xs text-slate-400">leads</p></div>
                <div><p className="text-xl font-bold text-emerald-600">{c.sent.toLocaleString()}</p><p className="text-xs text-slate-400">sent</p></div>
                <div><p className="text-xl font-bold text-slate-700">{pct}%</p><p className="text-xs text-slate-400">done</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Campaign detail ───────────────────────────────────────
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const { data: d } = await campaignApi.get(id); setData(d) }
    catch { toast.error('Failed to load') } finally { setLoading(false) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 8000); return () => clearInterval(iv) }, [id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
  if (!data) return null

  const sc = { sent:'text-emerald-600', failed:'text-red-500', pending:'text-slate-400' }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-slate-900 flex-1">{data.name}</h2>
        <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
        <button onClick={load} className="btn-icon"><RefreshCw size={15} /></button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total', value: data.total_leads.toLocaleString(), color:'text-slate-900' },
          { label:'Sent',  value: data.sent.toLocaleString(),        color:'text-emerald-600' },
          { label:'Failed',value: data.failed.toLocaleString(),      color:'text-red-500' },
          { label:'Limit', value: `${data.daily_limit}/day`,         color:'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(data.fail_reasons || {}).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Failure Reasons</p>
          {Object.entries(data.fail_reasons).map(([r,c]) => (
            <div key={r} className="flex justify-between py-1.5 border-b border-red-100 last:border-0 text-sm">
              <span className="text-red-700 truncate mr-4">{r}</span>
              <span className="text-red-600 font-bold">{c}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Sends</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead><tr><th>Company</th><th>Email</th><th>Status</th><th>Error</th><th>Sent at</th></tr></thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-900">{l.company_name || '—'}</td>
                  <td className="text-blue-600 text-xs">{l.email}</td>
                  <td><span className={`text-xs font-semibold ${sc[l.status] || 'text-slate-400'}`}>{l.status?.toUpperCase()}</span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '—'}</td>
                  <td className="text-xs text-slate-400">{l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
              {!data.leads_preview?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No sends yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Campaign create ───────────────────────────────────────
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name:'', subject_template:'', body_template:'', personalise:true, daily_limit:100, send_order:'as_selected' })
  const [selected, setSelected] = useState(new Map())
  const [preview, setPreview]   = useState(null)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)
  const timerRef = useRef()

  const schedulePreview = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(loadPreview, 900)
  }

  const loadPreview = async () => {
    if (selected.size === 0 || !form.subject_template) return
    const ids = Array.from(selected.keys())
    const leadId = ids[Math.min(previewIdx, ids.length-1)]
    setPreviewLoading(true)
    try {
      const { data } = await campaignApi.preview({ subject: form.subject_template, body: form.body_template, lead_id: leadId, personalise: form.personalise })
      setPreview(data)
    } catch { /* silent */ } finally { setPreviewLoading(false) }
  }

  useEffect(() => { schedulePreview() }, [form.subject_template, form.body_template, form.personalise, selected.size, previewIdx])

  const submit = async () => {
    if (!form.campaign_name || !form.subject_template || !form.body_template) { toast.error('Fill name, subject, body'); return }
    if (selected.size === 0) { toast.error('Select at least one lead'); return }
    setSubmitting(true)
    try {
      await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      toast.success(`Campaign started for ${selected.size} leads!`)
      setTimeout(onDone, 800)
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSubmitting(false) }
  }

  const ids = Array.from(selected.keys())

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New Email Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign name</label>
              <input className="input" placeholder="e.g. Automotive Outreach — May"
                value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Daily limit <span className="normal-case font-normal text-slate-400">(max 200)</span></label>
                <input type="number" min={1} max={200} className="input" value={form.daily_limit}
                  onChange={e => setForm(p => ({...p, daily_limit: parseInt(e.target.value)||100}))} />
              </div>
              <div>
                <label className="field-label">Send order</label>
                <select className="input" value={form.send_order} onChange={e => setForm(p => ({...p, send_order: e.target.value}))}>
                  <option value="as_selected">As selected</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0">Subject</label>
                <button onClick={async () => {
                  setAiLoading(true)
                  try {
                    const { data } = await campaignApi.preview({ subject:'', body:'', lead_id: ids[0]||0, personalise:false })
                    if (data.subject) setForm(p => ({...p, subject_template: data.subject}))
                    if (data.body)    setForm(p => ({...p, body_template: data.body}))
                  } catch {} finally { setAiLoading(false) }
                }} disabled={aiLoading} className="btn-ghost btn-sm text-blue-600 text-xs">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} AI generate
                </button>
              </div>
              <input className="input" placeholder="Quick question for {lead_company}"
                value={form.subject_template}
                onChange={e => { setForm(p => ({...p, subject_template: e.target.value})); schedulePreview() }} />
            </div>
            <div>
              <label className="field-label">Body</label>
              <textarea className="textarea h-40" placeholder={"Hi {lead_name},\n\nI noticed {lead_company}..."}
                value={form.body_template}
                onChange={e => { setForm(p => ({...p, body_template: e.target.value})); schedulePreview() }} />
              <p className="text-xs text-blue-600 font-medium mt-1">✨ Your signature added automatically</p>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">AI personalisation</p>
                <p className="text-xs text-slate-400">Groq rewrites each email per lead</p>
              </div>
              <button onClick={() => setForm(p => ({...p, personalise: !p.personalise}))}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Lead selector */}
          <div className="card p-5">
            <label className="field-label mb-3 block">Add leads</label>
            <LeadSelector selected={selected} onChange={setSelected} requirePhone={false} />
          </div>
        </div>

        {/* Right: preview */}
        <div>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Eye size={14} className="text-slate-400" /> Live Preview
              </p>
              {ids.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <button onClick={() => setPreviewIdx(p => Math.max(0,p-1))} disabled={previewIdx===0} className="btn-icon p-1 disabled:opacity-30 text-xs">‹</button>
                  {previewIdx+1}/{ids.length}
                  <button onClick={() => setPreviewIdx(p => Math.min(ids.length-1,p+1))} disabled={previewIdx>=ids.length-1} className="btn-icon p-1 disabled:opacity-30 text-xs">›</button>
                </div>
              )}
            </div>

            {previewLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin text-blue-500" /> Generating…
              </div>
            )}
            {!previewLoading && selected.size === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">Select leads to see preview</div>
            )}
            {!previewLoading && preview && (
              <div className="fade-up space-y-3">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] text-slate-400 font-mono uppercase mb-1">Subject</p>
                  <p className="text-sm font-semibold text-slate-800">{preview.subject}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] text-slate-400 font-mono uppercase mb-2">Body</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{preview.body}</p>
                </div>
                <p className="text-xs text-slate-400">
                  For: <strong>{preview.lead_name || '—'}</strong>{preview.lead_company ? ` @ ${preview.lead_company}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-8">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating…' : `Send to ${selected.size} leads`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
        {selected.size > 0 && (
          <p className="text-xs text-slate-400 ml-auto">
            ~{Math.ceil(selected.size / form.daily_limit)} day(s) to complete
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// REPLIES
// ═══════════════════════════════════════════════════════════

function ThreadView({ replyId, onClose }) {
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const bottomRef = useRef()

  const load = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.thread(replyId); setThread(data) }
    catch { toast.error('Failed to load thread') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [replyId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [thread])

  const send = async () => {
    if (!replyText.trim()) { toast.error('Write a reply first'); return }
    setSending(true)
    try {
      await repliesApi.respond(replyId, { body: replyText, use_ai: false })
      toast.success('Reply sent!')
      setReplyText('')
      await load()
    } catch { toast.error('Failed to send') } finally { setSending(false) }
  }

  const draftAI = async () => {
    setAiLoading(true)
    try {
      const { data } = await repliesApi.respond(replyId, { body:'', use_ai: true })
      const { data: fresh } = await repliesApi.thread(replyId)
      setReplyText(fresh.reply?.our_reply || '')
      setThread(fresh)
      toast.success('AI draft ready — edit and send')
    } catch { toast.error('AI failed') } finally { setAiLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
  if (!thread) return null
  const { reply, sent_item } = thread

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{reply.from_name || reply.from_email}</p>
          <p className="text-xs text-slate-400">{reply.from_email}</p>
        </div>
        <span className={reply.status==='responded' ? 'badge-green' : reply.status==='unread' ? 'badge-blue' : 'badge-gray'}>
          {reply.status}
        </span>
        <button onClick={onClose} className="btn-icon p-1.5"><X size={15} /></button>
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-400 uppercase font-medium tracking-wide mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-slate-800">{reply.subject}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-white">
        {sent_item && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Your email · {timeAgo(sent_item.sent_at)}</p>
            <div className="bubble-sent">{sent_item.body}</div>
          </div>
        )}
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{reply.from_name || 'Their reply'} · {timeAgo(reply.received_at)}</p>
          <div className="bubble-recv whitespace-pre-wrap">{reply.body_text}</div>
        </div>
        {reply.status === 'responded' && reply.our_reply && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">You · {timeAgo(reply.replied_at)}</p>
            <div className="bubble-sent whitespace-pre-wrap">{reply.our_reply}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {reply.status !== 'responded'
        ? (
          <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-white space-y-3">
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply…" className="textarea h-24 text-sm" />
            <div className="flex gap-2">
              <button onClick={send} disabled={sending || !replyText.trim()} className="btn-primary">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button onClick={draftAI} disabled={aiLoading} className="btn-secondary">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-blue-500" />}
                AI draft
              </button>
            </div>
          </div>
        )
        : (
          <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-emerald-50">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCheck size={15} /> Replied {timeAgo(reply.replied_at)}
            </p>
          </div>
        )
      }
    </div>
  )
}

function RepliesTab() {
  const [subTab, setSubTab]   = useState('inbox')
  const [inbox, setInbox]     = useState([])
  const [sent, setSent]       = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSent, setSelectedSent] = useState(null)
  const [polling, setPolling] = useState(false)
  const [search, setSearch]   = useState('')

  const loadInbox = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.inbox(); setInbox(data) }
    catch { toast.error('Failed to load inbox') } finally { setLoading(false) }
  }
  const loadSent = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.sent(); setSent(data) }
    catch { toast.error('Failed to load sent') } finally { setLoading(false) }
  }

  useEffect(() => { subTab === 'inbox' ? loadInbox() : loadSent() }, [subTab])

  const poll = async () => {
    setPolling(true)
    try { await repliesApi.poll(); toast.success('Syncing inbox…'); setTimeout(loadInbox, 2000) }
    catch { toast.error('Poll failed') } finally { setPolling(false) }
  }

  const filteredInbox = inbox.filter(i =>
    !search || i.from_email.toLowerCase().includes(search.toLowerCase()) ||
    i.from_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredSent = sent.filter(i =>
    !search || i.to_email?.toLowerCase().includes(search.toLowerCase()) ||
    i.to_company?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const statusDot = { unread:'bg-blue-500', read:'bg-slate-300', responded:'bg-emerald-400' }

  return (
    <div className="flex flex-col" style={{height:'calc(100vh - 180px)'}}>
      {/* Sub-tabs */}
      <div className="flex items-center gap-0 border-b border-slate-200 mb-0 flex-shrink-0">
        {[{id:'inbox',label:'Inbox'},{id:'sent',label:'Sent'}].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSelectedId(null); setSelectedSent(null) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${subTab===t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="bg-transparent text-sm outline-none placeholder-slate-400 w-36" />
          </div>
          {subTab==='inbox' && (
            <button onClick={poll} disabled={polling} className="btn-icon" title="Sync inbox">
              <RefreshCw size={14} className={polling ? 'animate-spin text-blue-500' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden border border-slate-200 rounded-xl mt-3">
        {/* List */}
        <div className="w-80 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-white">
          {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}

          {subTab === 'inbox' && !loading && filteredInbox.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No replies yet</p>
              <button onClick={poll} className="text-xs text-blue-600 mt-2">Sync inbox</button>
            </div>
          )}
          {subTab === 'inbox' && filteredInbox.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedId===item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDot[item.status]||'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-1 mb-0.5">
                    <p className={`text-sm truncate ${item.status==='unread'?'font-semibold text-slate-900':'font-medium text-slate-700'}`}>
                      {item.from_name || item.from_email}
                    </p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.received_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.preview}</p>
                </div>
              </div>
            </button>
          ))}

          {subTab === 'sent' && !loading && filteredSent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Send size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No sent emails yet</p>
            </div>
          )}
          {subTab === 'sent' && filteredSent.map(item => (
            <button key={item.id} onClick={() => setSelectedSent(item)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedSent?.id===item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                  {(item.to_company||item.to_name||item.to_email||'?').slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.to_company||item.to_name||item.to_email}</p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.sent_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail pane */}
        <div className="flex-1 overflow-hidden bg-white">
          {subTab==='inbox' && selectedId && <ThreadView replyId={selectedId} onClose={() => setSelectedId(null)} />}
          {subTab==='inbox' && !selectedId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Reply size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a reply to read</p>
            </div>
          )}
          {subTab==='sent' && selectedSent && (
            <div className="p-6 fade-up overflow-y-auto h-full">
              <p className="font-semibold text-slate-900 mb-1">{selectedSent.subject}</p>
              <p className="text-xs text-slate-400 mb-5">
                To: <span className="text-blue-600">{selectedSent.to_email}</span>
                {selectedSent.to_company ? ` · ${selectedSent.to_company}` : ''}
                {' · '}{timeAgo(selectedSent.sent_at)}
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{selectedSent.body}</p>
              </div>
            </div>
          )}
          {subTab==='sent' && !selectedSent && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Send size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select an email to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ROOT — EmailPage
// ═══════════════════════════════════════════════════════════
export default function EmailPage() {
  const [tab, setTab]       = useState('campaigns')   // campaigns | replies
  const [campView, setCampView] = useState('list')    // list | create | detail
  const [detailId, setDetailId] = useState(null)

  return (
    <div>
      {/* Top tabs */}
      <div className="flex items-center gap-0 border-b border-slate-200 mb-6 -mt-2">
        <h1 className="text-lg font-bold text-slate-900 pr-6 py-3">Email</h1>
        {[
          { id:'campaigns', label:'Campaigns' },
          { id:'replies',   label:'Replies'   },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setCampView('list') }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${tab===t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && campView === 'list' && (
        <CampaignList
          onCreate={() => setCampView('create')}
          onDetail={id => { setDetailId(id); setCampView('detail') }}
        />
      )}
      {tab === 'campaigns' && campView === 'create' && (
        <CampaignCreate onBack={() => setCampView('list')} onDone={() => setCampView('list')} />
      )}
      {tab === 'campaigns' && campView === 'detail' && (
        <CampaignDetail id={detailId} onBack={() => setCampView('list')} />
      )}
      {tab === 'replies' && <RepliesTab />}
    </div>
  )
}