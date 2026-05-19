import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  Image, FileText, Zap, Search, Upload, CreditCard,
  Check, ChevronRight, ClipboardList, RefreshCw, Plus, ChevronLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, leadsApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'

const statusBadge = {
  running: 'badge-blue',
  completed: 'badge-green',
  queued: 'badge-gray',
  failed: 'badge-red',
  paused: 'badge-orange',
}

function timeAgo(iso) {
  if (!iso) return '-'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const MSG_TYPES = [
  {
    id: 'hook', label: 'Hook', sub: 'Short punchy opener',
    placeholder: `Hi {lead_name}\n\nWe help {lead_company} get better results faster.\n\nWorth a chat?`,
    hint: 'hook short punchy opener under 3 lines', rows: 4,
  },
  {
    id: 'detailed', label: 'Detailed', sub: '80-120 word outreach',
    placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`,
    hint: 'detailed professional cold outreach 80-120 words', rows: 9,
  },
  {
    id: 'image', label: 'Image', sub: 'Image + caption',
    placeholder: `Hi {lead_name} - sharing our catalogue for {lead_company}.\nHappy to discuss! - {sender_name}`,
    hint: 'short 1-2 line caption for image attachment', rows: 3,
  },
]

function TypeIcon({ id, size = 13 }) {
  if (id === 'hook') return <Zap size={size} />
  if (id === 'detailed') return <FileText size={size} />
  return <Image size={size} />
}

function CampaignList({ onCreate, onSingle, onDetail }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await waApi.campaignList()
      setCamps(data)
    } catch {
      toast.error('Failed to load WhatsApp campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">WhatsApp Campaigns</h2>
          <p className="text-sm text-slate-400 mt-0.5">AI-personalised WhatsApp outreach</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={16} /></button>
          <button onClick={onSingle} className="btn-secondary"><Send size={16} /> Single Send</button>
          <button onClick={onCreate} className="btn-primary"><Plus size={16} /> Start Campaign</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>}

      {!loading && camps.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare size={36} className="mb-3 text-slate-200" />
          <p className="font-medium text-slate-600 mb-1">No WhatsApp campaigns yet</p>
          <p className="text-sm mb-4">Create your first WhatsApp outreach campaign</p>
          <button onClick={onCreate} className="btn-primary"><Plus size={15} /> Start Campaign</button>
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
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '-'} · {c.daily_limit}/day
                </p>
                <div className="h-1.5 bg-slate-100 rounded-full w-40">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex gap-5 text-right flex-shrink-0">
                <div><p className="text-xl font-bold text-slate-900">{c.total_leads?.toLocaleString?.() || 0}</p><p className="text-xs text-slate-400">leads</p></div>
                <div><p className="text-xl font-bold text-emerald-600">{c.sent?.toLocaleString?.() || 0}</p><p className="text-xs text-slate-400">sent</p></div>
                <div><p className="text-xl font-bold text-red-500">{c.failed?.toLocaleString?.() || 0}</p><p className="text-xs text-slate-400">failed</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data: d } = await waApi.campaignDetail(id)
      setData(d)
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>
  if (!data) return null

  const sc = { sent: 'text-emerald-600', failed: 'text-red-500', pending: 'text-slate-400' }

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
          { label: 'Total', value: data.total_leads?.toLocaleString?.() || 0, color: 'text-slate-900' },
          { label: 'Sent', value: data.sent?.toLocaleString?.() || 0, color: 'text-emerald-600' },
          { label: 'Failed', value: data.failed?.toLocaleString?.() || 0, color: 'text-red-500' },
          { label: 'Limit', value: `${data.daily_limit || 0}/day`, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(data.fail_reasons || {}).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Failure Logs</p>
          {Object.entries(data.fail_reasons).map(([r, c]) => (
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
            <thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Status</th><th>Error</th><th>Sent at</th></tr></thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-900">{l.name || '-'}</td>
                  <td>{l.company || '-'}</td>
                  <td className="text-emerald-600 text-xs">+{l.phone}</td>
                  <td><span className={`text-xs font-semibold ${sc[l.status] || 'text-slate-400'}`}>{l.status?.toUpperCase()}</span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '-'}</td>
                  <td className="text-xs text-slate-400">{l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : '-'}</td>
                </tr>
              ))}
              {!data.leads_preview?.length && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No sends yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({
    campaign_name: '',
    message_template: '',
    personalise: true,
    daily_limit: 50,
    send_order: 'as_selected',
  })
  const [selected, setSelected] = useState(new Map())
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const leadIds = Array.from(selected.keys())

  const generate = async () => {
    setAiLoading(true)
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_id: 0,
        personalise: false,
        generate_template: true,
        message_type: 'detailed',
        context_hint: form.campaign_name || 'WhatsApp cold outreach to business leads',
      })
      setForm(p => ({ ...p, message_template: data.message || '' }))
      toast.success('Message generated')
    } catch {
      toast.error('AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const loadPreview = async () => {
    if (!form.message_template.trim()) { toast.error('Enter a message first'); return }
    setPreviewLoading(true)
    try {
      const first = selected.values().next().value || {}
      const { data } = await waApi.preview({
        message: form.message_template,
        lead_id: leadIds[0] || 0,
        lead_name: first.contact_name || first.name || '',
        lead_company: first.company_name || first.company || '',
        lead_business_details: first.business_details || '',
        business_details: first.business_details || '',
        personalise: form.personalise,
        message_type: 'detailed',
      })
      setPreview(data)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const submit = async () => {
    if (!form.campaign_name.trim() || !form.message_template.trim()) {
      toast.error('Fill campaign name and message')
      return
    }
    if (selected.size === 0) {
      toast.error('Select at least one lead with phone')
      return
    }
    setSubmitting(true)
    try {
      await waApi.campaignCreate({ ...form, lead_ids: leadIds })
      toast.success(`WhatsApp campaign started for ${selected.size} leads`)
      setTimeout(onDone, 700)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Campaign failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New WhatsApp Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign name</label>
              <input className="input" placeholder="e.g. WhatsApp Outreach - May"
                value={form.campaign_name}
                onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Daily limit <span className="normal-case font-normal text-slate-400">(max 50)</span></label>
                <input type="number" min={1} max={50} className="input" value={form.daily_limit}
                  onChange={e => setForm(p => ({ ...p, daily_limit: Math.min(parseInt(e.target.value) || 50, 50) }))} />
              </div>
              <div>
                <label className="field-label">Send order</label>
                <select className="input" value={form.send_order}
                  onChange={e => setForm(p => ({ ...p, send_order: e.target.value }))}>
                  <option value="as_selected">As selected</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0">Message</label>
                <button onClick={generate} disabled={aiLoading} className="btn-ghost btn-sm text-emerald-600 text-xs">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI generate
                </button>
              </div>
              <textarea className="textarea h-44 font-mono text-xs"
                placeholder={"Hi {lead_name},\n\nI came across {lead_company}...\n\n{sender_name}"}
                value={form.message_template}
                onChange={e => { setForm(p => ({ ...p, message_template: e.target.value })); setPreview(null) }} />
              <p className="text-[10px] text-slate-400 mt-1">
                Use <code>{'{lead_name}'}</code>, <code>{'{lead_company}'}</code>, <code>{'{sender_name}'}</code>
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">AI personalisation</p>
                <p className="text-xs text-slate-400">Uses business description from each lead</p>
              </div>
              <button onClick={() => setForm(p => ({ ...p, personalise: !p.personalise }))}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-3 block">Add leads</label>
            <LeadSelector selected={selected} onChange={setSelected} requirePhone />
          </div>
        </div>

        <div>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Eye size={14} className="text-slate-400" /> Preview
              </p>
              <button onClick={loadPreview} disabled={previewLoading || !form.message_template.trim()}
                className="btn-secondary text-xs py-1.5 px-3">
                {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Preview
              </button>
            </div>

            {selected.size === 0 && <div className="py-12 text-center text-sm text-slate-400">Select leads to preview</div>}
            {previewLoading && <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>}
            {!previewLoading && preview && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#e5ddd5' }}>
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{preview.message}</p>
                    <p className="text-[10px] text-slate-500 text-right mt-1">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  For: <strong>{preview.lead_name || '-'}</strong>{preview.lead_company ? ` @ ${preview.lead_company}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-8">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating...' : `Send to ${selected.size} leads`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
        {selected.size > 0 && (
          <p className="text-xs text-slate-400 ml-auto">
            ~{Math.ceil(selected.size / Math.max(form.daily_limit, 1))} day(s) to complete
          </p>
        )}
      </div>
    </div>
  )
}

/* Keep your existing LeadInputPanel and single-send UI below.
   Only change these exact parts inside LeadInputPanel:
   - parsed result should include business_details
   - manual paste should parse description/details/business_details
   - selected payload should carry business_details
   - waApi.preview should send business_details / lead_business_details
*/

export default function WhatsAppPage() {
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)

  return (
    <div>
      {view === 'list' && (
        <CampaignList
          onCreate={() => setView('create')}
          onSingle={() => setView('single')}
          onDetail={id => { setDetailId(id); setView('detail') }}
        />
      )}

      {view === 'create' && (
        <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />
      )}

      {view === 'detail' && (
        <CampaignDetail id={detailId} onBack={() => setView('list')} />
      )}

      {view === 'single' && (
        <div>
          <button onClick={() => setView('list')} className="btn-ghost -ml-2 mb-4">
            <ChevronLeft size={16} /> Back to campaigns
          </button>
          <WhatsAppSingleSend />
        </div>
      )}
    </div>
  )
}