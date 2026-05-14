import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Smartphone, Wifi, WifiOff, QrCode, LogOut, Send, Plus,
  RefreshCw, Loader2, MessageSquare, Search, X, Check,
  Image, Zap, ChevronLeft, Reply
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - (typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(typeof ts === 'number' ? ts * 1000 : ts).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

function parseWAText(msg) {
  const c = msg?.message
  if (!c) return ''
  return c.conversation || c.extendedTextMessage?.text || c.imageMessage?.caption || '[media]'
}

const statusBadge = { running:'badge-blue', completed:'badge-green', queued:'badge-gray', failed:'badge-red' }

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

        {status.qr_status === 'pending' && status.qr
          ? (
            <div className="space-y-3">
              <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <img src={status.qr} alt="WA QR" className="w-44 h-44" />
              </div>
              <p className="text-xs text-slate-400">QR refreshes every 60s</p>
              <button onClick={onRefresh} className="btn-secondary btn-sm"><RefreshCw size={13} /> Refresh</button>
            </div>
          )
          : (
            <div className="space-y-3">
              {status.qr_status === 'waiting' && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-3">
                  <Loader2 size={15} className="animate-spin text-blue-500" /> Generating QR…
                </div>
              )}
              <button onClick={onRefresh} className="btn-primary"><QrCode size={15} /> Get QR Code</button>
            </div>
          )
        }
      </div>
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
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

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

  const draftAI = async () => {
    setAiLoading(true)
    try {
      const history = messages.slice(-6).map(m => ({
        role: m.key?.fromMe ? 'assistant' : 'user',
        content: parseWAText(m) || ''
      }))
      const { data } = await waApi.aiReply({ history, from_name: name || phone })
      setText(data.reply); toast.success('AI draft ready')
    } catch { toast.error('AI failed') } finally { setAiLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
        <button onClick={onBack} className="btn-icon p-1.5"><ChevronLeft size={17} /></button>
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
          {(name || phone).slice(0,2).toUpperCase()}
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
            <MessageSquare size={24} className="mb-2 text-slate-200" />
            <p className="text-sm">No messages yet</p>
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
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message…" rows={1}
            className="textarea flex-1 text-sm py-2 resize-none min-h-[40px] max-h-28" />
          <button onClick={draftAI} disabled={aiLoading} className="btn-icon flex-shrink-0">
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
    catch { toast.error('Failed') } finally { setLoading(false) }
  }
  useEffect(() => { if (connected) { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv) } else { setLoading(false) } }, [connected])

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
    <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white" style={{height:'calc(100vh - 310px)'}}>
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
              <MessageSquare size={24} className="mb-2 text-slate-200" />
              <p className="text-sm">No conversations</p>
            </div>
          )}
          {filtered.map(c => {
            const phone = c.id?.replace('@s.whatsapp.net','')
            return (
              <button key={c.id} onClick={() => setSelected({ phone, name: c.name })}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                  ${selected?.phone===phone ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                    {(c.name||phone).slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name||phone}</p>
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

      {/* Chat */}
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

// ── WA Campaign Create ────────────────────────────────────────────────────────
function WACampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name:'', message_template:'', personalise:true, daily_limit:50, send_order:'as_selected' })
  const [selected, setSelected] = useState(new Map())
  const [submitting, setSubmitting] = useState(false)

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
        <div className="card p-5 space-y-4">
          <div>
            <label className="field-label">Campaign name</label>
            <input className="input" placeholder="e.g. May Parts Outreach"
              value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
          </div>
          <div>
            <label className="field-label">Message template</label>
            <textarea className="textarea h-36"
              placeholder={"Hi {lead_name},\n\nI noticed {lead_company} specialises in...\n\nWould love to connect!"}
              value={form.message_template} onChange={e => setForm(p => ({...p, message_template: e.target.value}))} />
            <p className="text-xs text-slate-400 mt-1">Use {'{'}lead_name{'}'} and {'{'}lead_company{'}'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Daily limit <span className="normal-case font-normal">(max 200)</span></label>
              <input type="number" min={1} max={200} className="input" value={form.daily_limit}
                onChange={e => setForm(p => ({...p, daily_limit: parseInt(e.target.value)||50}))} />
              <p className="text-[10px] text-slate-400 mt-1">1–2 min random intervals</p>
            </div>
            <div>
              <label className="field-label">Send order</label>
              <select className="input" value={form.send_order} onChange={e => setForm(p => ({...p, send_order: e.target.value}))}>
                <option value="as_selected">As selected</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-800">AI personalisation</p>
              <p className="text-xs text-slate-400">Groq rewrites each message</p>
            </div>
            <button onClick={() => setForm(p => ({...p, personalise: !p.personalise}))}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="card p-5">
          <label className="field-label mb-3 block">
            Select leads <span className="normal-case font-normal text-slate-400">(must have phone number)</span>
          </label>
          <LeadSelector selected={selected} onChange={setSelected} requirePhone={true} />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating…' : `Start for ${selected.size} leads`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

// ── WA Campaign list ───────────────────────────────────────────────────────────
function WACampaignList({ onCreate }) {
  const [camps, setCamps]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await waApi.campaignList(); setCamps(data) }
    catch { toast.error('Failed') } finally { setLoading(false) }
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
            <div key={c.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{c.name}</p>
                  <span className={statusBadge[c.status]||'badge-gray'}>{c.status?.toUpperCase()}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full w-36">
                  <div className="h-full bg-emerald-400 rounded-full" style={{width:`${pct}%`}} />
                </div>
              </div>
              <div className="flex gap-4 text-right flex-shrink-0">
                <div><p className="text-lg font-bold text-slate-900">{c.total_leads}</p><p className="text-xs text-slate-400">total</p></div>
                <div><p className="text-lg font-bold text-emerald-600">{c.sent}</p><p className="text-xs text-slate-400">sent</p></div>
              </div>
            </div>
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
  const [status, setStatus]       = useState({ connected: false })
  const [statusLoading, setStatusLoading] = useState(true)
  const [tab, setTab]             = useState('inbox')      // inbox | campaigns
  const [campView, setCampView]   = useState('list')       // list | create

  const loadStatus = async () => {
    setStatusLoading(true)
    try { const { data } = await waApi.status(); setStatus(data) }
    catch { setStatus({ connected: false }) } finally { setStatusLoading(false) }
  }
  useEffect(() => { loadStatus(); const iv = setInterval(loadStatus, 15000); return () => clearInterval(iv) }, [])

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
          { id:'inbox',     label:'Inbox' },
          { id:'campaigns', label:'Campaigns' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setCampView('list') }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${tab===t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && <InboxTab connected={status.connected} />}

      {tab === 'campaigns' && campView === 'list' && (
        <WACampaignList onCreate={() => setCampView('create')} />
      )}
      {tab === 'campaigns' && campView === 'create' && (
        <WACampaignCreate onBack={() => setCampView('list')} onDone={() => setCampView('list')} />
      )}
    </div>
  )
}