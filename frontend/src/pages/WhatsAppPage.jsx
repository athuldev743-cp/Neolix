import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Smartphone, Wifi, WifiOff, QrCode, LogOut, Send, Plus,
  RefreshCw, Loader2, MessageSquare, Search, X, Check,
  Image, Zap, ChevronLeft, ChevronRight, Reply, Eye, AlertTriangle,
  CheckCircle2, Clock, Users, ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - (typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(typeof ts === 'number' ? ts * 1000 : ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function parseWAText(msg) {
  const c = msg?.message
  if (!c) return ''
  return c.conversation || c.extendedTextMessage?.text || c.imageMessage?.caption || '[media]'
}

const STATUS_BADGE = {
  running:   'badge-blue',
  completed: 'badge-green',
  queued:    'badge-gray',
  failed:    'badge-red',
}

const STATUS_ICON = {
  sent:    <CheckCircle2 size={13} className="text-emerald-500" />,
  failed:  <AlertTriangle size={13} className="text-red-400" />,
  pending: <Clock size={13} className="text-slate-400" />,
}

// ── Connection card ───────────────────────────────────────────────────────────
function ConnectionCard({ status, onRefresh }) {
  const [logging, setLogging] = useState(false)

  const logout = async () => {
    setLogging(true)
    try { await waApi.logout(); toast.success('WhatsApp disconnected'); onRefresh() }
    catch { toast.error('Logout failed') } finally { setLogging(false) }
  }

  if (status.connected) {
    return (
      <div className="card p-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Wifi size={17} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">WhatsApp Connected</p>
            <p className="text-xs text-slate-400">Session persisted — auto-reconnects</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-green flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
          <button onClick={logout} disabled={logging} className="btn-danger btn-sm">
            {logging ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 mb-5">
      <div className="text-center max-w-xs mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3">
          <QrCode size={24} className="text-slate-400" />
        </div>
        <p className="font-semibold text-slate-900 mb-1">Connect WhatsApp</p>
        <p className="text-sm text-slate-400 mb-4">Scan QR with WhatsApp → Settings → Linked Devices</p>
        {status.qr_status === 'pending' && status.qr ? (
          <div className="space-y-3">
            <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
              <img src={status.qr} alt="WA QR" className="w-44 h-44" />
            </div>
            <p className="text-xs text-slate-400">QR refreshes every 60s</p>
            <button onClick={onRefresh} className="btn-secondary btn-sm"><RefreshCw size={13} /> Refresh</button>
          </div>
        ) : (
          <div className="space-y-3">
            {status.qr_status === 'waiting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-3">
                <Loader2 size={15} className="animate-spin text-blue-500" /> Generating QR…
              </div>
            )}
            <button onClick={onRefresh} className="btn-primary"><QrCode size={15} /> Get QR Code</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Single Send tab ───────────────────────────────────────────────────────────
function SingleSendTab({ connected }) {
  const [phone, setPhone]         = useState('')
  const [message, setMessage]     = useState('')
  const [personalise, setPersonalise] = useState(false)
  const [leadId, setLeadId]       = useState(null)
  const [leadLabel, setLeadLabel] = useState('')
  const [sending, setSending]     = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview]     = useState(null)     // { message, lead_name, lead_company }
  const [generating, setGenerating] = useState(false)

  // Pick a lead → auto-fill phone
  const handleLeadPick = (id, lead) => {
    setLeadId(id)
    setLeadLabel(`${lead.contact_name || ''} — ${lead.company_name || ''}`.trim())
    if (lead.phone) setPhone(lead.phone)
  }

  const generateTemplate = async () => {
    setGenerating(true)
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_id: leadId || 0,
        personalise: false,
        generate_template: true,
        context_hint: '',
      })
      setMessage(data.message)
      setPreview(null)
      toast.success('Template generated')
    } catch { toast.error('Generation failed') } finally { setGenerating(false) }
  }

  const previewMessage = async () => {
    if (!message.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(true)
    setPreview(null)
    try {
      const { data } = await waApi.preview({
        message,
        lead_id: leadId || 0,
        personalise,
      })
      setPreview(data)
    } catch { toast.error('Preview failed') } finally { setPreviewing(false) }
  }

  const sendMessage = async () => {
    if (!phone.trim()) { toast.error('Enter a phone number'); return }
    const finalMsg = preview?.message || message
    if (!finalMsg.trim()) { toast.error('Enter a message'); return }
    if (personalise && !leadId) { toast.error('Select a lead to personalise'); return }
    setSending(true)
    try {
      await waApi.send({
        phone,
        message: finalMsg,
        personalise: false,   // already personalised via preview; send as-is
      })
      toast.success('Message sent!')
      setMessage(''); setPhone(''); setPreview(null)
      setLeadId(null); setLeadLabel('')
    } catch (e) { toast.error(e.response?.data?.detail || 'Send failed') } finally { setSending(false) }
  }

  if (!connected) return (
    <div className="card p-10 text-center">
      <WifiOff size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-700">WhatsApp not connected</p>
      <p className="text-sm text-slate-400 mt-1">Connect above to send messages</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — compose */}
      <div className="card p-5 space-y-4">
        <p className="font-semibold text-slate-900">Send a Message</p>

        {/* Lead picker (optional) */}
        <div>
          <label className="field-label">Lead <span className="normal-case font-normal text-slate-400">(optional — needed for AI personalisation)</span></label>
          {leadLabel ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <span className="flex-1 truncate">{leadLabel}</span>
              <button onClick={() => { setLeadId(null); setLeadLabel(''); setPreview(null) }} className="text-blue-400 hover:text-blue-600"><X size={13} /></button>
            </div>
          ) : (
            <LeadSinglePicker onPick={handleLeadPick} requirePhone />
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="field-label">Phone number</label>
          <input className="input" placeholder="+91 98765 43210" value={phone}
            onChange={e => setPhone(e.target.value)} />
          <p className="text-[10px] text-slate-400 mt-1">10-digit Indian or full international format</p>
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="field-label mb-0">Message</label>
            <button onClick={generateTemplate} disabled={generating}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
              {generating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
              AI generate
            </button>
          </div>
          <textarea className="textarea h-36" value={message}
            onChange={e => { setMessage(e.target.value); setPreview(null) }}
            placeholder={"Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out…\n\n— {sender_name}, {sender_company}"} />
          <p className="text-[10px] text-slate-400 mt-1">
            Supports: {'{lead_name}'} {'{lead_company}'} {'{sender_name}'} {'{sender_company}'}
          </p>
        </div>

        {/* AI personalise toggle */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">AI personalisation</p>
            <p className="text-xs text-slate-400">Groq rewrites the message for this lead</p>
          </div>
          <button onClick={() => setPersonalise(p => !p)}
            className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${personalise ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={previewMessage} disabled={previewing || !message.trim()}
            className="btn-secondary flex-1">
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Preview
          </button>
          <button onClick={sendMessage} disabled={sending || (!message.trim() && !preview)}
            className="btn-primary flex-1">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>

      {/* Right — preview pane */}
      <div className="card p-5">
        <p className="font-semibold text-slate-900 mb-3">Preview</p>
        {!preview ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <Eye size={24} className="mb-2 text-slate-200" />
            <p className="text-sm">Click Preview to see the final message</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(preview.lead_name || preview.lead_company) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Users size={12} className="text-slate-400" />
                <span>{preview.lead_name}{preview.lead_name && preview.lead_company ? ' · ' : ''}{preview.lead_company}</span>
              </div>
            )}
            {/* WhatsApp bubble */}
            <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-w-sm ml-auto">
              {preview.message}
            </div>
            <p className="text-xs text-slate-400 text-right">This is what will be sent</p>
            <button onClick={sendMessage} disabled={sending} className="btn-primary w-full mt-2">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send this message
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Minimal inline lead picker for single send
function LeadSinglePicker({ onPick, requirePhone }) {
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]     = useState(false)
  const ref = useRef()

  const search = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      // Re-use the same leads search your LeadSelector uses
      const { data } = await import('../services/api').then(m => m.leadsApi.search(q))
      const filtered = requirePhone ? (data.leads || data).filter(l => l.phone) : (data.leads || data)
      setResults(filtered.slice(0, 8))
      setOpen(true)
    } catch { setResults([]) } finally { setLoading(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <Search size={13} className="text-slate-400" />
        <input value={query} onChange={e => search(e.target.value)}
          placeholder="Search lead by name or company…"
          className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
        {loading && <Loader2 size={13} className="animate-spin text-blue-400" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.map(l => (
            <button key={l.id} onClick={() => { onPick(l.id, l); setQuery(''); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm">
              <p className="font-medium text-slate-800">{l.contact_name || '—'}</p>
              <p className="text-xs text-slate-400">{l.company_name} · {l.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────
function ChatView({ phone, name, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const bottomRef = useRef()
  const fileRef   = useRef()

  const load = async () => {
    try { const { data } = await waApi.messages(phone); setMessages(data.messages || []) }
    catch { toast.error('Failed to load messages') } finally { setLoading(false) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv) }, [phone])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim() && !imageFile) return
    setSending(true)
    try {
      if (imageFile) {
        const reader = new FileReader()
        reader.onload = async () => {
          await waApi.sendImage({ phone, image_base64: reader.result.split(',')[1], caption: text })
          toast.success('Image sent!'); setText(''); setImageFile(null); await load()
        }
        reader.readAsDataURL(imageFile)
      } else {
        await waApi.respond({ phone, message: text }); setText(''); await load()
      }
    } catch { toast.error('Send failed') } finally { setSending(false) }
  }

  // AI draft — passes last 6 messages + profile context is handled server-side
  const draftAI = async () => {
    setAiLoading(true)
    try {
      const history = messages.slice(-6).map(m => ({
        role: m.key?.fromMe ? 'assistant' : 'user',
        content: parseWAText(m) || '',
      }))
      const { data } = await waApi.aiReply({ history, from_name: name || phone })
      setText(data.reply)
      toast.success('AI draft ready')
    } catch { toast.error('AI failed') } finally { setAiLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
        <button onClick={onBack} className="btn-icon p-1.5"><ChevronLeft size={17} /></button>
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
          {(name || phone).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 text-sm">{name || phone}</p>
          <p className="text-xs text-slate-400">+{phone}</p>
        </div>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-slate-50">
        {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <MessageSquare size={24} className="mb-2 text-slate-200" /><p className="text-sm">No messages yet</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const fromMe = msg.key?.fromMe
          const txt = parseWAText(msg)
          return (
            <div key={i} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
              <div className={fromMe ? 'bubble-sent' : 'bubble-recv'}>
                {txt && <p className="whitespace-pre-wrap text-sm leading-relaxed">{txt}</p>}
                <p className={`text-[10px] mt-1 ${fromMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                  {timeAgo(msg.messageTimestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-white">
        {imageFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Image size={13} /><span className="flex-1 truncate text-xs">{imageFile.name}</span>
            <button onClick={() => setImageFile(null)} className="text-blue-500"><X size={13} /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current.click()} className="btn-icon flex-shrink-0"><Image size={16} /></button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files[0] && setImageFile(e.target.files[0])} />
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message…" rows={1}
            className="textarea flex-1 text-sm py-2 resize-none min-h-[40px] max-h-28" />
          <button onClick={draftAI} disabled={aiLoading} className="btn-icon flex-shrink-0"
            title="AI draft reply (uses your profile)">
            {aiLoading ? <Loader2 size={15} className="animate-spin text-blue-500" /> : <Zap size={16} className="text-blue-500" />}
          </button>
          <button onClick={send} disabled={sending || (!text.trim() && !imageFile)} className="btn-primary px-4 flex-shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────
function InboxTab({ connected }) {
  const [convos, setConvos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const { data } = await waApi.conversations(); setConvos(data.conversations || []) }
    catch { toast.error('Failed to load conversations') } finally { setLoading(false) }
  }
  useEffect(() => {
    if (connected) { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv) }
    else setLoading(false)
  }, [connected])

  if (!connected) return (
    <div className="card p-10 text-center">
      <WifiOff size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-700">WhatsApp not connected</p>
      <p className="text-sm text-slate-400 mt-1">Connect above to view your inbox</p>
    </div>
  )

  const filtered = convos.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.id?.includes(search)
  )

  return (
    <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 310px)' }}>
      {/* List */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <MessageSquare size={24} className="mb-2 text-slate-200" /><p className="text-sm">No conversations</p>
            </div>
          )}
          {filtered.map(c => {
            const phone = c.id?.replace('@s.whatsapp.net', '')
            return (
              <button key={c.id} onClick={() => setSelected({ phone, name: c.name })}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                  ${selected?.phone === phone ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                    {(c.name || phone).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name || phone}</p>
                      <p className="text-[10px] text-slate-400">{timeAgo(c.timestamp)}</p>
                    </div>
                    <p className="text-xs text-slate-400">+{phone}</p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 overflow-hidden">
        {selected
          ? <ChatView phone={selected.phone} name={selected.name} onBack={() => setSelected(null)} />
          : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a conversation</p>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Campaign Create ───────────────────────────────────────────────────────────
function WACampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({
    campaign_name: '', message_template: '',
    personalise: true, daily_limit: 50, send_order: 'as_selected',
  })
  const [selected, setSelected]   = useState(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview]     = useState(null)
  const [generating, setGenerating] = useState(false)

  const generateTemplate = async () => {
    setGenerating(true)
    try {
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false,
        generate_template: true, context_hint: '',
      })
      setForm(p => ({ ...p, message_template: data.message }))
      setPreview(null)
      toast.success('Template generated from your profile')
    } catch { toast.error('Generation failed') } finally { setGenerating(false) }
  }

  const previewForLead = async () => {
    if (!form.message_template.trim()) { toast.error('Write a message first'); return }
    const firstId = selected.size > 0 ? Array.from(selected.keys())[0] : 0
    setPreviewing(true)
    setPreview(null)
    try {
      const { data } = await waApi.preview({
        message: form.message_template,
        lead_id: firstId,
        personalise: form.personalise,
      })
      setPreview(data)
      toast.success('Preview ready')
    } catch { toast.error('Preview failed') } finally { setPreviewing(false) }
  }

  const submit = async () => {
    if (!form.campaign_name || !form.message_template) { toast.error('Fill in name and message'); return }
    if (selected.size === 0) { toast.error('Select at least one lead with a phone'); return }
    setSubmitting(true)
    try {
      await waApi.campaignCreate({ ...form, lead_ids: Array.from(selected.keys()) })
      toast.success(`WA campaign started for ${selected.size} leads!`)
      setTimeout(onDone, 800)
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSubmitting(false) }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New WhatsApp Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — config */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="field-label">Campaign name</label>
            <input className="input" placeholder="e.g. May Parts Outreach"
              value={form.campaign_name} onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="field-label mb-0">Message template</label>
              <button onClick={generateTemplate} disabled={generating}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                {generating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                AI generate
              </button>
            </div>
            <textarea className="textarea h-40"
              placeholder={"Hi {lead_name},\n\nI noticed {lead_company} specialises in…\n\nWould love to connect!\n— {sender_name}, {sender_company}"}
              value={form.message_template}
              onChange={e => { setForm(p => ({ ...p, message_template: e.target.value })); setPreview(null) }} />
            <p className="text-[10px] text-slate-400 mt-1">
              Supports: {'{lead_name}'} {'{lead_company}'} {'{sender_name}'} {'{sender_company}'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Daily limit <span className="normal-case font-normal">(max 50)</span></label>
              <input type="number" min={1} max={50} className="input" value={form.daily_limit}
                onChange={e => setForm(p => ({ ...p, daily_limit: parseInt(e.target.value) || 50 }))} />
              <p className="text-[10px] text-slate-400 mt-1">1–3 min random intervals</p>
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

          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-800">AI personalisation</p>
              <p className="text-xs text-slate-400">Groq rewrites each message using your profile</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, personalise: !p.personalise }))}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Preview button */}
          <button onClick={previewForLead} disabled={previewing || !form.message_template.trim()}
            className="btn-secondary w-full">
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Preview for first selected lead
          </button>
        </div>

        {/* Right — lead selector + preview */}
        <div className="space-y-4">
          <div className="card p-5">
            <label className="field-label mb-3 block">
              Select leads <span className="normal-case font-normal text-slate-400">(must have phone number)</span>
            </label>
            <LeadSelector selected={selected} onChange={setSelected} requirePhone={true} />
          </div>

          {/* Preview pane */}
          {preview && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
                {(preview.lead_name || preview.lead_company) && (
                  <span className="text-xs text-slate-400">{preview.lead_name} · {preview.lead_company}</span>
                )}
              </div>
              <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                {preview.message}
              </div>
              <p className="text-[10px] text-slate-400">Each lead will receive a version personalised like this</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating…' : `Start campaign for ${selected.size} lead${selected.size !== 1 ? 's' : ''}`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

// ── Campaign Detail ───────────────────────────────────────────────────────────
function WACampaignDetail({ campaignId, onBack }) {
  const [camp, setCamp]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await waApi.campaignDetail(campaignId); setCamp(data) }
    catch { toast.error('Failed to load campaign') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [campaignId])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
  if (!camp) return <div className="card p-8 text-center text-slate-400">Campaign not found</div>

  const pct = camp.total_leads > 0 ? Math.round((camp.sent / camp.total_leads) * 100) : 0

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> All Campaigns</button>

      {/* Header */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{camp.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{camp.created_at ? new Date(camp.created_at).toLocaleString('en-IN') : ''}</p>
          </div>
          <span className={`${STATUS_BADGE[camp.status] || 'badge-gray'} flex-shrink-0`}>{camp.status?.toUpperCase()}</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',   value: camp.total_leads, color: 'text-slate-900' },
            { label: 'Sent',    value: camp.sent,        color: 'text-emerald-600' },
            { label: 'Failed',  value: camp.failed,      color: camp.failed > 0 ? 'text-red-500' : 'text-slate-400' },
            { label: 'Daily cap', value: camp.daily_limit, color: 'text-slate-700' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right">{pct}% sent</p>
      </div>

      {/* Fail reasons */}
      {camp.fail_reasons && Object.keys(camp.fail_reasons).length > 0 && (
        <div className="card p-5 mb-5">
          <p className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" /> Failure reasons
          </p>
          <div className="space-y-2">
            {Object.entries(camp.fail_reasons).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
                <span className="text-red-700 truncate flex-1">{reason}</span>
                <span className="font-bold text-red-600 flex-shrink-0">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads preview table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-800">Leads</p>
          <button onClick={load} className="btn-icon"><RefreshCw size={13} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Phone</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Company</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Sent at</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Error</th>
              </tr>
            </thead>
            <tbody>
              {(camp.leads_preview || []).map((l, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">+{l.phone}</td>
                  <td className="px-5 py-3 text-slate-700">{l.name || '—'}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{l.company || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`flex items-center gap-1.5 ${l.status === 'sent' ? 'text-emerald-600' : l.status === 'failed' ? 'text-red-500' : 'text-slate-400'}`}>
                      {STATUS_ICON[l.status]} {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-red-400 max-w-[200px] truncate">{l.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!camp.leads_preview || camp.leads_preview.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users size={24} className="mb-2 text-slate-200" /><p className="text-sm">No lead data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Campaign List ─────────────────────────────────────────────────────────────
function WACampaignList({ onCreate, onDetail }) {
  const [camps, setCamps]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await waApi.campaignList(); setCamps(data) }
    catch { toast.error('Failed to load campaigns') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-slate-800">Campaigns</p>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
          <button onClick={onCreate} className="btn-primary btn-sm"><Plus size={13} /> New</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}

      {!loading && camps.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
          <Send size={28} className="mb-2 text-slate-200" />
          <p className="text-sm">No WA campaigns yet</p>
          <button onClick={onCreate} className="btn-primary btn-sm mt-3"><Plus size={13} /> Create one</button>
        </div>
      )}

      <div className="space-y-3">
        {camps.map(c => {
          const pct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0
          return (
            <button key={c.id} onClick={() => onDetail(c.id)}
              className="card p-4 flex items-center gap-4 w-full text-left hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{c.name}</p>
                  <span className={STATUS_BADGE[c.status] || 'badge-gray'}>{c.status?.toUpperCase()}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full w-36">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{pct}% · {c.daily_limit}/day</p>
              </div>
              <div className="flex gap-4 text-right flex-shrink-0">
                <div><p className="text-lg font-bold text-slate-900">{c.total_leads}</p><p className="text-xs text-slate-400">total</p></div>
                <div><p className="text-lg font-bold text-emerald-600">{c.sent}</p><p className="text-xs text-slate-400">sent</p></div>
                {c.failed > 0 && <div><p className="text-lg font-bold text-red-500">{c.failed}</p><p className="text-xs text-slate-400">failed</p></div>}
              </div>
              <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ROOT — WhatsAppPage
// ═══════════════════════════════════════════════════════════
export default function WhatsAppPage() {
  const [status, setStatus]             = useState({ connected: false })
  const [statusLoading, setStatusLoading] = useState(true)
  const [tab, setTab]                   = useState('inbox')   // inbox | send | campaigns
  const [campView, setCampView]         = useState('list')    // list | create | detail
  const [detailId, setDetailId]         = useState(null)

  const loadStatus = async () => {
    setStatusLoading(true)
    try { const { data } = await waApi.status(); setStatus(data) }
    catch { setStatus({ connected: false }) } finally { setStatusLoading(false) }
  }
  useEffect(() => { loadStatus(); const iv = setInterval(loadStatus, 15000); return () => clearInterval(iv) }, [])

  const openDetail = (id) => { setDetailId(id); setCampView('detail') }

  return (
    <div>
      {/* Connection card */}
      {statusLoading
        ? <div className="card p-4 mb-5 flex items-center gap-3 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin text-blue-500" /> Checking WhatsApp…
          </div>
        : <ConnectionCard status={status} onRefresh={loadStatus} />
      }

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-slate-200 mb-5">
        <h1 className="text-lg font-bold text-slate-900 pr-6 py-3">WhatsApp</h1>
        {[
          { id: 'inbox',     label: 'Inbox' },
          { id: 'send',      label: 'Send' },
          { id: 'campaigns', label: 'Campaigns' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setCampView('list') }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && <InboxTab connected={status.connected} />}

      {tab === 'send' && <SingleSendTab connected={status.connected} />}

      {tab === 'campaigns' && campView === 'list' && (
        <WACampaignList onCreate={() => setCampView('create')} onDetail={openDetail} />
      )}
      {tab === 'campaigns' && campView === 'create' && (
        <WACampaignCreate onBack={() => setCampView('list')} onDone={() => setCampView('list')} />
      )}
      {tab === 'campaigns' && campView === 'detail' && (
        <WACampaignDetail campaignId={detailId} onBack={() => setCampView('list')} />
      )}
    </div>
  )
}