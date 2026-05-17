import { useState, useRef } from 'react'
import {
  Send, Loader2, Eye, X, Phone, User, Building2,
  MessageSquare, Sparkles, Image, FileText, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'

// ── Message type config ───────────────────────────────────────────────────────
const MSG_TYPES = [
  {
    id: 'hook',
    label: 'Hook',
    icon: <Zap size={14} />,
    desc: 'Short punchy opener',
    rows: 4,
    placeholder: `Hi {lead_name} 👋\n\nWe help {lead_company} cut sourcing time by 40%.\nWorth a chat?`,
    hint: 'hook short punchy opener under 3 lines',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    icon: <FileText size={14} />,
    desc: '80-120 word outreach',
    rows: 9,
    placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Value proposition here]\n\nWould love to explore if there's a fit — are you free for a quick 10-min call this week?\n\nWarm regards,\n{sender_name}\n{sender_company}`,
    hint: 'detailed professional cold outreach 80-120 words',
  },
  {
    id: 'image',
    label: 'Image',
    icon: <Image size={14} />,
    desc: 'Image + caption',
    rows: 3,
    placeholder: `Hi {lead_name} — sharing our latest catalogue for {lead_company}.\nHappy to discuss! — {sender_name}`,
    hint: 'short caption for an image attachment under 2 lines',
  },
]

// ═══════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════
export default function WhatsAppSendPage() {
  const [phone, setPhone]           = useState('')
  const [leadName, setLeadName]     = useState('')
  const [leadCompany, setLeadCompany] = useState('')
  const [msgType, setMsgType]       = useState('hook')
  const [message, setMessage]       = useState('')
  const [personalise, setPersonalise] = useState(false)
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview]       = useState(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]       = useState(false)

  const fileRef = useRef()
  const currentType = MSG_TYPES.find(t => t.id === msgType)

  // ── switch type ───────────────────────────────────────────
  const switchType = (id) => {
    setMsgType(id)
    setMessage('')
    setPreview(null)
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
        lead_id: 0,
        lead_name: leadName || undefined,
        lead_company: leadCompany || undefined,
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
    setPreviewing(true)
    setPreview(null)
    try {
      const { data } = await waApi.preview({
        message,
        lead_id: 0,
        lead_name: leadName || undefined,
        lead_company: leadCompany || undefined,
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
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { toast.error('Enter a valid phone number'); return }

    const finalMsg = preview?.message || message
    if (!finalMsg.trim() && msgType !== 'image') { toast.error('Enter a message'); return }
    if (msgType === 'image' && !imageFile) { toast.error('Select an image'); return }

    const fullPhone = digits.length === 10 ? '91' + digits : digits
    setSending(true)

    try {
      if (msgType === 'image') {
        const reader = new FileReader()
        reader.onload = async () => {
          await waApi.sendImage({
            phone: fullPhone,
            image_base64: reader.result.split(',')[1],
            caption: finalMsg,
          })
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
    setMessage(''); setPhone(''); setLeadName(''); setLeadCompany('')
    setPreview(null); setImageFile(null); setImagePreviewUrl(null)
  }

  const canSend = msgType === 'image'
    ? !!imageFile
    : !!(message.trim() || preview)

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
          <p className="text-xs text-slate-400">Hook, detailed message, or image — all AI-ready</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Compose ── */}
        <div className="card p-5 space-y-4">

          {/* Type pills */}
          <div>
            <label className="field-label mb-2">Message type</label>
            <div className="grid grid-cols-3 gap-2">
              {MSG_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => switchType(t.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition-all
                    ${msgType === t.id
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
                    }`}
                >
                  <span className={msgType === t.id ? 'text-emerald-500' : 'text-slate-400'}>{t.icon}</span>
                  <span>{t.label}</span>
                  <span className={`text-[9px] font-normal leading-tight text-center ${msgType === t.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400" /> WhatsApp Number
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <span className="text-slate-500 text-sm font-mono select-none">+</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-slate-400 text-slate-800"
                placeholder="91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              />
              {phone && (
                <button onClick={() => setPhone('')} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">10-digit auto-prefixed with +91 · or enter full international</p>
          </div>

          {/* Lead info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label flex items-center gap-1.5">
                <User size={12} className="text-slate-400" /> Lead name
                <span className="normal-case font-normal text-slate-400 text-[10px]">optional</span>
              </label>
              <input className="input" placeholder="Arjun Sharma"
                value={leadName} onChange={e => { setLeadName(e.target.value); setPreview(null) }} />
            </div>
            <div>
              <label className="field-label flex items-center gap-1.5">
                <Building2 size={12} className="text-slate-400" /> Company
                <span className="normal-case font-normal text-slate-400 text-[10px]">optional</span>
              </label>
              <input className="input" placeholder="Acme Pvt Ltd"
                value={leadCompany} onChange={e => { setLeadCompany(e.target.value); setPreview(null) }} />
            </div>
          </div>

          {/* Image picker — only for image mode */}
          {msgType === 'image' && (
            <div>
              <label className="field-label">Image attachment</label>
              {imagePreviewUrl ? (
                <div className="relative">
                  <img src={imagePreviewUrl} alt="preview"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreviewUrl(null) }}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all"
                >
                  <Image size={22} />
                  <span className="text-xs">Click to upload image</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files[0] && handleImagePick(e.target.files[0])} />
            </div>
          )}

          {/* Message / Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">
                {msgType === 'image' ? 'Caption' : 'Message'}
              </label>
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
              <p className="text-xs text-slate-400">Groq rewrites the message using lead + your profile</p>
            </div>
            <button
              onClick={() => setPersonalise(p => !p)}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Action buttons */}
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
              {(leadName || (phone ? phone.slice(-4) : 'WA')).slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{leadName || (phone ? `+${phone}` : 'Recipient')}</p>
              <p className="text-xs text-slate-400">{leadCompany || 'No company'}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
              msgType === 'hook' ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : msgType === 'detailed' ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              {currentType.label.toUpperCase()}
            </span>
          </div>

          {/* WA chat canvas */}
          <div
            className="flex-1 rounded-xl p-4 flex flex-col justify-end gap-3 min-h-[240px]"
            style={{
              backgroundColor: '#e5ddd5',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23e5ddd5'/%3E%3Ccircle cx='50' cy='50' r='1' fill='%23d4c9bf' fill-opacity='.4'/%3E%3C/svg%3E")`,
            }}
          >
            {!preview && !imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare size={28} className="mb-2 text-slate-400 opacity-40" />
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

          {/* Quick send from preview */}
          {(preview || (msgType === 'image' && imageFile)) && (
            <div className="mt-4 space-y-2">
              <button onClick={sendMessage} disabled={sending} className="btn-primary w-full">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send {msgType === 'image' ? 'image' : msgType === 'hook' ? 'hook' : 'message'}
              </button>
              {(preview?.lead_name || leadName) && (
                <p className="text-xs text-slate-400 text-center">
                  To: <strong>{preview?.lead_name || leadName}</strong>
                  {(preview?.lead_company || leadCompany) && ` · ${preview?.lead_company || leadCompany}`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}