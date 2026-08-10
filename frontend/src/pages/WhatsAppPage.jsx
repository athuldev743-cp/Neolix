import { useState, useEffect, useRef } from 'react'
import {
  Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply, MessageSquare, Sparkles, Image, FileText, Edit3, Save, ArrowRight, Mic, HelpCircle, Send, Copy
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, repliesApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'
import { useUnreadReplies } from '../hooks/useUnreadReplies'
import { profileApi } from '../services/api'
// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = { 
  generating: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse',
  running: 'badge-blue', 
  completed: 'badge-green', 
  queued: 'badge-gray', 
  failed: 'badge-red', 
  paused: 'badge-orange' 
}

function interpolateCampaignInfo(template, campaignInfo) {
  return (template || '').replace(/\{campaign_info\}/g, campaignInfo || '')
}


function timeAgo(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function TypeIcon({ id, size = 13 }) {
  if (id === 'hook') return <Zap size={size} />
  if (id === 'detailed') return <FileText size={size} />
  return <Image size={size} />
}

const MSG_TYPES = [
  { id: 'hook', label: 'Hook', sub: 'Short punchy opener', placeholder: `Hi {lead_name}\n\nWe help {lead_company} get better results faster.\n\nRemember our chat at {campaign_info}?\n\nWorth a chat?`, hint: 'hook short punchy opener under 3 lines referencing the campaign context', rows: 4 },
  { id: 'detailed', label: 'Detailed', sub: '80-120 word outreach', placeholder: `Hi {lead_name},\n\nIt was great meeting you at {campaign_info}. I wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`, hint: 'detailed professional cold outreach 80-120 words referencing the campaign context', rows: 9 },
  { id: 'image', label: 'Image', sub: 'Image + caption', placeholder: `Hi {lead_name} - sharing our catalogue for {lead_company} following up from {campaign_info}.\nHappy to discuss! - {sender_name}`, hint: 'short 1-2 line caption for image attachment', rows: 3 },
]
// ═══════════════════════════════════════════════════════════
// BAILEYS LINK AUTH MONITOR
// ═══════════════════════════════════════════════════════════
function BaileysConnectionStatus() {
  const [status, setStatus] = useState({ connected: false, qr: null, loading: true })
  const lastQrRef = useRef(null)

  const checkStatus = async () => {
    try {
      const { data } = await waApi.status()
      if (data?.connected) {
        setStatus({ connected: true, qr: null, loading: false })
        return
      }
      if (data?.qr && data.qr !== lastQrRef.current) {
        lastQrRef.current = data.qr
        setStatus({ connected: false, qr: data.qr, loading: false })
      } else if (!data?.qr) {
        setStatus(p => ({ ...p, loading: false }))
      }
    } catch {
      setStatus(p => ({ ...p, loading: false }))
    }
  }

  useEffect(() => {
    checkStatus()
    const iv = setInterval(checkStatus, 2500)
    return () => clearInterval(iv)
  }, [])

  if (status.loading) return <div className="p-4 bg-slate-50 rounded-2xl border text-xs text-slate-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin text-slate-800" /> Fetching pipeline anchor authorization state...</div>

  if (status.connected) return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      <div className="text-xs font-bold">Baileys API Service Connected Natively</div>
    </div>
  )

  return (
    <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5">
      <div className="space-y-1 text-center md:text-left">
        <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider">WhatsApp Session Authentication Required</h4>
        <p className="text-xs text-amber-700 max-w-md">Tokens refresh every 20 seconds. Open WhatsApp ──► Linked Devices ──► Scan immediately upon rotation changes.</p>
      </div>
      <div className="bg-white p-3 rounded-2xl border flex items-center justify-center flex-shrink-0 w-36 h-36">
        {status.qr ? (
          <img src={`data:image/png;base64,${status.qr.replace(/^data:image\/[a-z]+;base64,/, '')}`} alt="QR Stream" className="w-full h-full object-contain" />
        ) : (
          <div className="text-center space-y-1 text-slate-400 text-[10px]"><Loader2 size={14} className="animate-spin mx-auto text-amber-600" /> Generating lease...</div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN LIST WORKSPACE VIEW
// ═══════════════════════════════════════════════════════════
function CampaignList({ onCreate, onDetail }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await waApi.campaignList()
      setCamps(data || [])
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <BaileysConnectionStatus />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">WhatsApp Engine Outreach</h2>
          <p className="text-sm text-slate-400 mt-0.5">Automated background copy synthesis via product showcase parameters</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={16} /></button>
          <button onClick={onCreate} className="btn-primary"><Plus size={16} /> New Campaign</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>}

      {!loading && camps.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare size={32} className="mb-2 text-slate-200" />
          <p className="text-sm">No active orchestration campaigns found.</p>
        </div>
      )}

      <div className="space-y-3">
        {camps.map(c => {
          const pct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0
          return (
            <div key={c.id} onClick={() => onDetail(c.id)} className="card-hover p-5 flex items-center gap-4 cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <span className={statusBadge[c.status] || 'badge-gray'}>{c.status?.toUpperCase()}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full w-40">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex gap-4 text-right text-xs">
                <div><p className="font-bold text-slate-900">{c.total_leads}</p><p className="text-slate-400">leads</p></div>
                <div><p className="font-bold text-emerald-600">{c.sent}</p><p className="text-slate-400">sent</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN DETAIL LOG VIEW WITH PREVIEW INTERFACES
// ═══════════════════════════════════════════════════════════
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeItem, setActiveItem] = useState(null)
  const [editedMessage, setEditedMessage] = useState('')
  const [committingDraft, setCommittingDraft] = useState(false)
  const [triggeringDispatch, setTriggeringDispatch] = useState(false)

  const load = async () => {
    try {
      const { data: d } = await waApi.campaignDetail(id)
      setData(d)
    } catch {
      toast.error('Detail pull error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [id])

  const openInlineEditor = (item) => {
    setActiveItem(item)
    setEditedMessage(item.message || '')
  }

  const handleCommitDraftApproval = async () => {
    if (!activeItem) return
    setCommittingDraft(true)
    try {
      await api.post('/whatsapp/draft/approve', {
        queue_item_id: activeItem.id,
        updated_message: editedMessage
      })
      toast.success('WhatsApp copy variant approved for dispatch!')
      setActiveItem(null)
      load()
    } catch {
      toast.error('Failed to register draft confirmation.')
    } finally {
      setCommittingDraft(false)
    }
  }

  const handleForceStartDispatch = async () => {
    setTriggeringDispatch(true)
    try {
      await api.post(`/whatsapp/campaign/${id}/start`)
      toast.success('Outbound messaging engine initialized!')
      load()
    } catch {
      toast.error('Failed to trigger background worker channels.')
    } finally {
      setTriggeringDispatch(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
  if (!data) return null

  const sc = { 
    sent: 'text-emerald-600 font-bold', 
    failed: 'text-red-500 font-bold', 
    pending: 'text-slate-500 font-bold', 
    draft: 'text-amber-500 font-bold animate-pulse' 
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back</button>
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">{data.name}</h2>
        <div className="flex items-center gap-2">
          <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
          {data.status === 'queued' && (
            <button 
              onClick={handleForceStartDispatch}
              disabled={triggeringDispatch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              {triggeringDispatch ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Start Delivery Engine
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><strong>{data.total_leads}</strong><p className="text-xs text-slate-400">Target Count</p></div>
        <div className="card p-4 text-emerald-600"><strong>{data.sent}</strong><p className="text-xs text-slate-400">Dispatched</p></div>
        <div className="card p-4 text-red-500"><strong>{data.failed}</strong><p className="text-xs text-slate-400">Faulty Runs</p></div>
      </div>

      {/* Dynamic Inline Layout Split Preview Workspace Editor */}
      {activeItem && (
        <div className="card border border-slate-800 bg-slate-950 p-5 space-y-4 rounded-2xl fade-up">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Edit3 size={14} className="text-emerald-500" /> Refine WhatsApp Background Copy Draft
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Modifying targeted layout string for: <span className="font-bold text-slate-300">+{activeItem.phone}</span></p>
            </div>
            <button onClick={() => setActiveItem(null)} className="text-slate-500 hover:text-slate-400"><X size={16} /></button>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Copy Body</label>
            <textarea className="textarea mt-1 w-full bg-slate-900 border-slate-800 text-slate-200 text-xs h-36 leading-relaxed" value={editedMessage} onChange={e => setEditedMessage(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setActiveItem(null)} className="btn-secondary px-4 py-1.5 text-xs">Dismiss</button>
            <button onClick={handleCommitDraftApproval} disabled={committingDraft} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-1.5 px-4 font-bold text-xs flex items-center gap-1 transition-all">
              {committingDraft ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Approve Copy & Queue
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table-base w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Company</th><th className="p-3">WhatsApp</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {data.leads_preview?.map((l, i) => (
              <tr key={i} className="border-t hover:bg-slate-50/60 transition-colors">
                <td className="p-3 font-medium">{l.company || l.name || '-'}</td>
                <td className="p-3 text-slate-500">+{l.phone}</td>
                <td className="p-3"><span className={`text-xs font-bold uppercase ${sc[l.status] || 'text-slate-400'}`}>{l.status}</span></td>
                <td className="p-3">
                  {l.status === 'draft' ? (
                    <button onClick={() => openInlineEditor(l)} className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg py-1 px-2.5 font-bold flex items-center gap-1 transition-all">
                      <Eye size={11} /> Review Draft
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 italic">Locked for Send</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CREATE VIEW (Renders Master Input Blueprints)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// CAMPAIGN CREATE VIEW — Auto-generation + Batch Preview/Launch
// ═══════════════════════════════════════════════════════════
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_form')
    const parsed = saved ? JSON.parse(saved) : {}
    return {
      campaign_name: '',
      campaign_info: '',
      personalise: true,
      daily_limit: 50,
      send_order: 'as_selected',
      ...parsed
    }
  })

  const [activeTypes, setActiveTypes] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_active_types')
    return saved ? new Set(JSON.parse(saved)) : new Set(['detailed'])
  })

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_messages')
    return saved ? JSON.parse(saved) : { hook: '', detailed: '', image: '' }
  })

  // ── Profile media state ───────────────────────────────────────────────
  const [profileMedia, setProfileMedia] = useState({ photos: [], pdfs: [], audio: '' })
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [selectedPdfs, setSelectedPdfs]     = useState(new Set())
  const [useProfileAudio, setUseProfileAudio] = useState(false)
  const [extraImageUrl, setExtraImageUrl] = useState(null)

  const [selected, setSelected]     = useState(new Map())
  const [focusedType, setFocusedType] = useState('detailed')
  const [autoGenLoading, setAutoGenLoading] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)

  // ── Preview/Review state ────────────────────────────────────────────────
  const [drafts, setDrafts] = useState(null) // null = setup screen
  const [draftIdx, setDraftIdx] = useState(0)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [launching, setLaunching] = useState(false)

  const leadIds = Array.from(selected.keys())
  const debounceRef = useRef(null)

  // Load profile media when image type is activated
  useEffect(() => {
    if (!activeTypes.has('image')) return
    const load = async () => {
      setMediaLoading(true)
      try {
        const { data } = await profileApi.get()
        setProfileMedia({
          photos: data.product_photos || [],
          pdfs:   data.product_pdfs   || [],
          audio:  data.audio_voice_base64 || '',
        })
        setSelectedPhotos(new Set((data.product_photos || []).map((_, i) => i)))
        setSelectedPdfs(new Set((data.product_pdfs || []).map((_, i) => i)))
        setUseProfileAudio(!!(data.audio_voice_base64))
      } catch {
        toast.error('Failed to load profile media assets')
      } finally {
        setMediaLoading(false)
      }
    }
    load()
  }, [activeTypes.has('image')])

  useEffect(() => { localStorage.setItem('neolix_wa_form', JSON.stringify(form)) }, [form])
  useEffect(() => { localStorage.setItem('neolix_wa_active_types', JSON.stringify(Array.from(activeTypes))) }, [activeTypes])
  useEffect(() => { localStorage.setItem('neolix_wa_messages', JSON.stringify(messages)) }, [messages])

  const purgeFormCache = () => {
    localStorage.removeItem('neolix_wa_form')
    localStorage.removeItem('neolix_wa_active_types')
    localStorage.removeItem('neolix_wa_messages')
  }

  // ── Auto-generation for focused type ──────────────────────────────────
  const autoGenerate = async (typeId) => {
    if (!form.campaign_name.trim() && !form.campaign_info.trim()) return
    setAutoGenLoading(true)
    try {
      const target = MSG_TYPES.find(x => x.id === typeId)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false,
        generate_template: true, message_type: typeId,
        context_hint: `${target.hint}. Campaign context: ${form.campaign_info || form.campaign_name}`
      })
      setMessages(p => ({ ...p, [typeId]: data.message || '' }))
    } catch {
      // silent fail — auto-gen, don't annoy the user
    } finally {
      setAutoGenLoading(false)
    }
  }

  // Debounced auto-trigger when campaign_name / campaign_info changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      autoGenerate(focusedType)
    }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [form.campaign_name, form.campaign_info]) // eslint-disable-line

  const toggleType = (id) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
        if (focusedType === id) setFocusedType(Array.from(next)[0])
      } else {
        next.add(id)
        setFocusedType(id)
        // Auto-generate for newly activated type if empty
        if (!messages[id]?.trim()) autoGenerate(id)
      }
      return next
    })
  }

  const switchFocusedType = (id) => {
    setFocusedType(id)
    if (!messages[id]?.trim()) autoGenerate(id)
  }

  const togglePhoto = (i) => setSelectedPhotos(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const togglePdf = (i) => setSelectedPdfs(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  // ── Generate Preview (batch, for focused type) ──────────────────────────
 const generatePreview = async () => {
  if (!form.campaign_name.trim()) return toast.error('Enter campaign name')
  if (selected.size === 0) return toast.error('Select at least one lead')
 
  const enabledList = Array.from(activeTypes)
  for (const type of enabledList) {
    if (type !== 'image' && !messages[type]?.trim())
      return toast.error(`Add a template for ${type.toUpperCase()}`)
  }
 
  setGeneratingPreview(true)
  try {
    const { data } = await waApi.previewBatch({
      campaign_info: form.campaign_info,
      lead_ids: leadIds.map(id => parseInt(id, 10) || id),
      message_types: enabledList,
      templates: {
        hook: messages.hook || '',
        detailed: messages.detailed || '',
        image: messages.image || '',
      },
      personalise: form.personalise,
    })
    setDrafts(data.drafts || [])
    setDraftIdx(0)
    toast.success(`${data.drafts?.length || 0} drafts ready — review below`)
  } catch (e) {
    toast.error(e.response?.data?.detail || 'Draft generation failed')
  } finally {
    setGeneratingPreview(false)
  }
}

  const updateDraftMessage = (msgType, value) => {
  setDrafts(prev => prev.map((d, i) =>
    i === draftIdx ? { ...d, messages: { ...d.messages, [msgType]: value } } : d
  ))
}

const applyToAllDrafts = (msgType) => {
  const value = drafts[draftIdx]?.messages?.[msgType] || ''
  setDrafts(prev => prev.map(d => ({ ...d, messages: { ...d.messages, [msgType]: value } })))
  toast.success(`Applied to all ${drafts.length} leads`)
}

 const removeDraft = () => {
  setDrafts(prev => {
    const next = prev.filter((_, i) => i !== draftIdx)
    if (draftIdx >= next.length) setDraftIdx(Math.max(0, next.length - 1))
    return next
  })
}

  // ── Launch ───────────────────────────────────────────────────────────────
  const launch = async () => {
  if (!drafts || drafts.length === 0) return toast.error('No drafts to send')
  setLaunching(true)
  try {
    const finalPhotos = [
      ...Array.from(selectedPhotos).map(i => profileMedia.photos[i]).filter(Boolean),
      ...(extraImageUrl ? [extraImageUrl] : [])
    ]
    const finalPdfs = Array.from(selectedPdfs).map(i => profileMedia.pdfs[i]).filter(Boolean)
    const finalAudio = useProfileAudio ? profileMedia.audio : ''
 
    await waApi.launch({
      campaign_name: form.campaign_name,
      campaign_info: form.campaign_info,
      daily_limit: parseInt(form.daily_limit, 10) || 50,
      message_types: Array.from(activeTypes),
      photos_array: finalPhotos,
      pdfs_array: finalPdfs,
      audio_voice_base64: finalAudio,
      drafts: drafts.map(d => ({
        lead_id: d.lead_id,
        phone: d.phone,
        name: d.name,
        company: d.company,
        business_details: d.business_details,
        messages: d.messages,
      }))
    })
    toast.success('Campaign launched — sending messages now!')
    purgeFormCache()
    setTimeout(onDone, 500)
  } catch (e) {
    toast.error(e.response?.data?.detail || 'Launch failed')
  } finally {
    setLaunching(false)
  }
}

  const activeConfigMeta = MSG_TYPES.find(x => x.id === focusedType)

  // ─────────────────────────────────────────────────────────────────────
  // REVIEW / PREVIEW SCREEN
  // ─────────────────────────────────────────────────────────────────────
  if (drafts) {
  const d = drafts[draftIdx]
  const total = drafts.length
  const activeTypesList = Array.from(activeTypes)
 
  if (total === 0) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDrafts(null)} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back to setup</button>
        <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-sm">No drafts left. Go back and regenerate.</p>
        </div>
      </div>
    )
  }
 
  const TYPE_META = {
    hook:     { label: 'Hook',     color: 'bg-blue-500' },
    detailed: { label: 'Detailed', color: 'bg-emerald-500' },
    image:    { label: 'Image + Caption', color: 'bg-violet-500' },
  }
 
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <button onClick={() => setDrafts(null)} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back to setup</button>
 
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Review Drafts</h2>
          <p className="text-sm text-slate-400 mt-0.5">{total} lead{total !== 1 ? 's' : ''} ready · {activeTypesList.length} variant{activeTypesList.length !== 1 ? 's' : ''} each · Edit, then launch</p>
        </div>
        <button onClick={launch} disabled={launching} className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm disabled:opacity-40">
          {launching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {launching ? 'Launching…' : 'Launch'}
        </button>
      </div>
 
      {/* Lead navigator */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <button disabled={draftIdx === 0} onClick={() => setDraftIdx(i => i - 1)}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">{d.company || d.name || 'Unknown'}</p>
          <p className="text-xs text-slate-400">+{d.phone} · {draftIdx + 1} of {total}</p>
        </div>
        <button disabled={draftIdx === total - 1} onClick={() => setDraftIdx(i => i + 1)}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 transition-colors">
          <ArrowRight size={15} />
        </button>
      </div>
 
      {/* Remove lead */}
      <div className="flex justify-end">
        <button onClick={removeDraft} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-bold">
          <X size={13} /> Remove this lead
        </button>
      </div>
 
      {/* Stacked editable variant cards */}
      {activeTypesList.map(typeId => {
        const meta = TYPE_META[typeId] || { label: typeId, color: 'bg-slate-400' }
        return (
          <div key={typeId} className="card p-5 space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
      <label className="field-label mb-0">{meta.label}</label>
    </div>
    <button
      type="button"
      onClick={() => applyToAllDrafts(typeId)}
      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
    >
      <Copy size={12} /> Apply to all {drafts.length} leads
    </button>
  </div>
  <textarea
    className="textarea h-32 text-sm"
    value={d.messages?.[typeId] || ''}
    onChange={e => updateDraftMessage(typeId, e.target.value)}
  />
 
            {/* WhatsApp bubble preview */}
            <div className="rounded-2xl border border-slate-200 bg-[#e5ddd5] p-4">
              <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] ml-auto shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{d.messages?.[typeId] || '—'}</p>
                {typeId === 'image' && (
                  <div className="mt-2 space-y-1.5">
                    {selectedPhotos.size > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from(selectedPhotos).slice(0, 4).map(i => (
                          <img key={i} src={profileMedia.photos[i]} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/50" />
                        ))}
                      </div>
                    )}
                    {selectedPdfs.size > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white/60 rounded-lg px-2 py-1">
                        <FileText size={12} /> {selectedPdfs.size} PDF{selectedPdfs.size !== 1 ? 's' : ''} attached
                      </div>
                    )}
                    {useProfileAudio && profileMedia.audio && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white/60 rounded-lg px-2 py-1">
                        <Mic size={12} /> Voice note attached
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 text-right mt-1">12:00 PM</p>
              </div>
            </div>
          </div>
        )
      })}
 
      <button onClick={launch} disabled={launching} className="w-full px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-40">
        {launching ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {launching ? 'Launching…' : `Launch to ${total} Lead${total !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
    

  // ─────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900">Configure Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Campaign Name</label>
                <input className="input" placeholder="e.g. Tech Leads Q1" value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Daily Limit</label>
                <input type="number" min={1} max={50} className="input" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: e.target.value })} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="field-label mb-0">Campaign Info / Event Context</label>
                <div className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
                  <HelpCircle size={13} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal shadow-md">
                    Used as {'{campaign_info}'} in your message templates — e.g. "Hey, remember we met at [Campaign Info]?"
                  </span>
                </div>
              </div>
              <input className="input" placeholder="e.g., Medical Physiotherapy Function, Kochi"
                value={form.campaign_info} onChange={e => setForm({ ...form, campaign_info: e.target.value })} />
            </div>

            {/* Variant selector */}
            <div>
              <label className="field-label mb-1.5 block">Message Variants</label>
              <div className="grid grid-cols-3 gap-2">
                {MSG_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => toggleType(t.id)}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all
                      ${activeTypes.has(t.id) ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <TypeIcon id={t.id} size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab switcher */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {Array.from(activeTypes).map(typeId => (
                  <button key={typeId} type="button" onClick={() => switchFocusedType(typeId)}
                    className={`flex-1 py-1 text-center font-bold text-xs rounded-lg uppercase transition-all
                      ${focusedType === typeId ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>
                    {typeId}
                  </button>
                ))}
              </div>

              {/* ── Image variant: show profile media picker ── */}
              {focusedType === 'image' && (
                <div className="space-y-4 fade-up">
                  {mediaLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                      <Loader2 size={13} className="animate-spin" /> Loading your profile media...
                    </div>
                  ) : (
                    <>
                      {profileMedia.photos.length > 0 ? (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Product Photos <span className="text-emerald-600">({selectedPhotos.size} selected)</span>
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {profileMedia.photos.map((src, i) => (
                              <button key={i} type="button" onClick={() => togglePhoto(i)}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                                  ${selectedPhotos.has(i) ? 'border-emerald-500' : 'border-slate-200 opacity-50'}`}>
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                {selectedPhotos.has(i) && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check size={9} className="text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                          No product photos saved. <a href="/settings" className="font-bold underline">Add them in Settings →</a>
                        </div>
                      )}

                      {profileMedia.pdfs.length > 0 ? (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Brochures / PDFs <span className="text-emerald-600">({selectedPdfs.size} selected)</span>
                          </p>
                          <div className="space-y-1.5">
                            {profileMedia.pdfs.map((_, i) => (
                              <button key={i} type="button" onClick={() => togglePdf(i)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all
                                  ${selectedPdfs.has(i) ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                <FileText size={14} className={selectedPdfs.has(i) ? 'text-emerald-600' : 'text-slate-400'} />
                                <span className="text-xs font-semibold flex-1">Brochure {i + 1}.pdf</span>
                                {selectedPdfs.has(i) && <Check size={13} className="text-emerald-500 flex-shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                          No PDFs saved. <a href="/settings" className="font-bold underline">Add them in Settings →</a>
                        </div>
                      )}

                      {profileMedia.audio ? (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Voice Note</p>
                          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                            ${useProfileAudio ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}
                            onClick={() => setUseProfileAudio(v => !v)}>
                            <Mic size={14} className={useProfileAudio ? 'text-emerald-600' : 'text-slate-400'} />
                            <audio controls src={profileMedia.audio} className="flex-1 h-7" onClick={e => e.stopPropagation()} />
                            {useProfileAudio && <Check size={13} className="text-emerald-500 flex-shrink-0" />}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                          No voice note saved. <a href="/settings" className="font-bold underline">Record one in Settings →</a>
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add Extra Image (optional)</p>
                        {extraImageUrl ? (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                            <img src={extraImageUrl} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => setExtraImageUrl(null)} className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <X size={8} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'; input.accept = 'image/*'
                            input.onchange = e => {
                              const f = e.target.files[0]
                              const r = new FileReader()
                              r.onload = ev => setExtraImageUrl(ev.target.result)
                              r.readAsDataURL(f)
                            }
                            input.click()
                          }} className="w-full h-14 border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2 hover:border-slate-400 transition-colors">
                            <Image size={13} /> Upload campaign-specific image
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Template editor — auto-generated, no manual AI button */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {activeConfigMeta?.label} Template
                  </span>
                  {autoGenLoading && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> Auto-generating…
                    </span>
                  )}
                </div>
                <textarea
                  className="textarea h-32 font-mono text-xs"
                  value={messages[focusedType]}
                  onChange={e => setMessages({ ...messages, [focusedType]: e.target.value })}
                  placeholder={activeConfigMeta?.placeholder}
                />
                <p className="text-[10px] text-slate-400">Auto-fills as you type your campaign name/context above. Edit freely.</p>
              </div>
            </div>

            {/* Personalise toggle */}
            <div className="flex items-center justify-between py-2 border-t text-xs">
              <div>
                <p className="font-bold text-slate-700">AI Personalisation</p>
                <p className="text-slate-400">Groq personalises each message per lead in background.</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, personalise: !form.personalise })}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-2 block">Target Leads</label>
            <LeadSelector selected={selected} onChange={setSelected} requiredChannels="whatsapp" />
          </div>
        </div>

        {/* Right info panel */}
        <div>
          <div className="card bg-slate-50 border border-slate-200 p-6 sticky top-6 space-y-4 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Zap size={15} className="text-emerald-500" /> Campaign Summary
            </div>
            <div className="bg-white p-3 border rounded-xl space-y-2 text-[11px] text-slate-600 font-medium">
              <p>🎯 Leads selected: <strong>{selected.size}</strong></p>
              <p>📨 Active variant: <strong>{focusedType}</strong></p>
              {activeTypes.has('image') && (
                <>
                  <p>🖼 Photos: <strong>{selectedPhotos.size} from profile{extraImageUrl ? ' + 1 extra' : ''}</strong></p>
                  <p>📄 PDFs: <strong>{selectedPdfs.size} from profile</strong></p>
                  <p>🎙 Voice note: <strong>{useProfileAudio && profileMedia.audio ? 'Yes' : 'No'}</strong></p>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate a preview to review and edit AI drafts per lead, then launch to send immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t">
        <button type="button" onClick={onBack} className="px-4 py-1.5 text-xs border rounded-xl font-bold hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={generatePreview}
          disabled={generatingPreview || selected.size === 0}
          className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm disabled:opacity-40">
          {generatingPreview ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Generate Preview
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// UPDATED THREAD VIEW WITH PARENT LIFECYCLE SYNC HOOKS
// ═══════════════════════════════════════════════════════════
function ThreadView({ replyId, onClose, onRefreshParent }) {
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const bottomRef = useRef()

  const load = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.thread(replyId); setThread(data) }
    catch { toast.error('Failed to load thread') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [replyId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const send = async () => {
    if (!replyText.trim()) { toast.error('Write a reply first'); return }
    setSending(true)
    try {
      await repliesApi.respond(replyId, { body: replyText, use_ai: false })
      toast.success('Reply sent!')
      setReplyText('')
      
      await load()
      if (onRefreshParent) onRefreshParent() 
    } catch { toast.error('Failed to send') } finally { setSending(false) }
  }

  const draftAI = async () => {
    setAiLoading(true)
    try {
      const { data } = await repliesApi.respond(replyId, { body: '', use_ai: true })
      const { data: fresh } = await repliesApi.thread(replyId)
      setReplyText(fresh.reply?.our_reply || '')
      setThread(fresh)
      toast.success('AI draft ready — edit and send')
      
      if (onRefreshParent) onRefreshParent()
    } catch { toast.error('AI failed') } finally { setAiLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
  if (!thread) return null
  const { reply, sent_item } = thread

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{reply.from_name || reply.from_email}</p>
          <p className="text-xs text-slate-400">{reply.from_email}</p>
        </div>
        <span className={reply.status === 'responded' ? 'badge-green' : reply.status === 'unread' ? 'badge-blue' : 'badge-gray'}>
          {reply.status}
        </span>
        <button onClick={onClose} className="btn-icon p-1.5"><X size={15} /></button>
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-400 uppercase font-medium tracking-wide mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-slate-800">{reply.subject}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-white">
        {sent_item && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Your WhatsApp message · {timeAgo(sent_item.sent_at)}</p>
            <div className="bubble-sent">{sent_item.body}</div>
          </div>
        )}
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{reply.from_name || 'Their reply'} · {timeAgo(reply.received_at)}</p>
          <div className="bubble-recv whitespace-pre-wrap">{reply.body_text}</div>
        </div>
        {reply.status === 'responded' && reply.our_reply && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">You · {timeAgo(reply.replied_at)}</p>
            <div className="bubble-sent whitespace-pre-wrap">{reply.our_reply}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {reply.status !== 'responded' ? (
        <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-white space-y-3">
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply…" className="textarea h-24 text-sm" />
          <div className="flex gap-2">
            <button onClick={send} disabled={sending || !replyText.trim()} className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />}
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button onClick={draftAI} disabled={aiLoading} className="btn-secondary">
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-emerald-500" />}
              AI draft
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-emerald-50">
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCheck size={15} /> Replied {timeAgo(reply.replied_at)}
          </p>
        </div>
      )}
    </div>
  )
}

function RepliesTab() {
  const [subTab, setSubTab]   = useState('inbox')
  const [inbox, setInbox]     = useState([])
  const [sent, setSent]       = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSent, setSelectedSent] = useState(null)
  const [polling, setPolling] = useState(false)
  const [search, setSearch]   = useState('')

  const loadInbox = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.inbox(null, 'whatsapp'); setInbox(data) }
    catch { toast.error('Failed to load inbox') } finally { setLoading(false) }
  }
  const loadSent = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.sent(null, 'whatsapp'); setSent(data) }
    catch { toast.error('Failed to load sent') } finally { setLoading(false) }
  }

  useEffect(() => { subTab === 'inbox' ? loadInbox() : loadSent() }, [subTab])

  const poll = async () => {
    setPolling(true)
    try { await repliesApi.poll(); toast.success('Syncing inbox…'); setTimeout(loadInbox, 2000) }
    catch { toast.error('Poll failed') } finally { setPolling(false) }
  }

  const filteredInbox = inbox.filter(i =>
    !search || i.from_email.toLowerCase().includes(search.toLowerCase()) ||
    i.from_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredSent = sent.filter(i =>
    !search || i.to_email?.toLowerCase().includes(search.toLowerCase()) ||
    i.to_company?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const statusDot = { unread: 'bg-blue-500', read: 'bg-slate-300', responded: 'bg-emerald-400' }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex items-center gap-0 border-b border-slate-200 mb-0 flex-shrink-0">
        {[{ id: 'inbox', label: 'Inbox' }, { id: 'sent', label: 'Sent' }].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSelectedId(null); setSelectedSent(null) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${subTab === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="bg-transparent text-sm outline-none placeholder-slate-400 w-36" />
          </div>
          {subTab === 'inbox' && (
            <button onClick={poll} disabled={polling} className="btn-icon" title="Sync inbox">
              <RefreshCw size={14} className={polling ? 'animate-spin text-emerald-500' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-slate-200 rounded-xl mt-3">
        <div className="w-80 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-white">
          {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>}

          {subTab === 'inbox' && !loading && filteredInbox.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No replies yet</p>
              <button onClick={poll} className="text-xs text-emerald-600 mt-2">Sync inbox</button>
            </div>
          )}
          {subTab === 'inbox' && filteredInbox.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedId === item.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDot[item.status] || 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-1 mb-0.5">
                    <p className={`text-sm truncate ${item.status === 'unread' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {item.from_name || item.from_email}
                    </p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.received_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.preview}</p>
                </div>
              </div>
            </button>
          ))}

          {subTab === 'sent' && !loading && filteredSent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No sent messages yet</p>
            </div>
          )}
          {subTab === 'sent' && filteredSent.map(item => (
            <button key={item.id} onClick={() => setSelectedSent(item)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedSent?.id === item.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 flex-shrink-0">
                  {(item.to_company || item.to_name || item.to_email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.to_company || item.to_name || item.to_email}</p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.sent_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          {subTab === 'inbox' && selectedId && (
            <ThreadView 
              replyId={selectedId} 
              onClose={() => setSelectedId(null)} 
              onRefreshParent={() => {
                loadInbox();
                loadSent();
              }}
            />
          )}
          {subTab === 'inbox' && !selectedId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Reply size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a reply to read</p>
            </div>
          )}
          {subTab === 'sent' && selectedSent && (
            <div className="p-6 fade-up overflow-y-auto h-full">
              <p className="font-semibold text-slate-900 mb-1">{selectedSent.subject}</p>
              <p className="text-xs text-slate-400 mb-5">
                To: <span className="text-emerald-600">{selectedSent.to_email}</span>
                {selectedSent.to_company ? ` · ${selectedSent.to_company}` : ''}
                {' · '}{timeAgo(selectedSent.sent_at)}
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{selectedSent.body}</p>
              </div>
            </div>
          )}
          {subTab === 'sent' && !selectedSent && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Inbox size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a message to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── GLOBAL SYSTEM MAIN EXPORT LAYER ───────────────────────────────────────────
export default function WhatsAppPage() {
  const [view, setView] = useState('list') 
  const [detailId, setDetailId] = useState(null)
  
  const { waUnread } = useUnreadReplies();

  return (
    <div className="p-1 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 border-b pb-1">
        <button onClick={() => setView('list')} className={`px-4 py-2 font-bold text-sm border-b-2 ${view === 'list' || view === 'detail' || view === 'create' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>
          Campaign Monitor
        </button>
        
        <button onClick={() => setView('replies')} className={`px-4 py-2 font-bold text-sm border-b-2 flex items-center gap-2 ${view === 'replies' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>
          <span>Replies Channel</span>
          {waUnread > 0 && (
            <span className="bg-red-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
              {waUnread} New
            </span>
          )}
        </button>
      </div>

      {view === 'list' && (
        <CampaignList 
          onCreate={() => setView('create')}
          onDetail={id => { setDetailId(id); setView('detail') }}
        />
      )}
      {view === 'create' && <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'detail' && <CampaignDetail id={detailId} onBack={() => setView('list')} />}
      {view === 'replies' && <RepliesTab />}
    </div>
  )
}