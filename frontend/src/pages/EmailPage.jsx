import { useState, useEffect, useRef } from 'react'
import {
  Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply, Edit3, Save, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, repliesApi, api } from '../services/api'
import LeadSelector, { splitLeadsForLaunch } from '../components/LeadSelector'
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
 
  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
  if (!data) return null
 
  const sc = { sent:'text-emerald-600', failed:'text-red-500', pending:'text-slate-500 font-bold' }
 
  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 flex-1">{data.name}</h2>
          <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
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
 
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Dynamic Multi-Tenant Message Queue Status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead><tr><th>Company Node</th><th>Target Email Handle</th><th>State Status</th><th>Fault Diagnostic</th></tr></thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="font-medium text-slate-900">{l.company_name || '—'}</td>
                  <td className="text-blue-600 text-xs font-mono">{l.email}</td>
                  <td><span className={`text-xs font-bold uppercase ${sc[l.status] || 'text-slate-400'}`}>{l.status}</span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '—'}</td>
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
// ── Campaign create ───────────────────────────────────────
// ── Email templates (mirrors backend EMAIL_TEMPLATES) ────────────────────
const EMAIL_TEMPLATES = [
  { id: 'navy',    label: 'Navy Blue',     primary: '#1e3a5f', accent: '#2563eb', bg: '#f4f6f9' },
  { id: 'emerald', label: 'Emerald',       primary: '#065f46', accent: '#10b981', bg: '#f3faf6' },
  { id: 'slate',   label: 'Minimal Slate', primary: '#1e293b', accent: '#64748b', bg: '#f8fafc' },
  { id: 'amber',   label: 'Warm Amber',    primary: '#92400e', accent: '#f59e0b', bg: '#fdf8f1' },
  { id: 'violet',  label: 'Violet',        primary: '#4c1d95', accent: '#8b5cf6', bg: '#f6f4fc' },
]

