import { useState, useEffect, useRef } from 'react'
import {
  Mail, Send, RefreshCw, Loader2, Check, CheckCheck,
  ChevronRight, Inbox, Clock, Zap, Reply, X, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { repliesApi } from '../services/api'

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const statusColors = {
  unread:    'bg-blue-500',
  read:      'bg-slate-300',
  responded: 'bg-emerald-400',
}

// ── Thread view ────────────────────────────────────────────────────────────
function ThreadView({ replyId, onClose }) {
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    loadThread()
  }, [replyId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const loadThread = async () => {
    setLoading(true)
    try {
      const { data } = await repliesApi.thread(replyId)
      setThread(data)
    } catch {
      toast.error('Failed to load thread')
    } finally {
      setLoading(false)
    }
  }

  const suggestAI = async () => {
    setAiLoading(true)
    try {
      const { data } = await repliesApi.respond(replyId, { body: '', use_ai: true })
      // AI-generated response returned — put in box for editing
      const { data: fresh } = await repliesApi.thread(replyId)
      setReplyText(fresh.reply?.our_reply || '')
      toast.success('AI draft ready — edit and send')
      setThread(fresh)
    } catch {
      toast.error('AI suggestion failed')
    } finally {
      setAiLoading(false)
    }
  }

  const send = async () => {
    if (!replyText.trim()) { toast.error('Write a reply first'); return }
    setSending(true)
    try {
      await repliesApi.respond(replyId, { body: replyText, use_ai: false })
      toast.success('Reply sent!')
      setReplyText('')
      await loadThread()
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <p className="text-sm">Loading thread…</p>
      </div>
    )
  }

  if (!thread) return null
  const { reply, sent_item } = thread

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{reply.from_name || reply.from_email}</p>
          <p className="text-xs text-slate-400 truncate">{reply.from_email}</p>
        </div>
        <span className={`badge ${reply.status === 'responded' ? 'badge-green' : reply.status === 'unread' ? 'badge-blue' : 'badge-gray'}`}>
          {reply.status}
        </span>
        <button onClick={onClose} className="btn-icon p-1.5 ml-1">
          <X size={16} />
        </button>
      </div>

      {/* Subject */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-slate-800">{reply.subject}</p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Our original email — left side */}
        {sent_item && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              Your email · {timeAgo(sent_item.sent_at)}
            </p>
            <div className="bubble-sent self-end">
              <p className="font-semibold text-sm mb-1 opacity-80">{sent_item.subject}</p>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{sent_item.body}</p>
            </div>
          </div>
        )}

        {/* Their reply — right side */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
            {reply.from_name || 'Their reply'} · {timeAgo(reply.received_at)}
          </p>
          <div className="bubble-recv self-start">
            <p className="whitespace-pre-wrap leading-relaxed text-sm">{reply.body_text}</p>
          </div>
        </div>

        {/* Our response (if already sent) */}
        {reply.our_reply && reply.status === 'responded' && (
          <div className="flex flex-col gap-1 items-end">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              You replied · {timeAgo(reply.replied_at)}
            </p>
            <div className="bubble-sent">
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{reply.our_reply}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {reply.status !== 'responded' && (
        <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-white">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your reply…"
            className="textarea h-24 text-sm mb-3"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={send}
              disabled={sending || !replyText.trim()}
              className="btn-primary"
            >
              {sending
                ? <Loader2 size={15} className="animate-spin" />
                : <Send size={15} />}
              {sending ? 'Sending…' : 'Send reply'}
            </button>
            <button
              onClick={suggestAI}
              disabled={aiLoading}
              className="btn-secondary"
            >
              {aiLoading
                ? <Loader2 size={15} className="animate-spin" />
                : <Zap size={15} className="text-blue-500" />}
              AI draft
            </button>
          </div>
        </div>
      )}

      {reply.status === 'responded' && (
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-emerald-50">
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCheck size={16} /> Replied {timeAgo(reply.replied_at)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Inbox list ─────────────────────────────────────────────────────────────
function InboxList({ onSelect, selectedId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [filter, setFilter] = useState('all')   // all | unread | responded
  const [search, setSearch] = useState('')

  const load = async (f) => {
    setLoading(true)
    try {
      const { data } = await repliesApi.inbox(f === 'all' ? null : f)
      setItems(data)
    } catch {
      toast.error('Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  const pollNow = async () => {
    setPolling(true)
    try {
      await repliesApi.poll()
      toast.success('Inbox synced — checking for new replies')
      setTimeout(() => load(filter), 2000)
    } catch {
      toast.error('Poll failed')
    } finally {
      setPolling(false)
    }
  }

  const filtered = items.filter(item =>
    !search ||
    item.from_email.toLowerCase().includes(search.toLowerCase()) ||
    item.from_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.subject?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search inbox…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
            />
          </div>
          <button onClick={pollNow} disabled={polling} className="btn-icon" title="Sync inbox">
            <RefreshCw size={15} className={polling ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-slate-100 -mx-4 px-4">
          {[
            { id: 'all',       label: 'All' },
            { id: 'unread',    label: 'Unread' },
            { id: 'responded', label: 'Responded' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`pb-2 pt-1 px-3 text-xs font-medium transition-all border-b-2 ${
                filter === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-6 text-center">
            <Inbox size={32} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-600">No replies yet</p>
            <p className="text-xs mt-1">
              {filter === 'all'
                ? 'Click ↻ to sync your inbox'
                : `No ${filter} messages`}
            </p>
          </div>
        )}

        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-all hover:bg-slate-50
              ${selectedId === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColors[item.status] || 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-sm truncate ${item.status === 'unread' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {item.from_name || item.from_email}
                  </p>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.received_at)}</p>
                </div>
                <p className="text-xs text-slate-500 truncate mb-0.5">{item.subject}</p>
                <p className="text-xs text-slate-400 truncate">{item.preview}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sent list ──────────────────────────────────────────────────────────────
function SentList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    repliesApi.sent()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Failed to load sent'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(item =>
    !search ||
    item.to_email?.toLowerCase().includes(search.toLowerCase()) ||
    item.to_company?.toLowerCase().includes(search.toLowerCase()) ||
    item.subject?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full gap-0">
      {/* Left: sent list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sent…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Send size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No sent emails yet</p>
            </div>
          )}
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-all hover:bg-slate-50
                ${selected?.id === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                  {(item.to_company || item.to_name || item.to_email || '?').slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.to_company || item.to_name || item.to_email}
                    </p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.sent_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex-1 overflow-y-auto">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Mail size={36} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-600">Select an email to preview</p>
          </div>
        )}
        {selected && (
          <div className="p-6 fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-base font-semibold text-slate-900">{selected.subject}</p>
                <p className="text-xs text-slate-400 mt-1">
                  To: <span className="text-blue-600">{selected.to_email}</span>
                  {selected.to_company ? ` · ${selected.to_company}` : ''}
                  {' · '}{timeAgo(selected.sent_at)}
                </p>
              </div>
              <span className="badge-green">Sent</span>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────
export default function RepliesPage() {
  const [tab, setTab] = useState('inbox')   // inbox | sent
  const [selectedReplyId, setSelectedReplyId] = useState(null)

  return (
    <div className="-m-7 h-[calc(100vh-0px)] flex flex-col">
      {/* Top tabs */}
      <div className="flex items-center gap-0 px-6 border-b border-slate-200 bg-white flex-shrink-0">
        <h1 className="text-base font-bold text-slate-900 mr-6 py-4">Replies</h1>
        <div className="flex gap-1">
          {[
            { id: 'inbox', icon: Inbox, label: 'Inbox' },
            { id: 'sent',  icon: Send,  label: 'Sent'  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedReplyId(null) }}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all
                ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {tab === 'inbox' && (
          <>
            {/* Inbox list */}
            <div className="w-80 flex-shrink-0 border-r border-slate-100 overflow-hidden flex flex-col bg-white">
              <InboxList
                onSelect={setSelectedReplyId}
                selectedId={selectedReplyId}
              />
            </div>

            {/* Thread */}
            <div className="flex-1 bg-white overflow-hidden flex flex-col">
              {selectedReplyId
                ? <ThreadView replyId={selectedReplyId} onClose={() => setSelectedReplyId(null)} />
                : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Mail size={40} className="mb-4 text-slate-200" />
                    <p className="text-sm font-medium text-slate-600">Select a reply to read</p>
                    <p className="text-xs mt-1">Click any message on the left</p>
                  </div>
                )
              }
            </div>
          </>
        )}

        {tab === 'sent' && (
          <div className="flex-1 bg-white overflow-hidden">
            <SentList />
          </div>
        )}
      </div>
    </div>
  )
}