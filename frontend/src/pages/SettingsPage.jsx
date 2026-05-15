import { useState, useContext, useEffect } from 'react'
import {
  User, Building2, PenLine, Server, MapPin, Sparkles,
  Check, Loader2, Eye, EyeOff, Save, Mail, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { profileApi } from '../services/api'
import { ProfileContext } from '../App'

const TONES = [
  { value:'professional', label:'Professional', desc:'Formal, confident' },
  { value:'friendly',     label:'Friendly',     desc:'Warm, approachable' },
  { value:'formal',       label:'Formal',       desc:'Corporate, precise' },
  { value:'casual',       label:'Casual',       desc:'Relaxed, human' },
]

function Section({ title, icon: Icon, desc, children }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{title}</p>
          {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function F({ label, hint, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext)
  const [form, setForm]     = useState({})
  const [smtp, setSmtp]     = useState({ host:'smtp.gmail.com', port:587, user:'', password:'', from_name:'', use_tls:true })
  const [saving, setSaving]         = useState(false)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [testing, setTesting]       = useState(false)
  const [showPass, setShowPass]     = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name:            profile.full_name            || '',
      designation:          profile.designation          || '',
      company_name:         profile.company_name         || '',
      company_tagline:      profile.company_tagline      || '',
      industry:             profile.industry             || '',
      website:              profile.website              || '',
      email:                profile.email                || '',
      phone:                profile.phone                || '',
      city:                 profile.city                 || '',
      country:              profile.country              || '',
      linkedin_url:         profile.linkedin_url         || '',
      preferred_tone:       profile.preferred_tone       || 'professional',
      intro_line:           profile.intro_line           || '',
      value_proposition:    profile.value_proposition    || '',
      email_signature_html: profile.email_signature_html || '',
    })
    if (profile.smtp?.user) {
      setSmtp({
        host:      profile.smtp.host      || 'smtp.gmail.com',
        port:      profile.smtp.port      || 587,
        user:      profile.smtp.user      || '',
        password:  profile.smtp.password  || '',
        from_name: profile.smtp.from_name || '',
        use_tls:   profile.smtp.use_tls   ?? true,
      })
    }
  }, [profile])

  const set = (k, v) => { setForm(p => ({...p, [k]: v})); setSaved(false) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      await refreshProfile()
      toast.success('Profile saved — AI will use your updated context!')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const saveSmtp = async () => {
    setSavingSmtp(true)
    try { await profileApi.updateSmtp(smtp); await refreshProfile(); toast.success('SMTP saved!') }
    catch { toast.error('Failed to save SMTP') } finally { setSavingSmtp(false) }
  }

  const testSmtp = async () => {
    setTesting(true)
    try {
      const { data } = await profileApi.testSmtp()
      if (data.ok) toast.success(`✓ Connected: ${data.message}`)
      else toast.error(`Failed: ${data.error}`)
    } catch { toast.error('Test failed — check credentials') } finally { setTesting(false) }
  }

  if (!profile) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin text-blue-500" />
    </div>
  )

  // Context preview string shown at top
  const ctxPreview = [
    form.full_name && `Name: ${form.full_name}`,
    form.designation && `Title: ${form.designation}`,
    form.company_name && `Company: ${form.company_name}`,
    form.company_tagline && `What we do: ${form.company_tagline}`,
    form.value_proposition && `Value prop: ${form.value_proposition?.slice(0, 80)}…`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Profile & Settings</h1>
          <p className="page-sub">Everything here is injected into every AI-generated email and WhatsApp message</p>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary flex-shrink-0">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </div>

      {/* Live context preview */}
      {ctxPreview && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Sparkles size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-0.5">AI outreach context</p>
            <p className="text-xs text-blue-600 leading-relaxed">{ctxPreview}</p>
          </div>
        </div>
      )}

      {/* ── Identity ── */}
      <Section title="Your Identity" icon={User} desc="Used as sender in every generated message">
        <div className="grid grid-cols-2 gap-4">
          <F label="Full name">
            <input className="input" value={form.full_name||''} onChange={e => set('full_name', e.target.value)} placeholder="John Smith" />
          </F>
          <F label="Designation">
            <input className="input" value={form.designation||''} onChange={e => set('designation', e.target.value)} placeholder="Business Development Manager" />
          </F>
          <F label="Email">
            <input className="input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
          </F>
          <F label="Phone">
            <input className="input" value={form.phone||''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </F>
          <F label="City">
            <input className="input" value={form.city||''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
          </F>
          <F label="Country">
            <input className="input" value={form.country||''} onChange={e => set('country', e.target.value)} placeholder="India" />
          </F>
          <F label="LinkedIn URL">
            <input className="input" value={form.linkedin_url||''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/you" />
          </F>
        </div>
      </Section>

      {/* ── Company ── */}
      <Section title="Your Company" icon={Building2} desc="Shown in outreach as your organisation">
        <div className="grid grid-cols-2 gap-4">
          <F label="Company name">
            <input className="input" value={form.company_name||''} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp" />
          </F>
          <F label="Industry">
            <input className="input" value={form.industry||''} onChange={e => set('industry', e.target.value)} placeholder="B2B SaaS" />
          </F>
          <div className="col-span-2">
            <F label="Company tagline" hint="One sentence — AI uses this in every pitch">
              <input className="input" value={form.company_tagline||''} onChange={e => set('company_tagline', e.target.value)}
                placeholder="We help automotive dealers automate their sales pipeline" />
            </F>
          </div>
          <div className="col-span-2">
            <F label="Website">
              <input className="input" value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://yourdomain.com" />
            </F>
          </div>
        </div>
      </Section>

      {/* ── AI Copy ── */}
      <Section title="AI Outreach Copy" icon={Sparkles}
        desc="These are the most important fields — AI uses them to write personalised emails and WhatsApp messages">
        <F label="Preferred tone" hint="Sets writing style for all AI-generated messages">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {TONES.map(t => (
              <button key={t.value} onClick={() => set('preferred_tone', t.value)}
                className={`p-3 rounded-xl border text-left transition-all
                  ${form.preferred_tone===t.value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className={`text-[10px] mt-0.5 ${form.preferred_tone===t.value ? 'text-blue-100' : 'text-slate-400'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </F>

        <F label="Intro line" hint="How you open cold outreach — AI uses this verbatim to start emails">
          <textarea className="textarea h-16" value={form.intro_line||''} onChange={e => set('intro_line', e.target.value)}
            placeholder="I'm reaching out because I noticed your company is actively growing in the automotive sector…" />
        </F>

        <F label="Value proposition" hint="What you offer — the core pitch woven into every message by AI">
          <textarea className="textarea h-28" value={form.value_proposition||''} onChange={e => set('value_proposition', e.target.value)}
            placeholder="We help automotive parts dealers increase their B2B sales by 30% through automated outreach to garages and service centres. Our platform identifies high-intent buyers and sends personalised follow-ups at scale." />
        </F>
      </Section>

      {/* ── Email Signature ── */}
      <Section title="Email Signature" icon={Mail} desc="Appended to every outbound email automatically">
        <F label="Signature HTML">
          <textarea className="textarea h-24 font-mono text-xs" value={form.email_signature_html||''} onChange={e => set('email_signature_html', e.target.value)}
            placeholder={'<p>Best regards,<br/><strong>John Smith</strong><br/>Business Development · Acme Corp<br/>+91 98765 43210</p>'} />
        </F>
        {form.email_signature_html && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2">Preview</p>
            <div className="text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
          </div>
        )}
      </Section>

      {/* Save button */}
      <div className="flex justify-end pb-2">
        <button onClick={saveProfile} disabled={saving} className="btn-primary px-8">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </div>

      {/* ── SMTP ── */}
      <Section title="SMTP / Email" icon={Server} desc="Env vars on Render take priority — use this to test or override">
        <div className="grid grid-cols-2 gap-4">
          <F label="SMTP Host">
            <input className="input" value={smtp.host} onChange={e => setSmtp(p => ({...p, host:e.target.value}))} placeholder="smtp.gmail.com" />
          </F>
          <F label="Port">
            <input className="input" type="number" value={smtp.port} onChange={e => setSmtp(p => ({...p, port:parseInt(e.target.value)}))} />
          </F>
          <F label="Username / Email">
            <input className="input" type="email" value={smtp.user} onChange={e => setSmtp(p => ({...p, user:e.target.value}))} placeholder="you@gmail.com" />
          </F>
          <F label="App password">
            <div className="relative">
              <input className="input pr-10" type={showPass?'text':'password'}
                value={smtp.password} onChange={e => setSmtp(p => ({...p, password:e.target.value}))}
                placeholder="Gmail app-specific password" />
              <button onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </F>
          <F label="From name">
            <input className="input" value={smtp.from_name} onChange={e => setSmtp(p => ({...p, from_name:e.target.value}))} placeholder="John from Acme" />
          </F>
          <F label="Encryption">
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setSmtp(p => ({...p, use_tls:!p.use_tls}))}
                className={`w-11 h-6 rounded-full relative transition-all flex-shrink-0 ${smtp.use_tls?'bg-blue-500':'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${smtp.use_tls?'left-5':'left-0.5'}`} />
              </button>
              <span className="text-sm text-slate-600">{smtp.use_tls ? 'STARTTLS (port 587)' : 'Plain (port 25)'}</span>
            </div>
          </F>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={saveSmtp} disabled={savingSmtp} className="btn-primary">
            {savingSmtp ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {savingSmtp ? 'Saving…' : 'Save SMTP'}
          </button>
          <button onClick={testSmtp} disabled={testing} className="btn-secondary">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </Section>
    </div>
  )
}