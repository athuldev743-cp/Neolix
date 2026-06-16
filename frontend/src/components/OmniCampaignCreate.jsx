/**
 * OmniCampaignCreate — Unified Omnichannel Campaign Builder
 * Reuses CampaignCreate from EmailPage, CampaignCreate from WhatsAppPage,
 * and SMSCampaignCreate from SMSPage — all sharing one lead selection.
 * 9-Day sequence handled via omniApi on launch.
 */
import { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Mail, Smartphone, MessageSquare,
  Loader2, Send, Eye, EyeOff, Plus, Check, X,
  Zap, FileText, Image, Mic, ShieldCheck, HelpCircle,
  Calendar, ArrowRight
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
  { id: 'hook',     label: 'Hook',     rows: 4, placeholder: 'Hi {lead_name}\n\nWe help {lead_company}...\n\nWorth a chat?' },
  { id: 'detailed', label: 'Detailed', rows: 9, placeholder: 'Hi {lead_name},\n\nI came across {lead_company}...' },
  { id: 'image',    label: 'Image',    rows: 3, placeholder: 'Hi {lead_name} — sharing our catalogue.' },
]

const EMAIL_TEMPLATES = [
  { id: 'navy',    label: 'Navy Blue',     primary: '#1e3a5f', accent: '#2563eb', bg: '#f4f6f9' },
  { id: 'emerald', label: 'Emerald',       primary: '#065f46', accent: '#10b981', bg: '#f3faf6' },
  { id: 'slate',   label: 'Minimal Slate', primary: '#1e293b', accent: '#64748b', bg: '#f8fafc' },
  { id: 'amber',   label: 'Warm Amber',    primary: '#92400e', accent: '#f59e0b', bg: '#fdf8f1' },
  { id: 'violet',  label: 'Violet',        primary: '#4c1d95', accent: '#8b5cf6', bg: '#f6f4fc' },
]

