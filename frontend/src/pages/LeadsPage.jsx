import { useState, useRef, useCallback } from 'react'
import {
  Search, Upload, CreditCard, Mail, ClipboardList,
  X, Plus, Check, AlertCircle, ChevronDown, Loader2,
  Building2, Phone, MapPin, Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../services/api'

// ── Lead card component ───────────────────────────────────────────────────────
function LeadCard({ lead, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(lead)}
      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150
        ${selected
          ? 'border-brand-300 bg-brand-50 shadow-sm'
          : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50'
        }`}
    >
      <div className="mt-0.5">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
          ${selected ? 'bg-brand-500 border-brand-500' : 'border-surface-300 bg-white'}`}>
          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{lead.company_name || 'Unknown Company'}</p>
        <p className="text-xs text-brand-600 truncate mt-0.5">{lead.email || '—'}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {lead.contact_name && (
            <span className="flex items-center gap-1 text-xs text-surface-500">
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              {lead.contact_name}
            </span>
          )}
          {(lead.city || lead.state) && (
            <span className="flex items-center gap-1 text-xs text-surface-400">
              <MapPin size={10} />
              {[lead.city, lead.state].filter(Boolean).join(', ')}
            </span>
          )}
          {lead.business_type && (
            <span className="text-xs text-surface-400 truncate">{lead.business_type}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Input panels ──────────────────────────────────────────────────────────────
function SinglePanel({ onAdded }) {
  const [form, setForm] = useState({ email: '', contact_name: '', company_name: '', phone: '', business_details: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.email || !form.email.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    try {
      const { data } = await leadsApi.addSingle(form)
      toast.success(data.already_existed ? `${form.email} already in DB — added` : `${form.email} added!`)
      onAdded(data.lead_ids)
      setForm({ email: '', contact_name: '', company_name: '', phone: '', business_details: '' })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Add Single Contact</p>
      <input className="input" placeholder="Email address *" type="email"
        value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Contact name" value={form.contact_name}
          onChange={e => setForm(p => ({...p, contact_name: e.target.value}))} />
        <input className="input" placeholder="Company name" value={form.company_name}
          onChange={e => setForm(p => ({...p, company_name: e.target.value}))} />
      </div>
      <input className="input" placeholder="Phone (optional)" value={form.phone}
        onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
      <textarea className="textarea h-20" placeholder="Business details (optional)"
        value={form.business_details}
        onChange={e => setForm(p => ({...p, business_details: e.target.value}))} />
      <button onClick={submit} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Adding…' : 'Add to selection'}
      </button>
    </div>
  )
}

function BulkPanel({ onAdded }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const found = [...new Set((text.match(emailRe) || []).map(e => e.toLowerCase()))]

  const submit = async () => {
    if (!text.trim()) { toast.error('Paste some emails first'); return }
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(text)
      toast.success(`${data.total_found} emails added`)
      onAdded(data.lead_ids)
      setText('')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Paste Bulk Emails</p>
      <textarea
        className="textarea h-36 font-mono text-xs"
        placeholder={"email1@company.com\nemail2@company.com\nor comma-separated..."}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {found.length > 0 && (
        <p className="text-xs text-emerald-600 font-medium">
          {found.length} email{found.length > 1 ? 's' : ''} detected:
          {' '}{found.slice(0,3).join(', ')}{found.length > 3 ? ` +${found.length-3} more` : ''}
        </p>
      )}
      <button onClick={submit} disabled={loading || !found.length} className="btn-primary w-full justify-center">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Adding…' : `Add ${found.length || ''} emails`}
      </button>
    </div>
  )
}

function UploadPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const handleFile = async (file) => {
    setLoading(true)
    setResult(null)
    try {
      const { data } = await leadsApi.uploadFile(file)
      setResult(data)
      toast.success(`${data.total_found} leads extracted from ${file.name}`)
      onAdded(data.lead_ids)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Upload File</p>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) handleFile(f) }}
        className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center cursor-pointer
                   hover:border-brand-300 hover:bg-brand-50 transition-all duration-150 group"
      >
        <Upload size={28} className="mx-auto mb-2 text-surface-300 group-hover:text-brand-400" />
        <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
        <p className="text-xs text-surface-400 mt-1">CSV, Excel, PDF, TXT, JSON</p>
        <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
          {['.csv','.xlsx','.pdf','.txt','.json'].map(f => (
            <span key={f} className="px-2 py-0.5 bg-surface-100 text-surface-500 rounded text-[10px] font-mono">{f}</span>
          ))}
        </div>
      </div>
      <input ref={inputRef} type="file" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-500">
          <Loader2 size={16} className="animate-spin text-brand-500" /> Extracting leads…
        </div>
      )}
      {result && (
        <div className="msg-success">
          <Check size={16} /> <strong>{result.total_found}</strong> leads extracted from <em>{result.filename}</em>
        </div>
      )}
    </div>
  )
}

function ScanPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const videoRef = useRef()
  const canvasRef = useRef()
  const [streaming, setStreaming] = useState(false)
  const streamRef = useRef(null)

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setStreaming(true)
    } catch (e) {
      toast.error('Camera access denied')
    }
  }

  const capture = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1]

    // Stop stream
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStreaming(false)
    setLoading(true)

    try {
      const { data } = await leadsApi.scanCard(base64)
      setResult(data.extracted)
      if (data.total_found > 0) {
        toast.success(`Card scanned: ${data.extracted.company_name || data.extracted.email}`)
        onAdded(data.lead_ids)
      } else {
        toast.error('Could not extract email from card. Try again.')
      }
    } catch (e) {
      toast.error('Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Scan Business Card</p>
      {!streaming && !loading && (
        <div
          onClick={openCamera}
          className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center cursor-pointer
                     hover:border-brand-300 hover:bg-brand-50 transition-all"
        >
          <CreditCard size={28} className="mx-auto mb-2 text-surface-300" />
          <p className="text-sm font-medium text-gray-700">Open Camera</p>
          <p className="text-xs text-surface-400 mt-1">AI extracts name, email, phone, company</p>
        </div>
      )}
      {streaming && (
        <div className="space-y-3">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-surface-200" />
          <button onClick={capture} className="btn-primary w-full justify-center">
            Capture & Extract
          </button>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-500 justify-center py-4">
          <Loader2 size={16} className="animate-spin text-brand-500" /> AI reading card…
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {result && (
        <div className="card-sm p-3 space-y-1 text-sm">
          {result.contact_name && <p><span className="text-surface-400">Name:</span> {result.contact_name}</p>}
          {result.company_name && <p><span className="text-surface-400">Company:</span> {result.company_name}</p>}
          {result.email && <p><span className="text-surface-400">Email:</span> <span className="text-brand-600">{result.email}</span></p>}
          {result.phone && <p><span className="text-surface-400">Phone:</span> {result.phone}</p>}
        </div>
      )}
    </div>
  )
}

// ── Main LeadsPage ─────────────────────────────────────────────────────────────
const PANELS = [
  { id: 'upload', icon: Upload,        label: 'Upload File',   title: 'Upload File' },
  { id: 'scan',   icon: CreditCard,    label: 'Scan Card',     title: 'Scan Card' },
  { id: 'single', icon: Mail,          label: 'Single Email',  title: 'Single Email' },
  { id: 'bulk',   icon: ClipboardList, label: 'Paste Bulk',    title: 'Paste Bulk' },
]

export default function LeadsPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(new Map())   // id → lead
  const [activePanel, setActivePanel] = useState(null)
  const searchRef = useRef()

  const doSearch = async (q) => {
    const term = (q || query).trim()
    if (!term) return
    setSearching(true)
    setSearched(true)
    try {
      const { data } = await leadsApi.search(term, 50)
      setResults(data.leads)
    } catch (e) {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
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
    // Add new IDs to selection (we don't have full lead data, just IDs)
    setSelected(prev => {
      const next = new Map(prev)
      ids.forEach(id => { if (!next.has(id)) next.set(id, { id }) })
      return next
    })
  }

  const clearAll = () => setSelected(new Map())

  const copyIds = () => {
    const ids = Array.from(selected.keys()).join(',')
    navigator.clipboard.writeText(ids)
    toast.success('Lead IDs copied to clipboard')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="page-title">Leads</h1>
        <p className="page-sub">Search your database of 1M+ contacts or add new ones</p>
      </div>

      {/* ── Search bar + action icons ── */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="flex-1 flex items-center gap-2.5 bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <Search size={16} className="text-surface-400 flex-shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Search by company, city, business type, email…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-surface-400 outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
                className="text-surface-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={() => doSearch()} className="btn-primary py-2.5 px-5">
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>

          {/* Icon buttons for other input methods */}
          <div className="flex items-center gap-1 border-l border-surface-200 pl-3">
            {PANELS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
                title={p.label}
                className={`btn-icon transition-all ${activePanel === p.id ? 'bg-brand-50 text-brand-600' : ''}`}
              >
                <p.icon size={17} />
              </button>
            ))}
          </div>
        </div>

        {/* Slide-down panel */}
        {activePanel && (
          <div className="mt-3 border-t border-surface-100 pt-3 fade-up">
            <div className="flex items-center justify-between mb-1 px-4">
              <span className="text-xs font-semibold text-gray-700">
                {PANELS.find(p => p.id === activePanel)?.title}
              </span>
              <button onClick={() => setActivePanel(null)}
                className="text-surface-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            {activePanel === 'single' && <SinglePanel onAdded={handleAdded} />}
            {activePanel === 'bulk'   && <BulkPanel   onAdded={handleAdded} />}
            {activePanel === 'upload' && <UploadPanel onAdded={handleAdded} />}
            {activePanel === 'scan'   && <ScanPanel   onAdded={handleAdded} />}
          </div>
        )}
      </div>

      {/* ── Selection bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-4 fade-up">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
              {selected.size}
            </div>
            <span className="text-sm font-semibold text-brand-700">leads selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyIds} className="btn-secondary btn-sm text-xs">Copy IDs</button>
            <button onClick={clearAll} className="btn-ghost btn-sm text-xs text-red-500 hover:text-red-600">
              <X size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {searching && (
        <div className="flex items-center justify-center py-16 text-surface-400">
          <Loader2 size={24} className="animate-spin mr-3 text-brand-500" />
          <span className="text-sm">Searching…</span>
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="text-center py-16">
          <AlertCircle size={32} className="mx-auto mb-3 text-surface-300" />
          <p className="text-gray-700 font-medium">No leads found</p>
          <p className="text-sm text-surface-400 mt-1">Try a different search term</p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-surface-500">
              <strong className="text-gray-800">{results.length}</strong> results
              {query && <> for "<span className="text-brand-600">{query}</span>"</>}
            </p>
            <button
              onClick={() => results.forEach(l => setSelected(p => { const n = new Map(p); n.set(l.id, l); return n }))}
              className="btn-ghost btn-sm text-xs"
            >
              Select all
            </button>
          </div>
          <div className="grid gap-2.5">
            {results.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                selected={selected.has(lead.id)}
                onToggle={toggleLead}
              />
            ))}
          </div>
        </div>
      )}

      {!searching && !searched && (
        <div className="text-center py-20">
          <Search size={40} className="mx-auto mb-4 text-surface-200" />
          <p className="text-gray-700 font-medium">Search your lead database</p>
          <p className="text-sm text-surface-400 mt-1">
            Or use the icons above to add leads via file, card scan, or email paste
          </p>
        </div>
      )}
    </div>
  )
}