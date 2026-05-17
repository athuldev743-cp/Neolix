import { useState, useRef, useCallback } from 'react'
import {
  Send, Loader2, Eye, X, Phone, User, Building2,
  MessageSquare, Sparkles, Image, FileText, Zap,
  Search, Upload, CreditCard, Plus, Check, Trash2,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, leadsApi } from '../services/api'

// ═══════════════════════════════════════════════════════════
// Message type config
// ═══════════════════════════════════════════════════════════
const MSG_TYPES = [
  {
    id: 'hook',
    label: 'Hook',
    icon: <Zap size={13} />,
    desc: 'Short punchy opener',
    rows: 4,
    placeholder: `Hi {lead_name} 👋\n\nWe help {lead_company} cut sourcing time by 40%.\nWorth a chat?`,
    hint: 'hook short punchy opener under 3 lines',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    icon: <FileText size={13} />,
    desc: '80-120 word outreach',
    rows: 9,
    placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Value proposition here]\n\nWould love to explore if there's a fit — are you free for a quick 10-min call?\n\nWarm regards,\n{sender_name}`,
    hint: 'detailed professional cold outreach 80-120 words',
  },
  {
    id: 'image',
    label: 'Image',
    icon: <Image size={13} />,
    desc: 'Image + caption',
    rows: 3,
    placeholder: `Hi {lead_name} — sharing our latest catalogue for {lead_company}.\nHappy to discuss! — {sender_name}`,
    hint: 'short caption for image attachment under 2 lines',
  },
]

