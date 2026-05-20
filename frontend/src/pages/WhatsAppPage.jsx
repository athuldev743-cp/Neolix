import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  Image, FileText, Zap, RefreshCw, Plus, ChevronLeft, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'

const statusBadge = { running: 'badge-blue', completed: 'badge-green', queued: 'badge-gray', failed: 'badge-red', paused: 'badge-orange' }

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
// BAILEYS LINK AUTH MANAGER
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
    const iv = setInterval(checkStatus, 2500) // Fast 2.5s poll loops to stop rotation drops
    return () => clearInterval(iv)
  }, [])

  if (status.loading) return <div className="p-4 bg-slate-50 rounded-2xl border text-xs text-slate-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin text-slate-800" /> Fetching pipeline anchor authorization state...</div>

  if (status.connected) return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
      <div className="w-2 h-2 rounded-full bg-emerald-500 anonymity-ping animate-ping flex-shrink-0" />
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
        <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
          <MessageSquare size={32} className="mb-2 text-slate-200" />
          <p className="text-sm">No active orchestration matrices found.</p>
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
// CAMPAIGN DETAIL ARCHIVE LOGS
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
// MULTI-VARIANT CAMPAIGN ENGINE GENERATION WORKFLOW
// ═══════════════════════════════════════════════════════════
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', personalise: true, daily_limit: 50, send_order: 'as_selected' })
  const [selected, setSelected] = useState(new Map())
  const [activeTypes, setActiveTypes] = useState(new Set(['detailed']))
  const [messages, setMessages] = useState({ hook: '', detailed: '', image: '' })
  const [previews, setPreviews] = useState({ hook: null, detailed: null, image: null })
  
  const [focusedType, setFocusedType] = useState('detailed') // Tracking active viewport panel focus 
  const [previewIdx, setPreviewIdx] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const timerRef = useRef()

  const leadIds = Array.from(selected.keys())

  const toggleType = (id) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id); if(focusedType === id) setFocusedType(Array.from(next)[0]) } 
      else { next.add(id); setFocusedType(id); }
      return next
    })
  }

  const schedulePreview = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(loadPreview, 900)
  }

  const loadPreview = async () => {
    if (selected.size === 0 || !messages[focusedType]?.trim()) return
    const ids = Array.from(selected.keys())
    const targetId = ids[Math.min(previewIdx, ids.length - 1)]
    const cachedLead = selected.get(targetId) || {}
    const bDetails = cachedLead.business_description || cachedLead.business_details || '';

    setPreviewLoading(true)
    try {
      const { data } = await waApi.preview({
        message: messages[focusedType],
        lead_id: targetId,
        lead_name: cachedLead.contact_name || cachedLead.name || '',
        lead_company: cachedLead.company_name || cachedLead.company || '',
        business_details: bDetails,
        personalise: form.personalise,
        message_type: focusedType
      })
      setPreviews(p => ({ ...p, [focusedType]: data?.message || '' }))
    } catch {
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => { schedulePreview() }, [messages, focusedType, form.personalise, selected.size, previewIdx])

  const triggerAIGenerate = async () => {
    setAiLoading(true)
    try {
      const target = MSG_TYPES.find(x => x.id === focusedType)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false, generate_template: true,
        message_type: focusedType, context_hint: target.hint
      })
      setMessages(p => ({ ...p, [focusedType]: data.message || '' }))
      toast.success(`${target.label} structure compiled successfully`)
    } catch {
      toast.error('Generation fault link drop')
    } finally {
      setAiLoading(false)
    }
  }

  const submitCampaignPipeline = async () => {
    if (!form.campaign_name.trim()) return toast.error('Enter valid campaign grouping label')
    if (selected.size === 0) return toast.error('Target set array is empty')
    
    // Check configured parameters are explicitly present before shipping array shapes
    const enabledList = Array.from(activeTypes)
    for(const type of enabledList) {
      if(type !== 'image' && !messages[type]?.trim()) return toast.error(`Please compile your ${type.toUpperCase()} layout template content`)
    }

    setSubmitting(true)
    try {
      await waApi.campaignCreate({
        campaign_name: form.campaign_name,
        lead_ids: leadIds,
        personalise: form.personalise,
        daily_limit: form.daily_limit,
        send_order: form.send_order,
        selected_types: enabledList,
        hook_template: messages.hook || "",
        detailed_template: messages.detailed || "",
        image_template: messages.image || "",
        image_base64: imageUrl ? imageUrl.split(',')[1] : ""
      })
      toast.success(`Cluster pipeline triggered for ${selected.size} targeted recipients`)
      setTimeout(onDone, 500)
    } catch {
      toast.error('Campaign schema processing crash validation rejection')
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
              <div><label className="field-label">Daily Allocation Cap</label><input type="number" min={1} max={50} className="input" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: Math.min(parseInt(e.target.value) || 50, 50) })} /></div>
            </div>

            {/* Selection Combo Matrices Boxes Trigger */}
            <div>
              <label className="field-label mb-1.5 block">Select Active Variant Configuration Combo</label>
              <div className="grid grid-cols-3 gap-2">
                {MSG_TYPES.map(t => {
                  const active = activeTypes.has(t.id)
                  return (
                    <button key={t.id} onClick={() => toggleType(t.id)} className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${active ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <TypeIcon id={t.id} size={14} />
                      {t.label} Variant
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Focus Tab Switcher viewport panels */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {Array.from(activeTypes).map(typeId => (
                  <button key={typeId} onClick={() => setFocusedType(typeId)} className={`flex-1 py-1 text-center font-bold text-xs rounded-lg uppercase transition-all ${focusedType === typeId ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400'}`}>
                    Edit {typeId}
                  </button>
                ))}
              </div>

              {focusedType === 'image' && (
                <div className="fade-up">
                  {imageUrl ? (
                    <div className="relative mb-2 w-full h-24 border rounded-xl overflow-hidden"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow border"><X size={10} /></button></div>
                  ) : (
                    <button onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=e=>{ const f=e.target.files[0]; const r=new FileReader(); r.onload=ev=>setImageUrl(ev.target.result); r.readAsDataURL(f) }; i.click() }} className="w-full h-20 border-2 border-dashed rounded-xl text-xs text-slate-400 flex flex-col items-center justify-center gap-1"><Image size={15} /> Upload Media Attachment Layer</button>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">{activeConfigMeta?.label} Base Content</span>
                  <button onClick={triggerAIGenerate} disabled={aiLoading} className="text-xs font-bold text-emerald-600 flex items-center gap-1">{aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Compile Template Asset</button>
                </div>
                <textarea className="textarea h-32 font-mono text-xs" value={messages[focusedType]} onChange={e => setMessages({ ...messages, [focusedType]: e.target.value })} placeholder={activeConfigMeta?.placeholder} />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t text-xs">
              <div><p className="font-bold text-slate-700">Dynamic Profile Rewriting Engine</p><p className="text-slate-400">Context schema variables inject automatically from the database index profile matching metrics.</p></div>
              <button onClick={() => setForm({ ...form, personalise: !form.personalise })} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} /></button>
            </div>
          </div>

          <div className="card p-5"><label className="field-label mb-2 block">Recipient Segment Node Target</label><LeadSelector selected={selected} onChange={setSelected} requirePhone={true} /></div>
        </div>

        {/* Live Multi-Variant Simulator Workspace View */}
        <div>
          <div className="card p-5 sticky top-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><Eye size={13} /> Simulation Viewport Panel</span>
              {leadIds.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border">
                  <button onClick={() => setPreviewIdx(p => Math.max(0, p - 1))} disabled={previewIdx === 0} className="font-bold">‹</button>
                  <span>{previewIdx + 1}/{leadIds.length}</span>
                  <button onClick={() => setPreviewIdx(p => Math.min(leadIds.length - 1, p + 1))} disabled={previewIdx >= leadIds.length - 1} className="font-bold">›</button>
                </div>
              )}
            </div>

            {selected.size === 0 && <div className="py-12 text-center text-xs text-slate-400 border border-dashed rounded-xl">Select a customer data tracking row item parameter logic to view dynamic response matrices</div>}
            {previewLoading && <div className="py-12 flex justify-center"><Loader2 size={16} className="animate-spin text-emerald-500" /></div>}

            {!previewLoading && messages[focusedType]?.trim() && selected.size > 0 && (
              <div className="space-y-3 fade-up">
                <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Simulated Device Output Layout ({focusedType}):</p>
                <div className="p-4 rounded-xl shadow-inner border" style={{ backgroundColor: '#e5ddd5' }}>
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-2xs max-w-[85%] text-xs space-y-1 text-slate-800 leading-relaxed">
                      {focusedType === 'image' && imageUrl && <img src={imageUrl} className="w-full h-20 object-cover rounded-lg mb-1" />}
                      <p className="whitespace-pre-wrap">{previews[focusedType] || messages[focusedType]}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl text-[11px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-700 block mb-1">Target Account Profile Verification Checklist:</span>
                  <p><strong className="text-slate-600">Company Name:</strong> {activeLead?.company_name || activeLead?.company || '-'}</p>
                  <p className="line-clamp-2"><strong className="text-slate-600">Context Summary Vector:</strong> {activeLead?.business_description || activeLead?.business_details || 'Empty value string field context'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t">
        <button onClick={onBack} className="px-4 py-1.5 text-xs border rounded-xl font-bold hover:bg-slate-50">Cancel</button>
        <button onClick={submitCampaignPipeline} disabled={submitting || selected.size === 0} className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm disabled:opacity-40">
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
    if (!messages[type]?.trim()) return toast.error('Enter content layout parameter parameters text first')
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
    if (!lead?.phone) return toast.error('Select target recipient index node handle parameter parameters configuration')
    const types = Array.from(activeTypes)
    setSending(true)
    const sent = new Set()

    for (const type of types) {
      const finalMsg = previews[type]?.message || messages[type] || ''
      try {
        if (type === 'image') {
          if (!imageFile) { toast.error('Upload image file attachment'); continue }
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
        toast.error(`Fault drop-off on output branch element ${type.toUpperCase()}`)
      }
    }

    setSending(false)
    if (sent.size > 0) {
      toast.success('Dispatched variant operations stack successfully')
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
        <div className="card p-5"><span className="field-label mb-2 block">Direct Target Node Picker</span><LeadSelector selected={lead ? new Map([[lead.id, lead]]) : new Map()} onChange={(map) => setLead(Array.from(map.values())[0] || null)} requirePhone={true} /></div>
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
                  <button key={t.id} onClick={() => toggleType(t.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${active ? `${colors.pill} border-current` : 'bg-slate-50 text-slate-400'}`}>
                    <span className="flex items-center gap-1.5"><TypeIcon id={t.id} /> {t.label} Layout</span>
                    {active && <Check size={12} />}
                  </button>
                )
              })}
            </div>
          </div>
          <button onClick={executeSend} disabled={sending || !lead} className="btn-primary w-full justify-center text-xs font-bold py-2">{sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Execute Single Send Dispatch</button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {MSG_TYPES.filter(t => activeTypes.has(t.id)).map(t => {
          const colors = TYPE_COLORS[t.id]
          return (
            <div key={t.id} className="card p-5 space-y-3">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${colors.header}`}><TypeIcon id={t.id} /> {t.label} Layer</span>
                <button onClick={() => generateSingleMsg(t.id)} disabled={generating[t.id]} className="text-xs font-bold text-emerald-600 flex items-center gap-1">{generating[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Compile</button>
              </div>

              {t.id === 'image' && (
                <div>
                  {imageUrl ? (
                    <div className="relative w-full h-20 border rounded-xl overflow-hidden mb-2"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={() => { setImageFile(null); setImageUrl(null) }} className="absolute top-1 right-1 p-1 bg-white border rounded-full shadow"><X size={10} /></button></div>
                  ) : (
                    <button onClick={() => imagePickRef.current?.click()} className="w-full h-16 border-2 border-dashed text-slate-400 text-xs flex flex-col items-center justify-center rounded-xl gap-1"><Image size={14} /> Link Dynamic Image File Asset</button>
                  )}
                  <input ref={imagePickRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files[0]; if(f){ setImageFile(f); const r=new FileReader(); r.onload=ev=>setImageUrl(ev.target.result); r.readAsDataURL(f) } }} />
                </div>
              )}

              <textarea className="textarea font-mono text-xs h-24" value={messages[t.id]} onChange={e => setMsg(t.id, e.target.value)} placeholder={t.placeholder} />
              <div className="flex gap-2 items-start">
                <button onClick={() => previewSingleType(t.id)} disabled={previewing[t.id] || !messages[t.id]?.trim()} className="btn-secondary py-1 text-xs px-3 font-bold flex items-center gap-1">{previewing[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Parse Sandbox</button>
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
// GLOBAL SYSTEM MAIN EXPORT LAYER
// ═══════════════════════════════════════════════════════════
export default function WhatsAppPage() {
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)

  return (
    <div className="p-1 space-y-4 max-w-7xl mx-auto">
      {view === 'list' && (
        <CampaignList
          onCreate={() => setView('create')}
          onSingle={() => setView('single')}
          onDetail={id => { setDetailId(id); setView('detail') }}
        />
      )}
      {view === 'create' && <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'detail' && <CampaignDetail id={detailId} onBack={() => setView('list')} />}
      {view === 'single' && (
        <div className="space-y-4">
          <button onClick={() => setView('list')} className="btn-ghost -ml-2 text-xs font-bold flex items-center gap-1 text-slate-400 hover:text-slate-800"><ChevronLeft size={14} /> Back to core monitor</button>
          <WhatsAppSingleSend />
        </div>
      )}
    </div>
  )
}