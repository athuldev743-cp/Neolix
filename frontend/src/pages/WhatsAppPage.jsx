import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  Image, FileText, Zap, Search, Upload, CreditCard,
  Check, ChevronRight, ClipboardList, RefreshCw, Plus, ChevronLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, leadsApi } from '../services/api'

const statusBadge = { running:'badge-blue', completed:'badge-green', queued:'badge-gray', failed:'badge-red', paused:'badge-orange' }

const MSG_TYPES = [
  { id:'hook', label:'Hook', sub:'Short punchy opener', placeholder:`Hi {lead_name}\n\nWe help {lead_company} get better results faster.\n\nWorth a chat?`, hint:'hook short punchy opener under 3 lines', rows:4 },
  { id:'detailed', label:'Detailed', sub:'80-120 word outreach', placeholder:`Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`, hint:'detailed professional cold outreach 80-120 words', rows:9 },
  { id:'image', label:'Image', sub:'Image + caption', placeholder:`Hi {lead_name} - sharing our catalogue for {lead_company}.\nHappy to discuss! - {sender_name}`, hint:'short 1-2 line caption for image attachment', rows:3 },
]

function timeAgo(iso) {
  if (!iso) return '-'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

function TypeIcon({ id, size = 13 }) {
  if (id === 'hook') return <Zap size={size} />
  if (id === 'detailed') return <FileText size={size} />
  return <Image size={size} />
}

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) return `91${digits}`
  return digits
}

