/**
 * OmniCampaignCreate — 9-Day Omnichannel Automation Cadence Builder
 * Single lead selector shared across all channels.
 * Per-channel config tabs: Email (subject/body), WhatsApp (variants + media), SMS (template).
 */
import { useState, useEffect } from 'react'
import {
  ChevronLeft, Send, Loader2, Mail, Smartphone, MessageSquare,
  ShieldCheck, HelpCircle, Zap, Sparkles, Image, FileText,
  Check, X, Mic, Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { omniApi, profileApi, waApi, campaignApi } from '../services/api'
import LeadSelector from './LeadSelector'

// ── WhatsApp message variant types ────────────────────────────────────────────
const WA_MSG_TYPES = [
  { id: 'hook',     label: 'Hook',     sub: 'Short punchy opener',  rows: 4,  hint: 'hook short punchy opener under 3 lines' },
  { id: 'detailed', label: 'Detailed', sub: '80-120 word outreach', rows: 9,  hint: 'detailed professional cold outreach 80-120 words' },
  { id: 'image',    label: 'Image',    sub: 'Image + caption',      rows: 3,  hint: 'short 1-2 line caption for image attachment' },
]

// ── Channel tab config ─────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'email',    label: 'Email',     Icon: Mail,           color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-500',    badge: 'SMTP / OAuth' },
  { id: 'whatsapp', label: 'WhatsApp',  Icon: MessageSquare,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', badge: 'Baileys' },
  { id: 'sms',      label: 'SMS',       Icon: Smartphone,     color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-500',  badge: 'Android APK' },
]

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CONFIG PANEL
// ─────────────────────────────────────────────────────────────────────────────
function EmailConfigPanel({ config, onChange }) {
  const [aiLoading, setAiLoading] = useState(false)

  const generateTemplate = async () => {
    setAiLoading(true)
    try {
      const { data } = await campaignApi.preview({
        subject: '', body: '', lead_id: 0,
        personalise: false, generate_template: true,
        context_hint: config.contextHint || 'cold outreach to business leads',
      })
      if (data.subject) onChange({ ...config, subject: data.subject })
      if (data.body)    onChange({ ...config, body: data.body })
      toast.success('Email template generated')
    } catch { toast.error('AI generation failed') }
    finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="field-label mb-0">Subject Line Template</label>
          <button onClick={generateTemplate} disabled={aiLoading}
            className="btn-ghost btn-sm text-blue-600 text-xs flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            AI Generate
          </button>
        </div>
        <input className="input" placeholder="Quick question for {lead_company}"
          value={config.subject} onChange={e => onChange({ ...config, subject: e.target.value })} />
      </div>
      <div>
        <label className="field-label">Body Template</label>
        <textarea className="textarea h-36" placeholder={"Hi {lead_name},\n\nI noticed {lead_company}..."}
          value={config.body} onChange={e => onChange({ ...config, body: e.target.value })} />
        <p className="text-[10px] text-blue-500 font-medium mt-1">
          ✨ Use {'{lead_name}'} and {'{lead_company}'} — AI personalises per lead in background
        </p>
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

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP CONFIG PANEL
// ─────────────────────────────────────────────────────────────────────────────
function WhatsAppConfigPanel({ config, onChange }) {
  const [aiLoading, setAiLoading]     = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [profileMedia, setProfileMedia] = useState({ photos: [], pdfs: [], audio: '' })

  // Load profile media when image variant is active
  useEffect(() => {
    if (!config.activeTypes?.has('image')) return
    const load = async () => {
      setMediaLoading(true)
      try {
        const { data } = await profileApi.get()
        const photos = data.product_photos || []
        const pdfs   = data.product_pdfs   || []
        const audio  = data.audio_voice_base64 || ''
        setProfileMedia({ photos, pdfs, audio })
        // Auto-select all by default
        onChange({
          ...config,
          selectedPhotos: new Set(photos.map((_, i) => i)),
          selectedPdfs:   new Set(pdfs.map((_, i) => i)),
          useAudio:       !!audio,
        })
      } catch { toast.error('Failed to load profile media') }
      finally { setMediaLoading(false) }
    }
    load()
  }, [config.activeTypes?.has('image')])  // eslint-disable-line

  const toggleType = (id) => {
    const next = new Set(config.activeTypes)
    if (next.has(id)) {
      if (next.size === 1) return toast.error('Keep at least one variant')
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange({ ...config, activeTypes: next, focusedType: next.has(config.focusedType) ? config.focusedType : Array.from(next)[0] })
  }

  const generateTemplate = async () => {
    setAiLoading(true)
    try {
      const target = WA_MSG_TYPES.find(x => x.id === config.focusedType)
      const { data } = await waApi.preview({
        message: '', lead_id: 0, personalise: false,
        generate_template: true, message_type: config.focusedType,
        context_hint: target.hint
      })
      onChange({ ...config, messages: { ...config.messages, [config.focusedType]: data.message || '' } })
      toast.success(`${target.label} template generated`)
    } catch { toast.error('AI generation failed') }
    finally { setAiLoading(false) }
  }

  const togglePhoto = (i) => {
    const next = new Set(config.selectedPhotos)
    next.has(i) ? next.delete(i) : next.add(i)
    onChange({ ...config, selectedPhotos: next })
  }

  const togglePdf = (i) => {
    const next = new Set(config.selectedPdfs)
    next.has(i) ? next.delete(i) : next.add(i)
    onChange({ ...config, selectedPdfs: next })
  }

  const focused = config.focusedType || 'detailed'

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      <div>
        <label className="field-label mb-2 block">Message Variants</label>
        <div className="grid grid-cols-3 gap-2">
          {WA_MSG_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => toggleType(t.id)}
              className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all
                ${config.activeTypes?.has(t.id)
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {t.id === 'hook' ? <Zap size={13} /> : t.id === 'detailed' ? <FileText size={13} /> : <Image size={13} />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      {config.activeTypes?.size > 1 && (
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {Array.from(config.activeTypes).map(typeId => (
            <button key={typeId} type="button" onClick={() => onChange({ ...config, focusedType: typeId })}
              className={`flex-1 py-1 text-center font-bold text-xs rounded-lg uppercase transition-all
                ${focused === typeId ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>
              {typeId}
            </button>
          ))}
        </div>
      )}

      {/* Image variant: profile media picker */}
      {focused === 'image' && (
        <div className="space-y-3 fade-up">
          {mediaLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 size={13} className="animate-spin" /> Loading profile media...
            </div>
          ) : (
            <>
              {profileMedia.photos.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Product Photos <span className="text-emerald-600">({config.selectedPhotos?.size || 0} selected)</span>
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {profileMedia.photos.map((src, i) => (
                      <button key={i} type="button" onClick={() => togglePhoto(i)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                          ${config.selectedPhotos?.has(i) ? 'border-emerald-500' : 'border-slate-200 opacity-50'}`}>
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {config.selectedPhotos?.has(i) && (
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
                  No product photos saved. <a href="/settings" className="font-bold underline">Add in Settings →</a>
                </div>
              )}

              {profileMedia.pdfs.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    PDFs / Brochures <span className="text-emerald-600">({config.selectedPdfs?.size || 0} selected)</span>
                  </p>
                  <div className="space-y-1.5">
                    {profileMedia.pdfs.map((_, i) => (
                      <button key={i} type="button" onClick={() => togglePdf(i)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all
                          ${config.selectedPdfs?.has(i) ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <FileText size={13} className={config.selectedPdfs?.has(i) ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="text-xs font-semibold flex-1">Brochure {i + 1}.pdf</span>
                        {config.selectedPdfs?.has(i) && <Check size={13} className="text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {profileMedia.audio && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Voice Note</p>
                  <div
                    onClick={() => onChange({ ...config, useAudio: !config.useAudio })}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                      ${config.useAudio ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <Mic size={13} className={config.useAudio ? 'text-emerald-600' : 'text-slate-400'} />
                    <audio controls src={profileMedia.audio} className="flex-1 h-7" onClick={e => e.stopPropagation()} />
                    {config.useAudio && <Check size={13} className="text-emerald-500" />}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Message template textarea */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">
            {WA_MSG_TYPES.find(x => x.id === focused)?.label} Template
          </span>
          <button type="button" onClick={generateTemplate} disabled={aiLoading}
            className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Generate
          </button>
        </div>
        <textarea
          className="textarea font-mono text-xs"
          rows={WA_MSG_TYPES.find(x => x.id === focused)?.rows || 6}
          value={config.messages?.[focused] || ''}
          onChange={e => onChange({ ...config, messages: { ...config.messages, [focused]: e.target.value } })}
          placeholder={WA_MSG_TYPES.find(x => x.id === focused)?.placeholder || ''}
        />
      </div>

      <div className="flex items-center justify-between py-2 border-t border-slate-100">
        <div>
          <p className="text-sm font-medium text-slate-800">AI Personalisation</p>
          <p className="text-xs text-slate-400">Groq customises each message per lead</p>
        </div>
        <button onClick={() => onChange({ ...config, personalise: !config.personalise })}
          className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${config.personalise ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.personalise ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS CONFIG PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SMSConfigPanel({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="field-label">SMS Template Body</label>
        <textarea className="textarea h-28 font-mono text-xs"
          placeholder={"Hi {lead_name}, we help {lead_company} grow faster. Worth a quick chat?"}
          value={config.template} onChange={e => onChange({ ...config, template: e.target.value })} />
        <p className="text-[10px] text-slate-400 font-medium mt-1">
          ✨ Use {'{lead_name}'} and {'{lead_company}'} — AI injects context per lead
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Daily Limit</label>
          <input type="number" min={1} max={500} className="input"
            value={config.dailyLimit}
            onChange={e => onChange({ ...config, dailyLimit: parseInt(e.target.value) || 150 })} />
        </div>
        <div>
          <label className="field-label">Timezone</label>
          <select className="input bg-white" value={config.timezone}
            onChange={e => onChange({ ...config, timezone: e.target.value })}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function OmniCampaignCreate({ onBack, onDone }) {
  // ── Core campaign fields ──────────────────────────────────────────────────
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '', daily_limit: 50 })

  // ── Shared leads ──────────────────────────────────────────────────────────
  const [selectedLeads, setSelectedLeads] = useState(new Map())

  // ── Channel gateways connection status ───────────────────────────────────
  const [gateways, setGateways]           = useState({ email: false, whatsapp: false, sms: true })
  const [checkingGateways, setChecking]   = useState(true)

  // ── Selected active channels ─────────────────────────────────────────────
  const [selectedChannels, setSelectedChannels] = useState(['whatsapp'])

  // ── Per-channel config states ─────────────────────────────────────────────
  const [emailConfig, setEmailConfig] = useState({
    subject: '', body: '', personalise: true, contextHint: '',
  })
  const [waConfig, setWaConfig] = useState({
    activeTypes: new Set(['detailed']),
    focusedType: 'detailed',
    messages: { hook: '', detailed: '', image: '' },
    personalise: true,
    selectedPhotos: new Set(),
    selectedPdfs: new Set(),
    useAudio: false,
  })
  const [smsConfig, setSmsConfig] = useState({
    template: '', dailyLimit: 150, timezone: 'Asia/Kolkata',
  })

  // ── Active tab for the config panel ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState('whatsapp')

  const [submitting, setSubmitting] = useState(false)

  // ── Verify gateway connections ────────────────────────────────────────────
  useEffect(() => {
    const verify = async () => {
      try {
        const [profRes, waRes] = await Promise.allSettled([profileApi.get(), waApi.status()])
        const hasEmail = profRes.status === 'fulfilled' &&
          !!profRes.value.data?.google_oauth?.connected_email
        const hasWA = waRes.status === 'fulfilled' && !!waRes.value.data?.connected
        setGateways({ email: hasEmail, whatsapp: hasWA, sms: true })
        // Default to first available channel
        const defaults = [hasWA && 'whatsapp', hasEmail && 'email', 'sms'].filter(Boolean)
        setSelectedChannels([defaults[0]])
        setActiveTab(defaults[0])
      } catch {
        toast.error('Could not verify gateway connections')
      } finally {
        setChecking(false)
      }
    }
    verify()
  }, [])

  const toggleChannel = (id) => {
    const isConnected = gateways[id]
    if (!isConnected) return
    if (selectedChannels.includes(id)) {
      if (selectedChannels.length === 1) return toast.error('Keep at least one channel')
      setSelectedChannels(prev => prev.filter(c => c !== id))
      if (activeTab === id) setActiveTab(selectedChannels.find(c => c !== id))
    } else {
      setSelectedChannels(prev => [...prev, id])
      setActiveTab(id)
    }
    setSelectedLeads(new Map()) // wipe leads on mask change
  }

  const submit = async () => {
    if (!form.campaign_name.trim() || !form.campaign_info.trim())
      return toast.error('Fill in Campaign Name and Campaign Info')
    if (selectedLeads.size === 0)
      return toast.error('Select at least one lead')

    // Per-channel validation
    if (selectedChannels.includes('email') && !emailConfig.subject.trim())
      return toast.error('Add an email subject template')
    if (selectedChannels.includes('whatsapp')) {
      const types = Array.from(waConfig.activeTypes)
      for (const t of types) {
        if (t !== 'image' && !waConfig.messages[t]?.trim())
          return toast.error(`Add WhatsApp ${t} template`)
      }
    }
    if (selectedChannels.includes('sms') && !smsConfig.template.trim())
      return toast.error('Add an SMS template')

    setSubmitting(true)
    try {
      // Build final WA media arrays from selected indices
      const finalPhotos = Array.from(waConfig.selectedPhotos).map(i => waConfig._photos?.[i]).filter(Boolean)
      const finalPdfs   = Array.from(waConfig.selectedPdfs).map(i => waConfig._pdfs?.[i]).filter(Boolean)

      await omniApi.create({
        campaign_name:      form.campaign_name,
        campaign_info:      form.campaign_info,
        selected_channels:  selectedChannels,
        lead_ids:           Array.from(selectedLeads.keys()),
        daily_limit:        parseInt(form.daily_limit) || 50,
        // Email
        email_subject:      emailConfig.subject,
        email_body:         emailConfig.body,
        email_personalise:  emailConfig.personalise,
        // WhatsApp
        wa_selected_types:  Array.from(waConfig.activeTypes),
        wa_hook:            waConfig.messages.hook,
        wa_detailed:        waConfig.messages.detailed,
        wa_image_caption:   waConfig.messages.image,
        wa_personalise:     waConfig.personalise,
        wa_photos:          finalPhotos,
        wa_pdfs:            finalPdfs,
        wa_audio:           waConfig.useAudio ? waConfig._audio : '',
        // SMS
        sms_template:       smsConfig.template,
        sms_daily_limit:    smsConfig.dailyLimit,
        sms_timezone:       smsConfig.timezone,
      })
      toast.success('Omnichannel 9-Day Campaign Activated!')
      setTimeout(onDone, 800)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Campaign launch failed')
    } finally {
      setSubmitting(false)
    }
  }

  const activeValidationMask = selectedChannels.join(',')

  if (checkingGateways) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-800" size={24} /></div>
  }

  return (
    <div className="fade-up">
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back to Hub</button>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Create Omnichannel Campaign Sequence</h2>
        <p className="text-xs text-slate-400 mt-0.5">Launches a 9-day step cadence follow-up across all active channels simultaneously.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Campaign meta */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign Name</label>
              <input className="input" placeholder="e.g., TechExpo 2026 Outreach"
                value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="field-label mb-0">Campaign Info / Event Context</label>
                <div className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
                  <HelpCircle size={13} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal leading-normal shadow-md">
                    Used in Day 0 greeting: "Hey, remember we met at [Campaign Info]?"
                  </span>
                </div>
              </div>
              <input className="input" placeholder="e.g., Medical Physiotherapy Function, Kochi"
                value={form.campaign_info} onChange={e => setForm({ ...form, campaign_info: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Daily Limit</label>
              <input type="number" className="input" min={1} max={200} value={form.daily_limit}
                onChange={e => setForm({ ...form, daily_limit: e.target.value })} />
            </div>

            {/* Channel selector cards */}
            <div className="pt-2 border-t">
              <label className="field-label mb-2 block">Active Channels</label>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(ch => {
                  const isConnected = gateways[ch.id]
                  const isSelected  = selectedChannels.includes(ch.id)
                  return (
                    <button key={ch.id} type="button"
                      disabled={!isConnected}
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-24 transition-all relative overflow-hidden
                        ${!isConnected
                          ? 'opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed'
                          : isSelected
                            ? `${ch.border} ${ch.bg} shadow-sm`
                            : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start w-full">
                        <ch.Icon size={16} className={isSelected ? ch.color : 'text-slate-400'} />
                        <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${isConnected ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                          {isConnected ? ch.badge : 'Offline'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ch.label}</p>
                        <p className="text-[9px] text-slate-400">
                          {isSelected && isConnected ? 'Pipeline Active' : isConnected ? 'Idle' : 'Requires Config'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Per-channel config tabs ──────────────────────────────── */}
          {selectedChannels.length > 0 && (
            <div className="card p-0 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-slate-100">
                {selectedChannels.map(id => {
                  const ch = CHANNELS.find(c => c.id === id)
                  return (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all
                        ${activeTab === id
                          ? `${ch.color} border-current`
                          : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                      <ch.Icon size={13} />
                      {ch.label}
                    </button>
                  )
                })}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {activeTab === 'email' && (
                  <EmailConfigPanel config={emailConfig} onChange={setEmailConfig} />
                )}
                {activeTab === 'whatsapp' && (
                  <WhatsAppConfigPanel config={waConfig} onChange={setWaConfig} />
                )}
                {activeTab === 'sms' && (
                  <SMSConfigPanel config={smsConfig} onChange={setSmsConfig} />
                )}
              </div>
            </div>
          )}

          {/* ── Shared lead selector ──────────────────────────────────── */}
          <div className="card p-5">
            <label className="field-label mb-1 block">Enroll Recipients</label>
            <p className="text-[10px] text-slate-400 mb-3">
              Leads missing required fields for active channels are filtered out automatically.
            </p>
            <LeadSelector
              selected={selectedLeads}
              onChange={setSelectedLeads}
              requiredChannels={activeValidationMask}
            />
          </div>
        </div>

        {/* ── RIGHT COLUMN — preview + launch ─────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-6 bg-slate-50/50 space-y-4 border border-dashed">
            <p className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-500" /> Automation Sequence Preview
            </p>

            <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-5">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 0 — Hook Phase</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Fires across all selected channels: <span className="italic font-medium text-slate-600">
                    "Hey, remember we met at {form.campaign_info || '[Campaign Info]'}?"
                  </span>
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 3 — Value Showcase</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Fetches your profile data. Email sends HTML copy, WhatsApp attaches media assets.
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 6 — CTA Close</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Low-friction calendar slot request across all active channels.
                </p>
              </div>
            </div>

            {/* Config summary */}
            <div className="bg-white rounded-xl border p-3 space-y-1.5 text-[11px] text-slate-600 font-medium">
              <p>📋 Channels: <strong>{selectedChannels.join(', ') || '—'}</strong></p>
              <p>🎯 Leads: <strong>{selectedLeads.size}</strong></p>
              {selectedChannels.includes('whatsapp') && (
                <p>💬 WA Variants: <strong>{Array.from(waConfig.activeTypes).join(', ')}</strong></p>
              )}
              {selectedChannels.includes('email') && (
                <p>✉️ Subject: <strong className="truncate">{emailConfig.subject || '—'}</strong></p>
              )}
              {selectedChannels.includes('sms') && (
                <p>📱 SMS Daily cap: <strong>{smsConfig.dailyLimit}</strong></p>
              )}
            </div>

            <button
              onClick={submit}
              disabled={submitting || selectedLeads.size === 0}
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold">
              {submitting
                ? <><Loader2 className="animate-spin mr-1" size={14} /> Launching...</>
                : <><Send size={14} className="mr-1" /> Activate Campaign for {selectedLeads.size} Targets</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}