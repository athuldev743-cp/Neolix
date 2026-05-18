import { useState, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  Image, FileText, Zap, Search, Upload, CreditCard,
  Plus, Check, ChevronRight, ClipboardList
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, leadsApi } from '../services/api'

const MSG_TYPES = [
  {
    id: 'hook', label: 'Hook', icon: 'Zap', sub: 'Short punchy opener',
    placeholder: `Hi {lead_name} 👋\n\nWe help {lead_company} get better results faster.\n\nWorth a chat?`,
    hint: 'hook short punchy opener under 3 lines', rows: 4,
  },
  {
    id: 'detailed', label: 'Detailed', icon: 'FileText', sub: '80-120 word outreach',
    placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`,
    hint: 'detailed professional cold outreach 80-120 words', rows: 9,
  },
  {
    id: 'image', label: 'Image', icon: 'Image', sub: 'Image + caption',
    placeholder: `Hi {lead_name} — sharing our catalogue for {lead_company}.\nHappy to discuss! — {sender_name}`,
    hint: 'short 1-2 line caption for image attachment', rows: 3,
  },
]

function TypeIcon({ id, size = 13 }) {
  if (id === 'hook') return <Zap size={size} />
  if (id === 'detailed') return <FileText size={size} />
  return <Image size={size} />
}

/**
 * LeadInputPanel — manual mode uses a single smart paste textarea.
 * Paste anything:
 *   phone=9876543210, name=John, company=Acme
 *   or: 9876543210 | John Smith | Acme Corp
 *   or: just a phone number
 * Fields are parsed automatically.
 */
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

  // ── Smart paste parser ────────────────────────────────────────────────────
  const parsePaste = (text) => {
    if (!text.trim()) { setParsed(null); return }

    const result = { phone: '', name: '', company: '' }

    // Try key=value format (phone=91..., name=John, company=Acme)
    const kvMatches = text.matchAll(/(\w+)\s*[=:]\s*([^\n,;|]+)/g)
    let kvFound = false
    for (const m of kvMatches) {
      const key = m[1].toLowerCase().trim()
      const val = m[2].trim()
      if (['phone', 'mobile', 'number', 'tel', 'ph'].includes(key))              { result.phone   = val.replace(/\D/g, ''); kvFound = true }
      else if (['name', 'contact', 'person', 'contact_name'].includes(key))      { result.name    = val; kvFound = true }
      else if (['company', 'org', 'organization', 'company_name'].includes(key)) { result.company = val; kvFound = true }
    }

    if (!kvFound) {
      // Try pipe/comma/tab separated: phone | name | company
      const parts = text.split(/[|,;\t]/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 1) {
        const phonePart = parts.find(p => /^\+?\d[\d\s\-]{7,}$/.test(p))
        if (phonePart) result.phone = phonePart.replace(/\D/g, '')

        const rest = parts.filter(p => p !== phonePart)
        if (rest[0]) result.name    = rest[0]
        if (rest[1]) result.company = rest[1]
      }

      // If still no phone, try to extract any 10+ digit number
      if (!result.phone) {
        const phoneMatch = text.match(/\+?(\d[\d\s\-]{9,})/)
        if (phoneMatch) result.phone = phoneMatch[1].replace(/\D/g, '')
      }

      // If still no name, try to extract words that aren't numbers
      if (!result.name) {
        const words = text.replace(/\+?\d[\d\s\-]+/g, '').trim()
        if (words) result.name = words.trim()
      }
    }

    // Normalize phone: prepend 91 for bare 10-digit Indian numbers
    if (result.phone && result.phone.length === 10 && ['6', '7', '8', '9'].includes(result.phone[0])) {
      result.phone = '91' + result.phone
    }

    setParsed(result.phone ? result : null)
  }

  const handlePaste = (text) => {
    setPasteText(text)
    parsePaste(text)
  }

  const confirmParsed = () => {
    if (!parsed?.phone) { toast.error('Could not find a phone number'); return }
    onSelect(parsed)
    setPasteText('')
    setParsed(null)
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setBusy(true)
    try {
      const { data } = await leadsApi.search(q, 20)
      setResults((data.leads || data).filter(l => l.phone))
    } catch { setResults([]) } finally { setBusy(false) }
  }

  const pickResult = (l) => {
    onSelect({ phone: l.phone.replace(/\D/g, ''), name: l.contact_name || '', company: l.company_name || '' })
    setQuery(''); setResults([])
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      const leads = (data.leads || data).filter(l => l.phone)
      setUploaded(leads)
      if (!leads.length) toast.error('No leads with phone found')
      else toast.success(`${leads.length} leads loaded`)
    } catch { toast.error('Upload failed') } finally { setBusy(false) }
  }

  // ── Scan ──────────────────────────────────────────────────────────────────
  const handleScan = async (file) => {
    if (!file) return
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { data } = await leadsApi.scanCard(reader.result.split(',')[1])
        if (data.phone) {
          onSelect({ phone: data.phone.replace(/\D/g, ''), name: data.contact_name || '', company: data.company_name || '' })
          toast.success('Card scanned!')
        } else toast.error('No phone found on card')
      } catch { toast.error('Scan failed') } finally { setBusy(false) }
    }
    reader.readAsDataURL(file)
  }

  // ── Selected state ────────────────────────────────────────────────────────
  if (selected) return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="field-label mb-0">Recipient</label>
        <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1">
          <X size={10} /> Change
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
          {(selected.name || selected.phone || 'WA').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 truncate">{selected.name || `+${selected.phone}`}</p>
          <p className="text-xs text-emerald-600 truncate">+{selected.phone}{selected.company ? ` · ${selected.company}` : ''}</p>
        </div>
        <Check size={14} className="text-emerald-500 flex-shrink-0" />
      </div>
    </div>
  )

  const MODES = [
    { id: 'search', label: 'Search', icon: <Search size={11} /> },
    { id: 'manual', label: 'Paste',  icon: <ClipboardList size={11} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={11} /> },
    { id: 'scan',   label: 'Scan',   icon: <CreditCard size={11} /> },
  ]

  return (
    <div className="space-y-2.5">
      <label className="field-label mb-0">Recipient</label>

      {/* Mode tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setInputMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${inputMode === m.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* Search mode */}
      {inputMode === 'search' && (
        <div className="relative">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
              placeholder="Name, company, or phone…"
              value={query} onChange={e => doSearch(e.target.value)} />
            {busy && <Loader2 size={13} className="animate-spin text-emerald-500 flex-shrink-0" />}
            {query && !busy && <button onClick={() => { setQuery(''); setResults([]) }}><X size={13} className="text-slate-400 hover:text-slate-600" /></button>}
          </div>
          {results.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map(l => (
                <button key={l.id} onClick={() => pickResult(l)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm">
                  <p className="font-medium text-slate-800">{l.contact_name || '—'}</p>
                  <p className="text-xs text-slate-400">{l.company_name} · +{l.phone}</p>
                </button>
              ))}
            </div>
          )}
          {query && !busy && results.length === 0 && (
            <p className="text-xs text-slate-400 mt-1.5 px-1">No leads with phone found</p>
          )}
        </div>
      )}

      {/* Smart paste mode */}
      {inputMode === 'manual' && (
        <div className="space-y-2">
          <textarea
            className="textarea text-sm font-mono h-24 leading-relaxed"
            placeholder={`Paste anything:\nphone=9876543210, name=John, company=Acme\nor: 9876543210 | John Smith | Acme Corp\nor just: +91 98765 43210`}
            value={pasteText}
            onChange={e => handlePaste(e.target.value)}
          />

          {/* Live parse preview */}
          {parsed && (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Phone',   value: `+${parsed.phone}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                { label: 'Name',    value: parsed.name    || '—', color: 'bg-slate-50 border-slate-200 text-slate-700' },
                { label: 'Company', value: parsed.company || '—', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              ].map(f => (
                <div key={f.label} className={`border rounded-lg px-2 py-1.5 ${f.color}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">{f.label}</p>
                  <p className="text-xs font-medium truncate">{f.value}</p>
                </div>
              ))}
            </div>
          )}

          {pasteText && !parsed && (
            <p className="text-xs text-amber-600">⚠ Could not find a phone number — include a 10+ digit number</p>
          )}

          <button onClick={confirmParsed} disabled={!parsed?.phone}
            className="btn-primary w-full text-sm py-2">
            <Check size={13} /> Use this contact
          </button>
        </div>
      )}

      {/* Upload mode */}
      {inputMode === 'upload' && (
        <div className="space-y-2">
          <button onClick={() => uploadRef.current?.click()} disabled={busy}
            className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
            {busy ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <Upload size={18} />}
            <span className="text-xs">{busy ? 'Processing…' : 'Upload CSV / Excel / PDF'}</span>
          </button>
          <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" className="hidden"
            onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
          {uploaded.length > 0 && (
            <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
              {uploaded.map((l, i) => (
                <button key={i}
                  onClick={() => onSelect({ phone: l.phone.replace(/\D/g, ''), name: l.contact_name || '', company: l.company_name || '' })}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.contact_name || l.company_name || '—'}</p>
                    <p className="text-xs text-slate-400">+{l.phone}</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan mode */}
      {inputMode === 'scan' && (
        <div className="space-y-1.5">
          <button onClick={() => scanRef.current?.click()} disabled={busy}
            className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
            {busy ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <CreditCard size={18} />}
            <span className="text-xs">{busy ? 'Scanning…' : 'Upload business card image'}</span>
          </button>
          <input ref={scanRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
          <p className="text-[10px] text-slate-400 text-center">AI extracts phone, name & company automatically</p>
        </div>
      )}
    </div>
  )
}

export default function WhatsAppSendPage() {
  const [lead, setLead] = useState(null)
  const [activeTypes, setActiveTypes] = useState(new Set(['hook']))
  const [messages, setMessages] = useState({ hook: '', detailed: '', image: '' })
  const [previews, setPreviews] = useState({ hook: null, detailed: null, image: null })
  const [generating, setGenerating] = useState({ hook: false, detailed: false, image: false })
  const [previewing, setPreviewing] = useState({ hook: false, detailed: false, image: false })
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

  const setMsg = (type, val) => { setMessages(p => ({ ...p, [type]: val })); setPreviews(p => ({ ...p, [type]: null })) }

  const generate = async (type) => {
    const t = MSG_TYPES.find(x => x.id === type)
    setGenerating(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_name: lead?.name || '',
        lead_company: lead?.company || '',
        personalise: false,
        generate_template: true,
        message_type: type,
        context_hint: t.hint,
      })
      setMsg(type, data.message || '')
      toast.success(`${t.label} generated`)
    } catch { toast.error('Generation failed') }
    finally { setGenerating(p => ({ ...p, [type]: false })) }
  }

  const previewType = async (type) => {
    if (!messages[type]?.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: messages[type],
        lead_name: lead?.name || '',
        lead_company: lead?.company || '',
        personalise,
        message_type: type,
      })
      setPreviews(p => ({ ...p, [type]: data }))
    } catch { toast.error('Preview failed') }
    finally { setPreviewing(p => ({ ...p, [type]: false })) }
  }

  const sendAll = async () => {
    if (!lead?.phone) { toast.error('Select a recipient first'); return }
    const types = Array.from(activeTypes)
    for (const t of types) {
      if (t === 'image' && !imageFile) { toast.error('Select an image for Image type'); return }
      if (t !== 'image' && !(previews[t]?.message || messages[t]?.trim())) { toast.error(`Enter or generate a ${t} message first`); return }
    }
    const digits = lead.phone.replace(/\D/g, '')
    const fullPhone = digits.length === 10 ? '91' + digits : digits
    setSending(true)
    const sent = new Set()
    for (const type of types) {
      const finalMsg = previews[type]?.message || messages[type] || ''
      try {
        if (type === 'image') {
          await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async () => {
              try { await waApi.sendImage({ phone: fullPhone, image_base64: reader.result.split(',')[1], caption: finalMsg }); sent.add(type); resolve() }
              catch (e) { reject(e) }
            }
            reader.onerror = reject
            reader.readAsDataURL(imageFile)
          })
        } else {
          await waApi.send({ phone: fullPhone, message: finalMsg, personalise: false })
          sent.add(type)
        }
      } catch (e) { toast.error(`${type} failed: ${e.response?.data?.detail || 'error'}`) }
    }
    setSending(false)
    if (sent.size > 0) {
      toast.success(`${sent.size} message${sent.size > 1 ? 's' : ''} sent!`)
      setSentTypes(sent)
      setTimeout(() => { setLead(null); setMessages({ hook: '', detailed: '', image: '' }); setPreviews({ hook: null, detailed: null, image: null }); setImageFile(null); setImageUrl(null); setSentTypes(new Set()) }, 1800)
    }
  }

  const handleImagePick = (file) => {
    setImageFile(file)
    const r = new FileReader()
    r.onload = e => setImageUrl(e.target.result)
    r.readAsDataURL(file)
    setPreviews(p => ({ ...p, image: null }))
  }

  const TYPE_COLORS = {
    hook:     { pill: 'bg-yellow-50 border-yellow-200 text-yellow-700',  preview: 'bg-yellow-50 border border-yellow-200 text-yellow-900',  header: 'text-yellow-700' },
    detailed: { pill: 'bg-blue-50 border-blue-200 text-blue-700',        preview: 'bg-blue-50 border border-blue-200 text-blue-900',        header: 'text-blue-700' },
    image:    { pill: 'bg-purple-50 border-purple-200 text-purple-700',  preview: 'bg-purple-50 border border-purple-200 text-purple-900',  header: 'text-purple-700' },
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <MessageSquare size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Send WhatsApp</h1>
          <p className="text-xs text-slate-400">Mix hook + detailed + image — send one or all at once</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* COL 1: Lead + Controls */}
        <div className="space-y-4">
          <div className="card p-5">
            <LeadInputPanel selected={lead} onSelect={setLead} onClear={() => { setLead(null); setPreviews({ hook: null, detailed: null, image: null }) }} />
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
                <p className="text-xs text-slate-400">Groq rewrites per lead</p>
              </div>
              <button onClick={() => setPersonalise(p => !p)} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <button onClick={sendAll} disabled={sending || !lead?.phone} className="btn-primary w-full">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : `Send ${activeTypes.size} message${activeTypes.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* COL 2+3: Composers */}
        <div className="lg:col-span-2 space-y-4">
          {MSG_TYPES.filter(t => activeTypes.has(t.id)).map(t => {
            const colors = TYPE_COLORS[t.id]
            return (
              <div key={t.id} className={`card p-5 transition-all ${sentTypes.has(t.id) ? 'ring-2 ring-emerald-400' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${colors.header}`}>
                    <TypeIcon id={t.id} /> {t.label}
                  </span>
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

                <textarea className="textarea font-mono text-xs leading-relaxed w-full mb-2" style={{ height: `${t.rows * 24}px` }}
                  value={messages[t.id]} onChange={e => setMsg(t.id, e.target.value)} placeholder={t.placeholder} />

                <p className="text-[10px] text-slate-400 mb-3">
                  {['{lead_name}', '{lead_company}', '{sender_name}'].map(p => (
                    <code key={p} className="bg-slate-100 px-1 rounded mx-0.5">{p}</code>
                  ))}
                </p>

                <div className="flex items-start gap-2">
                  <button onClick={() => previewType(t.id)} disabled={previewing[t.id] || !messages[t.id]?.trim()}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0">
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

          {/* Combined WA preview */}
          {lead && MSG_TYPES.some(t => activeTypes.has(t.id) && previews[t.id]) && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">WhatsApp Preview — as recipient will see</p>
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#e5ddd5' }}>
                {MSG_TYPES.filter(t => activeTypes.has(t.id) && previews[t.id]).map(t => (
                  <div key={t.id} className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                      {t.id === 'image' && imageUrl && <img src={imageUrl} alt="img" className="rounded-xl w-full max-h-32 object-cover mb-2" />}
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{previews[t.id].message}</p>
                      <p className="text-[10px] text-slate-500 text-right mt-1">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓</p>
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