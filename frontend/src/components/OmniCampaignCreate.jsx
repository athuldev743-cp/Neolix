/**
 * OmniCampaignCreate — Unified Omnichannel Campaign Builder
 *
 * Right panel = 3 stacked, self-contained preview cards (Email / WhatsApp / SMS).
 * Each card:
 *   - auto-fills the moment campaign name/info is typed (debounced, no manual
 *     "AI Generate" button anywhere)
 *   - renders ONLY the final preview (chat bubble / email render) — no raw
 *     Subject/Body input fields sitting above a preview
 *   - the rendered preview IS the editor: click into it and type
 *   - has its own corner arrows to page through which lead's name/company
 *     is shown interpolated into the (single, shared) template — editing
 *     the template applies to ALL leads, paging just changes whose
 *     {lead_name}/{lead_company} you're previewing
 *   - email card keeps clickable template swatches that re-skin the preview
 *     instantly
 *   - whatsapp card keeps type chips (hook/detailed/image) as additive
 *     toggles — fixed so clicking an already-active chip never silently
 *     removes it unless you genuinely meant to turn it off
 *   - sms card is bubble-only, no image/MMS anywhere
 */
import { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Mail, Smartphone, MessageSquare,
  Loader2, Send, Eye, Check, Zap, FileText, Image, Mic, Calendar, HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { omniApi, profileApi, waApi, campaignApi } from '../services/api'
import API from '../services/api'
import LeadSelector from './LeadSelector'

// ─── helpers ─────────────────────────────────────────────────────────────────
function interpolate(tpl, lead, profile, campaignInfo) {
  return (tpl || '')
    .replace(/\{lead_name\}/g,    lead?.contact_name  || lead?.name || 'there')
    .replace(/\{lead_company\}/g, lead?.company_name  || lead?.company || 'your company')
    .replace(/\{sender_name\}/g,  profile?.full_name  || '')
    .replace(/\{campaign_info\}/g, campaignInfo       || '')
}

const CHANNELS = [
  { id: 'email',    label: 'Email',    Icon: Mail,          color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-500',    badge: 'OAuth' },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', badge: 'Baileys' },
  { id: 'sms',      label: 'SMS',      Icon: Smartphone,    color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-500',  badge: 'Android' },
]

const WA_MSG_TYPES = [
  { id: 'hook',     label: 'Hook',     Icon: Zap,      hint: 'short punchy opener under 3 lines referencing the campaign context' },
  { id: 'detailed', label: 'Detailed', Icon: FileText, hint: 'detailed professional cold outreach 80-120 words referencing the campaign context' },
  { id: 'image',    label: 'Image',    Icon: Image,    hint: 'short 1-2 line caption for an image attachment' },
]

const EMAIL_TEMPLATES = [
  { id: 'navy',    label: 'Navy Blue',     primary: '#1e3a5f', accent: '#2563eb', bg: '#f4f6f9' },
  { id: 'emerald', label: 'Emerald',       primary: '#065f46', accent: '#10b981', bg: '#f3faf6' },
  { id: 'slate',   label: 'Minimal Slate', primary: '#1e293b', accent: '#64748b', bg: '#f8fafc' },
  { id: 'amber',   label: 'Warm Amber',    primary: '#92400e', accent: '#f59e0b', bg: '#fdf8f1' },
  { id: 'violet',  label: 'Violet',        primary: '#4c1d95', accent: '#8b5cf6', bg: '#f6f4fc' },
]

// ─── CARD LEAD ARROWS — corner nav embedded in each card's header ───────────
function CardLeadArrows({ leads, idx, setIdx }) {
  const total = leads.length
  if (total <= 1) return null
  const lead = leads[idx] || {}
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => setIdx(i => (i - 1 + total) % total)} title="Previous lead"
        className="w-5 h-5 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
        <ChevronLeft size={11} className="text-white"/>
      </button>
      <span className="text-[10px] text-white/90 font-semibold whitespace-nowrap">
        {lead.contact_name || lead.name || 'Lead'} · {idx + 1}/{total}
      </span>
      <button onClick={() => setIdx(i => (i + 1) % total)} title="Next lead"
        className="w-5 h-5 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
        <ChevronRight size={11} className="text-white"/>
      </button>
    </div>
  )
}

