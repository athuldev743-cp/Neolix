/**
 * LeadSelector — reusable lead search + add panel
 * Used inside Email campaign create and WA campaign create.
 * Props:
 *   selected: Map<id, lead>
 *   onChange: (newMap) => void
 *   requirePhone: bool  — WA mode, only show leads with phone
 */
import { useState, useRef, useCallback } from 'react'
import {
  Search, Upload, CreditCard, Mail, ClipboardList,
  X, Check, Plus, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../services/api'

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// ── Single email mini form ────────────────────────────────────────────────────
function SinglePanel({ onAdded }) {
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    try {
      const { data } = await leadsApi.addSingle({ email, contact_name: name, company_name: company })
      toast.success(data.already_existed ? `${email} already in DB — added` : `${email} added`)
      onAdded(data.lead_ids)
      setEmail(''); setName(''); setCompany('')
    } catch { toast.error('Failed to add') } finally { setLoading(false) }
  }

  return (
    <div className="p-3 space-y-2">
      <input className="input text-sm" type="email" placeholder="Email *"
        value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      <div className="grid grid-cols-2 gap-2">
        <input className="input text-sm" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="input text-sm" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
      </div>
      <button onClick={submit} disabled={loading} className="btn-primary btn-sm">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Add
      </button>
    </div>
  )
}

// ── Bulk paste ────────────────────────────────────────────────────────────────
function BulkPanel({ onAdded }) {
  const [text, setText]     = useState('')
  const [loading, setLoading] = useState(false)
  const found = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))].length

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(text)
      toast.success(`${data.total_found} emails added`)
      onAdded(data.lead_ids)
      setText('')
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  return (
    <div className="p-3 space-y-2">
      <textarea className="textarea h-28 text-xs font-mono"
        value={text} onChange={e => setText(e.target.value)}
        placeholder={"email1@co.com\nemail2@co.com\nor comma-separated..."} />
      {found > 0 && <p className="text-xs text-emerald-600 font-medium">{found} email{found > 1 ? 's' : ''} detected</p>}
      <button onClick={submit} disabled={loading || !found} className="btn-primary btn-sm">
        {loading ? <Loader2 size={13} className="animate-spin" /> : null}
        Add {found || ''} emails
      </button>
    </div>
  )
}

// ── File upload ───────────────────────────────────────────────────────────────
function UploadPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  const handle = async (file) => {
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      toast.success(`${data.total_found} leads extracted from ${file.name}`)
      onAdded(data.lead_ids)
    } catch { toast.error('Upload failed') } finally { setLoading(false) }
  }

  return (
    <div className="p-3">
      <div onClick={() => ref.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
        className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group">
        {loading
          ? <Loader2 size={20} className="animate-spin mx-auto text-blue-500" />
          : <>
              <Upload size={20} className="mx-auto mb-1.5 text-slate-300 group-hover:text-blue-400" />
              <p className="text-xs font-medium text-slate-600">Click or drop file</p>
              <p className="text-[10px] text-slate-400 mt-0.5">CSV, Excel, PDF, TXT, JSON</p>
            </>
        }
      </div>
      <input ref={ref} type="file" className="hidden"
        onChange={e => e.target.files[0] && handle(e.target.files[0])} />
    </div>
  )
}

// ── Card scan ─────────────────────────────────────────────────────────────────
function ScanPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = s
      videoRef.current.srcObject = s
      setStreaming(true)
    } catch { toast.error('Camera access denied') }
  }

  const capture = async () => {
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const b64 = c.toDataURL('image/jpeg').split(',')[1]
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStreaming(false); setLoading(true)
    try {
      const { data } = await leadsApi.scanCard(b64)
      if (data.total_found > 0) {
        toast.success(`Card scanned: ${data.extracted.company_name || data.extracted.email}`)
        onAdded(data.lead_ids)
      } else { toast.error('No email found on card') }
    } catch { toast.error('Scan failed') } finally { setLoading(false) }
  }

  return (
    <div className="p-3 space-y-2">
      {!streaming && !loading && (
        <div onClick={openCamera}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
          <CreditCard size={20} className="mx-auto mb-1.5 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">Open Camera</p>
          <p className="text-[10px] text-slate-400">AI extracts contact details</p>
        </div>
      )}
      {streaming && (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-slate-200" />
          <button onClick={capture} className="btn-primary w-full justify-center">Capture & Extract</button>
        </>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin text-blue-500" /> Reading card…
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// ── Main LeadSelector ─────────────────────────────────────────────────────────
const PANELS = [
  { id: 'upload', icon: Upload,        label: 'Upload File'  },
  { id: 'scan',   icon: CreditCard,    label: 'Scan Card'    },
  { id: 'single', icon: Mail,          label: 'Single Email' },
  { id: 'bulk',   icon: ClipboardList, label: 'Paste Bulk'   },
]

export default function LeadSelector({ selected, onChange, requirePhone = false }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [activePanel, setActivePanel] = useState(null)

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await leadsApi.search(query, 50)
      let leads = data.leads
      if (requirePhone) leads = leads.filter(l => l.phone)
      setResults(leads)
      if (leads.length === 0) toast('No leads found' + (requirePhone ? ' with phone numbers' : ''))
    } catch { toast.error('Search failed') } finally { setSearching(false) }
  }

  const toggle = useCallback((lead) => {
    const next = new Map(selected)
    if (next.has(lead.id)) next.delete(lead.id)
    else next.set(lead.id, lead)
    onChange(next)
  }, [selected, onChange])

  const handleAdded = (ids) => {
    const next = new Map(selected)
    ids.forEach(id => { if (!next.has(id)) next.set(id, { id }) })
    onChange(next)
  }

  const selectAll = () => {
    const next = new Map(selected)
    results.forEach(l => next.set(l.id, l))
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Search bar + icon buttons */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder={requirePhone ? 'Search leads with phone…' : 'Search company, city, business type…'}
            className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }}
              className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
          )}
        </div>
        <button onClick={doSearch} className="btn-secondary px-3 py-2.5">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
        {/* Add method icons */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          {PANELS.map(p => (
            <button key={p.id}
              onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
              title={p.label}
              className={`btn-icon p-2 ${activePanel === p.id ? 'bg-blue-50 text-blue-600' : ''}`}>
              <p.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Slide-down panel */}
      {activePanel && (
        <div className="border border-slate-200 rounded-xl overflow-hidden fade-up bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600">
              {PANELS.find(p => p.id === activePanel)?.label}
            </span>
            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
          {activePanel === 'single' && <SinglePanel onAdded={handleAdded} />}
          {activePanel === 'bulk'   && <BulkPanel   onAdded={handleAdded} />}
          {activePanel === 'upload' && <UploadPanel onAdded={handleAdded} />}
          {activePanel === 'scan'   && <ScanPanel   onAdded={handleAdded} />}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-slate-400">{results.length} results</p>
            <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Select all
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {results.map(lead => (
              <div key={lead.id} onClick={() => toggle(lead)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all
                  ${selected.has(lead.id)
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${selected.has(lead.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                  {selected.has(lead.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{lead.company_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {requirePhone ? lead.phone : lead.email}
                    {lead.city ? ` · ${lead.city}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection count bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-sm text-slate-500">
          <strong className="text-slate-900">{selected.size}</strong> leads selected
        </span>
        {selected.size > 0 && (
          <button onClick={() => onChange(new Map())}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
            <X size={12} /> Clear all
          </button>
        )}
      </div>
    </div>
  )
}