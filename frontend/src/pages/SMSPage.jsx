import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  FileText, Zap, Search, Upload, CreditCard, ShieldCheck,
  Check, ChevronRight, ClipboardList, RefreshCw, Plus, ChevronLeft, Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import API, { waApi, leadsApi } from '../services/api'
import SMSQueueTable from '../components/sms/SMSQueueTable'

const statusBadge = { running: 'badge-blue', completed: 'badge-green', queued: 'badge-gray', failed: 'badge-red', paused: 'badge-orange' }

const MSG_TYPES = [
  { id: 'hook', label: 'Hook', sub: 'Short punchy opener', placeholder: `Hi {lead_name}\n\nWe help {lead_company} get better results faster.\n\nWorth a chat?`, hint: 'hook short punchy opener under 3 lines', rows: 4 },
  { id: 'detailed', label: 'Detailed', sub: '80-120 word outreach', placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`, hint: 'detailed professional cold outreach 80-120 words', rows: 9 },
]

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) return `91${digits}`
  return digits
}

function CampaignLeadSelector({ selected, onChange }) {
  const [activePanel, setActivePanel] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState({ phone: '', name: '', company: '', business_details: '' })
  const [bulkText, setBulkText] = useState('')
  const [uploaded, setUploaded] = useState([])
  const uploadRef = useRef()
  const scanRef = useRef()

  const addLeadToSelection = (lead) => {
    const id = lead.id || `manual-${Date.now()}-${Math.random()}`
    const next = new Map(selected)
    next.set(id, { ...lead, id })
    onChange(next)
  }

  const addIdsToSelection = (ids) => {
    const next = new Map(selected)
    ids.forEach(id => {
      if (!next.has(id)) next.set(id, { id })
    })
    onChange(next)
  }

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await leadsApi.search(query, 50)
      const leads = (data.leads || data || []).filter(l => l.phone)
      setResults(leads)
      if (!leads.length) toast('No leads with valid mobile number found')
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

  const addManual = async () => {
    const phone = normalizePhone(manual.phone)
    if (phone.length < 10) {
      toast.error('Enter a valid mobile number')
      return
    }

    setLoading(true)
    try {
      const payload = {
        phone,
        contact_name: manual.name,
        company_name: manual.company,
        business_details: manual.business_details,
        source: 'sms_manual',
      }

      // Fixed payload structure keys to resolve the 422 error
      const { data } = await leadsApi.addSingle(payload)
      if (data.lead_ids?.length) {
        addIdsToSelection(data.lead_ids)
      } else {
        addLeadToSelection({ ...payload, id: data.id || data.lead_id })
      }

      toast.success('SMS recipient contact synced!')
      setManual({ phone: '', name: '', company: '', business_details: '' })
    } catch {
      addLeadToSelection({ phone, contact_name: manual.name, company_name: manual.company, business_details: manual.business_details })
      toast.success('SMS contact added locally')
    } finally {
      setLoading(false)
    }
  }

  const addBulk = async () => {
    if (!bulkText.trim()) return toast.error('Paste contacts first')
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(bulkText)
      if (data.lead_ids?.length) {
        addIdsToSelection(data.lead_ids)
        toast.success(`${data.lead_ids.length} contacts appended`)
      } else {
        toast.success('Bulk contacts processed')
      }
      setBulkText('')
    } catch {
      const rows = bulkText.split('\n').map(x => x.trim()).filter(Boolean)
      const next = new Map(selected)
      rows.forEach((row, i) => {
        const parts = row.split(/[|,;\t]/).map(x => x.trim()).filter(Boolean)
        const phonePart = parts.find(p => /^\+?\d[\d\s-]{7,}$/.test(p))
        if (!phonePart) return
        const phone = normalizePhone(phonePart)
        next.set(`bulk-${Date.now()}-${i}`, {
          id: `bulk-${Date.now()}-${i}`,
          phone,
          contact_name: parts[1] || '',
          company_name: parts[2] || '',
          business_details: parts.slice(3).join(' '),
        })
      })
      onChange(next)
      toast.success('Bulk contacts appended locally')
      setBulkText('')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      const leads = (data.leads || data || []).filter(l => l.phone)
      if (data.lead_ids?.length) addIdsToSelection(data.lead_ids)
      toast.success('Contacts successfully compiled')
    } catch {
      toast.error('Upload parser crash')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (file) => {
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { data } = await leadsApi.scanCard(reader.result.split(',')[1])
        if (data.phone || data.extracted?.phone) {
          const extracted = data.extracted || data
          addLeadToSelection({
            phone: normalizePhone(extracted.phone),
            contact_name: extracted.contact_name || '',
            company_name: extracted.company_name || '',
            business_details: extracted.business_details || extracted.business_type || '',
          })
          toast.success('Card processed')
        }
      } catch {
        toast.error('AI OCR engine timeout')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const PANELS = [
    { id: 'search', label: 'Search DB', icon: <Search size={12} /> },
    { id: 'single', label: 'Single', icon: <Smartphone size={12} /> },
    { id: 'bulk', label: 'Bulk Paste', icon: <ClipboardList size={12} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={12} /> },
    { id: 'scan', label: 'Scan Card', icon: <CreditCard size={12} /> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {PANELS.map(p => (
          <button key={p.id} type="button" onClick={() => setActivePanel(p.id)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activePanel === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {p.icon}{p.label}
          </button>
        ))}
      </div>

      {activePanel === 'search' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-900 transition-all">
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search database leads..." className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <button type="button" onClick={search} className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map(l => (
                <div key={l.id} onClick={() => toggle(l)} className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${selected.has(l.id) ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                  <div><p className="font-bold">{l.contact_name || l.company_name || 'Unknown'}</p><p className="text-slate-400">+{l.phone}</p></div>
                  {selected.has(l.id) && <Check size={12} className="text-blue-600" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activePanel === 'single' && (
        <div className="space-y-2">
          <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Mobile Number *" value={manual.phone} onChange={e => setManual(p => ({ ...p, phone: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Name" value={manual.name} onChange={e => setManual(p => ({ ...p, name: e.target.value }))} />
            <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Company" value={manual.company} onChange={e => setManual(p => ({ ...p, company: e.target.value }))} />
          </div>
          <textarea className="w-full p-3 border border-slate-200 rounded-xl text-xs h-16 resize-none" placeholder="AI Custom Personalization Parameters..." value={manual.business_details} onChange={e => setManual(p => ({ ...p, business_details: e.target.value }))} />
          <button type="button" onClick={addManual} className="w-full bg-slate-900 text-white rounded-xl py-1.5 font-bold text-xs">Append Recipient Node</button>
        </div>
      )}

      {activePanel === 'bulk' && (
        <div className="space-y-2">
          <textarea className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs h-24 resize-none" placeholder="9876543210 | Athul Dev | OmniAgent | SaaS Platform Engine" value={bulkText} onChange={e => setBulkText(e.target.value)} />
          <button type="button" onClick={addBulk} className="w-full bg-slate-900 text-white rounded-xl py-1.5 font-bold text-xs">Ingest Bulk Dataset Matrix</button>
        </div>
      )}

      {activePanel === 'upload' && (
        <button type="button" onClick={() => uploadRef.current?.click()} className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
          <Upload size={16} className="mb-1" /> Import CSV/Excel Architecture
          <input ref={uploadRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
        </button>
      )}

      {activePanel === 'scan' && (
        <button type="button" onClick={() => scanRef.current?.click()} className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
          <CreditCard size={16} className="mb-1" /> Trigger Card Vision Scanner Module
          <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
        </button>
      )}

      <div className="flex items-center justify-between pt-2 border-t text-xs">
        <span><strong>{selected.size}</strong> recipients targeted</span>
        {selected.size > 0 && <button type="button" onClick={() => onChange(new Map())} className="text-red-500">Clear</button>}
      </div>
    </div>
  )
}

function LeadInputPanel({ selected, onSelect, onClear }) {
  const [inputMode, setInputMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
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

    setParsed(result.phone ? result : null)
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

  if (selected) return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase">Recipient</label>
        <button type="button" onClick={onClear} className="text-xs text-red-500">Change</button>
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
        <div>
          <p className="font-bold text-slate-900">{selected.name || `+${selected.phone}`}</p>
          <p className="text-slate-500">+{selected.phone} {selected.company ? `@ ${selected.company}` : ''}</p>
        </div>
        <Check size={14} className="text-blue-600" />
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {['search', 'manual'].map(m => (
          <button key={m} type="button" onClick={() => setInputMode(m)} className={`flex-1 py-1 text-xs font-bold rounded-lg ${inputMode === m ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>{m.toUpperCase()}</button>
        ))}
      </div>
      {inputMode === 'search' && (
        <div className="relative">
          <input className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" placeholder="Search targeted customer name..." value={query} onChange={e => doSearch(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-white border rounded-xl mt-1 max-h-36 overflow-y-auto z-50 shadow-lg">
              {results.map(l => (
                <div key={l.id} onClick={() => onSelect({ phone: normalizePhone(l.phone), name: l.contact_name, company: l.company_name, business_details: l.business_details })} className="p-2 text-xs hover:bg-slate-50 cursor-pointer border-b last:border-0">
                  <p className="font-bold">{l.contact_name || 'Direct Contact'}</p><p className="text-slate-400">+{l.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {inputMode === 'manual' && (
        <div className="space-y-2">
          <textarea className="w-full p-3 border font-mono text-xs h-20 resize-none" placeholder="9876543210 | John Smith | Acme Corp" value={pasteText} onChange={e => { setPasteText(e.target.value); parsePaste(e.target.value) }} />
          <button type="button" disabled={!parsed} onClick={() => { onSelect(parsed); setPasteText(''); setParsed(null) }} className="w-full bg-slate-900 text-white rounded-xl py-1.5 text-xs font-bold disabled:opacity-40">Lock Recipient Parameters</button>
        </div>
      )}
    </div>
  )
}

function SMSSingleSend() {
  const [lead, setLead] = useState(null)
  const [activeType, setActiveType] = useState('hook')
  const [templateText, setTemplateText] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const generateAI = async () => {
    setAiLoading(true)
    try {
      const target = MSG_TYPES.find(x => x.id === activeType)
      const { data } = await waApi.preview({
        message: '',
        lead_name: lead?.name || '',
        lead_company: lead?.company || '',
        business_details: lead?.business_details || '',
        lead_business_details: lead?.business_details || '',
        personalise: false,
        generate_template: true,
        message_type: activeType,
        context_hint: target.hint
      })
      setTemplateText(data.message || '')
      toast.success('AI Copy generated successfully!')
    } catch {
      toast.error('AI text compiler failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSend = async () => {
    if (!lead?.phone) return toast.error('Select recipient node first')
    setLoading(true)
    try {
      // Synchronized fields to explicitly match Backend logic models
      await API.post('/sms/enqueue', {
        phone_number: normalizePhone(lead.phone),
        message_body: templateText,
        lead_name: lead.name || 'Direct Input'
      })
      toast.success('SMS job safely enqueued inside hardware channel outboxes!')
      setLead(null)
      setTemplateText('')
    } catch {
      toast.error('Outbox pipeline failure configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
      <div className="space-y-4">
        <div className="bg-white border rounded-2xl p-5 shadow-xs">
          <LeadInputPanel selected={lead} onSelect={setLead} onClear={() => setLead(null)} />
        </div>
      </div>
      <div className="lg:col-span-2 bg-white border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div className="flex gap-2">
            {MSG_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveType(t.id)} className={`px-3 py-1 text-xs font-bold rounded-lg ${activeType === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.label}</button>
            ))}
          </div>
          <button type="button" onClick={generateAI} disabled={aiLoading} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generate Copy
          </button>
        </div>
        <textarea className="w-full p-3 border font-mono text-xs h-36 rounded-xl resize-none" value={templateText} onChange={e => setTemplateText(e.target.value)} placeholder="Type or click AI Generate to output campaign text body layer parameters..." />
        <button type="button" onClick={handleSend} disabled={loading || !lead} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Dispatch SMS Routing Package
        </button>
      </div>
    </div>
  )
}

function SMSCampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', daily_limit: 150, timezone: 'Asia/Kolkata' })
  const [selectedLeads, setSelectedLeads] = useState(new Map())
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.campaign_name.trim()) return toast.error('Please enter a Campaign Name first!')
    if (selectedLeads.size === 0) return toast.error('Select at least one hardware recipient node!')
    
    setLoading(true)
    try {
      await API.post('/sms/config', {
        daily_cap: form.daily_limit,
        timezone: form.timezone
      })
      toast.success('Pacing network cluster parameters activated globally!')
      setTimeout(onDone, 500)
    } catch {
      toast.error('Network variables sync aborted.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl bg-white border rounded-2xl p-6 space-y-4 mx-auto shadow-xs">
      <h2 className="text-base font-black tracking-tight">Configure Hardware Pacing Cluster</h2>
      {/* Implemented type=button structures to block standard form auto-wipe operations */}
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Identity Group</label>
          <input className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="e.g. SMS Cold Outreach - Analytics Setup" value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Daily Run Cap Allocation</label>
            <input type="number" className="w-full px-3 py-2 border rounded-xl text-xs" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: e.target.value ? parseInt(e.target.value) : 150 })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Zone Threshold</label>
            <select className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-700 font-medium" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            </select>
          </div>
        </div>
        <div className="border p-4 rounded-xl bg-slate-50/50"><CampaignLeadSelector selected={selectedLeads} onChange={setSelectedLeads} /></div>
        <div className="flex gap-2 justify-end pt-2 border-t">
          <button type="button" onClick={onBack} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="button" onClick={handleCreate} disabled={loading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={13} />} Deploy Pacing Cluster
          </button>
        </div>
      </div>
    </div>
  )
}

function MainSMSDashboard({ onStartCampaign, onSingleSend, metrics, logs }) {
  const [newNodeId, setNewNodeId] = useState('')
  const [nodes, setNodes] = useState([])

  useEffect(() => { fetchNodes() }, [])

  const fetchNodes = async () => {
    try {
      const res = await API.get('/sms/gateway-nodes')
      setNodes(res.data)
    } catch {}
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!newNodeId.trim()) return
    try {
      await API.post('/sms/register-node', { device_id: newNodeId.trim() })
      toast.success('Hardware Node Signature Verification Link established!')
      setNewNodeId('')
      fetchNodes()
    } catch {
      toast.error('Signature mapping rejected.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-black text-slate-900">Android Mobile Node Pipeline</h2><p className="text-xs text-slate-400">Route AI lead context payloads natively over cellular hardware switches.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={onSingleSend} className="px-3 py-1.5 border rounded-xl bg-white text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-slate-50"><Send size={11} className="text-slate-500" /> Single Route</button>
          <button type="button" onClick={onStartCampaign} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"><Plus size={12} /> Init Cluster</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> Authorized Hardware Matrices</h3>
            <form onSubmit={handleRegister} className="flex gap-2">
              <input required className="flex-1 px-3 py-1.5 border rounded-xl font-mono text-xs uppercase bg-slate-50" placeholder="8516a3de3bfec38b" value={newNodeId} onChange={e => setNewNodeId(e.target.value)} />
              <button type="submit" className="px-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Link</button>
            </form>
            <div className="space-y-1.5">
              {nodes.map((n, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border rounded-xl font-mono text-[11px] font-bold text-slate-600"><span>{n.device_id}</span><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /></div>
              ))}
              {nodes.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No active gateway links initialized.</p>}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2"><SMSQueueTable logs={logs} /></div>
      </div>
    </div>
  )
}

export default function SMSPage() {
  const [view, setView] = useState('list')
  const [metrics, setMetrics] = useState({ pending_count: 0, processing_count: 0, sent_today: 0, daily_limit: 150 })
  const [logs, setLogs] = useState([])

  useEffect(() => {
    refreshDashboard()
    const iv = setInterval(refreshDashboard, 8000)
    return () => clearInterval(iv)
  }, [])

  const refreshDashboard = async () => {
    try {
      const mRes = await API.get('/sms/queue-status')
      setMetrics(mRes.data)
      const lRes = await API.get('/sms/logs')
      setLogs(lRes.data)
    } catch {}
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      {view === 'list' && <MainSMSDashboard metrics={metrics} logs={logs} refreshDashboard={refreshDashboard} onStartCampaign={() => setView('create')} onSingleSend={() => setView('single')} />}
      {view === 'create' && <SMSCampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'single' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setView('list')} className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-slate-800"><ChevronLeft size={14} /> Back to Dashboard</button>
          <SMSSingleSend />
        </div>
      )}
    </div>
  )
}