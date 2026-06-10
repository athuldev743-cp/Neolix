import { useState, useContext, useEffect, createContext } from 'react'
import {
  User, Building2, Server, MapPin, Sparkles, PenLine,
  Check, Loader2, Save, Mail, RefreshCw, Link2, AlertTriangle, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

// ── HYBRID SANDBOX / PRODUCTION RESOLVER ──────────────────────────────────────
// This pattern prevents compilation errors in standalone previews while
// binding seamlessly to your production endpoints in the live app.
let activeProfileApi = typeof window !== 'undefined' ? window.profileApi : null;
let ActiveProfileContext = typeof window !== 'undefined' ? window.ProfileContext : null;

// Sandbox fallback mock APIs to ensure the Preview renders beautifully
if (!activeProfileApi) {
  activeProfileApi = {
    get: async () => ({
      data: {
        id: "getomniagent@gmail.com",
        full_name: "Athul Dev",
        designation: "Founder",
        company_name: "Neolix Hub",
        company_tagline: "Autonomous Omnichannel Sales & Outreach",
        industry: "B2B SaaS",
        website: "https://neolix.co",
        email: "admin.neolix@gmail.com",
        phone: "+91 98765 43210",
        city: "Kochi",
        country: "India",
        linkedin_url: "https://linkedin.com/in/athuldev",
        preferred_tone: "professional",
        intro_line: "Hi {lead_name}, noticed your team at {lead_company}...",
        value_proposition: "We help firms automate outreach operations...",
        email_signature_html: "<p>Best regards,<br/><strong>Athul Dev</strong></p>",
        product_description: "Core automated lead scraping modules with dynamic B2B multi-tenant setup engines.",
        product_photos: [],
        product_pdfs: [],
        google_oauth: { status: "connected", connected_email: "admin.neolix@gmail.com" }
      }
    }),
    update: async (data) => {
      toast.success("Profile updated in preview mode!");
      return { data };
    }
  };
}

if (!ActiveProfileContext) {
  ActiveProfileContext = createContext({
    profile: {
      full_name: "Athul Dev",
      designation: "Founder",
      company_name: "Neolix Hub",
      google_oauth: { status: "connected", connected_email: "admin.neolix@gmail.com" }
    },
    refreshProfile: async () => {}
  });
}

const TONES = [
  { value: 'professional', label: 'Direct & Polished', desc: 'Clear, direct, and respectful. No fluff.' },
  { value: 'friendly',     label: 'Warm & Authentic', desc: 'Warm, APPROACHABLE, peer-to-peer.' },
  { value: 'formal',       label: 'Corporate & Precise', desc: 'Structured, polished, and detailed.' },
  { value: 'casual',       label: 'Quick & Conversational', desc: 'Short, relaxed, as if texting a peer.' },
]

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
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>
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

export default function SettingsPage() {
  const { profile, refreshProfile } = useContext(ActiveProfileContext)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const { data } = await activeProfileApi.get()
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
        })
      } catch {
        toast.error('Failed to load active profile metrics')
      }
    }
    loadProfileData()
  }, [profile])

  const set = (k, v) => { setForm(p => ({...p, [k]: v})); setSaved(false) }

 const saveProfile = async () => {
  setSaving(true)
  try {
    await activeProfileApi.update(form)
    await refreshProfile()                  // ← updates profile state in context
    toast.success('Profile saved!')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)

    // Navigate to dashboard — App re-renders with fresh profile,
    // isOnboarded will now be true, so the route allows it through
    const filled = !!(form.company_name?.trim() && form.product_description?.trim())
    if (filled) navigate('/')

  } catch {
    toast.error('Failed to save profile')
  } finally {
    setSaving(false)
  }
}

  const triggerGoogleOAuthLink = () => {
    // Safely reads global process variables to avoid es2015 import.meta.env exceptions
    const apiBaseUrl = (typeof window !== 'undefined' && window.VITE_API_URL) || 'https://neolix-neolix-backend.hf.space/api/v1'
    window.location.href = `${apiBaseUrl}/auth/google/login`
  }

  const isGmailConnected = profile?.google_oauth?.status === 'connected'
  const connectedEmail = profile?.google_oauth?.connected_email

  const ctxPreview = [
    form.full_name && `SDR: ${form.full_name}`,
    form.company_name && `For: ${form.company_name}`,
    form.company_tagline && `Tagline: ${form.company_tagline}`,
    form.product_description && `Offering: ${form.product_description?.slice(0, 40)}…`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Profile & AI Persona</h1>
          <p className="text-xs text-slate-400 mt-1">Configure how the AI represents you, your organization, and your core offering.</p>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary flex-shrink-0">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      {/* Live context preview */}
      {ctxPreview && (
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <Sparkles size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-400 mb-0.5">Active AI Knowledge Base Context</p>
            <p className="text-xs text-blue-300 leading-relaxed">{ctxPreview}</p>
          </div>
        </div>
      )}

      {/* Google API Integration Gateway */}
      <Section title="E-mail Sending Setup" icon={Server} desc="Connect your professional Google email natively. No passwords or SMTP server configuration required.">
        {isGmailConnected ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-emerald-400">Gmail Sending Account Active</p>
                <p className="text-[11px] text-emerald-500">Sending campaigns directly through: <span className="font-semibold">{connectedEmail}</span></p>
              </div>
            </div>
            <button onClick={triggerGoogleOAuthLink} className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-3xs">
              <RefreshCw size={11} /> Re-link / Swap Email
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400">Email Integration Not Connected</p>
                <p className="text-[11px] text-amber-300 leading-relaxed">You must authorize your Google Workspace or Gmail account so our background scheduler can send your outreach drafts.</p>
              </div>
            </div>
            <button type="button" onClick={triggerGoogleOAuthLink} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl py-2 px-4 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm">
              <Link2 size={13} strokeWidth={2.5} /> Connect Google Sending Account
            </button>
          </div>
        )}
      </Section>

      {/* ── Personal Identity ── */}
      <Section title="Your Personal Profile" icon={User} desc="How you sign off in emails and introduce yourself on professional chat channels.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Your Name" hint="How you want to be called (e.g. John, Dr. Sarah)">
            <input className="input" value={form.full_name||''} onChange={e => set('full_name', e.target.value)} placeholder="e.g. John Smith" />
          </F>
          <F label="Job Title" hint="Used to explain your role if asked">
            <input className="input" value={form.designation||''} onChange={e => set('designation', e.target.value)} placeholder="e.g. Founder, BD Manager" />
          </F>
          <F label="Public Business Email" hint="Where prospects will see replies">
            <input className="input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
          </F>
          <F label="Direct Phone / Mobile" hint="Used for SMS/WhatsApp identification">
            <input className="input" value={form.phone||''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </F>
          <F label="Base City">
            <input className="input" value={form.city||''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
          </F>
          <F label="Base Country">
            <input className="input" value={form.country||''} onChange={e => set('country', e.target.value)} placeholder="India" />
          </F>
          <div className="col-span-2">
            <F label="LinkedIn URL" hint="Can be appended to message hooks as a trust signal">
              <input className="input" value={form.linkedin_url||''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/yourusername" />
            </F>
          </div>
        </div>
      </Section>

      {/* ── Company Details ── */}
      <Section title="Your Company Details" icon={Building2} desc="How your business is framed to cold prospects who might not know you yet.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Company Name">
            <input className="input" value={form.company_name||''} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Acme Corp" />
          </F>
          <F label="Core Industry / Category" hint="e.g. Real Estate, Logistics, B2B SaaS">
            <input className="input" value={form.industry||''} onChange={e => set('industry', e.target.value)} placeholder="e.g. Logistics" />
          </F>
          <div className="col-span-2">
            <F label="What does your company do? (One Simple Sentence)" hint="Avoid buzzwords. Describe your core business clearly. AI uses this line to contextualize pitches.">
              <input className="input" value={form.company_tagline||''} onChange={e => set('company_tagline', e.target.value)}
                placeholder="e.g. We build custom aluminum storage boxes for commercial cargo fleets." />
            </F>
          </div>
          <div className="col-span-2">
            <F label="Company Website">
              <input className="input" value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" />
            </F>
          </div>
        </div>
      </Section>

      {/* ── Product Showcase ── */}
      <Section title="Your Product / Offering" icon={PenLine} desc="The specific product, service, or solution you want the AI to sell during campaigns.">
        <div className="space-y-4">
          <F label="Describe your product / service as if explaining it to a friend" hint="Be highly detailed but natural. Tell the AI what makes it special, the technical advantages, or specific pricing tiers. The AI scans this context to construct your Day 3 product drops.">
            <textarea className="textarea h-28 leading-relaxed" value={form.product_description||''} onChange={e => set('product_description', e.target.value)}
              placeholder="e.g. Our main product is CargoSafe: heavy-duty, weatherproof storage boxes that mount directly to trucks. They are made from aviation-grade aluminum, cost 30% less than steel alternatives, and can be customized with biometric locks." />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-dashed border-slate-800 rounded-xl bg-slate-900 text-center">
              <p className="text-xs font-semibold text-slate-300">Product Photos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{form.product_photos?.length || 0} media assets loaded</p>
            </div>
            <div className="p-4 border border-dashed border-slate-800 rounded-xl bg-slate-900 text-center">
              <p className="text-xs font-semibold text-slate-300">Spec Brochures / PDFs</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{form.product_pdfs?.length || 0} documentation nodes</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI Copywriting Styles ── */}
      <Section title="AI Conversation Styling" icon={Sparkles} desc="Determine how conversational, friendly, or structured you want your AI outreach drafts to feel.">
        <F label="Overall Message Vibe" hint="Determines sentence structures and tone for all background campaigns">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {TONES.map(t => (
              <button key={t.value} type="button" onClick={() => set('preferred_tone', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${form.preferred_tone===t.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'}`}>
                <p className="text-xs font-bold">{t.label}</p>
                <p className={`text-[10px] mt-1 leading-normal font-medium ${form.preferred_tone===t.value ? 'text-blue-100' : 'text-slate-500'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </F>

        <F label="How do you naturally open a conversation?" hint="Your signature ice-breaker. The AI will use this style verbatim to start Day 1 messages.">
          <textarea className="textarea h-16 leading-relaxed bg-slate-950 border-slate-800 text-slate-300" value={form.intro_line||''} onChange={e => set('intro_line', e.target.value)} placeholder="e.g. I noticed your team is managing a large regional cargo fleet and wanted to share a quick insight..." />
        </F>

        <F label="What specific problem do you solve for prospects?" hint="The core value anchor. Explain who you help, why they struggle, and how you fix it. The AI weaves this organically into cold templates.">
          <textarea className="textarea h-28 leading-relaxed bg-slate-950 border-slate-800 text-slate-300" value={form.value_proposition||''} onChange={e => set('value_proposition', e.target.value)} placeholder="e.g. We help fleet managers eliminate gear damage caused by cheap, leaky plastic storage containers. Our boxes keep cargo dry, organized, and secured, saving about $4k per vehicle annually in replacement tools." />
        </F>
      </Section>

      {/* ── Email Signature ── */}
      <Section title="Email Signature" icon={Mail} desc="Appended to the bottom of outbound email sequences automatically.">
        <F label="Signature HTML Copy" hint="Plain text, simple HTML, or rich signatures. Keep it brief.">
          <textarea className="textarea h-24 font-mono text-xs bg-slate-950 border-slate-800 text-slate-300" value={form.email_signature_html||''} onChange={e => set('email_signature_html', e.target.value)} placeholder={'<p>Best regards,<br/><strong>John Smith</strong></p>'} />
        </F>
        {form.email_signature_html && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2">Live Render Signature Preview</p>
            <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
          </div>
        )}
      </Section>

      {/* Footer Save */}
      <div className="flex justify-end pb-6">
        <button onClick={saveProfile} disabled={saving} className="btn-primary px-8">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}