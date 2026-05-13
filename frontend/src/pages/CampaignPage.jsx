import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Plus, ChevronLeft, RefreshCw, Search, Upload,
  CreditCard, Mail, ClipboardList, X, Check, Loader2,
  Zap, Eye, ChevronLeft as Prev, ChevronRight as Next, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, leadsApi } from '../services/api'

// ── Status badge ──────────────────────────────────────────────────────────────
const statusClass = {
  running:   'badge-blue',
  completed: 'badge-green',
  paused:    'badge-orange',
  failed:    'badge-red',
  queued:    'badge-gray',
}

// ── Campaign list view ────────────────────────────────────────────────────────
function CampaignList({ onSelect, onCreate }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await campaignApi.list()
      setCampaigns(data)
    } catch { toast.error('Failed to load campaigns') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-sub">Email outreach with AI personalisation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={onCreate} className="btn-primary">
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="text-center py-20">
          <Send size={40} className="mx-auto mb-4 text-surface-200" />
          <p className="font-medium text-gray-700">No campaigns yet</p>
          <p className="text-sm text-surface-400 mt-1">Create your first outreach campaign</p>
          <button onClick={onCreate} className="btn-primary mt-4">
            <Plus size={16} /> New Campaign
          </button>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map(c => {
          const pct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              className="card-hover p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <span className={statusClass[c.status] || 'badge-gray'}>
                    {c.status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-surface-400">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}
                  {' · '}{c.daily_limit}/day limit
                </p>
                <div className="mt-2 h-1.5 bg-surface-100 rounded-full overflow-hidden w-48">
                  <div className="h-full bg-brand-400 rounded-full transition-all" style={{width: `${pct}%`}} />
                </div>
              </div>
              <div className="flex gap-6 text-right flex-shrink-0">
                <div>
                  <p className="text-xl font-bold text-gray-900">{c.total_leads.toLocaleString()}</p>
                  <p className="text-xs text-surface-400">leads</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600">{c.sent.toLocaleString()}</p>
                  <p className="text-xs text-surface-400">sent</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{pct}%</p>
                  <p className="text-xs text-surface-400">done</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Campaign detail view ──────────────────────────────────────────────────────
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data: d } = await campaignApi.get(id)
      setData(d)
    } catch { toast.error('Failed to load campaign') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)   // auto-refresh
    return () => clearInterval(iv)
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
  if (!data) return null

  const statusColor = { sent: 'text-emerald-600', failed: 'text-red-500', pending: 'text-surface-400', skipped: 'text-surface-400' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
        <ChevronLeft size={16} /> Back to campaigns
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{data.name}</h1>
          <span className={`${statusClass[data.status] || 'badge-gray'} mt-1`}>
            {data.status?.toUpperCase()}
          </span>
        </div>
        <button onClick={load} className="btn-ghost btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Leads', value: data.total_leads.toLocaleString(), color: 'text-gray-900' },
          { label: 'Sent',        value: data.sent.toLocaleString(),        color: 'text-emerald-600' },
          { label: 'Failed',      value: data.failed.toLocaleString(),      color: 'text-red-500' },
          { label: 'Daily Limit', value: `${data.daily_limit}/day`,         color: 'text-brand-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Failure reasons */}
      {Object.keys(data.fail_reasons || {}).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Failure Reasons</p>
          {Object.entries(data.fail_reasons).map(([reason, count]) => (
            <div key={reason} className="flex justify-between py-1.5 border-b border-red-100 last:border-0 text-sm">
              <span className="text-red-700 truncate mr-4">{reason}</span>
              <span className="text-red-600 font-semibold flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leads table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100">
          <p className="text-sm font-semibold text-gray-800">Recent sends</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Company</th><th>Email</th><th>Status</th><th>Error</th><th>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900">{l.company_name || '—'}</td>
                  <td className="text-brand-600 text-xs">{l.email}</td>
                  <td><span className={`text-xs font-semibold ${statusColor[l.status] || 'text-surface-400'}`}>
                    {l.status?.toUpperCase()}
                  </span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '—'}</td>
                  <td className="text-xs text-surface-400">
                    {l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
              {!data.leads_preview?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-surface-400">No sends yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Create campaign view ──────────────────────────────────────────────────────
const PANELS = [
  { id: 'upload', icon: Upload,        label: 'Upload File' },
  { id: 'scan',   icon: CreditCard,    label: 'Scan Card' },
  { id: 'single', icon: Mail,          label: 'Single Email' },
  { id: 'bulk',   icon: ClipboardList, label: 'Paste Bulk' },
]

function CreateCampaign({ onBack, onCreated }) {
  const [form, setForm] = useState({
    campaign_name: '', subject_template: '', body_template: '',
    personalise: true, daily_limit: 100, send_order: 'as_selected',
  })
  const [selected, setSelected] = useState(new Map())
  const [activePanel, setActivePanel] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const previewTimer = useRef()

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await leadsApi.search(query, 50)
      setResults(data.leads)
    } catch { toast.error('Search failed') }
    finally { setSearching(false) }
  }

  const toggleLead = useCallback((lead) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(lead.id)) next.delete(lead.id)
      else next.set(lead.id, lead)
      return next
    })
  }, [])

  const handleAdded = (ids) => {
    setSelected(prev => {
      const next = new Map(prev)
      ids.forEach(id => { if (!next.has(id)) next.set(id, { id }) })
      return next
    })
  }

  const schedulePreview = () => {
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(loadPreview, 900)
  }

  const loadPreview = async () => {
    if (selected.size === 0 || !form.subject_template) return
    const ids = Array.from(selected.keys())
    const leadId = ids[previewIdx] || ids[0]
    setPreviewLoading(true)
    try {
      const { data } = await campaignApi.preview({
        subject: form.subject_template,
        body: form.body_template,
        lead_id: leadId,
        personalise: form.personalise,
      })
      setPreviewData(data)
    } catch { /* silent */ }
    finally { setPreviewLoading(false) }
  }

  useEffect(() => { schedulePreview() }, [form.subject_template, form.body_template, form.personalise, selected.size, previewIdx])

  const generateAI = async () => {
    const hint = form.campaign_name || 'cold outreach'
    setAiGenerating(true)
    try {
      // Call groq via backend preview with empty lead to get template
      const { data } = await campaignApi.preview({
        subject: '', body: '',
        lead_id: Array.from(selected.keys())[0] || 1,
        personalise: false,
        generate_template: true,
        context_hint: hint,
      })
      if (data.subject) setForm(p => ({ ...p, subject_template: data.subject }))
      if (data.body)    setForm(p => ({ ...p, body_template: data.body }))
      toast.success('Template generated!')
    } catch {
      toast.error('AI generation failed — check Groq key')
    } finally {
      setAiGenerating(false)
    }
  }

  const submit = async () => {
    if (!form.campaign_name || !form.subject_template || !form.body_template) {
      toast.error('Fill in campaign name, subject, and body')
      return
    }
    if (selected.size === 0) { toast.error('Select at least one lead'); return }
    setSubmitting(true)
    try {
      await campaignApi.create({
        ...form,
        lead_ids: Array.from(selected.keys()),
      })
      toast.success(`Campaign started! Sending to ${selected.size} leads.`)
      setTimeout(onCreated, 1000)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const ids = Array.from(selected.keys())

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
        <ChevronLeft size={16} /> Back
      </button>
      <h1 className="page-title mb-6">New Campaign</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: form */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-800 border-b border-surface-100 pb-3">Campaign details</p>

            <div>
              <label className="field-label">Campaign name</label>
              <input className="input" placeholder="e.g. Automotive Outreach — May"
                value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Daily limit <span className="normal-case font-normal text-surface-400">(max 200)</span></label>
                <input type="number" min={1} max={200} className="input" value={form.daily_limit}
                  onChange={e => setForm(p => ({...p, daily_limit: parseInt(e.target.value) || 100}))} />
              </div>
              <div>
                <label className="field-label">Send order</label>
                <select className="input" value={form.send_order}
                  onChange={e => setForm(p => ({...p, send_order: e.target.value}))}>
                  <option value="as_selected">As selected</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0">Subject</label>
                <button onClick={generateAI} disabled={aiGenerating}
                  className="btn-ghost btn-sm text-brand-600 hover:text-brand-700">
                  {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  AI generate
                </button>
              </div>
              <input className="input" placeholder="Quick question for {lead_company}"
                value={form.subject_template}
                onChange={e => { setForm(p => ({...p, subject_template: e.target.value})); schedulePreview() }} />
            </div>

            <div>
              <label className="field-label">Email body</label>
              <textarea className="textarea h-40" placeholder={"Hi {lead_name},\n\nI noticed {lead_company} specialises in..."}
                value={form.body_template}
                onChange={e => { setForm(p => ({...p, body_template: e.target.value})); schedulePreview() }} />
              <p className="text-xs text-brand-600 mt-1.5 font-medium">
                ✨ Signature and brand colours added automatically
              </p>
            </div>

            {/* AI personalise toggle */}
            <div className="flex items-center justify-between py-2 border-t border-surface-100">
              <div>
                <p className="text-sm font-medium text-gray-800">AI personalisation</p>
                <p className="text-xs text-surface-400">Groq rewrites each email using lead's business details</p>
              </div>
              <button onClick={() => setForm(p => ({...p, personalise: !p.personalise}))}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0
                  ${form.personalise ? 'bg-brand-500' : 'bg-surface-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200
                  ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Lead selector */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">Add leads</p>

            {/* Search */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={14} className="text-surface-400" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Search database…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-surface-400" />
              </div>
              <button onClick={doSearch} className="btn-secondary px-3">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
              {/* Add method icons */}
              {PANELS.map(p => (
                <button key={p.id} onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
                  title={p.label}
                  className={`btn-icon ${activePanel === p.id ? 'bg-brand-50 text-brand-600' : ''}`}>
                  <p.icon size={15} />
                </button>
              ))}
            </div>

            {/* Panel */}
            {activePanel && (
              <div className="mb-3 border border-surface-200 rounded-xl overflow-hidden fade-up">
                {activePanel === 'single' && <SingleMini onAdded={handleAdded} />}
                {activePanel === 'bulk'   && <BulkMini   onAdded={handleAdded} />}
                {activePanel === 'upload' && <UploadMini onAdded={handleAdded} />}
                {activePanel === 'scan'   && <ScanMini   onAdded={handleAdded} />}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {results.map(lead => (
                  <div key={lead.id} onClick={() => toggleLead(lead)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-sm transition-all
                      ${selected.has(lead.id) ? 'border-brand-300 bg-brand-50' : 'border-surface-100 bg-white hover:border-surface-200'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${selected.has(lead.id) ? 'bg-brand-500 border-brand-500' : 'border-surface-300'}`}>
                      {selected.has(lead.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-900">{lead.company_name || 'Unknown'}</p>
                      <p className="text-xs text-brand-600 truncate">{lead.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected count */}
            <div className="flex items-center justify-between pt-3 border-t border-surface-100 mt-3">
              <span className="text-sm text-surface-500">
                <strong className="text-gray-900">{selected.size}</strong> leads selected
              </span>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Map())}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column: preview */}
        <div>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">
                <Eye size={14} className="inline mr-1.5 text-surface-400" />
                Live Preview
              </p>
              {ids.length > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPreviewIdx(p => Math.max(0, p-1))} disabled={previewIdx === 0}
                    className="btn-icon p-1 disabled:opacity-30"><Prev size={14} /></button>
                  <span className="text-xs text-surface-400">{previewIdx+1} / {ids.length}</span>
                  <button onClick={() => setPreviewIdx(p => Math.min(ids.length-1, p+1))} disabled={previewIdx >= ids.length-1}
                    className="btn-icon p-1 disabled:opacity-30"><Next size={14} /></button>
                </div>
              )}
            </div>

            {previewLoading && (
              <div className="flex items-center gap-2 text-sm text-surface-400 py-8 justify-center">
                <Loader2 size={16} className="animate-spin text-brand-500" /> Generating preview…
              </div>
            )}

            {!previewLoading && selected.size === 0 && (
              <div className="py-12 text-center text-surface-400 text-sm">
                Select a lead to preview the email
              </div>
            )}

            {!previewLoading && previewData && (
              <div className="fade-up">
                <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                  <p className="text-xs text-surface-400 mb-1 font-mono uppercase">Subject</p>
                  <p className="text-sm font-semibold text-gray-800 mb-4">{previewData.subject}</p>
                  <div className="h-px bg-surface-200 mb-4" />
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{previewData.body}</p>
                  <div className="mt-4 pt-4 border-t border-surface-200">
                    <p className="text-xs text-surface-400">
                      Preview for: <strong className="text-gray-700">{previewData.lead_name || '—'}</strong>
                      {previewData.lead_company ? ` @ ${previewData.lead_company}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6 pt-6 border-t border-surface-200 flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-8">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating campaign…' : `Send to ${selected.size} leads`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
        {selected.size > 0 && (
          <p className="text-sm text-surface-400 ml-auto">
            ~{Math.ceil(selected.size / form.daily_limit)} day{Math.ceil(selected.size / form.daily_limit) !== 1 ? 's' : ''} to complete
          </p>
        )}
      </div>
    </div>
  )
}

// ── Mini input components for campaign create panel ────────────────────────────
function SingleMini({ onAdded }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!email.includes('@')) { toast.error('Invalid email'); return }
    setLoading(true)
    try {
      const { data } = await leadsApi.addSingle({ email })
      toast.success(`${email} added`)
      onAdded(data.lead_ids)
      setEmail('')
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }
  return (
    <div className="p-3 flex gap-2">
      <input className="input flex-1" type="email" placeholder="email@company.com"
        value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      <button onClick={submit} disabled={loading} className="btn-primary px-4">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
      </button>
    </div>
  )
}

function BulkMini({ onAdded }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const found = [...new Set((text.match(emailRe) || []).map(e => e.toLowerCase()))].length
  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(text)
      toast.success(`${data.total_found} added`)
      onAdded(data.lead_ids)
      setText('')
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }
  return (
    <div className="p-3 space-y-2">
      <textarea className="textarea h-24 text-xs font-mono" value={text}
        onChange={e => setText(e.target.value)} placeholder="Paste emails..." />
      {found > 0 && <p className="text-xs text-emerald-600">{found} emails found</p>}
      <button onClick={submit} disabled={loading || !found} className="btn-primary btn-sm">
        {loading ? <Loader2 size={13} className="animate-spin" /> : null} Add {found || ''} emails
      </button>
    </div>
  )
}

function UploadMini({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef()
  const handle = async (file) => {
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      toast.success(`${data.total_found} leads extracted`)
      onAdded(data.lead_ids)
    } catch { toast.error('Upload failed') } finally { setLoading(false) }
  }
  return (
    <div className="p-3">
      <div onClick={() => ref.current.click()}
        className="border-2 border-dashed border-surface-200 rounded-lg p-4 text-center cursor-pointer hover:border-brand-300 transition-all">
        {loading
          ? <Loader2 size={18} className="animate-spin mx-auto text-brand-500" />
          : <><Upload size={18} className="mx-auto mb-1 text-surface-400" /><p className="text-xs text-surface-500">Click or drop CSV/Excel/PDF</p></>}
      </div>
      <input ref={ref} type="file" className="hidden" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
    </div>
  )
}

function ScanMini({ onAdded }) {
  return (
    <div className="p-3 text-center text-xs text-surface-500">
      Use the Leads page scanner for full camera support
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function CampaignPage() {
  const [view, setView] = useState('list')   // list | create | detail
  const [detailId, setDetailId] = useState(null)

  if (view === 'create') {
    return <CreateCampaign onBack={() => setView('list')} onCreated={() => setView('list')} />
  }
  if (view === 'detail' && detailId) {
    return <CampaignDetail id={detailId} onBack={() => setView('list')} />
  }
  return (
    <CampaignList
      onSelect={id => { setDetailId(id); setView('detail') }}
      onCreate={() => setView('create')}
    />
  )
}