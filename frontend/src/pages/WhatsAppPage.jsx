import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Eye, X, MessageSquare, Sparkles,
  Image, FileText, Zap, RefreshCw, Plus, ChevronLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { waApi } from '../services/api'
// Importing the shared unified lead selector component
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
// CAMPAIGN LIST
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
      toast.error('Failed to load WhatsApp campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">WhatsApp Campaigns</h2>
          <p className="text-sm text-slate-400 mt-0.5">AI-personalised outreach via WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={16} /></button>
          <button onClick={onSingle} className="btn-secondary"><Send size={16} /> Single Send</button>
          <button onClick={onCreate} className="btn-primary"><Plus size={16} /> Start Campaign</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>}

      {!loading && camps.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare size={36} className="mb-3 text-slate-200" />
          <p className="font-medium text-slate-600 mb-1">No WhatsApp campaigns yet</p>
          <p className="text-sm mb-4">Create your first WhatsApp outreach campaign</p>
          <button onClick={onCreate} className="btn-primary"><Plus size={15} /> Start Campaign</button>
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
                <p className="text-xs text-slate-400 mb-2">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '-'} · {c.daily_limit}/day</p>
                <div className="h-1.5 bg-slate-100 rounded-full w-40">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex gap-5 text-right flex-shrink-0">
                <div><p className="text-xl font-bold text-slate-900">{c.total_leads?.toLocaleString() || 0}</p><p className="text-xs text-slate-400">leads</p></div>
                <div><p className="text-xl font-bold text-emerald-600">{c.sent?.toLocaleString() || 0}</p><p className="text-xs text-slate-400">sent</p></div>
                <div><p className="text-xl font-bold text-red-500">{c.failed?.toLocaleString() || 0}</p><p className="text-xs text-slate-400">failed</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN DETAIL VIEW
