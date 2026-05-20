import { useState, useEffect, useRef } from 'react'
import {
  Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply, MessageSquare, Sparkles, Image, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi, repliesApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'
import { useUnreadReplies } from '../hooks/useUnreadReplies'

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = { running: 'badge-blue', completed: 'badge-green', queued: 'badge-gray', failed: 'badge-red', paused: 'badge-orange' }

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
  { id: 'hook', label: 'Hook', sub: 'Short punchy opener', placeholder: `Hi {lead_name}\n\nWe help {lead_company} get better results faster.\n\nWorth a chat?`, hint: 'hook short punchy opener under 3 lines', rows: 4 },
  { id: 'detailed', label: 'Detailed', sub: '80-120 word outreach', placeholder: `Hi {lead_name},\n\nI came across {lead_company} and wanted to reach out personally.\n\n[Your value proposition here]\n\nWould love a quick 10-min call this week.\n\nWarm regards,\n{sender_name}`, hint: 'detailed professional cold outreach 80-120 words', rows: 9 },
  { id: 'image', label: 'Image', sub: 'Image + caption', placeholder: `Hi {lead_name} - sharing our catalogue for {lead_company}.\nHappy to discuss! - {sender_name}`, hint: 'short 1-2 line caption for image attachment', rows: 3 },
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
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
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
function CampaignList({ onCreate, onSingle, onDetail }) {
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
          <p className="text-sm text-slate-400 mt-0.5">Multi-variant cluster orchestration layers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={16} /></button>
          <button onClick={onSingle} className="btn-secondary"><Send size={16} /> Single Dispatch</button>
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
            <div key={c.id} onClick={() => onDetail(c.id)} className="card-hover p-5 flex items-center gap-4">
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
// CAMPAIGN DETAIL LOG VIEW
// ═══════════════════════════════════════════════════════════
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back</button>
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">{data.name}</h2>
        <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><strong>{data.total_leads}</strong><p className="text-xs text-slate-400">Target Count</p></div>
        <div className="card p-4 text-emerald-600"><strong>{data.sent}</strong><p className="text-xs text-slate-400">Dispatched</p></div>
        <div className="card p-4 text-red-500"><strong>{data.failed}</strong><p className="text-xs text-slate-400">Faulty Runs</p></div>
      </div>

      <div className="card overflow-hidden">
        <table className="table-base w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Company</th><th className="p-3">WhatsApp</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {data.leads_preview?.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-3 font-medium">{l.company || l.name || '-'}</td>
                <td className="p-3 text-slate-500">+{l.phone}</td>
                <td className="p-3"><span className={l.status === 'sent' ? 'text-emerald-600 font-bold' : 'text-red-500'}>{l.status?.toUpperCase()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CREATE VIEW
// ═══════════════════════════════════════════════════════════
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_form')
    return saved ? JSON.parse(saved) : { campaign_name: '', personalise: true, daily_limit: 50, send_order: 'as_selected' }
  })

  const [activeTypes, setActiveTypes] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_active_types')
    return saved ? new Set(JSON.parse(saved)) : new Set(['detailed'])
  })

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('neolix_wa_messages')
    return saved ? JSON.parse(saved) : { hook: '', detailed: '', image: '' }
  })

  const [imageUrl, setImageUrl] = useState(null)
  const [selected, setSelected] = useState(new Map())
  const [allPreviews, setAllPreviews] = useState({ hook: null, detailed: null, image: null })
  const [focusedType, setFocusedType] = useState('detailed') 
  const [previewIdx, setPreviewIdx] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef()

  const leadIds = Array.from(selected.keys())

  useEffect(() => {
    localStorage.setItem('neolix_wa_form', JSON.stringify(form))
  }, [form])

  useEffect(() => {
    localStorage.setItem('neolix_wa_active_types', JSON.stringify(Array.from(activeTypes)))
  }, [activeTypes])

  useEffect(() => {
    localStorage.setItem('neolix_wa_messages', JSON.stringify(messages))
  }, [messages])

  const purgeFormCache = () => {
    localStorage.removeItem('neolix_wa_form')
    localStorage.removeItem('neolix_wa_active_types')
    localStorage.removeItem('neolix_wa_messages')
  }

  const toggleType = (id) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(id)) { 
        if (next.size > 1) next.delete(id); 
        if(focusedType === id) setFocusedType(Array.from(next)[0]) 
      } else { 
        next.add(id); 
        setFocusedType(id); 
      }
      return next
    })
  }

  const schedulePreview = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(loadAllActivePreviews, 1000)
  }

  const loadAllActivePreviews = async () => {
    if (selected.size === 0) return
    const ids = Array.from(selected.keys())
    const targetId = ids[Math.min(previewIdx, ids.length - 1)]
    const cachedLead = selected.get(targetId) || {}
    const bDetails = cachedLead.business_description || cachedLead.business_details || '';

    setPreviewLoading(true)
    const activeList = Array.from(activeTypes)

    try {
      await Promise.all(
        activeList.map(async (type) => {
          if (!messages[type]?.trim()) {
            setAllPreviews(p => ({ ...p, [type]: null }))
            return
          }
          try {
            const { data } = await waApi.preview({
              message: messages[type],
              lead_id: targetId,
              lead_name: cachedLead.contact_name || cachedLead.name || '',
              lead_company: cachedLead.company_name || cachedLead.company || '',
              business_details: bDetails,
              personalise: form.personalise,
              message_type: type
            })
            setAllPreviews(p => ({ ...p, [type]: data?.message || String(data || '') }))
          } catch {
            setAllPreviews(p => ({ ...p, [type]: 'Failed to parse variations context.' }))
          }
        })
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => { schedulePreview() }, [messages, activeTypes, form.personalise, selected.size, previewIdx])

  const triggerAIGenerate = async () => {
    setAiLoading(true)
    try {
      const target = MSG_TYPES.find(x => x.id === focusedType)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false, generate_template: true,
        message_type: focusedType, context_hint: target.hint
      })
      setMessages(p => ({ ...p, [focusedType]: data.message || '' }))
      toast.success(`${target.label} template drafted`)
    } catch {
      toast.error('AI text generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const submitCampaignPipeline = async () => {
    if (!form.campaign_name.trim()) return toast.error('Enter valid campaign label identity')
    if (selected.size === 0) return toast.error('Target recipient group selector is empty')
    
    const enabledList = Array.from(activeTypes)
    for(const type of enabledList) {
      if(type !== 'image' && !messages[type]?.trim()) return toast.error(`Please define template copy data for ${type.toUpperCase()}`)
    }

    setSubmitting(true)
    try {
      const dailyLimitInt = parseInt(form.daily_limit, 10) || 50

      await waApi.campaignCreate({
        campaign_name: form.campaign_name,
        lead_ids: leadIds.map(id => parseInt(id, 10) || id), 
        personalise: form.personalise,
        daily_limit: dailyLimitInt,
        send_order: form.send_order,
        selected_types: enabledList,
        hook_template: messages.hook || "",
        detailed_template: messages.detailed || "",
        image_template: messages.image || "",
        image_base64: imageUrl ? imageUrl.split(',')[1] : ""
      })
      toast.success(`Multi-variant campaign deployment successful!`)
      purgeFormCache()
      setTimeout(onDone, 500)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payload constraint validation failure')
    } finally {
      setSubmitting(false)
    }
  }

  const activeLead = selected.get(leadIds[Math.min(previewIdx, leadIds.length - 1)])
  const activeConfigMeta = MSG_TYPES.find(x => x.id === focusedType)

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900">Configure Multi-Variant Cluster Outreach</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Identity Label</label><input className="input" placeholder="e.g. Combo Campaign - Tech Leads" value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} /></div>
              <div><label className="field-label">Daily Allocation Cap</label><input type="number" min={1} max={50} className="input" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: e.target.value })} /></div>
            </div>

            <div>
              <label className="field-label mb-1.5 block">Select Active Variant Configuration Combo</label>
              <div className="grid grid-cols-3 gap-2">
                {MSG_TYPES.map(t => {
                  const active = activeTypes.has(t.id)
                  return (
                    <button key={t.id} type="button" onClick={() => toggleType(t.id)} className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${active ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <TypeIcon id={t.id} size={14} />
                      {t.label} Variant
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {Array.from(activeTypes).map(typeId => (
                  <button key={typeId} type="button" onClick={() => setFocusedType(typeId)} className={`flex-1 py-1 text-center font-bold text-xs rounded-lg uppercase transition-all ${focusedType === typeId ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400'}`}>
                    Edit {typeId}
                  </button>
                ))}
              </div>

              {focusedType === 'image' && (
                <div className="fade-up">
                  {imageUrl ? (
                    <div className="relative mb-2 w-full h-24 border rounded-xl overflow-hidden"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow border"><X size={10} /></button></div>
                  ) : (
                    <button type="button" onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=e=>{ const f=e.target.files[0]; const r=new FileReader(); r.onload=ev=>setImageUrl(ev.target.result); r.readAsDataURL(f) }; i.click() }} className="w-full h-20 border-2 border-dashed rounded-xl text-xs text-slate-400 flex flex-col items-center justify-center gap-1"><Image size={15} /> Upload Media Attachment Layer</button>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">{activeConfigMeta?.label} Base Content</span>
                  <button type="button" onClick={triggerAIGenerate} disabled={aiLoading} className="text-xs font-bold text-emerald-600 flex items-center gap-1">{aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Generate Template</button>
                </div>
                <textarea className="textarea h-32 font-mono text-xs" value={messages[focusedType]} onChange={e => setMessages({ ...messages, [focusedType]: e.target.value })} placeholder={activeConfigMeta?.placeholder} />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t text-xs">
              <div><p className="font-bold text-slate-700">Dynamic Profile Rewriting Engine</p><p className="text-slate-400">Context variables populate straight out of target database fields profile data vectors.</p></div>
              <button type="button" onClick={() => setForm({ ...form, personalise: !form.personalise })} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} /></button>
            </div>
          </div>

          <div className="card p-5"><label className="field-label mb-2 block">Recipient Segment Node Target</label><LeadSelector selected={selected} onChange={setSelected} requirePhone={true} /></div>
        </div>

        <div>
          <div className="card p-5 sticky top-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1"><Eye size={13} /> Active Campaign Previews Stack</span>
              {leadIds.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border">
                  <button type="button" onClick={() => setPreviewIdx(p => Math.max(0, p - 1))} disabled={previewIdx === 0} className="font-bold">‹</button>
                  <span>{previewIdx + 1}/{leadIds.length}</span>
                  <button type="button" onClick={() => setPreviewIdx(p => Math.min(leadIds.length - 1, p + 1))} disabled={previewIdx >= leadIds.length - 1} className="font-bold">›</button>
                </div>
              )}
            </div>

            {selected.size === 0 && <div className="py-12 text-center text-xs text-slate-400 border border-dashed rounded-xl">Select leads to simulate dynamic response matrices stack outputs</div>}
            {previewLoading && <div className="py-8 flex justify-center"><Loader2 size={16} className="animate-spin text-emerald-500" /> Preparing pipeline configurations...</div>}

            {!previewLoading && selected.size > 0 && (
              <div className="space-y-4 fade-up">
                {Array.from(activeTypes).map((type) => {
                  const previewText = allPreviews[type];
                  if (!previewText && !messages[type]?.trim()) return null;
                  
                  return (
                    <div key={type} className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                        <TypeIcon id={type} size={10} /> {type.toUpperCase()} Outbound Stream Variant
                      </p>
                      <div className="p-3.5 rounded-xl border relative shadow-2xs" style={{ backgroundColor: '#e5ddd5' }}>
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-3xs max-w-[85%] text-xs text-slate-800 leading-relaxed">
                            {type === 'image' && imageUrl && <img src={imageUrl} alt="Attached Data Asset" className="w-full h-24 object-cover rounded-lg mb-1.5 border" />}
                            <p className="whitespace-pre-wrap">{previewText || messages[type]}</p>
                            <p className="text-[9px] text-slate-400 text-right mt-1">✓✓</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="p-3 bg-slate-50 border rounded-xl text-[11px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-700 block mb-0.5">Target Account Metadata Parameters:</span>
                  <p><strong className="text-slate-600">Recipient Name:</strong> {activeLead?.contact_name || activeLead?.name || 'Unspecified Node'}</p>
                  <p><strong className="text-slate-600">Company Group:</strong> {activeLead?.company_name || activeLead?.company || '-'}</p>
                  <p className="line-clamp-2"><strong className="text-slate-600">AI Context Vector Profile:</strong> {activeLead?.business_description || activeLead?.business_details || 'No data found'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t">
        <button type="button" onClick={onBack} className="px-4 py-1.5 text-xs border rounded-xl font-bold hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={submitCampaignPipeline} disabled={submitting || selected.size === 0} className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm disabled:opacity-40">
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Deploy Strategy Matrix
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WHATSAPP SINGLE SEND DISPATCH PIPELINE
// ═══════════════════════════════════════════════════════════
function WhatsAppSingleSend() {
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

  const setMsg = (type, val) => {
    setMessages(p => ({ ...p, [type]: val }))
    setPreviews(p => ({ ...p, [type]: null }))
  }

  const singleDesc = lead?.business_description || lead?.business_details || '';

  const generateSingleMsg = async (type) => {
    const t = MSG_TYPES.find(x => x.id === type)
    setGenerating(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: '', lead_id: lead?.id || 0,
        lead_name: lead?.contact_name || lead?.name || '',
        lead_company: lead?.company_name || lead?.company || '',
        business_details: singleDesc, personalise: false, generate_template: true,
        message_type: type, context_hint: t.hint,
      })
      setMsg(type, data.message || '')
      toast.success(`${t.label} generated`)
    } catch {
      toast.error('Generation failed')
    } finally {
      setGenerating(p => ({ ...p, [type]: false }))
    }
  }

  const previewSingleType = async (type) => {
    if (!messages[type]?.trim()) return toast.error('Enter copy text body parameters first')
    setPreviewing(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: messages[type], lead_id: lead?.id || 0,
        lead_name: lead?.contact_name || lead?.name || '',
        lead_company: lead?.company_name || lead?.company || '',
        business_details: singleDesc, personalise, message_type: type,
      })
      setPreviews(p => ({ ...p, [type]: data }))
    } catch {
      toast.error('Preview system error')
    } finally {
      setPreviewing(p => ({ ...p, [type]: false }))
    }
  }

  const executeSend = async () => {
    if (!lead?.phone) return toast.error('Select recipient target node context handle')
    const types = Array.from(activeTypes)
    setSending(true)
    const sent = new Set()

    for (const type of types) {
      const finalMsg = previews[type]?.message || messages[type] || ''
      try {
        if (type === 'image') {
          if (!imageFile) { toast.error('Attach source image file first'); continue }
          await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async () => {
              try {
                await waApi.sendImage({ phone: lead.phone, image_base64: reader.result.split(',')[1], caption: finalMsg })
                sent.add(type)
                resolve()
              } catch (e) { reject(e) }
            }
            reader.onerror = reject
            reader.readAsDataURL(imageFile)
          })
        } else {
          await waApi.send({ phone: lead.phone, message: finalMsg, personalise: false })
          sent.add(type)
        }
      } catch {
        toast.error(`Fault drop-off on direct channel route branch ${type.toUpperCase()}`)
      }
    }

    setSending(false)
    if (sent.size > 0) {
      toast.success('Dispatched variant targets safely')
      setSentTypes(sent)
      setTimeout(() => {
        setLead(null); setMessages({ hook: '', detailed: '', image: '' }); setPreviews({ hook: null, detailed: null, image: null });
        setImageFile(null); setImageUrl(null); setSentTypes(new Set())
      }, 1500)
    }
  }

  const TYPE_COLORS = {
    hook: { pill: 'bg-yellow-50 border-yellow-200 text-yellow-700', preview: 'bg-yellow-50 border border-yellow-200 text-yellow-900', header: 'text-yellow-700' },
    detailed: { pill: 'bg-blue-50 border-blue-200 text-blue-700', preview: 'bg-blue-50 border border-blue-200 text-blue-900', header: 'text-blue-700' },
    image: { pill: 'bg-purple-50 border-purple-200 text-purple-700', preview: 'bg-purple-50 border border-purple-200 text-purple-900', header: 'text-purple-700' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto items-start">
      <div className="space-y-4">
        <div className="card p-5">
          <span className="field-label mb-2 block">Direct Target Node Picker</span>
          <LeadSelector selected={lead ? new Map([[lead.id, lead]]) : new Map()} onChange={(map) => setLead(Array.from(map.values())[0] || null)} requirePhone={true} />
        </div>
        {lead && (
          <div className="card p-3 bg-slate-50 border text-xs text-slate-500 space-y-0.5 fade-up">
            <span className="font-bold text-slate-700 block">Target Account Summary:</span>
            <p><strong>Company:</strong> {lead.company_name || lead.company || '-'}</p>
            <p className="line-clamp-3"><strong>AI Profile Vector:</strong> {singleDesc || 'Empty fields'}</p>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <div>
            <label className="field-label mb-2">Message Matrix configurations</label>
            <div className="space-y-1.5">
              {MSG_TYPES.map(t => {
                const active = activeTypes.has(t.id)
                const colors = TYPE_COLORS[t.id]
                return (
                  <button key={t.id} type="button" onClick={() => toggleType(t.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${active ? `${colors.pill} border-current` : 'bg-slate-50 text-slate-400'}`}>
                    <span className="flex items-center gap-1.5"><TypeIcon id={t.id} /> {t.label} Layout</span>
                    {active && <Check size={12} />}
                  </button>
                )
              })}
            </div>
          </div>
          <button type="button" onClick={executeSend} disabled={sending || !lead} className="btn-primary w-full justify-center text-xs font-bold py-2">{sending ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Execute Single Send Dispatch</button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {MSG_TYPES.filter(t => activeTypes.has(t.id)).map(t => {
          const colors = TYPE_COLORS[t.id]
          return (
            <div key={t.id} className="card p-5 space-y-3">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${colors.header}`}><TypeIcon id={t.id} /> {t.label} Layer</span>
                <button type="button" onClick={() => generateSingleMsg(t.id)} disabled={generating[t.id]} className="text-xs font-bold text-emerald-600 flex items-center gap-1">{generating[t.id] ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>} AI Compile</button>
              </div>

              {t.id === 'image' && (
                <div>
                  {imageUrl ? (
                    <div className="relative w-full h-20 border rounded-xl overflow-hidden mb-2"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={() => { setImageFile(null); setImageUrl(null) }} className="absolute top-1 right-1 p-1 bg-white border rounded-full shadow"><X size={10} /></button></div>
                  ) : (
                    <button type="button" onClick={() => imagePickRef.current?.click()} className="w-full h-16 border-2 border-dashed text-slate-400 text-xs flex flex-col items-center justify-center rounded-xl gap-1"><Image size={14}/> Link Dynamic Image File Asset</button>
                  )}
                  <input ref={imagePickRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files[0]; if(f){ setImageFile(f); const r=new FileReader(); r.onload=ev=>setImageUrl(ev.target.result); r.readAsDataURL(f) } }} />
                </div>
              )}

              <textarea className="textarea font-mono text-xs h-24" value={messages[t.id]} onChange={e => setMsg(t.id, e.target.value)} placeholder={t.placeholder} />
              <div className="flex gap-2 items-start">
                <button type="button" onClick={() => previewSingleType(t.id)} disabled={previewing[t.id] || !messages[t.id]?.trim()} className="btn-secondary py-1 text-xs px-3 font-bold flex items-center gap-1">{previewing[t.id] ? <Loader2 size={11} className="animate-spin"/> : <Eye size={11}/>} Parse Sandbox</button>
                {previews[t.id] && <div className={`flex-1 p-2.5 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed ${colors.preview}`}>{previews[t.id].message || previews[t.id]}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// REPLIES VIEW INFRASTRUCTURE (REPLICATED NATIVELY)
// ═══════════════════════════════════════════════════════════
function ThreadView({ replyId, onClose }) {
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
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
              <Send size={28} className="mb-2 text-slate-200" />
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
          {subTab === 'inbox' && selectedId && <ThreadView replyId={selectedId} onClose={() => setSelectedId(null)} />}
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
              <Send size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a message to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// GLOBAL SYSTEM MAIN EXPORT LAYER
// ═══════════════════════════════════════════════════════════
export default function WhatsAppPage() {
  const [view, setView] = useState('list') // list | create | detail | single | replies
  const [detailId, setDetailId] = useState(null)
  
  const { waUnread } = useUnreadReplies();

  return (
    <div className="p-1 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 border-b pb-1">
        <button onClick={() => setView('list')} className={`px-4 py-2 font-bold text-sm border-b-2 ${view === 'list' || view === 'detail' || view === 'create' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>
          Campaign Monitor
        </button>
        <button onClick={() => setView('single')} className={`px-4 py-2 font-bold text-sm border-b-2 ${view === 'single' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>
          Single Dispatch
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
        <CampaignList onCreate={() => setView('create')}
          onSingle={() => setView('single')}
          onDetail={id => { setDetailId(id); setView('detail') }}
        />
      )}
      {view === 'create' && <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'detail' && <CampaignDetail id={detailId} onBack={() => setView('list')} />}
      {view === 'single' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setView('list')} className="btn-ghost -ml-2 text-xs font-bold flex items-center gap-1 text-slate-400 hover:text-slate-800"><ChevronLeft size={14}/> Back to core monitor</button>
          <WhatsAppSingleSend/>
        </div>
      )}
      {view === 'replies' && <RepliesTab />}
    </div>
  )
}