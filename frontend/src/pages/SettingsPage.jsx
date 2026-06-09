import { useState, useContext, useEffect } from 'react'
import {
  User, Building2, Server, MapPin, Sparkles, PenLine,
  Check, Loader2, Save, Mail, RefreshCw, Link2, AlertTriangle
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

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
      // ✅ Bind Product properties safely on mount
      product_description:  profile.product_description  || '',
      product_photos:       profile.product_photos       || [],
      product_pdfs:         profile.product_pdfs         || [],
    })
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
    } catch { 
      toast.error('Failed to save profile context configurations') 
    } finally { 
      setSaving(false) 
    }
  }

  const triggerGoogleOAuthLink = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neolix-neolix-backend.hf.space/api/v1'
    window.location.href = `${apiBaseUrl}/auth/google/login`
  }

  if (!profile) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin text-blue-500" />
    </div>
  )

  const isGmailConnected = profile.google_oauth?.status === 'connected'
  const connectedEmail = profile.google_oauth?.connected_email

  const ctxPreview = [
    form.full_name && `Name: ${form.full_name}`,
    form.designation && `Title: ${form.designation}`,
    form.company_name && `Company: ${form.company_name}`,
    form.company_tagline && `What we do: ${form.company_tagline}`,
    form.product_description && `Product: ${form.product_description?.slice(0, 40)}…`,
    form.value_proposition && `Value prop: ${form.value_proposition?.slice(0, 60)}…`,
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

      {/* Google API Integration Gateway */}
      <Section title="Google API Integration Gateway" icon={Server} desc="Connect your account via direct Google APIs. No manual passwords required.">
        {isGmailConnected ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Direct Gmail API Connected</p>
                <p className="text-[11px] text-emerald-600">Outbound tracking campaigns sending smoothly via: <span className="font-semibold">{connectedEmail}</span></p>
              </div>
            </div>
            <button onClick={triggerGoogleOAuthLink} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-3xs">
              <RefreshCw size={11} /> Re-link Account
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Gmail Outreach Delivery Interrupted</p>
                <p className="text-[11px] text-amber-600 leading-relaxed">You haven't linked your Google API workspace node yet. Connect your email to activate automated outreach delivery campaigns instantly.</p>
              </div>
            </div>
            <button type="button" onClick={triggerGoogleOAuthLink} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 px-4 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm">
              <Link2 size={13} strokeWidth={2.5} /> Authorize Direct Gmail API Channel
            </button>
          </div>
        )}
      </Section>

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
          <div className="col-span-2">
            <F label="LinkedIn URL">
              <input className="input" value={form.linkedin_url||''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/you" />
            </F>
          </div>
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

      {/* ── ✅ NEW: Product Showcase Builder ── */}
      <Section title="Product Showcase Builder" icon={PenLine} desc="Detailed parameters injected into Day 3 follow-ups of your 9-Day Campaign sequences">
        <div className="space-y-4">
          <F label="Product/Service Description" hint="Provide explicit specifications. The AI scans this context to construct your pitch copies.">
            <textarea className="textarea h-28" value={form.product_description||''} onChange={e => set('product_description', e.target.value)}
              placeholder="Enter item configurations, technical specifications, or specialized service tiers..." />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <p className="text-xs font-semibold text-slate-600">Product Photos</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{form.product_photos?.length || 0} assets uploaded</p>
            </div>
            <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <p className="text-xs font-semibold text-slate-600">Brochure PDFs</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{form.product_pdfs?.length || 0} specifications loaded</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI Copy ── */}
      <Section title="AI Outreach Copy" icon={Sparkles} desc="These are the most important fields — AI uses them to write personalised emails and WhatsApp messages">
        <F label="Preferred tone" hint="Sets writing style for all AI-generated messages">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {TONES.map(t => (
              <button key={t.value} type="button" onClick={() => set('preferred_tone', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${form.preferred_tone===t.value ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className={`text-[10px] mt-0.5 ${form.preferred_tone===t.value ? 'text-blue-100' : 'text-slate-400'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </F>

        <F label="Intro line" hint="How you open cold outreach — AI uses this verbatim to start emails">
          <textarea className="textarea h-16" value={form.intro_line||''} onChange={e => set('intro_line', e.target.value)} placeholder="I'm reaching out because I noticed your company is actively growing in the automotive sector…" />
        </F>

        <F label="Value proposition" hint="What you offer — the core pitch woven into every message by AI">
          <textarea className="textarea h-28" value={form.value_proposition||''} onChange={e => set('value_proposition', e.target.value)} placeholder="We help automotive parts dealers increase their B2B sales by 30% through automated outreach..." />
        </F>
      </Section>

      {/* ── Email Signature ── */}
      <Section title="Email Signature" icon={Mail} desc="Appended to every outbound email automatically">
        <F label="Signature HTML">
          <textarea className="textarea h-24 font-mono text-xs" value={form.email_signature_html||''} onChange={e => set('email_signature_html', e.target.value)} placeholder={'<p>Best regards,<br/><strong>John Smith</strong></p>'} />
        </F>
        {form.email_signature_html && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2">Preview</p>
            <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
          </div>
        )}
      </Section>

      <div className="flex justify-end pb-6">
        <button onClick={saveProfile} disabled={saving} className="btn-primary px-8">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}