// ═══════════════════════════════════════════════════════════
// Lead Input Panel — search / manual / upload / card scan
// ═══════════════════════════════════════════════════════════
function LeadInputPanel({ onLeadSelected, selectedLead, onClear }) {
  const [mode, setMode]         = useState('search')   // search | manual | upload | scan
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  // manual form
  const [manualPhone, setManualPhone]     = useState('')
  const [manualName, setManualName]       = useState('')
  const [manualCompany, setManualCompany] = useState('')

  // file upload
  const [uploading, setUploading] = useState(false)
  const [uploadedLeads, setUploadedLeads] = useState([])
  const fileUploadRef = useRef()

  // card scan
  const [scanning, setScanning]   = useState(false)
  const cardScanRef = useRef()

  // ── search ──────────────────────────────────────────────
  const doSearch = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); setDropOpen(false); return }
    setSearching(true)
    try {
      const { data } = await leadsApi.search(q, 20)
      const leads = (data.leads || data).filter(l => l.phone)
      setResults(leads)
      setDropOpen(true)
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  const pickSearchResult = (lead) => {
    onLeadSelected({ phone: lead.phone, name: lead.contact_name || '', company: lead.company_name || '' })
    setQuery(''); setResults([]); setDropOpen(false)
  }

  // ── manual ──────────────────────────────────────────────
  const confirmManual = () => {
    if (!manualPhone.trim()) { toast.error('Phone is required'); return }
    onLeadSelected({ phone: manualPhone.replace(/\D/g,''), name: manualName, company: manualCompany })
    setManualPhone(''); setManualName(''); setManualCompany('')
  }

  // ── file upload ─────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      const leads = (data.leads || data).filter(l => l.phone)
      setUploadedLeads(leads)
      if (leads.length === 0) toast.error('No leads with phone numbers found')
      else toast.success(`${leads.length} leads loaded`)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  // ── card scan ────────────────────────────────────────────
  const handleCardScan = async (file) => {
    if (!file) return
    setScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const { data } = await leadsApi.scanCard(reader.result.split(',')[1])
          if (data.phone) {
            onLeadSelected({ phone: data.phone.replace(/\D/g,''), name: data.contact_name || '', company: data.company_name || '' })
            toast.success('Card scanned!')
          } else {
            toast.error('No phone found on card')
          }
        } catch { toast.error('Scan failed') }
        finally { setScanning(false) }
      }
      reader.readAsDataURL(file)
    } catch { setScanning(false) }
  }

  const MODES = [
    { id: 'search', label: 'Search', icon: <Search size={12} /> },
    { id: 'manual', label: 'Manual', icon: <Plus size={12} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={12} /> },
    { id: 'scan',   label: 'Scan',   icon: <CreditCard size={12} /> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="field-label mb-0">Recipient</label>
        {selectedLead && (
          <button onClick={onClear} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Selected lead badge */}
      {selectedLead ? (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
            {(selectedLead.name || selectedLead.phone).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 truncate">{selectedLead.name || `+${selectedLead.phone}`}</p>
            <p className="text-xs text-emerald-600">+{selectedLead.phone}{selectedLead.company ? ` · ${selectedLead.company}` : ''}</p>
          </div>
          <Check size={15} className="text-emerald-500 flex-shrink-0" />
        </div>
      ) : (
        <>
          {/* Mode tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${mode === m.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Search mode */}
          {mode === 'search' && (
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <Search size={13} className="text-slate-400 flex-shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
                  placeholder="Search by name, company, or phone…"
                  value={query}
                  onChange={e => doSearch(e.target.value)}
                />
                {searching && <Loader2 size={13} className="animate-spin text-emerald-500 flex-shrink-0" />}
                {query && !searching && (
                  <button onClick={() => { setQuery(''); setResults([]); setDropOpen(false) }}>
                    <X size={13} className="text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              {dropOpen && results.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {results.map(l => (
                    <button key={l.id} onClick={() => pickSearchResult(l)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm">
                      <p className="font-medium text-slate-800">{l.contact_name || '—'}</p>
                      <p className="text-xs text-slate-400">{l.company_name} · +{l.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              {dropOpen && results.length === 0 && !searching && query && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
                  No leads with phone found for "{query}"
                </div>
              )}
            </div>
          )}

          {/* Manual mode */}
          {mode === 'manual' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <span className="text-slate-500 text-sm font-mono select-none">+</span>
                <input className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-slate-400"
                  placeholder="91 98765 43210" value={manualPhone}
                  onChange={e => setManualPhone(e.target.value.replace(/\D/g,''))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input text-sm" placeholder="Name (optional)"
                  value={manualName} onChange={e => setManualName(e.target.value)} />
                <input className="input text-sm" placeholder="Company (optional)"
                  value={manualCompany} onChange={e => setManualCompany(e.target.value)} />
              </div>
              <button onClick={confirmManual} className="btn-primary w-full text-sm py-2">
                <Check size={13} /> Confirm
              </button>
            </div>
          )}

          {/* Upload mode */}
          {mode === 'upload' && (
            <div className="space-y-2">
              <button onClick={() => fileUploadRef.current?.click()} disabled={uploading}
                className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
                {uploading ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <Upload size={18} />}
                <span className="text-xs">{uploading ? 'Processing…' : 'Upload CSV / Excel / PDF'}</span>
              </button>
              <input ref={fileUploadRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" className="hidden"
                onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
              {uploadedLeads.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                  {uploadedLeads.map((l, i) => (
                    <button key={i} onClick={() => onLeadSelected({ phone: l.phone.replace(/\D/g,''), name: l.contact_name || '', company: l.company_name || '' })}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm">
                      <p className="font-medium text-slate-800">{l.contact_name || l.company_name || '—'}</p>
                      <p className="text-xs text-slate-400">+{l.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card scan mode */}
          {mode === 'scan' && (
            <div>
              <button onClick={() => cardScanRef.current?.click()} disabled={scanning}
                className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
                {scanning ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <CreditCard size={18} />}
                <span className="text-xs">{scanning ? 'Scanning…' : 'Upload business card image'}</span>
              </button>
              <input ref={cardScanRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files[0] && handleCardScan(e.target.files[0])} />
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">AI extracts phone, name & company</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ROOT — WhatsAppSendPage
// ═══════════════════════════════════════════════════════════
export default function WhatsAppSendPage() {
  const [selectedLead, setSelectedLead] = useState(null) // { phone, name, company }
  const [msgType, setMsgType]           = useState('hook')
  const [message, setMessage]           = useState('')
  const [personalise, setPersonalise]   = useState(false)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview]       = useState(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]       = useState(false)

  const imagePickRef = useRef()
  const currentType  = MSG_TYPES.find(t => t.id === msgType)

  const switchType = (id) => {
    setMsgType(id); setMessage(''); setPreview(null)
    if (id !== 'image') { setImageFile(null); setImagePreviewUrl(null) }
  }

  const handleImagePick = (file) => {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreviewUrl(e.target.result)
    reader.readAsDataURL(file)
    setPreview(null)
  }

  // ── AI generate ───────────────────────────────────────────
  const generateTemplate = async () => {
    setGenerating(true)
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_name: selectedLead?.name || '',
        lead_company: selectedLead?.company || '',
        personalise: false,
        generate_template: true,
        message_type: msgType,
        context_hint: currentType.hint,
      })
      setMessage(data.message || '')
      setPreview(null)
      toast.success('Template generated')
    } catch {
      toast.error('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Preview ───────────────────────────────────────────────
  const previewMessage = async () => {
    if (!message.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(true); setPreview(null)
    try {
      const { data } = await waApi.preview({
        message,
        lead_name: selectedLead?.name || '',
        lead_company: selectedLead?.company || '',
        personalise,
        message_type: msgType,
      })
      setPreview(data)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  // ── Send ──────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedLead?.phone) { toast.error('Select or enter a recipient first'); return }
    const finalMsg = preview?.message || message
    if (!finalMsg.trim() && msgType !== 'image') { toast.error('Enter a message'); return }
    if (msgType === 'image' && !imageFile) { toast.error('Select an image'); return }

    // Normalise phone
    const digits = selectedLead.phone.replace(/\D/g,'')
    const fullPhone = digits.length === 10 ? '91' + digits : digits

    setSending(true)
    try {
      if (msgType === 'image') {
        const reader = new FileReader()
        reader.onload = async () => {
          await waApi.sendImage({ phone: fullPhone, image_base64: reader.result.split(',')[1], caption: finalMsg })
          toast.success('Image sent!')
          resetForm()
          setSending(false)
        }
        reader.onerror = () => { toast.error('Failed to read image'); setSending(false) }
        reader.readAsDataURL(imageFile)
      } else {
        await waApi.send({ phone: fullPhone, message: finalMsg, personalise: false })
        toast.success('Message sent!')
        resetForm()
        setSending(false)
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Send failed')
      setSending(false)
    }
  }

  const resetForm = () => {
    setMessage(''); setSelectedLead(null); setPreview(null)
    setImageFile(null); setImagePreviewUrl(null)
  }

  const canSend = selectedLead?.phone && (msgType === 'image' ? !!imageFile : !!(message.trim() || preview))

  // ── render ────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <MessageSquare size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Send WhatsApp</h1>
          <p className="text-xs text-slate-400">Hook, detailed, or image — search, manual, upload, or scan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Compose ── */}
        <div className="card p-5 space-y-4">

          {/* Lead input (all methods) */}
          <LeadInputPanel
            selectedLead={selectedLead}
            onLeadSelected={setSelectedLead}
            onClear={() => { setSelectedLead(null); setPreview(null) }}
          />

          {/* Message type pills */}
          <div>
            <label className="field-label mb-2">Message type</label>
            <div className="grid grid-cols-3 gap-2">
              {MSG_TYPES.map(t => (
                <button key={t.id} onClick={() => switchType(t.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all
                    ${msgType === t.id
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}>
                  <span className={msgType === t.id ? 'text-emerald-500' : 'text-slate-400'}>{t.icon}</span>
                  <span>{t.label}</span>
                  <span className={`text-[9px] font-normal leading-tight text-center ${msgType === t.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Image picker */}
          {msgType === 'image' && (
            <div>
              <label className="field-label">Image attachment</label>
              {imagePreviewUrl ? (
                <div className="relative">
                  <img src={imagePreviewUrl} alt="preview"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                  <button onClick={() => { setImageFile(null); setImagePreviewUrl(null) }}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => imagePickRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all">
                  <Image size={20} />
                  <span className="text-xs">Click to upload image</span>
                </button>
              )}
              <input ref={imagePickRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files[0] && handleImagePick(e.target.files[0])} />
            </div>
          )}

          {/* Message / Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">{msgType === 'image' ? 'Caption' : 'Message'}</label>
              <button onClick={generateTemplate} disabled={generating}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors">
                {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                AI generate
              </button>
            </div>
            <textarea
              className="textarea font-mono text-xs leading-relaxed"
              style={{ height: `${currentType.rows * 24}px` }}
              value={message}
              onChange={e => { setMessage(e.target.value); setPreview(null) }}
              placeholder={currentType.placeholder}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Placeholders:{' '}
              {['{lead_name}', '{lead_company}', '{sender_name}'].map(p => (
                <code key={p} className="bg-slate-100 px-1 rounded mx-0.5 text-[9px]">{p}</code>
              ))}
            </p>
          </div>

          {/* AI personalise toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-800">AI personalisation</p>
              <p className="text-xs text-slate-400">Groq rewrites using lead + your profile</p>
            </div>
            <button onClick={() => setPersonalise(p => !p)}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={previewMessage} disabled={previewing || !message.trim()} className="btn-secondary flex-1">
              {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Preview
            </button>
            <button onClick={sendMessage} disabled={sending || !canSend} className="btn-primary flex-1">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send
            </button>
          </div>
        </div>

        {/* ── RIGHT: Preview pane ── */}
        <div className="card p-5 flex flex-col">

          {/* Mock WA header */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
              {(selectedLead?.name || selectedLead?.phone || 'WA').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {selectedLead?.name || (selectedLead?.phone ? `+${selectedLead.phone}` : 'No recipient selected')}
              </p>
              <p className="text-xs text-slate-400">
                {selectedLead?.company || (selectedLead?.phone ? `+${selectedLead.phone}` : '—')}
              </p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
              msgType === 'hook' ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : msgType === 'detailed' ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              {currentType.label.toUpperCase()}
            </span>
          </div>

          {/* Chat canvas */}
          <div className="flex-1 rounded-xl p-4 flex flex-col justify-end gap-3 min-h-[240px]"
            style={{ backgroundColor: '#e5ddd5' }}>
            {!preview && !imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare size={28} className="mb-2 opacity-30 text-slate-600" />
                <p className="text-sm text-slate-500">Click Preview to see your message</p>
                {personalise && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Sparkles size={11} /> AI will personalise on send
                  </p>
                )}
              </div>
            )}

            {/* Image bubble */}
            {msgType === 'image' && imagePreviewUrl && (
              <div className="flex justify-end">
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm p-2 shadow-sm max-w-[220px]">
                  <img src={imagePreviewUrl} alt="attachment" className="rounded-xl w-full object-cover max-h-36" />
                  {(preview?.message || message) && (
                    <p className="text-xs text-slate-700 mt-2 px-1 whitespace-pre-wrap leading-relaxed">
                      {preview?.message || message}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 text-right mt-1.5">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>
            )}

            {/* Text bubble */}
            {preview && msgType !== 'image' && (
              <div className="flex justify-end">
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-w-[280px]">
                  {preview.message}
                  <p className="text-[10px] text-slate-500 text-right mt-1.5">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Send CTA */}
          {(preview || (msgType === 'image' && imageFile)) && (
            <div className="mt-4 space-y-2">
              <button onClick={sendMessage} disabled={sending} className="btn-primary w-full">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send {msgType === 'image' ? 'image' : msgType === 'hook' ? 'hook message' : 'message'}
              </button>
              {selectedLead && (
                <p className="text-xs text-slate-400 text-center">
                  To: <strong>{selectedLead.name || `+${selectedLead.phone}`}</strong>
                  {selectedLead.company ? ` · ${selectedLead.company}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}