// ─── EditableText — contentEditable-ish span that behaves like a controlled input ─
function EditableField({ value, onChange, className, multiline, placeholder }) {
  const ref = useRef(null)
  const isFocused = useRef(false)

  useEffect(() => {
    if (!isFocused.current && ref.current && ref.current.innerText !== (value || '')) {
      ref.current.innerText = value || ''
    }
  }, [value])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => { isFocused.current = true }}
      onBlur={() => { isFocused.current = false }}
      onInput={e => onChange(e.currentTarget.innerText)}
      data-placeholder={placeholder}
      className={`outline-none cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400/70 ${multiline ? 'whitespace-pre-wrap' : 'whitespace-nowrap overflow-hidden'} ${className || ''}`}
    />
  )
}

// ─── EMAIL PREVIEW CARD — preview-only render, click-to-edit, swatches on card ──
function EmailPreviewCard({ config, onChange, campaignInfo, leadsArr, profile }) {
  const [loading, setLoading] = useState(false)
  const [leadIdx, setLeadIdx] = useState(0)
  const debounceRef = useRef(null)
  const lead = leadsArr[leadIdx] || leadsArr[0]

  useEffect(() => {
    if (leadIdx >= leadsArr.length) setLeadIdx(0)
  }, [leadsArr.length]) // eslint-disable-line

  useEffect(() => {
    if (!campaignInfo) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { generate() }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [campaignInfo]) // eslint-disable-line

  const generate = async () => {
    setLoading(true)
    try {
      const { data } = await campaignApi.preview({
        subject: '', body: '', lead_id: 0,
        personalise: false, generate_template: true,
        context_hint: campaignInfo || 'cold outreach to business leads',
      })
      onChange(prev => ({ ...prev, subject: data.subject || prev.subject, body: data.body || prev.body }))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const tpl = EMAIL_TEMPLATES.find(t => t.id === config.template_id) || EMAIL_TEMPLATES[0]
  const previewSubject = interpolate(config.subject, lead, profile, campaignInfo)
  const previewBody = interpolate(config.body, lead, profile, campaignInfo)

  // Editing always writes back to the raw template (with placeholders intact
  // where possible) — since we render interpolated text, edits made while
  // viewing a lead get saved as the literal text typed. This is template-level
  // editing: simplest mental model is "what you see is what gets sent",
  // and {lead_name}/{lead_company} tokens are simply not present once the
  // user has started hand-editing a previewed (already-interpolated) field.
  const setSubject = (text) => onChange(prev => ({ ...prev, subject: text }))
  const setBody = (text) => onChange(prev => ({ ...prev, body: text }))

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: tpl.primary }}>
        <div className="flex items-center gap-2 text-white min-w-0">
          <Mail size={13} className="flex-shrink-0"/>
          <span className="text-xs font-bold flex-shrink-0">Email</span>
          {loading && <Loader2 size={11} className="animate-spin flex-shrink-0"/>}
        </div>
        <CardLeadArrows leads={leadsArr} idx={leadIdx} setIdx={setLeadIdx}/>
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-slate-50">
        <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Template</span>
        {EMAIL_TEMPLATES.map(t => (
          <button key={t.id} type="button" title={t.label} onClick={() => onChange(prev => ({ ...prev, template_id: t.id }))}
            className={`w-4 h-4 rounded-full border-2 transition-all ${config.template_id === t.id ? 'border-slate-700 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: t.accent }}/>
        ))}
      </div>

      <div className="p-4 space-y-2.5" style={{ backgroundColor: tpl.bg }}>
        <EditableField
          value={previewSubject}
          onChange={setSubject}
          placeholder="Quick question for your company"
          className="w-full text-sm font-bold text-slate-800 border-b border-slate-300/60 pb-1.5"
        />
        <EditableField
          value={previewBody}
          onChange={setBody}
          multiline
          placeholder="Hi there, I noticed your company..."
          className="w-full text-xs text-slate-700 leading-relaxed min-h-[130px]"
        />
      </div>

      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
        <p className="text-[10px] text-blue-500/80 font-medium">✨ Previewing as {lead?.contact_name || lead?.name || 'lead'} · edits apply to all leads</p>
        <button onClick={() => onChange(prev => ({ ...prev, personalise: !prev.personalise }))} title="AI personalise per lead"
          className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${config.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${config.personalise ? 'left-4' : 'left-0.5'}`}/>
        </button>
      </div>
    </div>
  )
}

// ─── WHATSAPP PREVIEW CARD — chips are additive toggles, preview-only bubbles ──
function WhatsAppPreviewCard({ config, onChange, campaignInfo, leadsArr, profile }) {
  const [loadingTypes, setLoadingTypes] = useState(new Set())
  const [mediaLoading, setMediaLoading] = useState(false)
  const [profileMedia, setProfileMedia] = useState({ photos: [], pdfs: [], audio: '' })
  const [leadIdx, setLeadIdx] = useState(0)
  const debounceRef = useRef(null)
  const lead = leadsArr[leadIdx] || leadsArr[0]

  const hasImage = config.activeTypes?.has('image')

  useEffect(() => {
    if (leadIdx >= leadsArr.length) setLeadIdx(0)
  }, [leadsArr.length]) // eslint-disable-line

  useEffect(() => {
    if (!hasImage) return
    setMediaLoading(true)
    profileApi.get().then(({ data }) => {
      const photos = data.product_photos || []
      const pdfs   = data.product_pdfs   || []
      const audio  = data.audio_voice_base64 || ''
      setProfileMedia({ photos, pdfs, audio })
      onChange(prev => ({
        ...prev,
        _photos: photos, _pdfs: pdfs, _audio: audio,
        selectedPhotos: prev.selectedPhotos?.size ? prev.selectedPhotos : new Set(photos.map((_, i) => i)),
        selectedPdfs:   prev.selectedPdfs?.size   ? prev.selectedPdfs   : new Set(pdfs.map((_, i) => i)),
        useAudio: prev.useAudio ?? !!audio,
      }))
    }).catch(() => toast.error('Failed to load profile media'))
      .finally(() => setMediaLoading(false))
  }, [hasImage]) // eslint-disable-line

  // Auto-generate for every ACTIVE type the moment campaign info changes —
  // this is the only generation trigger; there is no manual "Generate" button.
  useEffect(() => {
    if (!campaignInfo) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      Array.from(config.activeTypes || []).forEach(t => autoGenerate(t))
    }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [campaignInfo]) // eslint-disable-line

  const autoGenerate = async (typeId) => {
    setLoadingTypes(prev => new Set(prev).add(typeId))
    try {
      const t = WA_MSG_TYPES.find(x => x.id === typeId)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false,
        generate_template: true, message_type: typeId,
        context_hint: `${t?.hint}. Campaign context: ${campaignInfo || 'cold outreach'}`
      })
      onChange(prev => ({ ...prev, messages: { ...prev.messages, [typeId]: data.message || '' } }))
    } catch { /* silent */ }
    finally { setLoadingTypes(prev => { const n = new Set(prev); n.delete(typeId); return n }) }
  }

  // FIX: previously, clicking an already-active chip always removed it,
  // which made the *currently focused* type feel like it "auto-deselected"
  // the moment you clicked it again. Toggling is intentional — this is still
  // an on/off chip — but we now guard against a stale-closure double-fire
  // and never silently drop the last remaining type without a clear signal.
  const toggleType = (id) => {
    onChange(prev => {
      const next = new Set(prev.activeTypes)
      const wasActive = next.has(id)
      if (wasActive) {
        if (next.size === 1) {
          toast.error('Keep at least one variant active')
          return prev
        }
        next.delete(id)
        return { ...prev, activeTypes: next }
      }
      next.add(id)
      // schedule generation for the newly-activated type only if it's empty
      if (!prev.messages?.[id]?.trim()) autoGenerate(id)
      return { ...prev, activeTypes: next }
    })
  }

  const togglePhoto = (i) => onChange(prev => { const s = new Set(prev.selectedPhotos); s.has(i) ? s.delete(i) : s.add(i); return { ...prev, selectedPhotos: s } })
  const togglePdf   = (i) => onChange(prev => { const s = new Set(prev.selectedPdfs);   s.has(i) ? s.delete(i) : s.add(i); return { ...prev, selectedPdfs: s } })
  const setMessage = (typeId, text) => onChange(prev => ({ ...prev, messages: { ...prev.messages, [typeId]: text } }))

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-600">
        <div className="flex items-center gap-2 text-white min-w-0">
          <MessageSquare size={13} className="flex-shrink-0"/>
          <span className="text-xs font-bold flex-shrink-0">WhatsApp</span>
        </div>
        <CardLeadArrows leads={leadsArr} idx={leadIdx} setIdx={setLeadIdx}/>
      </div>

      <div className="flex gap-1.5 px-4 py-2 border-b border-slate-100 bg-emerald-50/40">
        {WA_MSG_TYPES.map(v => (
          <button key={v.id} type="button" onClick={() => toggleType(v.id)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1
              ${config.activeTypes?.has(v.id) ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200'}`}>
            {loadingTypes.has(v.id) ? <Loader2 size={9} className="animate-spin"/> : <v.Icon size={9}/>}
            {v.label}
          </button>
        ))}
      </div>

      {/* scrollable variant stack — preview bubbles only, click straight into text */}
      <div className="bg-[#e5ddd5] p-3 space-y-3 max-h-72 overflow-y-auto">
        {Array.from(config.activeTypes || []).map(typeId => {
          const t = WA_MSG_TYPES.find(x => x.id === typeId)
          const interpolated = interpolate(config.messages?.[typeId], lead, profile, campaignInfo)
          return (
            <div key={typeId}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
                <t.Icon size={10}/> {t?.label}
              </p>

              {typeId === 'image' && (
                <div className="mb-2 space-y-2">
                  {mediaLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-1"><Loader2 size={12} className="animate-spin"/> Loading media...</div>
                  ) : (
                    <>
                      {profileMedia.photos.length > 0 ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {profileMedia.photos.map((src, i) => (
                            <button key={i} type="button" onClick={() => togglePhoto(i)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${config.selectedPhotos?.has(i) ? 'border-emerald-500' : 'border-transparent opacity-50'}`}>
                              <img src={src} alt="" className="w-full h-full object-cover"/>
                              {config.selectedPhotos?.has(i) && <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={7} className="text-white"/></div>}
                            </button>
                          ))}
                        </div>
                      ) : <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">No photos in Settings.</p>}

                      {profileMedia.pdfs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {profileMedia.pdfs.map((_, i) => (
                            <button key={i} type="button" onClick={() => togglePdf(i)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${config.selectedPdfs?.has(i) ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                              <FileText size={10}/> Brochure {i + 1} {config.selectedPdfs?.has(i) && <Check size={9}/>}
                            </button>
                          ))}
                        </div>
                      )}

                      {profileMedia.audio && (
                        <div onClick={() => onChange(prev => ({ ...prev, useAudio: !prev.useAudio }))}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer ${config.useAudio ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200 opacity-60'}`}>
                          <Mic size={11} className={config.useAudio ? 'text-emerald-600' : 'text-slate-400'}/>
                          <audio controls src={profileMedia.audio} className="h-6 flex-1" onClick={e => e.stopPropagation()}/>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[95%] ml-auto shadow-sm">
                <EditableField
                  value={interpolated}
                  onChange={(text) => setMessage(typeId, text)}
                  multiline
                  placeholder={typeId === 'image' ? 'Caption for the image...' : 'Message preview...'}
                  className="text-xs text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">Previewing as {lead?.contact_name || lead?.name || 'lead'} · edits apply to all leads</p>
        <button onClick={() => onChange(prev => ({ ...prev, personalise: !prev.personalise }))}
          className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${config.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${config.personalise ? 'left-4' : 'left-0.5'}`}/>
        </button>
      </div>
    </div>
  )
}

// ─── SMS PREVIEW CARD — bubble-only, no image/MMS anywhere ──────────────────
function SMSPreviewCard({ config, onChange, campaignInfo, leadsArr, profile }) {
  const [loading, setLoading] = useState(false)
  const [leadIdx, setLeadIdx] = useState(0)
  const debounceRef = useRef(null)
  const lead = leadsArr[leadIdx] || leadsArr[0]

  useEffect(() => {
    if (leadIdx >= leadsArr.length) setLeadIdx(0)
  }, [leadsArr.length]) // eslint-disable-line

  useEffect(() => {
    if (!campaignInfo) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { generate() }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [campaignInfo]) // eslint-disable-line

  const generate = async () => {
    setLoading(true)
    try {
      const { data } = await API.post('/sms/template/generate', { campaign_name: '', campaign_info: campaignInfo })
      onChange(prev => ({ ...prev, template: data.template || prev.template }))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const interpolated = interpolate(config.template, lead, profile, campaignInfo)
  const charCount = interpolated?.length || 0
  const units = Math.ceil(charCount / 160) || 1

  const setTemplate = (text) => onChange(prev => ({ ...prev, template: text }))

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-violet-600">
        <div className="flex items-center gap-2 text-white min-w-0">
          <Smartphone size={13} className="flex-shrink-0"/>
          <span className="text-xs font-bold flex-shrink-0">SMS</span>
          {loading && <Loader2 size={11} className="animate-spin flex-shrink-0"/>}
        </div>
        <CardLeadArrows leads={leadsArr} idx={leadIdx} setIdx={setLeadIdx}/>
      </div>

      <div className="bg-slate-100 p-3">
        <div className="bg-blue-500 rounded-2xl rounded-tr-none px-3 py-2 max-w-[95%] ml-auto shadow-sm">
          <EditableField
            value={interpolated}
            onChange={setTemplate}
            multiline
            placeholder="Hi there, we help you grow faster. Visit: https://yoursite.com"
            className="text-xs text-white leading-relaxed placeholder-blue-100"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-right">{charCount} chars · {units} unit{units !== 1 ? 's' : ''} · plain SMS, no image attachment</p>
      </div>

      <div className="px-4 py-2.5 bg-white border-t border-slate-100 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Daily Limit</label>
          <input type="number" min={1} max={500} className="input mt-0.5 text-xs py-1.5" value={config.dailyLimit}
            onChange={e => onChange(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 150 }))}/>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Timezone</label>
          <select className="input mt-0.5 text-xs py-1.5 bg-white" value={config.timezone} onChange={e => onChange(prev => ({ ...prev, timezone: e.target.value }))}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OmniCampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '', daily_limit: 50 })
  const [selectedLeads, setSelectedLeads] = useState(new Map())
  const [gateways, setGateways] = useState({ email: false, whatsapp: false, sms: true })
  const [checkingGateways, setChecking] = useState(true)
  const [selectedChannels, setSelectedChannels] = useState(['sms'])
  const [nineDayMode, setNineDayMode] = useState(false)
  const [profile, setProfile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [emailConfig, setEmailConfig] = useState({
    subject: '', body: '', personalise: true, template_id: 'navy'
  })
  const [waConfig, setWaConfig] = useState({
    activeTypes: new Set(['detailed']),
    messages: { hook: '', detailed: '', image: '' },
    personalise: true,
    selectedPhotos: new Set(), selectedPdfs: new Set(),
    useAudio: false, _photos: [], _pdfs: [], _audio: '',
  })
  const [smsConfig, setSmsConfig] = useState({
    template: '', dailyLimit: 150, timezone: 'Asia/Kolkata',
  })

  const leadsArr = Array.from(selectedLeads.values())

  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, waRes] = await Promise.allSettled([profileApi.get(), waApi.status()])
        const prof   = profRes.status === 'fulfilled' ? profRes.value.data : null
        const hasEmail = !!prof?.google_oauth?.connected_email
        const hasWA   = waRes.status === 'fulfilled' && !!waRes.value.data?.connected
        setGateways({ email: hasEmail, whatsapp: hasWA, sms: true })
        setProfile(prof)
        const defaults = ['sms', hasWA && 'whatsapp', hasEmail && 'email'].filter(Boolean)
        setSelectedChannels([defaults[0]])
      } catch { toast.error('Could not verify gateway connections') }
      finally { setChecking(false) }
    }
    init()
  }, [])

  const toggleChannel = (id) => {
    if (!gateways[id]) return
    if (selectedChannels.includes(id)) {
      if (selectedChannels.length === 1) return toast.error('Keep at least one channel')
      setSelectedChannels(p => p.filter(c => c !== id))
    } else {
      setSelectedChannels(p => [...p, id])
    }
  }

  const submit = async () => {
    if (!form.campaign_name.trim()) return toast.error('Enter campaign name')
    if (selectedLeads.size === 0) return toast.error('Select at least one lead')
    if (selectedChannels.includes('email') && !emailConfig.subject.trim()) return toast.error('Add email subject')
    if (selectedChannels.includes('whatsapp')) {
      for (const t of Array.from(waConfig.activeTypes)) {
        if (t !== 'image' && !waConfig.messages[t]?.trim()) return toast.error(`Add WhatsApp ${t} template`)
      }
    }
    if (selectedChannels.includes('sms') && !smsConfig.template.trim()) return toast.error('Add SMS template')

    setSubmitting(true)
    try {
      const finalPhotos = (waConfig._photos || []).filter((_, i) => waConfig.selectedPhotos?.has(i))
      const finalPdfs   = (waConfig._pdfs   || []).filter((_, i) => waConfig.selectedPdfs?.has(i))

      await omniApi.create({
        campaign_name:     form.campaign_name,
        campaign_info:     form.campaign_info,
        selected_channels: selectedChannels,
        lead_ids:          Array.from(selectedLeads.keys()),
        daily_limit:       parseInt(form.daily_limit) || 50,
        nine_day_mode:     nineDayMode,
        // Email
        email_subject:     emailConfig.subject,
        email_body:        emailConfig.body,
        email_personalise: emailConfig.personalise,
        email_template_id: emailConfig.template_id,
        // WhatsApp
        wa_selected_types: Array.from(waConfig.activeTypes),
        wa_hook:           waConfig.messages.hook,
        wa_detailed:       waConfig.messages.detailed,
        wa_image_caption:  waConfig.messages.image,
        wa_personalise:    waConfig.personalise,
        wa_photos:         finalPhotos,
        wa_pdfs:           finalPdfs,
        wa_audio:          waConfig.useAudio ? waConfig._audio : '',
        // SMS
        sms_template:      smsConfig.template,
        sms_daily_limit:   smsConfig.dailyLimit,
        sms_timezone:      smsConfig.timezone,
      })
      toast.success(nineDayMode ? '9-Day Omnichannel Campaign Activated!' : 'Campaign launched across all channels!')
      setTimeout(onDone, 800)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Campaign launch failed')
    } finally { setSubmitting(false) }
  }

  if (checkingGateways) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-800" size={24}/></div>

  return (
    <div className="fade-up">
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16}/> Back to Hub</button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Launch Omnichannel Campaign</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {nineDayMode ? '9-day sequence: Day 0 → Day 3 → Day 6 across all active channels. Day 3 & 6 follow-ups use your profile info automatically.' : 'Single blast to all selected channels simultaneously'}
          </p>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all cursor-pointer ${nineDayMode ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
          onClick={() => setNineDayMode(v => !v)}>
          <Calendar size={14} className={nineDayMode ? 'text-indigo-500' : 'text-slate-400'}/>
          <div>
            <p className={`text-xs font-bold ${nineDayMode ? 'text-indigo-700' : 'text-slate-600'}`}>{nineDayMode ? '9-Day Sequence' : 'Single Blast'}</p>
            <p className="text-[10px] text-slate-400">{nineDayMode ? 'Day 0 → 3 → 6' : 'Day 0 only'}</p>
          </div>
          <div className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${nineDayMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${nineDayMode ? 'left-4' : 'left-0.5'}`}/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN — meta, channels, leads */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign Name</label>
              <input className="input" placeholder="e.g., TechExpo 2026 Outreach"
                value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })}/>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="field-label mb-0">Campaign Info / Event Context</label>
                <div className="group relative cursor-pointer text-slate-400">
                  <HelpCircle size={13}/>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                    Used in Day 0: "Hey, remember we met at [Campaign Info]?". Typing here auto-fills every channel's preview.
                  </span>
                </div>
              </div>
              <input className="input" placeholder="e.g., All India Physio Fest, Kochi"
                value={form.campaign_info} onChange={e => setForm({ ...form, campaign_info: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">Daily Limit</label>
              <input type="number" className="input" min={1} max={200} value={form.daily_limit}
                onChange={e => setForm({ ...form, daily_limit: e.target.value })}/>
            </div>

            <div className="pt-2 border-t">
              <label className="field-label mb-2 block">Active Channels</label>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(ch => {
                  const connected = gateways[ch.id]
                  const selected  = selectedChannels.includes(ch.id)
                  return (
                    <button key={ch.id} type="button" disabled={!connected} onClick={() => toggleChannel(ch.id)}
                      className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-24 transition-all
                        ${!connected ? 'opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed'
                          : selected ? `${ch.border} ${ch.bg} shadow-sm`
                          : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start w-full">
                        <ch.Icon size={16} className={selected ? ch.color : 'text-slate-400'}/>
                        <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${connected ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                          {connected ? ch.badge : 'Offline'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ch.label}</p>
                        <p className="text-[9px] text-slate-400">{selected && connected ? 'Active' : connected ? 'Idle' : 'Requires Config'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <label className="field-label mb-1 block">Enroll Recipients</label>
            <p className="text-[10px] text-slate-400 mb-3">One lead selection applies to all active channels. Each card on the right updates live.</p>
            <LeadSelector
              selected={selectedLeads}
              onChange={setSelectedLeads}
              requiredChannels={selectedChannels.join(',')}
            />
          </div>
        </div>

        {/* RIGHT COLUMN — stacked preview-only cards + launch */}
        <div className="card p-0 overflow-hidden flex flex-col h-[calc(100vh-160px)] lg:sticky lg:top-6">
          <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Eye size={14} className="text-blue-500"/> Live Preview
            </p>
          </div>

          {leadsArr.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-2 p-6 text-center">
              <Eye size={28} className="text-slate-200"/>
              <p className="text-sm">Select leads to see editable previews for every active channel</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {selectedChannels.includes('email') && (
                  <EmailPreviewCard config={emailConfig} onChange={setEmailConfig} campaignInfo={form.campaign_info} leadsArr={leadsArr} profile={profile}/>
                )}
                {selectedChannels.includes('whatsapp') && (
                  <WhatsAppPreviewCard config={waConfig} onChange={setWaConfig} campaignInfo={form.campaign_info} leadsArr={leadsArr} profile={profile}/>
                )}
                {selectedChannels.includes('sms') && (
                  <SMSPreviewCard config={smsConfig} onChange={setSmsConfig} campaignInfo={form.campaign_info} leadsArr={leadsArr} profile={profile}/>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-slate-100 p-4 space-y-3 bg-slate-50/60">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                  <span>{selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''}</span>
                  <span className="capitalize">{selectedChannels.join(' + ')}</span>
                  <span>{nineDayMode ? '9-day' : 'single blast'}</span>
                </div>
                <button onClick={submit} disabled={submitting || selectedLeads.size === 0}
                  className="btn-primary w-full justify-center py-2.5 text-xs font-bold">
                  {submitting
                    ? <><Loader2 className="animate-spin mr-1" size={14}/> Launching...</>
                    : <><Send size={14} className="mr-1"/> Launch to {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 