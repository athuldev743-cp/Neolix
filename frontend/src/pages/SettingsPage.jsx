import { useState, useContext, useEffect, useRef } from 'react'
import {
  User, Building2, Server, Sparkles, PenLine,
  Check, Loader2, Save, Mail, RefreshCw, Link2,
  AlertTriangle, Info, Upload, X, FileText, Mic, Image
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../services/api'
import { ProfileContext } from '../App'

const TONES = [
  { value: 'professional', label: 'Direct & Polished',      desc: 'Clear, direct, respectful. No fluff.' },
  { value: 'friendly',     label: 'Warm & Authentic',       desc: 'Warm, approachable, peer-to-peer.' },
  { value: 'formal',       label: 'Corporate & Precise',    desc: 'Structured, polished, detailed.' },
  { value: 'casual',       label: 'Quick & Conversational', desc: 'Short, relaxed, texting a peer.' },
]

// ── Converts a File object to base64 string ───────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result) // includes data:mime;base64, prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function Section({ title, icon: Icon, desc, children }) {
  return (
    <div className="card p-6 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-100 text-sm">{title}</p>
          {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function F({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
      {children}
      {hint && (
        <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1 font-medium leading-relaxed">
          <Info size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  )
}

// ── Photo grid with add/remove ────────────────────────────────────────────────
function PhotoUploader({ photos, onChange }) {
  const inputRef = useRef()

  const handleAdd = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const oversized = files.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length) { toast.error('Each photo must be under 5 MB'); return }
    try {
      const b64s = await Promise.all(files.map(fileToBase64))
      onChange([...photos, ...b64s])
    } catch { toast.error('Failed to read image files') }
    e.target.value = ''
  }

  const remove = (i) => onChange(photos.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-900 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-400 transition-colors"
        >
          <Image size={16} />
          <span className="text-[10px] font-semibold">Add photo</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      <p className="text-[11px] text-slate-500">Max 5 MB per image. Sent on WhatsApp Day 3 product drops.</p>
    </div>
  )
}

// ── PDF list with add/remove ──────────────────────────────────────────────────
function PDFUploader({ pdfs, onChange }) {
  const inputRef = useRef()

  const handleAdd = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length) { toast.error('Each PDF must be under 10 MB'); return }
    try {
      const b64s = await Promise.all(files.map(fileToBase64))
      onChange([...pdfs, ...b64s])
    } catch { toast.error('Failed to read PDF files') }
    e.target.value = ''
  }

  const remove = (i) => onChange(pdfs.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      {pdfs.map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <FileText size={14} className="text-blue-400" />
          </div>
          <p className="text-xs text-slate-300 font-semibold flex-1">Brochure {i + 1}.pdf</p>
          <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl text-xs text-slate-500 hover:text-blue-400 flex items-center justify-center gap-2 transition-colors"
      >
        <Upload size={13} /> Upload PDF Brochure
      </button>
      <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleAdd} />
      <p className="text-[11px] text-slate-500">Max 10 MB per PDF. Sent as document attachments via WhatsApp.</p>
    </div>
  )
}

// ── Voice note recorder / uploader ───────────────────────────────────────────
function VoiceUploader({ audio, onChange }) {
  const inputRef  = useRef()
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds]     = useState(0)
  const timerRef  = useRef(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => onChange(reader.result)
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    clearInterval(timerRef.current)
    setRecording(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Audio file must be under 10 MB'); return }
    const b64 = await fileToBase64(file)
    onChange(b64)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {audio ? (
        <div className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Mic size={14} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-300 font-semibold">Voice note saved</p>
            <audio controls src={audio} className="mt-1 w-full h-7" />
          </div>
          <button onClick={() => onChange('')} className="text-slate-500 hover:text-red-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
              recording
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Mic size={13} />
            {recording ? `Recording… ${seconds}s (tap to stop)` : 'Record voice note'}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 flex items-center gap-1.5 transition-all"
          >
            <Upload size={13} /> Upload
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
      <p className="text-[11px] text-slate-500">Sent as a WhatsApp voice note (push-to-talk) on product drops.</p>
    </div>
  )
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://neolix-neolix-backend.hf.space/api/v1'

export default function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await profileApi.get()
        setForm({
          full_name:            data.full_name            || '',
          designation:          data.designation          || '',
          company_name:         data.company_name         || '',
          company_tagline:      data.company_tagline      || '',
          industry:             data.industry             || '',
          website:              data.website              || '',
          email:                data.email                || '',
          phone:                data.phone                || '',
          city:                 data.city                 || '',
          country:              data.country              || '',
          linkedin_url:         data.linkedin_url         || '',
          preferred_tone:       data.preferred_tone       || 'professional',
          intro_line:           data.intro_line           || '',
          value_proposition:    data.value_proposition    || '',
          email_signature_html: data.email_signature_html || '',
          product_description:  data.product_description  || '',
          product_photos:       data.product_photos       || [],
          product_pdfs:         data.product_pdfs         || [],
          audio_voice_base64:   data.audio_voice_base64   || '',
        })
      } catch { toast.error('Failed to load profile') }
    }
    load()
  }, [profile])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      await refreshProfile()
      toast.success('Profile saved!')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      const filled = !!(form.company_name?.trim() && form.product_description?.trim())
      if (filled) navigate('/')
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const triggerGoogleOAuth = () => {
    window.location.href = `${API_BASE}/auth/google/login`
  }

  const isGmailConnected = profile?.google_oauth?.status === 'connected'
  const connectedEmail   = profile?.google_oauth?.connected_email

  const ctxPreview = [
    form.full_name        && `SDR: ${form.full_name}`,
    form.company_name     && `For: ${form.company_name}`,
    form.company_tagline  && `Tagline: ${form.company_tagline}`,
    form.product_description && `Offering: ${form.product_description?.slice(0, 40)}…`,
  ].filter(Boolean).join(' · ')

  const SaveBtn = ({ className = '' }) => (
    <button onClick={saveProfile} disabled={saving} className={`btn-primary flex-shrink-0 ${className}`}>
      {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
      {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
    </button>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Profile & AI Persona</h1>
          <p className="text-xs text-slate-400 mt-1">Configure how the AI represents you and your offering.</p>
        </div>
        <SaveBtn />
      </div>

      {/* AI context preview bar */}
      {ctxPreview && (
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <Sparkles size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-400 mb-0.5">Active AI Knowledge Base Context</p>
            <p className="text-xs text-blue-300 leading-relaxed">{ctxPreview}</p>
          </div>
        </div>
      )}

      {/* Gmail */}
      <Section title="E-mail Sending Setup" icon={Server} desc="Connect your professional Google email natively.">
        {isGmailConnected ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-emerald-400">Gmail Sending Account Active</p>
                <p className="text-[11px] text-emerald-500">Sending through: <span className="font-semibold">{connectedEmail}</span></p>
              </div>
            </div>
            <button onClick={triggerGoogleOAuth} className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-700 transition-colors flex items-center gap-1">
              <RefreshCw size={11} /> Re-link
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400">Email Integration Not Connected</p>
                <p className="text-[11px] text-amber-300 leading-relaxed">Authorize your Google account so the scheduler can send outreach drafts.</p>
              </div>
            </div>
            <button onClick={triggerGoogleOAuth} className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl py-2 px-4 font-bold text-xs flex items-center gap-2 transition-all">
              <Link2 size={13} strokeWidth={2.5} /> Connect Google Sending Account
            </button>
          </div>
        )}
      </Section>

      {/* Personal */}
      <Section title="Your Personal Profile" icon={User} desc="How you sign off in emails and introduce yourself.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Your Name"><input className="input" value={form.full_name||''} onChange={e => set('full_name', e.target.value)} placeholder="John Smith" /></F>
          <F label="Job Title"><input className="input" value={form.designation||''} onChange={e => set('designation', e.target.value)} placeholder="Founder" /></F>
          <F label="Business Email"><input className="input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="you@company.com" /></F>
          <F label="Phone"><input className="input" value={form.phone||''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" /></F>
          <F label="City"><input className="input" value={form.city||''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" /></F>
          <F label="Country"><input className="input" value={form.country||''} onChange={e => set('country', e.target.value)} placeholder="India" /></F>
          <div className="col-span-2">
            <F label="LinkedIn URL"><input className="input" value={form.linkedin_url||''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/username" /></F>
          </div>
        </div>
      </Section>

      {/* Company */}
      <Section title="Your Company Details" icon={Building2} desc="How your business is framed to cold prospects.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Company Name"><input className="input" value={form.company_name||''} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp" /></F>
          <F label="Industry"><input className="input" value={form.industry||''} onChange={e => set('industry', e.target.value)} placeholder="B2B SaaS" /></F>
          <div className="col-span-2">
            <F label="What does your company do?" hint="One sentence. AI uses this to contextualize pitches.">
              <input className="input" value={form.company_tagline||''} onChange={e => set('company_tagline', e.target.value)} placeholder="We build custom aluminum storage boxes for cargo fleets." />
            </F>
          </div>
          <div className="col-span-2">
            <F label="Website"><input className="input" value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" /></F>
          </div>
        </div>
      </Section>

      {/* Product — now with real media uploaders */}
      <Section title="Your Product / Offering" icon={PenLine} desc="The product the AI sells in campaigns. Media is auto-sent on WhatsApp Day 3 drops.">
        <div className="space-y-5">
          <F label="Describe your product" hint="Be detailed. The AI reads this for Day 3 product messages.">
            <textarea className="textarea h-28" value={form.product_description||''} onChange={e => set('product_description', e.target.value)}
              placeholder="e.g. CargoSafe: heavy-duty weatherproof storage boxes. Aviation-grade aluminum, 30% cheaper than steel, biometric lock option." />
          </F>

          <F label="Product Photos" hint="Sent as WhatsApp image messages in the product drop sequence.">
            <PhotoUploader
              photos={form.product_photos || []}
              onChange={v => set('product_photos', v)}
            />
          </F>

          <F label="Spec Brochures / PDFs" hint="Sent as WhatsApp document attachments.">
            <PDFUploader
              pdfs={form.product_pdfs || []}
              onChange={v => set('product_pdfs', v)}
            />
          </F>

          <F label="Voice Note" hint="A short personal audio message sent as a WhatsApp push-to-talk note.">
            <VoiceUploader
              audio={form.audio_voice_base64 || ''}
              onChange={v => set('audio_voice_base64', v)}
            />
          </F>
        </div>
      </Section>

      {/* AI styling */}
      <Section title="AI Conversation Styling" icon={Sparkles} desc="How your AI outreach drafts should feel.">
        <F label="Message Vibe">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {TONES.map(t => (
              <button key={t.value} type="button" onClick={() => set('preferred_tone', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${form.preferred_tone===t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'}`}>
                <p className="text-xs font-bold">{t.label}</p>
                <p className={`text-[10px] mt-1 leading-normal ${form.preferred_tone===t.value ? 'text-blue-100' : 'text-slate-500'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </F>
        <F label="How do you open conversations?" hint="AI uses this verbatim for Day 1 messages.">
          <textarea className="textarea h-16 bg-slate-950 border-slate-800 text-slate-300" value={form.intro_line||''} onChange={e => set('intro_line', e.target.value)} placeholder="e.g. I noticed your team is managing a large regional cargo fleet..." />
        </F>
        <F label="What problem do you solve?" hint="AI weaves this into cold templates.">
          <textarea className="textarea h-28 bg-slate-950 border-slate-800 text-slate-300" value={form.value_proposition||''} onChange={e => set('value_proposition', e.target.value)} placeholder="e.g. We help fleet managers eliminate gear damage from cheap containers..." />
        </F>
      </Section>

      {/* Email signature */}
      <Section title="Email Signature" icon={Mail} desc="Appended to outbound email sequences.">
        <F label="Signature HTML" hint="Plain text or simple HTML. Keep it brief.">
          <textarea className="textarea h-24 font-mono text-xs bg-slate-950 border-slate-800 text-slate-300" value={form.email_signature_html||''} onChange={e => set('email_signature_html', e.target.value)} placeholder={'<p>Best regards,<br/><strong>John Smith</strong></p>'} />
        </F>
        {form.email_signature_html && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2">Signature Preview</p>
            <div className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
          </div>
        )}
      </Section>

      <div className="flex justify-end pb-6">
        <SaveBtn className="px-8" />
      </div>
    </div>
  )
}