// ─── EMAIL CONFIG PANEL (full feature parity with EmailPage) ─────────────────
function EmailConfigPanel({ config, onChange, campaignInfo }) {
  const [aiLoading, setAiLoading] = useState(false)

  const generate = async () => {
    setAiLoading(true)
    try {
      const { data } = await campaignApi.preview({
        subject: '', body: '', lead_id: 0,
        personalise: false, generate_template: true,
        context_hint: campaignInfo || 'cold outreach to business leads',
      })
      onChange({ ...config, subject: data.subject || config.subject, body: data.body || config.body })
      toast.success('Email template generated')
    } catch { toast.error('AI generation failed') }
    finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Template color picker */}
      <div>
        <label className="field-label">Email Template Style</label>
        <div className="grid grid-cols-5 gap-2 mt-1">
          {EMAIL_TEMPLATES.map(t => (
            <button key={t.id} type="button" onClick={() => onChange({ ...config, template_id: t.id })}
              className={`rounded-xl border-2 overflow-hidden text-left transition-all ${config.template_id === t.id ? 'border-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <div style={{ backgroundColor: t.primary }} className="h-8 w-full" />
              <div style={{ backgroundColor: t.bg }} className="h-8 w-full flex items-center justify-center">
                <div style={{ backgroundColor: t.accent }} className="w-6 h-1.5 rounded-full" />
              </div>
              <p className="text-[10px] font-semibold text-slate-600 text-center py-1 truncate px-1">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="field-label mb-0">Subject Line</label>
          <button onClick={generate} disabled={aiLoading} className="btn-ghost text-blue-600 text-xs flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} AI Generate
          </button>
        </div>
        <input className="input" placeholder="Quick question for {lead_company}"
          value={config.subject} onChange={e => onChange({ ...config, subject: e.target.value })} />
      </div>

      <div>
        <label className="field-label">Body Template</label>
        <textarea className="textarea h-36" placeholder={'Hi {lead_name},\n\nI noticed {lead_company}...'}
          value={config.body} onChange={e => onChange({ ...config, body: e.target.value })} />
        <p className="text-[10px] text-blue-500 font-medium mt-1">✨ {'{lead_name}'} and {'{lead_company}'} are replaced per lead</p>
      </div>

      <div className="flex items-center justify-between py-2 border-t border-slate-100">
        <div>
          <p className="text-sm font-medium text-slate-800">AI Personalisation</p>
          <p className="text-xs text-slate-400">Groq generates custom drafts per lead</p>
        </div>
        <button onClick={() => onChange({ ...config, personalise: !config.personalise })}
          className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${config.personalise ? 'bg-blue-500' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.personalise ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )
}

// ─── WHATSAPP CONFIG PANEL (full feature parity with WhatsAppPage) ────────────
function WhatsAppConfigPanel({ config, onChange, campaignInfo }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [profileMedia, setProfileMedia] = useState({ photos: [], pdfs: [], audio: '' })
  const debounceRef = useRef(null)

  const hasImage = config.activeTypes?.has('image')

  useEffect(() => {
    if (!hasImage) return
    setMediaLoading(true)
    profileApi.get().then(({ data }) => {
      const photos = data.product_photos || []
      const pdfs   = data.product_pdfs   || []
      const audio  = data.audio_voice_base64 || ''
      setProfileMedia({ photos, pdfs, audio })
      onChange({
        ...config,
        _photos: photos, _pdfs: pdfs, _audio: audio,
        selectedPhotos: new Set(photos.map((_, i) => i)),
        selectedPdfs:   new Set(pdfs.map((_, i) => i)),
        useAudio: !!audio,
      })
    }).catch(() => toast.error('Failed to load profile media'))
      .finally(() => setMediaLoading(false))
  }, [hasImage]) // eslint-disable-line

  // Auto-generate on campaign info change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (campaignInfo && config.focusedType) autoGenerate(config.focusedType)
    }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [campaignInfo]) // eslint-disable-line

  const autoGenerate = async (typeId) => {
    setAiLoading(true)
    try {
      const t = WA_MSG_TYPES.find(x => x.id === typeId)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false,
        generate_template: true, message_type: typeId,
        context_hint: `${t?.label} outreach. Campaign context: ${campaignInfo || 'cold outreach'}`
      })
      onChange({ ...config, messages: { ...config.messages, [typeId]: data.message || '' } })
    } catch { /* silent */ }
    finally { setAiLoading(false) }
  }

  const toggleType = (id) => {
    const next = new Set(config.activeTypes)
    if (next.has(id)) {
      if (next.size === 1) return toast.error('Keep at least one variant')
      next.delete(id)
    } else { next.add(id); autoGenerate(id) }
    onChange({ ...config, activeTypes: next, focusedType: next.has(config.focusedType) ? config.focusedType : Array.from(next)[0] })
  }

  const togglePhoto = (i) => { const s = new Set(config.selectedPhotos); s.has(i) ? s.delete(i) : s.add(i); onChange({ ...config, selectedPhotos: s }) }
  const togglePdf   = (i) => { const s = new Set(config.selectedPdfs);   s.has(i) ? s.delete(i) : s.add(i); onChange({ ...config, selectedPdfs: s }) }

  const focused = config.focusedType || 'detailed'
  const t = WA_MSG_TYPES.find(x => x.id === focused)

  return (
    <div className="space-y-4">
      {/* Variant toggles */}
      <div>
        <label className="field-label mb-2 block">Message Variants</label>
        <div className="grid grid-cols-3 gap-2">
          {WA_MSG_TYPES.map(v => (
            <button key={v.id} type="button" onClick={() => toggleType(v.id)}
              className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all
                ${config.activeTypes?.has(v.id) ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {v.id === 'hook' ? <Zap size={13}/> : v.id === 'detailed' ? <FileText size={13}/> : <Image size={13}/>}
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      {config.activeTypes?.size > 1 && (
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {Array.from(config.activeTypes).map(id => (
            <button key={id} type="button"
              onClick={() => { onChange({ ...config, focusedType: id }); if (!config.messages[id]?.trim()) autoGenerate(id) }}
              className={`flex-1 py-1 text-center font-bold text-xs rounded-lg uppercase transition-all ${focused === id ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>
              {id}
            </button>
          ))}
        </div>
      )}

      {/* Image media picker */}
      {focused === 'image' && (
        <div className="space-y-3">
          {mediaLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 size={13} className="animate-spin"/> Loading media...</div>
          ) : (
            <>
              {profileMedia.photos.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Photos <span className="text-emerald-600">({config.selectedPhotos?.size || 0} selected)</span></p>
                  <div className="grid grid-cols-4 gap-2">
                    {profileMedia.photos.map((src, i) => (
                      <button key={i} type="button" onClick={() => togglePhoto(i)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${config.selectedPhotos?.has(i) ? 'border-emerald-500' : 'border-slate-200 opacity-50'}`}>
                        <img src={src} alt="" className="w-full h-full object-cover"/>
                        {config.selectedPhotos?.has(i) && <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={9} className="text-white"/></div>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">No photos. <a href="/settings" className="font-bold underline">Add in Settings →</a></p>}

              {profileMedia.pdfs.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">PDFs <span className="text-emerald-600">({config.selectedPdfs?.size || 0} selected)</span></p>
                  {profileMedia.pdfs.map((_, i) => (
                    <button key={i} type="button" onClick={() => togglePdf(i)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left mb-1.5 transition-all ${config.selectedPdfs?.has(i) ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                      <FileText size={13} className={config.selectedPdfs?.has(i) ? 'text-emerald-600' : 'text-slate-400'}/>
                      <span className="text-xs font-semibold flex-1">Brochure {i+1}.pdf</span>
                      {config.selectedPdfs?.has(i) && <Check size={13} className="text-emerald-500"/>}
                    </button>
                  ))}
                </div>
              )}

              {profileMedia.audio && (
                <div onClick={() => onChange({ ...config, useAudio: !config.useAudio })}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${config.useAudio ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <Mic size={13} className={config.useAudio ? 'text-emerald-600' : 'text-slate-400'}/>
                  <audio controls src={profileMedia.audio} className="flex-1 h-7" onClick={e => e.stopPropagation()}/>
                  {config.useAudio && <Check size={13} className="text-emerald-500"/>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Template editor */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">{t?.label} Template</span>
          <button type="button" onClick={() => autoGenerate(focused)} disabled={aiLoading}
            className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            {aiLoading ? <Loader2 size={11} className="animate-spin"/> : <Zap size={11}/>} AI Generate
          </button>
        </div>
        <textarea className="textarea font-mono text-xs" rows={t?.rows || 5}
          value={config.messages?.[focused] || ''}
          placeholder={t?.placeholder || ''}
          onChange={e => onChange({ ...config, messages: { ...config.messages, [focused]: e.target.value } })}/>
      </div>

      <div className="flex items-center justify-between py-2 border-t border-slate-100">
        <div>
          <p className="text-sm font-medium text-slate-800">AI Personalisation</p>
          <p className="text-xs text-slate-400">Groq customises each message per lead</p>
        </div>
        <button onClick={() => onChange({ ...config, personalise: !config.personalise })}
          className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${config.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.personalise ? 'left-5' : 'left-0.5'}`}/>
        </button>
      </div>
    </div>
  )
}

// ─── SMS CONFIG PANEL (full feature parity with SMSPage) ─────────────────────
function SMSConfigPanel({ config, onChange, campaignInfo }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [profilePhotos, setProfilePhotos] = useState([])
  const debounceRef = useRef(null)

  useEffect(() => {
    profileApi.get().then(({ data }) => {
      setProfilePhotos(data.product_photos || [])
    }).catch(() => {}).finally(() => setMediaLoading(false))
    setMediaLoading(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { autoGenerate() }, 900)
    return () => clearTimeout(debounceRef.current)
  }, [campaignInfo]) // eslint-disable-line

  const autoGenerate = async () => {
    if (!campaignInfo) return
    setAiLoading(true)
    try {
      const { data } = await API.post('/sms/template/generate', {
        campaign_name: '', campaign_info: campaignInfo,
      })
      onChange({ ...config, template: data.template || config.template })
    } catch { /* silent */ }
    finally { setAiLoading(false) }
  }

  const finalImage = config.extraImageUrl || (config.selectedPhotoIdx != null ? profilePhotos[config.selectedPhotoIdx] : null)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="field-label mb-0">SMS Template</label>
          {aiLoading && <span className="text-xs font-bold text-violet-600 flex items-center gap-1"><Loader2 size={11} className="animate-spin"/> Auto-generating…</span>}
        </div>
        <textarea className="textarea h-28 font-mono text-xs"
          placeholder={'Hi {lead_name}, we help {lead_company} grow faster. Visit: https://yoursite.com'}
          value={config.template} onChange={e => onChange({ ...config, template: e.target.value })}/>
        <p className="text-[10px] text-slate-400 mt-1">Auto-fills from campaign context. Edit freely.</p>
      </div>

      {/* Image picker → MMS */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="field-label mb-0">Image (optional — sends as MMS)</label>
          {finalImage && (
            <button type="button" onClick={() => onChange({ ...config, selectedPhotoIdx: null, extraImageUrl: null })}
              className="text-xs text-red-500 font-bold flex items-center gap-1"><X size={12}/> Remove</button>
          )}
        </div>

        {mediaLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 size={13} className="animate-spin"/> Loading...</div>
        ) : (
          <div className="space-y-3">
            {profilePhotos.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">From Settings</p>
                <div className="grid grid-cols-4 gap-2">
                  {profilePhotos.map((src, i) => (
                    <button key={i} type="button"
                      onClick={() => onChange({ ...config, selectedPhotoIdx: config.selectedPhotoIdx === i ? null : i, extraImageUrl: null })}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${config.selectedPhotoIdx === i ? 'border-violet-500' : 'border-slate-200 opacity-60'}`}>
                      <img src={src} alt="" className="w-full h-full object-cover"/>
                      {config.selectedPhotoIdx === i && <div className="absolute top-1 right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center"><Check size={9} className="text-white"/></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Or Upload Image</p>
              {config.extraImageUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                  <img src={config.extraImageUrl} className="w-full h-full object-cover" alt=""/>
                  <button onClick={() => onChange({ ...config, extraImageUrl: null })} className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={8} className="text-white"/>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'; input.accept = 'image/*'
                  input.onchange = e => {
                    const f = e.target.files[0]; const r = new FileReader()
                    r.onload = ev => onChange({ ...config, extraImageUrl: ev.target.result, selectedPhotoIdx: null })
                    r.readAsDataURL(f)
                  }
                  input.click()
                }} className="w-full h-14 border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2 hover:border-slate-400 transition-colors">
                  <Image size={13}/> Upload image
                </button>
              )}
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{finalImage ? 'Will send as MMS with caption.' : 'No image — plain SMS.'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Daily Limit</label>
          <input type="number" min={1} max={500} className="input" value={config.dailyLimit}
            onChange={e => onChange({ ...config, dailyLimit: parseInt(e.target.value) || 150 })}/>
        </div>
        <div>
          <label className="field-label">Timezone</label>
          <select className="input bg-white" value={config.timezone} onChange={e => onChange({ ...config, timezone: e.target.value })}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── PREVIEW DRAWER ────────────────────────────────────────────────────────────
function PreviewDrawer({ open, onClose, leads, selectedChannels, nineDayMode, emailConfig, waConfig, smsConfig, profile, campaignInfo }) {
  const [leadIdx, setLeadIdx] = useState(0)
  const leadsArr = Array.from(leads.values())
  const lead = leadsArr[leadIdx] || {}
  const total = leadsArr.length

  const buildMessages = (day) => {
    const name    = lead.contact_name || lead.name || 'there'
    const company = lead.company_name || lead.company || 'your company'
    const prodDesc = profile?.product_description || '[your product details]'
    const compName = profile?.company_name || '[your company]'

    if (day === 0) {
      return {
        email:    { subject: interpolate(emailConfig.subject, lead, profile, campaignInfo), body: interpolate(emailConfig.body, lead, profile, campaignInfo) },
        whatsapp: { body: interpolate(waConfig.messages?.[waConfig.focusedType] || '', lead, profile, campaignInfo) },
        sms:      { body: interpolate(smsConfig.template, lead, profile, campaignInfo) },
      }
    }
    if (day === 3) {
      const body = `Hi ${name},\n\nHere's an overview of ${compName}:\n\n${prodDesc}`
      return {
        email:    { subject: `Overview: ${compName}`, body },
        whatsapp: { body },
        sms:      { body: `Hi ${name}, more about us: ${prodDesc.slice(0, 100)}...` },
      }
    }
    const body = `Hi ${name},\n\nDo you have 10 minutes next week to connect? Let me know.`
    return {
      email:    { subject: "Let's block a quick slot", body },
      whatsapp: { body },
      sms:      { body: `Hi ${name}, do you have 10 mins next week for a quick call?` },
    }
  }

  const days = nineDayMode ? [0, 3, 6] : [0]
  const DAY_LABELS = { 0: 'Day 0 — Hook', 3: 'Day 3 — Value Showcase', 6: 'Day 6 — CTA Close' }
  const DAY_COLORS = { 0: 'bg-blue-500', 3: 'bg-amber-400', 6: 'bg-emerald-500' }

  return (
    <>
      <div className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Message Preview</h3>
            <p className="text-xs text-slate-400 mt-0.5">{total} lead{total !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16}/></button>
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-2">
            <Eye size={28} className="text-slate-200"/>
            <p className="text-sm">Select leads to preview</p>
          </div>
        ) : (
          <>
            {/* Lead navigator */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <button disabled={leadIdx === 0} onClick={() => setLeadIdx(i => i - 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">
                <ChevronLeft size={14}/>
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">{lead.contact_name || lead.name || 'Unknown'}</p>
                <p className="text-xs text-slate-400">{lead.company_name || lead.company || ''} · {leadIdx + 1} of {total}</p>
              </div>
              <button disabled={leadIdx === total - 1} onClick={() => setLeadIdx(i => i + 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">
                <ChevronRight size={14}/>
              </button>
            </div>

            {/* Day sections */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {days.map(day => {
                const msgs = buildMessages(day)
                return (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DAY_COLORS[day]}`}/>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{DAY_LABELS[day]}</p>
                    </div>

                    <div className="space-y-3">
                      {selectedChannels.includes('email') && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                            <Mail size={13} className="text-blue-600"/>
                            <span className="text-xs font-bold text-blue-700">Email</span>
                          </div>
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-[11px] font-bold text-slate-500 uppercase">Subject</p>
                            <p className="text-xs font-semibold text-slate-800">{msgs.email.subject || '—'}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase mt-2">Body</p>
                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{msgs.email.body || '—'}</p>
                          </div>
                        </div>
                      )}

                      {selectedChannels.includes('whatsapp') && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
                            <MessageSquare size={13} className="text-emerald-600"/>
                            <span className="text-xs font-bold text-emerald-700">WhatsApp</span>
                          </div>
                          <div className="px-4 py-3">
                            <div className="bg-[#e5ddd5] rounded-xl p-3">
                              <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[90%] ml-auto shadow-sm">
                                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{msgs.whatsapp.body || '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedChannels.includes('sms') && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
                            <Smartphone size={13} className="text-violet-600"/>
                            <span className="text-xs font-bold text-violet-700">SMS</span>
                          </div>
                          <div className="px-4 py-3">
                            <div className="bg-slate-100 rounded-xl p-3">
                              <div className="bg-blue-500 text-white rounded-2xl rounded-tr-none px-3 py-2 max-w-[90%] ml-auto shadow-sm">
                                <p className="text-xs whitespace-pre-wrap leading-relaxed">{msgs.sms.body || '—'}</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{msgs.sms.body?.length || 0} chars · {Math.ceil((msgs.sms.body?.length || 0) / 160)} SMS unit{Math.ceil((msgs.sms.body?.length || 0) / 160) !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OmniCampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '', daily_limit: 50 })
  const [selectedLeads, setSelectedLeads] = useState(new Map())
  const [gateways, setGateways] = useState({ email: false, whatsapp: false, sms: true })
  const [checkingGateways, setChecking] = useState(true)
  const [selectedChannels, setSelectedChannels] = useState(['sms'])
  const [activeTab, setActiveTab] = useState('sms')
  const [nineDayMode, setNineDayMode] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [emailConfig, setEmailConfig] = useState({
    subject: '', body: '', personalise: true, template_id: 'navy'
  })
  const [waConfig, setWaConfig] = useState({
    activeTypes: new Set(['detailed']), focusedType: 'detailed',
    messages: { hook: '', detailed: '', image: '' },
    personalise: true,
    selectedPhotos: new Set(), selectedPdfs: new Set(),
    useAudio: false, _photos: [], _pdfs: [], _audio: '',
  })
  const [smsConfig, setSmsConfig] = useState({
    template: '', dailyLimit: 150, timezone: 'Asia/Kolkata',
    selectedPhotoIdx: null, extraImageUrl: null,
  })

  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, waRes] = await Promise.allSettled([profileApi.get(), waApi.status()])
        const prof   = profRes.status === 'fulfilled' ? profRes.value.data : null
        const hasEmail = !!prof?.google_oauth?.connected_email
        const hasWA   = waRes.status === 'fulfilled' && !!waRes.value.data?.connected
        setGateways({ email: hasEmail, whatsapp: hasWA, sms: true })
        setProfile(prof)
        // Default to first available channel
        const defaults = ['sms', hasWA && 'whatsapp', hasEmail && 'email'].filter(Boolean)
        setSelectedChannels([defaults[0]])
        setActiveTab(defaults[0])
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
      if (activeTab === id) setActiveTab(selectedChannels.find(c => c !== id))
    } else {
      setSelectedChannels(p => [...p, id])
      setActiveTab(id)
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

      // SMS image
      const smsProfilePhotos = [] // loaded inside SMSConfigPanel, passed via config
      const smsImage = smsConfig.extraImageUrl ||
        (smsConfig.selectedPhotoIdx != null ? `profile_photo_${smsConfig.selectedPhotoIdx}` : null)
      const smsImageBase64 = smsConfig.extraImageUrl
        ? (smsConfig.extraImageUrl.includes(',') ? smsConfig.extraImageUrl.split(',')[1] : smsConfig.extraImageUrl)
        : null

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
        sms_image_base64:  smsImageBase64,
      })
      toast.success(nineDayMode ? '9-Day Omnichannel Campaign Activated!' : 'Campaign launched across all channels!')
      setTimeout(onDone, 800)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Campaign launch failed')
    } finally { setSubmitting(false) }
  }

  if (checkingGateways) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-800" size={24}/></div>

  return (
    <>
      <div className="fade-up">
        <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16}/> Back to Hub</button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Launch Omnichannel Campaign</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {nineDayMode ? '9-day sequence: Day 0 → Day 3 → Day 6 across all active channels' : 'Single blast to all selected channels simultaneously'}
            </p>
          </div>

          {/* 9-Day toggle */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all cursor-pointer ${nineDayMode ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
            onClick={() => setNineDayMode(v => !v)}>
            <Calendar size={14} className={nineDayMode ? 'text-indigo-500' : 'text-slate-400'}/>
            <div>
              <p className={`text-xs font-bold ${nineDayMode ? 'text-indigo-700' : 'text-slate-600'}`}>
                {nineDayMode ? '9-Day Sequence' : 'Single Blast'}
              </p>
              <p className="text-[10px] text-slate-400">{nineDayMode ? 'Day 0 → 3 → 6' : 'Day 0 only'}</p>
            </div>
            <div className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${nineDayMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${nineDayMode ? 'left-4' : 'left-0.5'}`}/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* Campaign Meta */}
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
                      Used in Day 0: "Hey, remember we met at [Campaign Info]?"
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

              {/* Channel selector */}
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

            {/* Per-channel config tabs — full panels */}
            {selectedChannels.length > 0 && (
              <div className="card p-0 overflow-hidden">
                <div className="flex border-b border-slate-100">
                  {selectedChannels.map(id => {
                    const ch = CHANNELS.find(c => c.id === id)
                    return (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all
                          ${activeTab === id ? `${ch.color} border-current` : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                        <ch.Icon size={13}/>{ch.label}
                      </button>
                    )
                  })}
                </div>
                <div className="p-5">
                  {activeTab === 'email' && (
                    <EmailConfigPanel config={emailConfig} onChange={setEmailConfig} campaignInfo={form.campaign_info}/>
                  )}
                  {activeTab === 'whatsapp' && (
                    <WhatsAppConfigPanel config={waConfig} onChange={setWaConfig} campaignInfo={form.campaign_info}/>
                  )}
                  {activeTab === 'sms' && (
                    <SMSConfigPanel config={smsConfig} onChange={setSmsConfig} campaignInfo={form.campaign_info}/>
                  )}
                </div>
              </div>
            )}

            {/* Lead selector — shared across all channels */}
            <div className="card p-5">
              <label className="field-label mb-1 block">Enroll Recipients</label>
              <p className="text-[10px] text-slate-400 mb-3">One lead selection applies to all active channels.</p>
              <LeadSelector
                selected={selectedLeads}
                onChange={setSelectedLeads}
                requiredChannels={selectedChannels.join(',')}
              />
            </div>
          </div>

          {/* RIGHT COLUMN — summary + preview + launch */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-6 bg-slate-50/50 space-y-4 border border-dashed">
              <p className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-500"/> Campaign Overview
              </p>

              {/* 9-day timeline */}
              <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-4">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"/>
                  <p className="text-xs font-bold text-slate-800">Day 0 — Hook</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 italic">
                    "{form.campaign_info ? `Hey, remember we met at ${form.campaign_info}?` : 'Event context message fires here'}"
                  </p>
                </div>
                {nineDayMode && (
                  <>
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-white"/>
                      <p className="text-xs font-bold text-slate-800">Day 3 — Value Showcase</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Product description + media assets sent automatically from your profile.</p>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"/>
                      <p className="text-xs font-bold text-slate-800">Day 6 — CTA Close</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Calendar slot request across all active channels.</p>
                    </div>
                  </>
                )}
                {!nineDayMode && (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white"/>
                    <p className="text-[11px] text-slate-400 italic">Enable 9-Day Sequence for automated follow-ups</p>
                  </div>
                )}
              </div>

              {/* Summary stats */}
              <div className="bg-white rounded-xl border p-3 space-y-1.5 text-[11px] text-slate-600 font-medium">
                <p>📋 Channels: <strong>{selectedChannels.join(', ') || '—'}</strong></p>
                <p>🎯 Leads: <strong>{selectedLeads.size}</strong></p>
                <p>📆 Mode: <strong>{nineDayMode ? '9-Day Sequence' : 'Single Day 0 Blast'}</strong></p>
                {selectedChannels.includes('whatsapp') && (
                  <p>💬 WA variants: <strong>{Array.from(waConfig.activeTypes).join(', ')}</strong></p>
                )}
                {selectedChannels.includes('sms') && (
                  <p>📱 SMS: <strong>{smsConfig.extraImageUrl || smsConfig.selectedPhotoIdx != null ? 'MMS (with image)' : 'Plain SMS'}</strong></p>
                )}
                {selectedChannels.includes('email') && (
                  <p>✉️ Template: <strong>{EMAIL_TEMPLATES.find(t => t.id === emailConfig.template_id)?.label || 'Navy Blue'}</strong></p>
                )}
              </div>

              {/* Preview button */}
              <button onClick={() => setPreviewOpen(true)} disabled={selectedLeads.size === 0}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all disabled:opacity-30">
                <Eye size={13}/> Preview Messages for {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''}
              </button>

              {/* Launch */}
              <button onClick={submit} disabled={submitting || selectedLeads.size === 0}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold">
                {submitting
                  ? <><Loader2 className="animate-spin mr-1" size={14}/> Launching...</>
                  : <><Send size={14} className="mr-1"/> Activate for {selectedLeads.size} Target{selectedLeads.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <PreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        leads={selectedLeads}
        selectedChannels={selectedChannels}
        nineDayMode={nineDayMode}
        emailConfig={emailConfig}
        waConfig={waConfig}
        smsConfig={smsConfig}
        profile={profile}
        campaignInfo={form.campaign_info}
      />
    </>
  )
}