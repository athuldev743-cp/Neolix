import { useState, useContext, useEffect } from 'react'
import {
  User, Building2, PenLine, Server,
  Check, Loader2, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { profileApi } from '../services/api'
import { ProfileContext } from '../App'

const TONES = ['professional', 'friendly', 'formal', 'casual']

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Icon size={15} className="text-blue-600" />
        </div>
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
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
  const [form, setForm]   = useState({})
  const [smtp, setSmtp]   = useState({ host:'smtp.gmail.com', port:587, user:'', password:'', from_name:'', use_tls:true })
  const [saving, setSaving]         = useState(false)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [testing, setTesting]       = useState(false)
  const [showPass, setShowPass]     = useState(false)

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

  const set = (k, v) => setForm(p => ({...p, [k]: v}))

  const saveProfile = async () => {
    setSaving(true)
    try { await profileApi.update(form); await refreshProfile(); toast.success('Profile saved!') }
    catch { toast.error('Failed to save') } finally { setSaving(false) }
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
      if (data.ok) toast.success(`SMTP OK: ${data.message}`)
      else toast.error(`Failed: ${data.error}`)
    } catch { toast.error('Test failed') } finally { setTesting(false) }
  }

  if (!profile) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Profile context is injected into every AI-generated message</p>
      </div>

      {/* Identity */}
      <Section title="Your Identity" icon={User}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name">
            <input className="input" value={form.full_name||''} onChange={e => set('full_name', e.target.value)} placeholder="John Smith" />
          </Field>
          <Field label="Designation">
            <input className="input" value={form.designation||''} onChange={e => set('designation', e.target.value)} placeholder="Business Development Manager" />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone||''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="City">
            <input className="input" value={form.city||''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
          </Field>
          <Field label="Country">
            <input className="input" value={form.country||''} onChange={e => set('country', e.target.value)} placeholder="India" />
          </Field>
        </div>
      </Section>

      {/* Company */}
      <Section title="Your Company" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company name">
            <input className="input" value={form.company_name||''} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp" />
          </Field>
          <Field label="Industry">
            <input className="input" value={form.industry||''} onChange={e => set('industry', e.target.value)} placeholder="B2B SaaS" />
          </Field>
          <div className="col-span-2">
            <Field label="Company tagline" hint="One-liner used in AI prompts">
              <input className="input" value={form.company_tagline||''} onChange={e => set('company_tagline', e.target.value)} placeholder="We help automotive dealers automate their sales pipeline" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Website">
              <input className="input" value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://yourdomain.com" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Outreach prefs */}
      <Section title="Outreach Preferences" icon={PenLine}>
        <Field label="Preferred tone" hint="How Groq writes your emails and WA messages">
          <div className="flex gap-2 flex-wrap mt-1">
            {TONES.map(t => (
              <button key={t} onClick={() => set('preferred_tone', t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
                  ${form.preferred_tone===t
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Intro line" hint="How you open cold emails (AI uses this)">
          <input className="input" value={form.intro_line||''} onChange={e => set('intro_line', e.target.value)}
            placeholder="I'm reaching out because I noticed your company…" />
        </Field>
        <Field label="Value proposition" hint="What you offer — woven into every message">
          <textarea className="textarea h-24" value={form.value_proposition||''} onChange={e => set('value_proposition', e.target.value)}
            placeholder="We help [industry] businesses increase revenue by 30% through automated outreach…" />
        </Field>
        <Field label="Email signature HTML" hint="Appended to every outbound email">
          <textarea className="textarea h-24 font-mono text-xs" value={form.email_signature_html||''} onChange={e => set('email_signature_html', e.target.value)}
            placeholder={'<p><strong>John Smith</strong></p>\n<p>Acme Corp</p>'} />
        </Field>
      </Section>

      <div className="flex justify-end">
        <button onClick={saveProfile} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* SMTP */}
      <Section title="SMTP / Email" icon={Server}>
        <p className="text-xs text-slate-500 -mt-1">
          Env vars in Render take priority. Use this to override or test a different account.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SMTP Host">
            <input className="input" value={smtp.host} onChange={e => setSmtp(p => ({...p, host:e.target.value}))} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <input className="input" type="number" value={smtp.port} onChange={e => setSmtp(p => ({...p, port:parseInt(e.target.value)}))} />
          </Field>
          <Field label="Username / Email">
            <input className="input" type="email" value={smtp.user} onChange={e => setSmtp(p => ({...p, user:e.target.value}))} placeholder="you@gmail.com" />
          </Field>
          <Field label="App password">
            <div className="relative">
              <input className="input pr-10" type={showPass?'text':'password'}
                value={smtp.password} onChange={e => setSmtp(p => ({...p, password:e.target.value}))}
                placeholder="App-specific password" />
              <button onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="From name">
            <input className="input" value={smtp.from_name} onChange={e => setSmtp(p => ({...p, from_name:e.target.value}))} placeholder="John from Acme" />
          </Field>
          <Field label="TLS">
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setSmtp(p => ({...p, use_tls:!p.use_tls}))}
                className={`w-11 h-6 rounded-full relative transition-all ${smtp.use_tls?'bg-blue-500':'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${smtp.use_tls?'left-5':'left-0.5'}`} />
              </button>
              <span className="text-sm text-slate-600">{smtp.use_tls?'STARTTLS on':'TLS off'}</span>
            </div>
          </Field>
        </div>
        <div className="flex gap-3 pt-1">
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