function CampaignLeadSelector({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await leadsApi.search(query, 50)
      const leads = (data.leads || data || []).filter(l => l.phone)
      setResults(leads)
      if (!leads.length) toast('No leads with WhatsApp number found')
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const toggle = (lead) => {
    const next = new Map(selected)
    if (next.has(lead.id)) next.delete(lead.id)
    else next.set(lead.id, lead)
    onChange(next)
  }

  const selectAll = () => {
    const next = new Map(selected)
    results.forEach(l => next.set(l.id, l))
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search leads with WhatsApp number..." className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
          {query && <button onClick={() => { setQuery(''); setResults([]) }} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>}
        </div>
        <button onClick={search} className="btn-secondary px-3 py-2.5">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
      </div>

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-slate-400">{results.length} WhatsApp leads</p>
            <button onClick={selectAll} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Select all</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
            {results.map(lead => (
              <div key={lead.id} onClick={() => toggle(lead)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${selected.has(lead.id) ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected.has(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                  {selected.has(lead.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{lead.company_name || lead.contact_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400 truncate">+{lead.phone}{lead.city ? ` · ${lead.city}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-sm text-slate-500"><strong className="text-slate-900">{selected.size}</strong> leads selected</span>
        {selected.size > 0 && <button onClick={() => onChange(new Map())} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><X size={12} /> Clear all</button>}
      </div>
    </div>
  )
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
          <p className="text-sm text-slate-400 mt-0.5">AI-personalised outreach via WhatsApp</p>
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
                <p className="text-xs text-slate-400 mb-2">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '-'} · {c.daily_limit}/day</p>
                <div className="h-1.5 bg-slate-100 rounded-full w-40">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width:`${pct}%` }} />
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
          { label:'Total', value:data.total_leads?.toLocaleString?.() || 0, color:'text-slate-900' },
          { label:'Sent', value:data.sent?.toLocaleString?.() || 0, color:'text-emerald-600' },
          { label:'Failed', value:data.failed?.toLocaleString?.() || 0, color:'text-red-500' },
          { label:'Limit', value:`${data.daily_limit || 0}/day`, color:'text-blue-600' },
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
            <thead><tr><th>Name</th><th>Company</th><th>WhatsApp</th><th>Status</th><th>Error</th><th>Sent at</th></tr></thead>
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
              {!data.leads_preview?.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No sends yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name:'', message_template:'', personalise:true, daily_limit:50, send_order:'as_selected' })
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
        message:'',
        lead_id:0,
        personalise:false,
        generate_template:true,
        message_type:'detailed',
        context_hint:form.campaign_name || 'WhatsApp cold outreach to business leads',
      })
      setForm(p => ({ ...p, message_template:data.message || '' }))
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
        message:form.message_template,
        lead_id:leadIds[0] || 0,
        lead_name:first.contact_name || first.name || '',
        lead_company:first.company_name || first.company || '',
        business_details:first.business_details || '',
        lead_business_details:first.business_details || '',
        personalise:form.personalise,
        message_type:'detailed',
      })
      setPreview(data)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const submit = async () => {
    if (!form.campaign_name.trim() || !form.message_template.trim()) { toast.error('Fill campaign name and message'); return }
    if (selected.size === 0) { toast.error('Select at least one lead with WhatsApp number'); return }
    setSubmitting(true)
    try {
      await waApi.campaignCreate({ ...form, daily_limit:Math.min(form.daily_limit, 50), lead_ids:leadIds })
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
              <input className="input" placeholder="e.g. WhatsApp Outreach - May" value={form.campaign_name}
                onChange={e => setForm(p => ({ ...p, campaign_name:e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Daily limit <span className="normal-case font-normal text-slate-400">(max 50)</span></label>
                <input type="number" min={1} max={50} className="input" value={form.daily_limit}
                  onChange={e => setForm(p => ({ ...p, daily_limit:Math.min(parseInt(e.target.value) || 50, 50) }))} />
              </div>
              <div>
                <label className="field-label">Send order</label>
                <select className="input" value={form.send_order} onChange={e => setForm(p => ({ ...p, send_order:e.target.value }))}>
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
              <textarea className="textarea h-44 font-mono text-xs" value={form.message_template}
                onChange={e => { setForm(p => ({ ...p, message_template:e.target.value })); setPreview(null) }}
                placeholder={"Hi {lead_name},\n\nI came across {lead_company}...\n\n{sender_name}"} />
              <p className="text-[10px] text-slate-400 mt-1">
                Uses <code>{'{lead_name}'}</code>, <code>{'{lead_company}'}</code>, <code>{'{sender_name}'}</code>
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">AI personalisation</p>
                <p className="text-xs text-slate-400">Uses business description from each lead</p>
              </div>
              <button onClick={() => setForm(p => ({ ...p, personalise:!p.personalise }))}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-3 block">Add WhatsApp leads</label>
            <CampaignLeadSelector selected={selected} onChange={setSelected} />
          </div>
        </div>

        <div>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Eye size={14} className="text-slate-400" /> Preview</p>
              <button onClick={loadPreview} disabled={previewLoading || !form.message_template.trim()} className="btn-secondary text-xs py-1.5 px-3">
                {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Preview
              </button>
            </div>

            {selected.size === 0 && <div className="py-12 text-center text-sm text-slate-400">Select leads to preview</div>}
            {previewLoading && <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>}
            {!previewLoading && preview && (
              <div className="rounded-xl p-4" style={{ backgroundColor:'#e5ddd5' }}>
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{preview.message}</p>
                    <p className="text-[10px] text-slate-500 text-right mt-1">{new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} ✓✓</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">For: <strong>{preview.lead_name || '-'}</strong>{preview.lead_company ? ` @ ${preview.lead_company}` : ''}</p>
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
        {selected.size > 0 && <p className="text-xs text-slate-400 ml-auto">~{Math.ceil(selected.size / Math.max(form.daily_limit, 1))} day(s) to complete</p>}
      </div>
    </div>
  )
}

function LeadInputPanel({ selected, onSelect, onClear }) {
  const [inputMode, setInputMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState(null)
  const uploadRef = useRef()
  const scanRef = useRef()

  const parsePaste = (text) => {
    if (!text.trim()) { setParsed(null); return }
    const result = { phone:'', name:'', company:'', business_details:'' }
    const kvMatches = text.matchAll(/([\w_ ]+)\s*[=:]\s*([^\n,;|]+)/g)
    let kvFound = false

    for (const m of kvMatches) {
      const key = m[1].toLowerCase().trim().replace(/\s+/g, '_')
      const val = m[2].trim()
      if (['phone','mobile','number','whatsapp','wa','tel','ph'].includes(key)) { result.phone = normalizePhone(val); kvFound = true }
      else if (['name','contact','person','contact_name'].includes(key)) { result.name = val; kvFound = true }
      else if (['company','org','organization','company_name'].includes(key)) { result.company = val; kvFound = true }
      else if (['business','business_details','business_description','description','details','notes'].includes(key)) { result.business_details = val; kvFound = true }
    }

    if (!kvFound) {
      const parts = text.split(/[|,;\t]/).map(s => s.trim()).filter(Boolean)
      const phonePart = parts.find(p => /^\+?\d[\d\s-]{7,}$/.test(p))
      if (phonePart) result.phone = normalizePhone(phonePart)
      const rest = parts.filter(p => p !== phonePart)
      if (rest[0]) result.name = rest[0]
      if (rest[1]) result.company = rest[1]
      if (rest[2]) result.business_details = rest.slice(2).join(' ')
    }

    if (!result.phone) {
      const phoneMatch = text.match(/\+?(\d[\d\s-]{9,})/)
      if (phoneMatch) result.phone = normalizePhone(phoneMatch[1])
    }

    if (!result.name) {
      const words = text.replace(/\+?\d[\d\s-]+/g, '').trim()
      if (words) result.name = words
    }

    setParsed(result.phone ? result : null)
  }

  const handlePaste = (text) => {
    setPasteText(text)
    parsePaste(text)
  }

  const confirmParsed = () => {
    if (!parsed?.phone) { toast.error('Could not find a WhatsApp number'); return }
    onSelect(parsed)
    setPasteText('')
    setParsed(null)
  }

  const doSearch = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setBusy(true)
    try {
      const { data } = await leadsApi.search(q, 20)
      setResults((data.leads || data || []).filter(l => l.phone))
    } catch {
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  const pickResult = (l) => {
    onSelect({
      phone:normalizePhone(l.phone),
      name:l.contact_name || '',
      company:l.company_name || '',
      business_details:l.business_details || '',
    })
    setQuery('')
    setResults([])
  }

  const handleUpload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      const leads = (data.leads || data || []).filter(l => l.phone)
      setUploaded(leads)
      if (!leads.length) toast.error('No WhatsApp numbers found')
      else toast.success(`${leads.length} WhatsApp leads loaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleScan = async (file) => {
    if (!file) return
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { data } = await leadsApi.scanCard(reader.result.split(',')[1])
        if (data.phone) {
          onSelect({
            phone:normalizePhone(data.phone),
            name:data.contact_name || '',
            company:data.company_name || '',
            business_details:data.business_details || data.business_type || '',
          })
          toast.success('Card scanned')
        } else toast.error('No WhatsApp number found on card')
      } catch {
        toast.error('Scan failed')
      } finally {
        setBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  if (selected) return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="field-label mb-0">Recipient</label>
        <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1"><X size={10} /> Change</button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
          {(selected.name || selected.phone || 'WA').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 truncate">{selected.name || `+${selected.phone}`}</p>
          <p className="text-xs text-emerald-600 truncate">+{selected.phone}{selected.company ? ` · ${selected.company}` : ''}</p>
          {selected.business_details && <p className="text-[10px] text-emerald-600 truncate">{selected.business_details}</p>}
        </div>
        <Check size={14} className="text-emerald-500 flex-shrink-0" />
      </div>
    </div>
  )

  const MODES = [
    { id:'search', label:'Search', icon:<Search size={11} /> },
    { id:'manual', label:'Paste', icon:<ClipboardList size={11} /> },
    { id:'upload', label:'Upload', icon:<Upload size={11} /> },
    { id:'scan', label:'Scan', icon:<CreditCard size={11} /> },
  ]

  return (
    <div className="space-y-2.5">
      <label className="field-label mb-0">Recipient</label>
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setInputMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === m.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {inputMode === 'search' && (
        <div className="relative">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" placeholder="Name, company, or WhatsApp number..." value={query} onChange={e => doSearch(e.target.value)} />
            {busy && <Loader2 size={13} className="animate-spin text-emerald-500 flex-shrink-0" />}
            {query && !busy && <button onClick={() => { setQuery(''); setResults([]) }}><X size={13} className="text-slate-400 hover:text-slate-600" /></button>}
          </div>
          {results.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map(l => (
                <button key={l.id} onClick={() => pickResult(l)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm">
                  <p className="font-medium text-slate-800">{l.contact_name || l.company_name || '-'}</p>
                  <p className="text-xs text-slate-400">{l.company_name} · +{l.phone}</p>
                </button>
              ))}
            </div>
          )}
          {query && !busy && results.length === 0 && <p className="text-xs text-slate-400 mt-1.5 px-1">No leads with WhatsApp number found</p>}
        </div>
      )}

      {inputMode === 'manual' && (
        <div className="space-y-2">
          <textarea className="textarea text-sm font-mono h-28 leading-relaxed"
            placeholder={`Paste WhatsApp contact:\nwhatsapp=9876543210, name=John, company=Acme, business_description=Auto parts dealer\nor: 9876543210 | John Smith | Acme Corp | Auto parts dealer`}
            value={pasteText} onChange={e => handlePaste(e.target.value)} />
          {parsed && (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label:'WhatsApp', value:`+${parsed.phone}`, color:'bg-emerald-50 border-emerald-200 text-emerald-800' },
                { label:'Name', value:parsed.name || '-', color:'bg-slate-50 border-slate-200 text-slate-700' },
                { label:'Company', value:parsed.company || '-', color:'bg-slate-50 border-slate-200 text-slate-700' },
                { label:'Business', value:parsed.business_details || '-', color:'bg-slate-50 border-slate-200 text-slate-700' },
              ].map(f => (
                <div key={f.label} className={`border rounded-lg px-2 py-1.5 ${f.color}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">{f.label}</p>
                  <p className="text-xs font-medium truncate">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          {pasteText && !parsed && <p className="text-xs text-amber-600">Could not find a WhatsApp number - include a 10+ digit number</p>}
          <button onClick={confirmParsed} disabled={!parsed?.phone} className="btn-primary w-full text-sm py-2">
            <Check size={13} /> Use this WhatsApp contact
          </button>
        </div>
      )}

      {inputMode === 'upload' && (
        <div className="space-y-2">
          <button onClick={() => uploadRef.current?.click()} disabled={busy}
            className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
            {busy ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <Upload size={18} />}
            <span className="text-xs">{busy ? 'Processing...' : 'Upload CSV / Excel / PDF'}</span>
          </button>
          <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
          {uploaded.length > 0 && (
            <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
              {uploaded.map((l, i) => (
                <button key={i} onClick={() => onSelect({ phone:normalizePhone(l.phone), name:l.contact_name || '', company:l.company_name || '', business_details:l.business_details || '' })}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.contact_name || l.company_name || '-'}</p>
                    <p className="text-xs text-slate-400">+{l.phone}</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {inputMode === 'scan' && (
        <div className="space-y-1.5">
          <button onClick={() => scanRef.current?.click()} disabled={busy}
            className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
            {busy ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <CreditCard size={18} />}
            <span className="text-xs">{busy ? 'Scanning...' : 'Upload business card image'}</span>
          </button>
          <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
          <p className="text-[10px] text-slate-400 text-center">AI extracts WhatsApp number, name, company and details</p>
        </div>
      )}
    </div>
  )
}

function WhatsAppSingleSend() {
  const [lead, setLead] = useState(null)
  const [activeTypes, setActiveTypes] = useState(new Set(['hook']))
  const [messages, setMessages] = useState({ hook:'', detailed:'', image:'' })
  const [previews, setPreviews] = useState({ hook:null, detailed:null, image:null })
  const [generating, setGenerating] = useState({ hook:false, detailed:false, image:false })
  const [previewing, setPreviewing] = useState({ hook:false, detailed:false, image:false })
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [personalise, setPersonalise] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentTypes, setSentTypes] = useState(new Set())
  const imagePickRef = useRef()

  const toggleType = (id) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
      return next
    })
  }

  const setMsg = (type, val) => {
    setMessages(p => ({ ...p, [type]:val }))
    setPreviews(p => ({ ...p, [type]:null }))
  }

  const generate = async (type) => {
    const t = MSG_TYPES.find(x => x.id === type)
    setGenerating(p => ({ ...p, [type]:true }))
    try {
      const { data } = await waApi.preview({
        message:'',
        lead_name:lead?.name || '',
        lead_company:lead?.company || '',
        business_details:lead?.business_details || '',
        lead_business_details:lead?.business_details || '',
        personalise:false,
        generate_template:true,
        message_type:type,
        context_hint:t.hint,
      })
      setMsg(type, data.message || '')
      toast.success(`${t.label} generated`)
    } catch {
      toast.error('Generation failed')
    } finally {
      setGenerating(p => ({ ...p, [type]:false }))
    }
  }

  const previewType = async (type) => {
    if (!messages[type]?.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(p => ({ ...p, [type]:true }))
    try {
      const { data } = await waApi.preview({
        message:messages[type],
        lead_name:lead?.name || '',
        lead_company:lead?.company || '',
        business_details:lead?.business_details || '',
        lead_business_details:lead?.business_details || '',
        personalise,
        message_type:type,
      })
      setPreviews(p => ({ ...p, [type]:data }))
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(p => ({ ...p, [type]:false }))
    }
  }

  const sendAll = async () => {
    if (!lead?.phone) { toast.error('Select a WhatsApp recipient first'); return }
    const types = Array.from(activeTypes)
    for (const t of types) {
      if (t === 'image' && !imageFile) { toast.error('Select an image for Image type'); return }
      if (t !== 'image' && !(previews[t]?.message || messages[t]?.trim())) { toast.error(`Enter or generate a ${t} message first`); return }
    }

    const fullPhone = normalizePhone(lead.phone)
    setSending(true)
    const sent = new Set()

    for (const type of types) {
      const finalMsg = previews[type]?.message || messages[type] || ''
      try {
        if (type === 'image') {
          await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async () => {
              try {
                await waApi.sendImage({ phone:fullPhone, image_base64:reader.result.split(',')[1], caption:finalMsg })
                sent.add(type)
                resolve()
              } catch (e) {
                reject(e)
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(imageFile)
          })
        } else {
          await waApi.send({ phone:fullPhone, message:finalMsg, personalise:false })
          sent.add(type)
        }
      } catch (e) {
        console.error('WhatsApp send failed:', { type, phone:fullPhone, error:e })
        toast.error(`${type} failed: ${e.response?.data?.detail || 'error'}`)
      }
    }

    setSending(false)
    if (sent.size > 0) {
      toast.success(`${sent.size} message${sent.size > 1 ? 's' : ''} sent`)
      setSentTypes(sent)
      setTimeout(() => {
        setLead(null)
        setMessages({ hook:'', detailed:'', image:'' })
        setPreviews({ hook:null, detailed:null, image:null })
        setImageFile(null)
        setImageUrl(null)
        setSentTypes(new Set())
      }, 1800)
    }
  }

  const handleImagePick = (file) => {
    setImageFile(file)
    const r = new FileReader()
    r.onload = e => setImageUrl(e.target.result)
    r.readAsDataURL(file)
    setPreviews(p => ({ ...p, image:null }))
  }

  const TYPE_COLORS = {
    hook:{ pill:'bg-yellow-50 border-yellow-200 text-yellow-700', preview:'bg-yellow-50 border border-yellow-200 text-yellow-900', header:'text-yellow-700' },
    detailed:{ pill:'bg-blue-50 border-blue-200 text-blue-700', preview:'bg-blue-50 border border-blue-200 text-blue-900', header:'text-blue-700' },
    image:{ pill:'bg-purple-50 border-purple-200 text-purple-700', preview:'bg-purple-50 border border-purple-200 text-purple-900', header:'text-purple-700' },
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <MessageSquare size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Send WhatsApp</h1>
          <p className="text-xs text-slate-400">Single WhatsApp number, AI message and optional image</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="card p-5">
            <LeadInputPanel selected={lead} onSelect={setLead} onClear={() => { setLead(null); setPreviews({ hook:null, detailed:null, image:null }) }} />
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label mb-2">Message types <span className="normal-case font-normal text-slate-400 text-[10px]">pick any combo</span></label>
              <div className="space-y-2">
                {MSG_TYPES.map(t => {
                  const active = activeTypes.has(t.id)
                  const colors = TYPE_COLORS[t.id]
                  return (
                    <button key={t.id} onClick={() => toggleType(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${active ? `${colors.pill} shadow-sm` : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                        {active && <Check size={10} className="text-white" />}
                      </div>
                      <span className={active ? colors.header : 'text-slate-400'}><TypeIcon id={t.id} /></span>
                      <div className="flex-1 min-w-0">
                        <span className="block">{t.label}</span>
                        <span className={`text-[10px] font-normal ${active ? 'opacity-70' : 'text-slate-400'}`}>{t.sub}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">AI personalise</p>
                <p className="text-xs text-slate-400">Uses business description</p>
              </div>
              <button onClick={() => setPersonalise(p => !p)} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <button onClick={sendAll} disabled={sending || !lead?.phone} className="btn-primary w-full">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : `Send ${activeTypes.size} message${activeTypes.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {MSG_TYPES.filter(t => activeTypes.has(t.id)).map(t => {
            const colors = TYPE_COLORS[t.id]
            return (
              <div key={t.id} className={`card p-5 transition-all ${sentTypes.has(t.id) ? 'ring-2 ring-emerald-400' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${colors.header}`}><TypeIcon id={t.id} /> {t.label}</span>
                  <span className="text-xs text-slate-400">{t.sub}</span>
                  {sentTypes.has(t.id) && <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium"><Check size={11} /> Sent</span>}
                  <button onClick={() => generate(t.id)} disabled={generating[t.id]} className={`${sentTypes.has(t.id) ? '' : 'ml-auto'} flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium`}>
                    {generating[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI generate
                  </button>
                </div>

                {t.id === 'image' && (
                  <div className="mb-3">
                    {imageUrl ? (
                      <div className="relative mb-2">
                        <img src={imageUrl} alt="preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        <button onClick={() => { setImageFile(null); setImageUrl(null) }} className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500"><X size={11} /></button>
                      </div>
                    ) : (
                      <button onClick={() => imagePickRef.current?.click()} className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all mb-2">
                        <Image size={18} /><span className="text-xs">Click to upload image</span>
                      </button>
                    )}
                    <input ref={imagePickRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImagePick(e.target.files[0])} />
                  </div>
                )}

                <textarea className="textarea font-mono text-xs leading-relaxed w-full mb-2" style={{ height:`${t.rows * 24}px` }}
                  value={messages[t.id]} onChange={e => setMsg(t.id, e.target.value)} placeholder={t.placeholder} />

                <p className="text-[10px] text-slate-400 mb-3">
                  {['{lead_name}', '{lead_company}', '{sender_name}'].map(p => <code key={p} className="bg-slate-100 px-1 rounded mx-0.5">{p}</code>)}
                </p>

                <div className="flex items-start gap-2">
                  <button onClick={() => previewType(t.id)} disabled={previewing[t.id] || !messages[t.id]?.trim()} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0">
                    {previewing[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Preview
                  </button>
                  {previews[t.id] && (
                    <div className={`flex-1 rounded-xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${colors.preview}`}>
                      {t.id === 'image' && imageUrl && <img src={imageUrl} alt="thumb" className="w-full h-14 object-cover rounded-lg mb-1.5" />}
                      {previews[t.id].message}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {lead && MSG_TYPES.some(t => activeTypes.has(t.id) && previews[t.id]) && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">WhatsApp Preview</p>
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor:'#e5ddd5' }}>
                {MSG_TYPES.filter(t => activeTypes.has(t.id) && previews[t.id]).map(t => (
                  <div key={t.id} className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                      {t.id === 'image' && imageUrl && <img src={imageUrl} alt="img" className="rounded-xl w-full max-h-32 object-cover mb-2" />}
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{previews[t.id].message}</p>
                      <p className="text-[10px] text-slate-500 text-right mt-1">{new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} ✓✓</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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

      {view === 'create' && <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'detail' && <CampaignDetail id={detailId} onBack={() => setView('list')} />}

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