import { useState, useEffect, useRef } from 'react'
import {
  Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply, Edit3, Save, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, repliesApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'
import { useUnreadReplies } from '../hooks/useUnreadReplies'

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = { 
  generating: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse',
  running: 'badge-blue', 
  completed: 'badge-green', 
  queued: 'badge-gray', 
  failed: 'badge-red', 
  paused: 'badge-orange' 
}

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
// CAMPAIGNS LAYER
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
          <p className="text-sm text-slate-400 mt-0.5">Automated background pre-generation via multi-tenant profiles</p>
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
            <div key={c.id} onClick={() => onDetail(c.id)} className="card-hover p-5 flex items-center gap-4 cursor-pointer">
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

// ── Campaign Detail & Interactive Live Approvals ───────────────────────────
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeItem, setActiveItem] = useState(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [committingDraft, setCommittingDraft] = useState(false)
  const [triggeringDeployment, setTriggeringDeployment] = useState(false)

  const load = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`)
      setData(res.data)
    } catch { 
      toast.error('Failed to load campaign context metrics') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [id])

  const openInlineEditor = (item) => {
    setActiveItem(item)
    setEditedSubject(item.subject || '')
    setEditedBody(item.body || '')
  }

  const handleCommitDraftUpdate = async () => {
    if (!activeItem) return
    setCommittingDraft(true)
    try {
      await api.post('/campaigns/draft/save', {
        queue_item_id: activeItem.id,
        updated_subject: editedSubject,
        updated_body: editedBody
      })
      toast.success('Draft modifications authorized for deployment!')
      setActiveItem(null)
      load()
    } catch {
      toast.error('Failed to update target draft parameters.')
    } finally {
      setCommittingDraft(false)
    }
  }

  const forceStartCampaignProcessing = async () => {
    setTriggeringDeployment(true)
    try {
      await api.post(`/campaigns/${id}/start`)
      toast.success('Omnichannel queue processing sequence activated!')
      load()
    } catch {
      toast.error('Could not activate background worker nodes.')
    } finally {
      setTriggeringDeployment(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
  if (!data) return null

  const sc = { sent:'text-emerald-600', failed:'text-red-500', pending:'text-slate-500 font-bold', draft:'text-amber-500 font-bold animate-pulse' }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 flex-1">{data.name}</h2>
          <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
          {data.status === 'queued' && (
            <button 
              onClick={forceStartCampaignProcessing} 
              disabled={triggeringDeployment}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              {triggeringDeployment ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Start Dispatch Loops
            </button>
          )}
          <button onClick={load} className="btn-icon"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Target Size', value: data.total_leads?.toLocaleString() || '0', color:'text-slate-900' },
          { label:'Dispatched Nodes', value: data.sent?.toLocaleString() || '0', color:'text-emerald-600' },
          { label:'Delivery Failures', value: data.failed?.toLocaleString() || '0', color:'text-red-500' },
          { label:'Sequence Speed Limit', value: `${data.daily_limit || 100}/day`, color:'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Dynamic Inline Layout Split Preview Area */}
      {activeItem && (
        <div className="card border-2 border-blue-500/30 bg-slate-900 p-5 space-y-4 rounded-2xl fade-up">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Edit3 size={14} className="text-blue-500" /> Refine Background AI Template Draft
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Modifying active payload copy for: <span className="font-bold text-slate-300">{activeItem.email}</span></p>
            </div>
            <button onClick={() => setActiveItem(null)} className="text-slate-500 hover:text-slate-400"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Hook</label>
              <input className="input mt-1 w-full bg-slate-950 border-slate-800 text-slate-200 text-xs" value={editedSubject} onChange={e => setEditedSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body Copy</label>
              <textarea className="textarea mt-1 w-full bg-slate-950 border-slate-800 text-slate-300 text-xs h-40 leading-relaxed" value={editedBody} onChange={e => setEditedBody(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setActiveItem(null)} className="btn-secondary px-4 py-1.5 text-xs">Bypass Changes</button>
            <button onClick={handleCommitDraftUpdate} disabled={committingDraft} className="btn-primary px-5 py-1.5 text-xs">
              {committingDraft ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Approve & Queue
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Dynamic Multi-Tenant Message Queue Status</p>
          <p className="text-[11px] text-slate-400 font-medium">Click "Review Draft" to verify or modify background copies before pipeline dispatch.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead><tr><th>Company Node</th><th>Target Email Handle</th><th>State Status</th><th>Fault Diagnostic</th><th>Actions</th></tr></thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="font-medium text-slate-900">{l.company_name || '—'}</td>
                  <td className="text-blue-600 text-xs font-mono">{l.email}</td>
                  <td><span className={`text-xs font-bold uppercase ${sc[l.status] || 'text-slate-400'}`}>{l.status}</span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '—'}</td>
                  <td>
                    {l.status === 'draft' ? (
                      <button onClick={() => openInlineEditor(l)} className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg py-1 px-2.5 font-bold flex items-center gap-1 transition-all">
                        <Eye size={11} /> Review Draft
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 italic pl-2">Locked for Send</span>
                    )}
                  </td>
                </tr>
              ))}
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
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)

  const submit = async () => {
    if (!form.campaign_name || !form.subject_template || !form.body_template) { toast.error('Fill name, subject, body templates'); return }
    if (selected.size === 0) { toast.error('Select target leads to ingest'); return }
    setSubmitting(true)
    try {
      await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      toast.success(`Campaign initialized! Processing background generations...`)
      setTimeout(onDone, 800)
    } catch (e) { toast.error(e.response?.data?.detail || 'Execution configuration failure') } finally { setSubmitting(false) }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New Email Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <label className="field-label mb-0">Base Subject Line Template</label>
                <button type="button" onClick={async () => {
                  setAiLoading(true)
                  try {
                    const { data } = await campaignApi.preview({
                      subject: '', body: '', lead_id: 0, personalise: false, generate_template: true,
                      context_hint: form.campaign_name || 'cold outreach to business leads',
                    })
                    if (data.subject) setForm(p => ({...p, subject_template: data.subject}))
                    if (data.body)    setForm(p => ({...p, body_template: data.body}))
                  } catch (e) { toast.error('AI blueprint generation failed') } finally { setAiLoading(false) }
                }} disabled={aiLoading} className="btn-ghost btn-sm text-blue-600 text-xs">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Create AI Template Blueprint
                </button>
              </div>
              <input className="input" placeholder="Quick question for {lead_company}"
                value={form.subject_template} onChange={e => setForm(p => ({...p, subject_template: e.target.value}))} />
            </div>
            <div>
              <label className="field-label">Base Body Copy Template</label>
              <textarea className="textarea h-40" placeholder={"Hi {lead_name},\n\nI noticed {lead_company}..."}
                value={form.body_template} onChange={e => setForm(p => ({...p, body_template: e.target.value}))} />
              <p className="text-xs text-blue-600 font-medium mt-1">✨ Dynamic multi-tenant profile fields will inject automatically on launch</p>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Background AI Personalisation</p>
                <p className="text-xs text-slate-400">Groq loops asynchronously to generate custom drafts per lead</p>
              </div>
              <button type="button" onClick={() => setForm(p => ({...p, personalise: !p.personalise}))}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-3 block">Target Outreach Segment List Selection</label>
            <LeadSelector selected={selected} onChange={setSelected} requirePhone={false} />
          </div>
        </div>

        {/* Right Info Notice Panel Placeholder */}
        <div>
          <div className="card bg-slate-50 border border-slate-200 p-6 sticky top-6 space-y-4 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Zap size={15} className="text-amber-500" /> Automated Pipeline Blueprint Flow
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Neolix has completely retired local generation waiting loops. When you click launch, the backend immediately distributes your custom body blueprints into concurrent Groq processing threads.
            </p>
            <div className="bg-white p-3 border rounded-xl space-y-2 text-[11px] text-slate-600 font-medium">
              <p>🟢 Step 1: Initialize template layouts and variables.</p>
              <p>🟡 Step 2: System builds isolated custom copies automatically in background collections.</p>
              <p>🔵 Step 3: Open details panel anytime to refine copy strings or confirm active dispatch hooks.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-8">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Initializing Matrix…' : `Launch Campaign for ${selected.size} Targets`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// REPLIES VIEW LAYERS (Kept completely intact)
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

      <div className="flex flex-1 overflow-hidden border border-slate-200 rounded-xl mt-3">
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
  const [tab, setTab]       = useState('campaigns')   
  const [campView, setCampView] = useState('list')    
  const [detailId, setDetailId] = useState(null)
  
  const { emailUnread } = useUnreadReplies();

  return (
    <div>
      <div className="flex items-center gap-0 border-b border-slate-200 mb-6 -mt-2">
        <h1 className="text-lg font-bold text-slate-900 pr-6 py-3">Email</h1>
        {[
          { id: 'campaigns', label: 'Campaigns' },
          { id: 'replies',   label: 'Replies', badgeCount: emailUnread }, 
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setCampView('list') }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2
              ${tab===t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
            {t.badgeCount > 0 && (
              <span className="bg-red-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {t.badgeCount}
              </span>
            )}
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