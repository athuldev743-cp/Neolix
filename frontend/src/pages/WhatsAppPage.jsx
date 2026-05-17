import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, Zap, X, RefreshCw,
  Phone, User, MessageSquare, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPhone(val) {
  // Strip non-digits, keep leading +
  return val.replace(/[^\d+]/g, '')
}

const STATUS_ICON = {
  sent:    <CheckCircle2 size={13} className="text-emerald-500" />,
  failed:  <AlertTriangle size={13} className="text-red-400" />,
  pending: <Loader2 size={13} className="text-slate-400 animate-spin" />,
}

// ── Root: Single-tab WhatsApp Send Page ──────────────────────────────────────
export default function WhatsAppSendPage() {
  const [phone, setPhone]           = useState('')
  const [message, setMessage]       = useState('')
  const [personalise, setPersonalise] = useState(false)
  const [leadName, setLeadName]     = useState('')
  const [leadCompany, setLeadCompany] = useState('')

  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview]       = useState(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]       = useState(false)

  // Clear preview whenever message changes
  const handleMessageChange = (val) => {
    setMessage(val)
    setPreview(null)
  }

  // AI: generate a template
  const generateTemplate = async () => {
    setGenerating(true)
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_id: 0,
        personalise: false,
        generate_template: true,
        context_hint: '',
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

  // Preview: resolve placeholders / AI-personalise
  const previewMessage = async () => {
    if (!message.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(true)
    setPreview(null)
    try {
      const { data } = await waApi.preview({
        message,
        lead_id: 0,
        personalise,
        // Pass inline name/company so backend can fill placeholders
        lead_name: leadName || undefined,
        lead_company: leadCompany || undefined,
      })
      setPreview(data)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  // Send
  const sendMessage = async () => {
    const cleanPhone = formatPhone(phone)
    if (!cleanPhone) { toast.error('Enter a phone number'); return }
    const finalMsg = preview?.message || message
    if (!finalMsg.trim()) { toast.error('Enter a message'); return }

    setSending(true)
    try {
      await waApi.send({
        phone: cleanPhone,
        message: finalMsg,
        personalise: false, // already resolved via preview
      })
      toast.success('Message sent!')
      setMessage('')
      setPhone('')
      setLeadName('')
      setLeadCompany('')
      setPreview(null)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <MessageSquare size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Send WhatsApp</h1>
          <p className="text-xs text-slate-400">Send a single personalised message</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Compose ── */}
        <div className="card p-5 space-y-5">

          {/* Phone number */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400" /> WhatsApp Number
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <span className="text-slate-400 text-sm font-mono">+</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-slate-400 text-slate-800"
                placeholder="91 98765 43210"
                value={phone.startsWith('+') ? phone.slice(1) : phone}
                onChange={e => setPhone('+' + e.target.value.replace(/\D/g, ''))}
              />
              {phone && (
                <button onClick={() => { setPhone(''); setPreview(null) }} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Country code required · e.g. +91 for India</p>
          </div>

          {/* Optional: Lead name + company for placeholder fill */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label flex items-center gap-1.5">
                <User size={12} className="text-slate-400" /> Lead name
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="Arjun Sharma"
                value={leadName}
                onChange={e => { setLeadName(e.target.value); setPreview(null) }}
              />
            </div>
            <div>
              <label className="field-label">Company <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              <input
                className="input"
                placeholder="Acme Pvt Ltd"
                value={leadCompany}
                onChange={e => { setLeadCompany(e.target.value); setPreview(null) }}
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Message</label>
              <button
                onClick={generateTemplate}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
              >
                {generating
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Sparkles size={11} />
                }
                AI generate
              </button>
            </div>
            <textarea
              className="textarea h-40 font-mono text-xs leading-relaxed"
              value={message}
              onChange={e => handleMessageChange(e.target.value)}
              placeholder={`Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out…\n\nWarm regards,\n{sender_name}`}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Placeholders: <code className="bg-slate-100 px-1 rounded">{'{lead_name}'}</code>{' '}
              <code className="bg-slate-100 px-1 rounded">{'{lead_company}'}</code>{' '}
              <code className="bg-slate-100 px-1 rounded">{'{sender_name}'}</code>{' '}
              <code className="bg-slate-100 px-1 rounded">{'{sender_company}'}</code>
            </p>
          </div>

          {/* AI personalisation toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-800">AI personalisation</p>
              <p className="text-xs text-slate-400">Groq rewrites the message for this contact</p>
            </div>
            <button
              onClick={() => setPersonalise(p => !p)}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={previewMessage}
              disabled={previewing || !message.trim()}
              className="btn-secondary flex-1"
            >
              {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Preview
            </button>
            <button
              onClick={sendMessage}
              disabled={sending || (!message.trim() && !preview)}
              className="btn-primary flex-1"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send
            </button>
          </div>
        </div>

        {/* ── RIGHT: Preview pane ── */}
        <div className="card p-5 flex flex-col">
          <p className="font-semibold text-slate-900 mb-4">Preview</p>

          {!preview ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 min-h-[260px]">
              <Eye size={26} className="mb-2 text-slate-200" />
              <p className="text-sm">Click Preview to see the final message</p>
              {personalise && (
                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <Sparkles size={11} /> AI will personalise before sending
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              {/* Recipient info */}
              {(preview.lead_name || preview.lead_company || phone) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <Phone size={11} className="text-slate-400" />
                  <span className="font-mono">{phone}</span>
                  {(preview.lead_name || preview.lead_company) && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{preview.lead_name}{preview.lead_name && preview.lead_company ? ' · ' : ''}{preview.lead_company}</span>
                    </>
                  )}
                </div>
              )}

              {/* WhatsApp-style bubble */}
              <div className="flex justify-end">
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-w-xs">
                  {preview.message}
                  <p className="text-[10px] text-slate-500 text-right mt-1.5">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-right">This is exactly what will be sent</p>

              <button
                onClick={sendMessage}
                disabled={sending}
                className="btn-primary w-full mt-auto"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send this message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}