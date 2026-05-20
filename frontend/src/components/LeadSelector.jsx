/**
 * LeadSelector — reusable lead search + add panel
 * Upgraded to universally support dynamic channel selection matrix blocks (Email / WhatsApp / SMS)
 * Props:
 *   selected: Map<id, lead>
 *   onChange: (newMap) => void
 *   requirePhone: bool — toggles phone/WhatsApp architecture layout matrix mode
 */
import { useState, useRef, useCallback } from 'react'
import {
  Search, Upload, CreditCard, Mail, ClipboardList,
  X, Check, Plus, Loader2, Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../services/api'

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}|\d{10,12}/g

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) return `91${digits}`
  return digits
}

// ── Single dynamic contact input panel ─────────────────────────────────────────
function SinglePanel({ onAdded, requirePhone }) {
  const [targetVal, setTargetVal] = useState('')
  const [name, setName]     = useState('')
  const [company, setCompany] = useState('')
  const [businessDesc, setBusinessDesc] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!targetVal.trim()) return toast.error(requirePhone ? 'Enter a mobile number' : 'Enter an email address')
    
    setLoading(true)
    try {
      const payload = {
        contact_name: name,
        company_name: company,
        business_details: businessDesc, // Fixed: preserving crucial AI context layer mapping strings
        source: requirePhone ? 'whatsapp_manual' : 'email_manual',
      }

      if (requirePhone) {
        const phone = normalizePhone(targetVal)
        if (phone.length < 10) { toast.error('Enter a valid phone number'); setLoading(false); return }
        payload.phone = phone
        payload.email = `${phone}@neolix-channel.local` // Satisfies strict backend architecture constraints
      } else {
        if (!targetVal.includes('@')) { toast.error('Enter a valid email'); setLoading(false); return }
        payload.email = targetVal.toLowerCase().trim()
      }

      const { data } = await leadsApi.addSingle(payload)
      toast.success('Contact target synced successfully!')
      onAdded(data.lead_ids || [data.id || data.lead_id])
      setTargetVal(''); setName(''); setCompany(''); setBusinessDesc('')
    } catch { 
      toast.error('Failed to sync node parameters') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="p-3 space-y-2">
      <input 
        className="input text-sm" 
        type={requirePhone ? 'tel' : 'email'} 
        placeholder={requirePhone ? 'WhatsApp / Mobile Number *' : 'Email Address *'}
        value={targetVal} 
        onChange={e => setTargetVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} 
      />
      <div className="grid grid-cols-2 gap-2">
        <input className="input text-sm" placeholder="Contact Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="input text-sm" placeholder="Company Name" value={company} onChange={e => setCompany(e.target.value)} />
      </div>
      <textarea 
        className="textarea text-xs h-16 resize-none" 
        placeholder="Business description / details (Important for AI personalization matching)..." 
        value={businessDesc} 
        onChange={e => setBusinessDesc(e.target.value)} 
      />
      <button onClick={submit} disabled={loading} className="btn-primary btn-sm w-full justify-center">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Recipient Node
      </button>
    </div>
  )
}

// ── Bulk dataset parsing row context matrix ────────────────────────────────────
function BulkPanel({ onAdded, requirePhone }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  
  const matches = requirePhone ? (text.match(PHONE_RE) || []) : (text.match(EMAIL_RE) || [])
  const found = [...new Set(matches.map(m => m.trim()))].length

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(text)
      toast.success(`${data.total_found || found} contacts processed into outbox matrices`)
      onAdded(data.lead_ids || [])
      setText('')
    } catch { 
      toast.error('Bulk ingestion pipeline timeout') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="p-3 space-y-2">
      <textarea 
        className="textarea h-28 text-xs font-mono"
        value={text} 
        onChange={e => setText(e.target.value)}
        placeholder={requirePhone ? "9876543210 | John | Acme | Auto parts\n9123456789 | Priya | Dental Clinic" : "email1@co.com\nemail2@co.com"} 
      />
      {found > 0 && <p className="text-xs text-emerald-600 font-medium">{found} match dataset matrix logs detected</p>}
      <button onClick={submit} disabled={loading || !found} className="btn-primary btn-sm w-full justify-center">
        {loading ? <Loader2 size={13} className="animate-spin" /> : null}
        Ingest bulk dataset matrix ({found || ''})
      </button>
    </div>
  )
}