// ═══════════════════════════════════════════════════════════
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data: d } = await waApi.campaignDetail(id)
      setData(d)
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>
  if (!data) return null

  const sc = { sent: 'text-emerald-600', failed: 'text-red-500', pending: 'text-slate-400' }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-slate-900 flex-1">{data.name}</h2>
        <span className={statusBadge[data.status] || 'badge-gray'}>{data.status?.toUpperCase()}</span>
        <button onClick={load} className="btn-icon"><RefreshCw size={15} /></button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: data.total_leads?.toLocaleString() || 0, color: 'text-slate-900' },
          { label: 'Sent', value: data.sent?.toLocaleString() || 0, color: 'text-emerald-600' },
          { label: 'Failed', value: data.failed?.toLocaleString() || 0, color: 'text-red-500' },
          { label: 'Limit', value: `${data.daily_limit || 0}/day`, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(data.fail_reasons || {}).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Failure Logs</p>
          {Object.entries(data.fail_reasons).map(([r, c]) => (
            <div key={r} className="flex justify-between py-1.5 border-b border-red-100 last:border-0 text-sm">
              <span className="text-red-700 truncate mr-4">{r}</span>
              <span className="text-red-600 font-bold">{c}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Sends</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead><tr><th>Name</th><th>Company</th><th>WhatsApp</th><th>Status</th><th>Error</th><th>Sent at</th></tr></thead>
            <tbody>
              {(data.leads_preview || []).map((l, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-900">{l.name || '-'}</td>
                  <td>{l.company || '-'}</td>
                  <td className="text-emerald-600 text-xs">+{l.phone}</td>
                  <td><span className={`text-xs font-semibold ${sc[l.status] || 'text-slate-400'}`}>{l.status?.toUpperCase()}</span></td>
                  <td className="text-xs text-red-500 max-w-xs truncate">{l.error || '-'}</td>
                  <td className="text-xs text-slate-400">{l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : '-'}</td>
                </tr>
              ))}
              {!data.leads_preview?.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No sends yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CREATE VIEW
// ═══════════════════════════════════════════════════════════
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', message_template: '', personalise: true, daily_limit: 50, send_order: 'as_selected' })
  const [selected, setSelected] = useState(new Map())
  const [preview, setPreview] = useState(null)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef()

  const leadIds = Array.from(selected.keys())

  const schedulePreview = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(loadPreview, 900)
  }

  const loadPreview = async () => {
    if (selected.size === 0 || !form.message_template.trim()) return
    const ids = Array.from(selected.keys())
    const currentLeadId = ids[Math.min(previewIdx, ids.length - 1)]
    const cachedLead = selected.get(currentLeadId) || {}
    
    setPreviewLoading(true)
    try {
      const { data } = await waApi.preview({
        message: form.message_template,
        lead_id: currentLeadId,
        lead_name: cachedLead.contact_name || cachedLead.name || '',
        lead_company: cachedLead.company_name || cachedLead.company || '',
        // Explicitly ensuring business_details are mapped from the schema context map
        business_details: cachedLead.business_details || cachedLead.business_description || '',
        lead_business_details: cachedLead.business_details || cachedLead.business_description || '',
        personalise: form.personalise,
        message_type: 'detailed'
      })
      setPreview(data && typeof data.message === 'string' ? data : { message: String(data?.message || '') })
    } catch {
      /* fail silently on incomplete template parameters */
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => { schedulePreview() }, [form.message_template, form.personalise, selected.size, previewIdx])

  const generateTemplate = async () => {
    setAiLoading(true)
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_id: 0,
        personalise: false,
        generate_template: true,
        message_type: 'detailed',
        context_hint: form.campaign_name || 'WhatsApp cold outreach to business leads',
      })
      setForm(p => ({ ...p, message_template: data.message || '' }))
      toast.success('Message template generated')
    } catch {
      toast.error('AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const submit = async () => {
    if (!form.campaign_name.trim() || !form.message_template.trim()) { toast.error('Fill campaign name and message'); return }
    if (selected.size === 0) { toast.error('Select at least one lead'); return }
    setSubmitting(true)
    try {
      await waApi.campaignCreate({ ...form, daily_limit: Math.min(form.daily_limit, 50), lead_ids: leadIds })
      toast.success(`WhatsApp campaign started for ${selected.size} leads`)
      setTimeout(onDone, 700)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Campaign creation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back</button>
      <h2 className="text-xl font-bold text-slate-900 mb-5">New WhatsApp Campaign</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign name</label>
              <input className="input" placeholder="e.g. WhatsApp Outreach - May" value={form.campaign_name}
                onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Daily limit <span className="normal-case font-normal text-slate-400">(max 50)</span></label>
                <input type="number" min={1} max={50} className="input" value={form.daily_limit}
                  onChange={e => setForm(p => ({ ...p, daily_limit: Math.min(parseInt(e.target.value) || 50, 50) }))} />
              </div>
              <div>
                <label className="field-label">Send order</label>
                <select className="input" value={form.send_order} onChange={e => setForm(p => ({ ...p, send_order: e.target.value }))}>
                  <option value="as_selected">As selected</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0">Message Template</label>
                <button onClick={generateTemplate} disabled={aiLoading} className="btn-ghost btn-sm text-emerald-600 text-xs">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI generate
                </button>
              </div>
              <textarea className="textarea h-44 font-mono text-xs" value={form.message_template}
                onChange={e => { setForm(p => ({ ...p, message_template: e.target.value })); setPreview(null) }}
                placeholder={"Hi {lead_name},\n\nI came across {lead_company}...\n\n{sender_name}"} />
              <p className="text-[10px] text-slate-400 mt-1">
                Supports: <code>{'{lead_name}'}</code>, <code>{'{lead_company}'}</code>, <code>{'{sender_name}'}</code>
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">AI personalisation</p>
                <p className="text-xs text-slate-400">Uses business description from each lead</p>
              </div>
              <button onClick={() => setForm(p => ({ ...p, personalise: !p.personalise }))}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${form.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.personalise ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-3 block">Add WhatsApp Contacts</label>
            <LeadSelector selected={selected} onChange={setSelected} requirePhone={true} />
          </div>
        </div>

        {/* Live Preview Panel Container */}
        <div>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Eye size={14} className="text-slate-400" /> Live WhatsApp Preview</p>
              {leadIds.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <button onClick={() => setPreviewIdx(p => Math.max(0, p - 1))} disabled={previewIdx === 0} className="btn-icon p-1 disabled:opacity-30">‹</button>
                  {previewIdx + 1}/{leadIds.length}
                  <button onClick={() => setPreviewIdx(p => Math.min(leadIds.length - 1, p + 1))} disabled={previewIdx >= leadIds.length - 1} className="btn-icon p-1 disabled:opacity-30">›</button>
                </div>
              )}
            </div>

            {selected.size === 0 && <div className="py-12 text-center text-sm text-slate-400">Select leads to view dynamic simulation</div>}
            {previewLoading && <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>}
            
            {!previewLoading && preview && selected.size > 0 && (
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: '#e5ddd5' }}>
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{preview.message}</p>
                      <p className="text-[10px] text-slate-500 text-right mt-1">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </p>
                    </div>
                  </div>
                </div>
                {/* Visual debug section to confirm business context is parsed successfully */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-500">
                  <span className="font-semibold block text-slate-700 mb-1">Active Prompting Metadata:</span>
                  <p className="truncate"><strong className="text-slate-600">Company:</strong> {selected.get(leadIds[Math.min(previewIdx, leadIds.length - 1)])?.company_name || 'None'}</p>
                  <p className="text-slate-600 mt-1"><strong className="text-slate-600">AI Context Profile:</strong> {selected.get(leadIds[Math.min(previewIdx, leadIds.length - 1)])?.business_details || 'No business description provided for this record'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-8">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Creating...' : `Send to ${selected.size} leads`}
        </button>
        <button onClick={onBack} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WHATSAPP SINGLE SEND VIEW
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

  const generateSingleMsg = async (type) => {
    const t = MSG_TYPES.find(x => x.id === type)
    setGenerating(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: '',
        lead_name: lead?.name || '',
        lead_company: lead?.company || '',
        business_details: lead?.business_details || '',
        personalise: false,
        generate_template: true,
        message_type: type,
        context_hint: t.hint,
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
    if (!messages[type]?.trim()) { toast.error('Enter a message first'); return }
    setPreviewing(p => ({ ...p, [type]: true }))
    try {
      const { data } = await waApi.preview({
        message: messages[type],
        lead_name: lead?.name || '',
        lead_company: lead?.company || '',
        business_details: lead?.business_details || '',
        personalise,
        message_type: type,
      })
      setPreviews(p => ({ ...p, [type]: data }))
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(p => ({ ...p, [type]: false }))
    }
  }

  const executeSend = async () => {
    if (!lead?.phone) { toast.error('Select a recipient first'); return }
    const types = Array.from(activeTypes)
    
    setSending(true)
    const sent = new Set()

    for (const type of types) {
      const finalMsg = previews[type]?.message || messages[type] || ''
      try {
        if (type === 'image') {
          if (!imageFile) { toast.error('Upload image file first'); continue }
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
      } catch (e) {
        toast.error(`Dispatch failed for ${type}`)
      }
    }

    setSending(false)
    if (sent.size > 0) {
      toast.success('Dispatched successfully')
      setSentTypes(sent)
      setTimeout(() => {
        setLead(null)
        setMessages({ hook: '', detailed: '', image: '' })
        setPreviews({ hook: null, detailed: null, image: null })
        setImageFile(null)
        setImageUrl(null)
        setSentTypes(new Set())
      }, 1500)
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
    hook: { pill: 'bg-yellow-50 border-yellow-200 text-yellow-700', preview: 'bg-yellow-50 border border-yellow-200 text-yellow-900', header: 'text-yellow-700' },
    detailed: { pill: 'bg-blue-50 border-blue-200 text-blue-700', preview: 'bg-blue-50 border border-blue-200 text-blue-900', header: 'text-blue-700' },
    image: { pill: 'bg-purple-50 border-purple-200 text-purple-700', preview: 'bg-purple-50 border border-purple-200 text-purple-900', header: 'text-purple-700' },
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <MessageSquare size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Direct WhatsApp Dispatch</h1>
          <p className="text-xs text-slate-400">Target a direct profile via contextual variants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          {/* Integrated dynamic target selector explicitly filtering for WhatsApp Numbers */}
          <div className="card p-5">
            <span className="field-label mb-2 block">Recipient Selection</span>
            <LeadSelector 
              selected={lead ? new Map([[lead.id, lead]]) : new Map()} 
              onChange={(map) => {
                const selectedLead = Array.from(map.values())[0]
                setLead(selectedLead ? { ...selectedLead, phone: selectedLead.phone } : null)
              }} 
              requirePhone={true} 
            />
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label mb-2">Message Matrix Configurations</label>
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

            <button onClick={executeSend} disabled={sending || !lead} className="btn-primary w-full">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Processing Pipeline...' : `Execute Single Send`}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {MSG_TYPES.filter(t => activeTypes.has(t.id)).map(t => {
            const colors = TYPE_COLORS[t.id]
            return (
              <div key={t.id} className={`card p-5 transition-all ${sentTypes.has(t.id) ? 'ring-2 ring-emerald-400' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${colors.header}`}><TypeIcon id={t.id} /> {t.label}</span>
                  <button onClick={() => generateSingleMsg(t.id)} disabled={generating[t.id]} className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    {generating[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Compile
                  </button>
                </div>

                {t.id === 'image' && (
                  <div className="mb-3">
                    {imageUrl ? (
                      <div className="relative mb-2">
                        <img src={imageUrl} alt="preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        <button onClick={() => { setImageFile(null); setImageUrl(null) }} className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-slate-500"><X size={11} /></button>
                      </div>
                    ) : (
                      <button onClick={() => imagePickRef.current?.click()} className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all mb-2">
                        <Image size={18} /><span className="text-xs">Attach Pipeline Image Asset</span>
                      </button>
                    )}
                    <input ref={imagePickRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImagePick(e.target.files[0])} />
                  </div>
                )}

                <textarea className="textarea font-mono text-xs leading-relaxed w-full mb-2" style={{ height: `${t.rows * 24}px` }}
                  value={messages[t.id]} onChange={e => setMsg(t.id, e.target.value)} placeholder={t.placeholder} />

                <div className="flex items-start gap-2">
                  <button onClick={() => previewSingleType(t.id)} disabled={previewing[t.id] || !messages[t.id]?.trim()} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    {previewing[t.id] ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Parse Sandbox
                  </button>
                  {previews[t.id] && (
                    <div className={`flex-1 rounded-xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${colors.preview}`}>
                      {previews[t.id].message}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTREE POINT
// ═══════════════════════════════════════════════════════════
export default function WhatsAppPage() {
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)

  return (
    <div>
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
        <div>
          <button onClick={() => setView('list')} className="btn-ghost -ml-2 mb-4">
            <ChevronLeft size={16} /> Back to campaigns
          </button>
          <WhatsAppSingleSend />
        </div>
      )}
    </div>
  )
}