// ── Template picker swatch grid ──────────────────────────────────────────
function TemplatePicker({ selected, onSelect }) {
  return (
    <div>
      <label className="field-label">Email Template</label>
      <div className="grid grid-cols-5 gap-2 mt-1">
        {EMAIL_TEMPLATES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`rounded-xl border-2 overflow-hidden text-left transition-all ${selected === t.id ? 'border-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div style={{ backgroundColor: t.primary }} className="h-8 w-full" />
            <div style={{ backgroundColor: t.bg }} className="h-10 w-full flex items-center justify-center">
              <div style={{ backgroundColor: t.accent }} className="w-6 h-1.5 rounded-full" />
            </div>
            <p className="text-[10px] font-semibold text-slate-600 text-center py-1 truncate px-1">{t.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Campaign create ───────────────────────────────────────
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({
    campaign_name: '',
    campaign_info: '',
    daily_limit: 100,
    template_id: 'navy',
    is_cold_outreach: false,   // ← NEW
  })
  const [selected, setSelected] = useState(new Map())
  const [drafts, setDrafts] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [launching, setLaunching] = useState(false)

  const generatePreview = async () => {
  if (!form.campaign_name) {
    toast.error('Campaign name is required'); return
  }
  if (!form.is_cold_outreach && !form.campaign_info) {
    toast.error('Context/info is required (or switch to Cold Outreach mode)'); return
  }
  if (selected.size === 0) { toast.error('Select target leads'); return }

  const { lead_ids, inline_leads } = splitLeadsForLaunch(selected)

  setGenerating(true)
  try {
    const { data } = await campaignApi.previewBatch(
      form.is_cold_outreach ? '' : form.campaign_info,
      lead_ids, inline_leads, form.template_id
    )
    setDrafts(data.drafts || [])
    toast.success('Drafts generated — review and edit below')
  } catch (e) {
    toast.error(e.response?.data?.detail || 'Draft generation failed')
  } finally {
    setGenerating(false)
  }
}


  const updateDraft = (idx, field, value) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const removeDraft = (idx) => {
    setDrafts(prev => prev.filter((_, i) => i !== idx))
  }

  const launch = async () => {
    if (!drafts || drafts.length === 0) { toast.error('No drafts to send'); return }
    setLaunching(true)
    try {
      await campaignApi.launch({
        campaign_name: form.campaign_name,
        campaign_info: form.campaign_info,
        daily_limit: form.daily_limit,
        template_id: form.template_id,
        drafts: drafts.map(d => ({
          lead_id: d.lead_id,
          email: d.email,
          company_name: d.company_name,
          contact_name: d.contact_name,
          business_details: d.business_details,
          subject: d.subject,
          body: d.body,
        }))
      })
      toast.success('Campaign launched — sending emails now!')
      onDone()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  // ── Preview / Edit screen ──────────────────────────────
  if (drafts) {
    const tpl = EMAIL_TEMPLATES.find(t => t.id === form.template_id) || EMAIL_TEMPLATES[0]

    return (
      <div>
        <button onClick={() => setDrafts(null)} className="btn-ghost -ml-2 mb-4">
          <ChevronLeft size={16} /> Back to setup
        </button>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Drafts</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {drafts.length} email{drafts.length !== 1 ? 's' : ''} ready · Edit any draft, then launch to send
            </p>
          </div>
          <button onClick={launch} disabled={launching || drafts.length === 0} className="btn-primary">
            {launching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {launching ? 'Launching…' : 'Launch'}
          </button>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Try a different template</p>
          <div className="flex gap-2">
            {EMAIL_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm(p => ({...p, template_id: t.id}))}
                title={t.label}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 transition-all ${form.template_id === t.id ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <span style={{ backgroundColor: t.primary }} className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {drafts.map((d, idx) => (
            <div key={d.lead_id} className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Editable fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{d.company_name || d.contact_name || 'Unnamed Lead'}</p>
                    <p className="text-xs text-blue-600 font-mono">{d.email}</p>
                  </div>
                  <button onClick={() => removeDraft(idx)} className="text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
                <div>
                  <label className="field-label">Subject</label>
                  <input className="input" value={d.subject} onChange={e => updateDraft(idx, 'subject', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Body</label>
                  <textarea className="textarea h-56" value={d.body} onChange={e => updateDraft(idx, 'body', e.target.value)} />
                </div>
              </div>

              {/* Live HTML preview in selected template */}
              <div>
                <label className="field-label">Preview ({tpl.label})</label>
                <div className="rounded-xl border border-slate-200 overflow-hidden h-[28rem] bg-slate-100">
                  <iframe
                    title={`preview-${d.lead_id}`}
                    srcDoc={buildLivePreviewHtml(tpl, d.subject, d.body)}
                    className="w-full h-full border-0"
                    sandbox=""
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={launch} disabled={launching || drafts.length === 0} className="btn-primary w-full mt-4">
          {launching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {launching ? 'Launching…' : 'Launch'}
        </button>
      </div>
    )
  }

  // ── Setup screen ────────────────────────────────────────
    // ── Setup screen ────────────────────────────────────────
  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New AI Campaign</h2>

      <div className="card p-5 space-y-4 max-w-2xl">
        <div>
          <label className="field-label">Campaign Name</label>
          <input className="input" placeholder="e.g. Startup Fest Follow-up"
            value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={form.is_cold_outreach}
              onChange={e => setForm(p => ({...p, is_cold_outreach: e.target.checked}))}
            />
            <span className="field-label mb-0">Cold Outreach (no prior contact — uses our AI opener model)</span>
          </label>

          {!form.is_cold_outreach && (
            <>
              <label className="field-label">Campaign Context / AI Prompt</label>
              <textarea className="textarea h-24" placeholder="e.g. We met at the Startup Fest. You were interested in our automated lead generation system."
                value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
              <p className="text-xs text-slate-400 mt-1">The AI will use this context to write a natural, professional email for every lead.</p>
            </>
          )}
          {form.is_cold_outreach && (
            <p className="text-xs text-slate-400">No prior meeting context needed — each email opener is generated from the lead's company, industry, and location using our fine-tuned model.</p>
          )}
        </div>

        <TemplatePicker selected={form.template_id} onSelect={id => setForm(p => ({...p, template_id: id}))} />

        <LeadSelector selected={selected} onChange={setSelected} />

        <button onClick={generatePreview} disabled={generating} className="btn-primary w-full mt-4">
          {generating ? <Loader2 className="animate-spin" /> : 'Generate Preview'}
        </button>
      </div>
    </div>
  )
}

// ── Client-side mirror of backend render_email_html (for live preview only) ─
function buildLivePreviewHtml(tpl, subject, bodyText) {
  const paragraphs = (bodyText || '')
    .split(/\n\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 16px 0; line-height:1.65;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:${tpl.bg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tpl.bg}; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:${tpl.primary}; border-radius:10px 10px 0 0; padding:18px 24px;">
            <p style="margin:0; color:#ffffff; font-size:14px; font-weight:700;">Your Company</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff; padding:28px 24px 8px 24px;">
            <div style="font-size:14px; color:#1f2937;">
              ${paragraphs || '<p style="color:#9ca3af;">Body preview will appear here…</p>'}
            </div>
            <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:13px; font-weight:600; color:#1f2937;">Your Name</p>
              <p style="margin:2px 0 0 0; font-size:12px; color:#6b7280;">Title · Company</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff; border-radius:0 0 10px 10px; text-align:center; padding:16px 20px; font-size:10px; color:#9ca3af;">
            You're receiving this because of a prior connection relevant to your business.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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