// ── Multi-format file parsing block architecture ──────────────────────────────
function UploadPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  const handle = async (file) => {
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      toast.success(`Leads extracted from file asset architecture`)
      onAdded(data.lead_ids || [])
    } catch { 
      toast.error('Upload parser exception structural reject') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="p-3">
      <div onClick={() => ref.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
        className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all group">
        {loading ? (
          <Loader2 size={20} className="animate-spin mx-auto text-slate-800" />
        ) : (
          <>
            <Upload size={20} className="mx-auto mb-1.5 text-slate-300 group-hover:text-slate-800" />
            <p className="text-xs font-medium text-slate-600">Click or drop data sheets</p>
            <p className="text-[10px] text-slate-400 mt-0.5">CSV, XLSX, PDF, TXT, JSON</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" className="hidden" accept=".csv,.xlsx,.xls,.txt,.pdf,.json"
        onChange={e => e.target.files[0] && handle(e.target.files[0])} />
    </div>
  )
}

// ── OCR card engine link architecture maps ─────────────────────────────────────
function ScanPanel({ onAdded, requirePhone }) {
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
    } catch { toast.error('Camera capture array access blocked') }
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
      if (data.total_found > 0 || data.phone || data.email) {
        toast.success(`Card metrics logged accurately into nodes`)
        onAdded(data.lead_ids || [])
      } else { 
        toast.error(requirePhone ? 'No matching phone sequence verified' : 'No matching email sequence verified') 
      }
    } catch { 
      toast.error('AI vision system error') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="p-3 space-y-2">
      {!streaming && !loading && (
        <div onClick={openCamera}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all">
          <CreditCard size={20} className="mx-auto mb-1.5 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">Trigger OCR capture matrix module</p>
        </div>
      )}
      {streaming && (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border" />
          <button onClick={capture} className="btn-primary w-full justify-center">Parse hardware viewport target</button>
        </>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin text-slate-800" /> Deconstructing physical asset arrays...
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// ── Global Component Context ───────────────────────────────────────────────────
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
      let leads = data.leads || data || []
      if (requirePhone) leads = leads.filter(l => l.phone)
      setResults(leads)
      if (leads.length === 0) toast('No valid targets matched schema filter attributes')
    } catch { 
      toast.error('Index database routing timeout') 
    } finally { 
      setSearching(false) 
    }
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

  const PANELS = [
    { id: 'upload', icon: Upload,        label: 'Upload File' },
    { id: 'scan',   icon: CreditCard,    label: 'Scan Card' },
    { id: 'single', icon: requirePhone ? Smartphone : Mail, label: requirePhone ? 'Single Contact' : 'Single Email' },
    { id: 'bulk',   icon: ClipboardList, label: 'Paste Bulk' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-400 transition-all">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder={requirePhone ? 'Search parameters via mobile index...' : 'Search criteria over email database architecture...'}
            className="flex-1 bg-transparent text-xs outline-none placeholder-slate-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={doSearch} className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
          {searching ? <Loader2 size={14} className="animate-spin text-slate-800" /> : <Search size={14} />}
        </button>
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          {PANELS.map(p => (
            <button key={p.id} type="button"
              onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
              title={p.label}
              className={`p-2 rounded-xl transition-all ${activePanel === p.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              <p.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {activePanel && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white fade-up">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {PANELS.find(p => p.id === activePanel)?.label} Configuration Module
            </span>
            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
          {activePanel === 'single' && <SinglePanel onAdded={handleAdded} requirePhone={requirePhone} />}
          {activePanel === 'bulk'   && <BulkPanel   onAdded={handleAdded} requirePhone={requirePhone} />}
          {activePanel === 'upload' && <UploadPanel onAdded={handleAdded} />}
          {activePanel === 'scan'   && <ScanPanel   onAdded={handleAdded} requirePhone={requirePhone} />}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{results.length} active nodes loaded</p>
            <button onClick={selectAll} className="text-xs text-slate-900 font-bold hover:underline">Select entire array</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border p-1 rounded-xl bg-slate-50/50">
            {results.map(lead => (
              <div key={lead.id} onClick={() => toggle(lead)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${selected.has(lead.id) ? 'bg-white border-slate-400 shadow-2xs' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                <div>
                  <p className="font-bold text-slate-800">{lead.company_name || lead.contact_name || 'Anonymous Node'}</p>
                  <p className="text-slate-400 text-[11px]">
                    {requirePhone ? `+${lead.phone}` : lead.email} {lead.city ? `· ${lead.city}` : ''}
                  </p>
                  {/* Dynamic render validation checking matching properties safely */}
                  {(lead.business_description || lead.business_details) && (
                    <p className="text-[10px] text-slate-400 italic max-w-xs truncate mt-0.5">Ctx: {lead.business_description || lead.business_details}</p>
                  )}
                </div>
                {selected.has(lead.id) && <Check size={14} className="text-slate-900" strokeWidth={3} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}