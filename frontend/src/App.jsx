import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import axios from 'axios'
import {
  LogIn, Sparkles, ShieldCheck, Loader2, LayoutDashboard, Mail, Phone, MessageSquare,
  Settings, LogOut, RefreshCw, Plus, ChevronLeft, Eye, Zap, X, Check, CheckCheck,
  Search, Reply, FileText, Image, PenLine, AlertTriangle, Link2, Save, Info, Smartphone,
  Edit3, ArrowRight, Inbox, CreditCard, Upload,
  User, Building2, Server, MapPin
} from 'lucide-react'

// ── 🌐 API BASE ───────────────────────────────────────────────────────────────
const apiBaseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8000/api/v1'
  : 'https://neolix-neolix-backend.hf.space/api/v1'

export const api = axios.create({ baseURL: apiBaseUrl, timeout: 120000 })

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  updateSmtp: (data) => api.put('/profile/smtp', data),
  testSmtp: () => api.post('/profile/smtp/test'),
  getContext: () => api.get('/profile/context'),
}

export const campaignApi = {
  list: () => api.get('/campaigns/list'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns/create', data),
  preview: (data) => api.post('/campaigns/preview', data),
}

export const waApi = {
  status: () => api.get('/whatsapp/status'),
  logout: () => api.post('/whatsapp/logout'),
  send: (data) => api.post('/whatsapp/send', data),
  campaignList: () => api.get('/whatsapp/campaign/list'),
  campaignDetail: (id) => api.get(`/whatsapp/campaign/${id}`),
  campaignCreate: (data) => api.post('/whatsapp/campaign/create', data),
  preview: (data) => api.post('/whatsapp/preview', data),
}

export const leadsApi = {
  search: (q, limit = 50, channelContext = 'email') =>
    api.get('/leads/search', { params: { q, limit, channel_context: channelContext } }),
  addSingle: (data) => api.post('/leads/single', data),
  addBulk: (raw_text) => api.post('/leads/bulk', { raw_text }),
  uploadFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/leads/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  scanCard: (image_base64) => api.post('/leads/scan', { image_base64 }),
}

export const repliesApi = {
  inbox: (status, channel) =>
    api.get('/replies/inbox', { params: { ...(status ? { status } : {}), ...(channel ? { channel } : {}) } }),
  sent: (cid, channel) =>
    api.get('/replies/sent', { params: { ...(cid ? { campaign_id: cid } : {}), ...(channel ? { channel } : {}) } }),
  thread: (id) => api.get(`/replies/${id}`),
  respond: (id, data) => api.post(`/replies/${id}/respond`, data),
  poll: () => api.post('/replies/poll'),
}

// ── 🧠 CONTEXT ────────────────────────────────────────────────────────────────
export const ProfileContext = createContext(null)

// ── 🎣 HOOKS ──────────────────────────────────────────────────────────────────
export function useUnreadReplies() {
  const [unread, setUnread] = useState({ emailUnread: 0, waUnread: 0, smsUnread: 0 })
  const { activeUserEmail } = useContext(ProfileContext) || {}
  useEffect(() => {
    if (!activeUserEmail) return
    const check = async () => {
      try {
        const { data } = await api.get('/replies/unread-counts')
        setUnread({ emailUnread: data.email || 0, waUnread: data.whatsapp || 0, smsUnread: data.sms || 0 })
      } catch {}
    }
    check()
    const iv = setInterval(check, 10000)
    return () => clearInterval(iv)
  }, [activeUserEmail])
  return unread
}

// ── 🧩 LAYOUT ─────────────────────────────────────────────────────────────────
function Layout() {
  const { profile, setActiveUserEmail } = useContext(ProfileContext)
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('neolix_auth_email')
    setActiveUserEmail('')
    navigate('/')
  }

  const navItems = [
    { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
    { to: '/email',     label: 'Email',     icon: Mail },
    { to: '/whatsapp',  label: 'WhatsApp',  icon: MessageSquare },
    { to: '/sms',       label: 'SMS',       icon: Smartphone },
    { to: '/settings',  label: 'Settings',  icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span>⚡</span>
            <span className="font-black text-slate-100 text-sm">NEOLIX HUB</span>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                  }`
                }
              >
                <item.icon size={15} />{item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-400"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}

// ── ⚙️ SETTINGS PAGE ──────────────────────────────────────────────────────────
const TONES = [
  { value: 'professional', label: 'Direct & Polished',      desc: 'Clear, direct, and respectful. No fluff.' },
  { value: 'friendly',     label: 'Warm & Authentic',       desc: 'Warm, approachable, peer-to-peer.' },
  { value: 'formal',       label: 'Corporate & Precise',    desc: 'Structured, polished, and detailed.' },
  { value: 'casual',       label: 'Quick & Conversational', desc: 'Short, relaxed, as if texting a peer.' },
]

function Section({ title, icon: Icon, desc, children }) {
  return (
    <div className="p-6 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
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

function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext)
  const navigate = useNavigate()
  const [form, setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

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
        })
      } catch {
        toast.error('Failed to load profile')
      }
    }
    load()
  }, [profile])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      await refreshProfile()                        // ← updates context so isOnboarded recalculates
      toast.success('Profile saved — AI will use your updated context!')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      navigate('/')                                 // ← navigate to dashboard after save
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const triggerGoogleOAuthLink = () => {
    window.location.href = `${apiBaseUrl}/auth/google/login`
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
    <button onClick={saveProfile} disabled={saving} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-60 ${className}`}>
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
          <p className="text-xs text-slate-400 mt-1">Configure how the AI represents you, your organization, and your core offering.</p>
        </div>
        <SaveBtn className="flex-shrink-0" />
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

      {/* Email Sending Setup */}
      <Section title="E-mail Sending Setup" icon={Server} desc="Connect your professional Google email natively. No passwords or SMTP required.">
        {isGmailConnected ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-emerald-400">Gmail Sending Account Active</p>
                <p className="text-[11px] text-emerald-500">Sending via: <span className="font-semibold">{connectedEmail}</span></p>
              </div>
            </div>
            <button onClick={triggerGoogleOAuthLink} className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-700 transition-colors flex items-center gap-1">
              <RefreshCw size={11} /> Re-link / Swap Email
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400">Email Integration Not Connected</p>
                <p className="text-[11px] text-amber-300 leading-relaxed">Authorize your Google Workspace or Gmail account so campaigns can be sent.</p>
              </div>
            </div>
            <button type="button" onClick={triggerGoogleOAuthLink} className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl py-2 px-4 font-bold text-xs flex items-center gap-2 transition-all">
              <Link2 size={13} strokeWidth={2.5} /> Connect Google Sending Account
            </button>
          </div>
        )}
      </Section>

      {/* Personal Identity */}
      <Section title="Your Personal Profile" icon={User} desc="How you sign off in emails and introduce yourself on professional channels.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Your Name" hint="How you want to be called">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} placeholder="e.g. John Smith" />
          </F>
          <F label="Job Title">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.designation || ''} onChange={e => set('designation', e.target.value)} placeholder="e.g. Founder, BD Manager" />
          </F>
          <F label="Public Business Email">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
          </F>
          <F label="Direct Phone / Mobile">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </F>
          <F label="Base City">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
          </F>
          <F label="Base Country">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.country || ''} onChange={e => set('country', e.target.value)} placeholder="India" />
          </F>
          <div className="col-span-2">
            <F label="LinkedIn URL" hint="Can be appended to messages as a trust signal">
              <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.linkedin_url || ''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/yourusername" />
            </F>
          </div>
        </div>
      </Section>

      {/* Company Details */}
      <Section title="Your Company Details" icon={Building2} desc="How your business is framed to cold prospects who might not know you yet.">
        <div className="grid grid-cols-2 gap-4">
          <F label="Company Name">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Acme Corp" />
          </F>
          <F label="Core Industry / Category">
            <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder="e.g. Logistics" />
          </F>
          <div className="col-span-2">
            <F label="What does your company do? (One Simple Sentence)" hint="Avoid buzzwords. AI uses this to contextualize pitches.">
              <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.company_tagline || ''} onChange={e => set('company_tagline', e.target.value)} placeholder="e.g. We build custom aluminum storage boxes for commercial cargo fleets." />
            </F>
          </div>
          <div className="col-span-2">
            <F label="Company Website">
              <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" />
            </F>
          </div>
        </div>
      </Section>

      {/* Product / Offering */}
      <Section title="Your Product / Offering" icon={PenLine} desc="The specific product, service, or solution you want the AI to sell during campaigns.">
        <div className="space-y-4">
          <F label="Describe your product / service" hint="Be detailed but natural. The AI scans this to construct your Day 3 product drops.">
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 h-28 leading-relaxed resize-none"
              value={form.product_description || ''}
              onChange={e => set('product_description', e.target.value)}
              placeholder="e.g. Our main product is CargoSafe: heavy-duty, weatherproof storage boxes that mount directly to trucks..."
            />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-center">
              <p className="text-xs font-semibold text-slate-300">Product Photos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{form.product_photos?.length || 0} media assets loaded</p>
            </div>
            <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-center">
              <p className="text-xs font-semibold text-slate-300">Spec Brochures / PDFs</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{form.product_pdfs?.length || 0} documentation nodes</p>
            </div>
          </div>
        </div>
      </Section>

      {/* AI Conversation Styling */}
      <Section title="AI Conversation Styling" icon={Sparkles} desc="Determine how conversational, friendly, or structured your AI outreach drafts feel.">
        <F label="Overall Message Vibe" hint="Determines sentence structures and tone for all background campaigns">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {TONES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('preferred_tone', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.preferred_tone === t.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className={`text-[10px] mt-1 leading-normal font-medium ${form.preferred_tone === t.value ? 'text-blue-100' : 'text-slate-500'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </F>

        <F label="How do you naturally open a conversation?" hint="Your signature ice-breaker. The AI will use this style to start Day 1 messages.">
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 h-16 leading-relaxed resize-none"
            value={form.intro_line || ''}
            onChange={e => set('intro_line', e.target.value)}
            placeholder="e.g. I noticed your team is managing a large regional cargo fleet and wanted to share a quick insight..."
          />
        </F>

        <F label="What specific problem do you solve for prospects?" hint="The AI weaves this organically into cold templates.">
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 h-28 leading-relaxed resize-none"
            value={form.value_proposition || ''}
            onChange={e => set('value_proposition', e.target.value)}
            placeholder="e.g. We help fleet managers eliminate gear damage caused by cheap, leaky plastic storage containers..."
          />
        </F>
      </Section>

      {/* Email Signature */}
      <Section title="Email Signature" icon={Mail} desc="Appended to the bottom of outbound email sequences automatically.">
        <F label="Signature HTML" hint="Plain text, simple HTML, or rich signatures. Keep it brief.">
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 h-24 resize-none"
            value={form.email_signature_html || ''}
            onChange={e => set('email_signature_html', e.target.value)}
            placeholder={'<p>Best regards,<br/><strong>John Smith</strong></p>'}
          />
        </F>
        {form.email_signature_html && (
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2">Live Signature Preview</p>
            <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
          </div>
        )}
      </Section>

      {/* Footer Save */}
      <div className="flex justify-end pb-6">
        <SaveBtn className="px-8" />
      </div>
    </div>
  )
}

// ── 🏎️ APP BOOTSTRAP ──────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [activeUserEmail, setActiveUserEmail] = useState(
    () => localStorage.getItem('neolix_auth_email') || ''
  )

  // Attach auth header to every request
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) config.headers['X-User-Email'] = activeUserEmail
      return config
    })
    return () => api.interceptors.request.eject(interceptor)
  }, [activeUserEmail])

  // Handle OAuth callback redirect with ?login_success=true&email=...
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('login_success') === 'true' && urlParams.get('email')) {
      const email = urlParams.get('email').toLowerCase()
      localStorage.setItem('neolix_auth_email', email)
      setActiveUserEmail(email)
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!activeUserEmail) { setLoading(false); return }
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } finally {
      setLoading(false)
    }
  }, [activeUserEmail])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  // Not logged in
  if (!activeUserEmail) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
      <button
        onClick={() => window.location.href = `${apiBaseUrl}/auth/google/login`}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  )

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-slate-400" size={28} />
    </div>
  )

  // User is onboarded if they have both company_name and product_description filled
  const isOnboarded = !!(
    profile &&
    profile.company_name?.trim() &&
    profile.product_description?.trim()
  )

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, activeUserEmail, setActiveUserEmail }}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            {/* Dashboard — redirect to settings if not onboarded yet */}
            <Route
              path="/"
              element={
                isOnboarded
                  ? <div className="text-2xl font-bold text-slate-800">Dashboard (Placeholder)</div>
                  : <Navigate to="/settings" replace />
              }
            />

            {/* Settings — full profile page; navigates to / after save */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Other pages */}
            <Route path="/email"    element={<div className="text-slate-800 font-bold text-xl">Email Page</div>} />
            <Route path="/whatsapp" element={<div className="text-slate-800 font-bold text-xl">WhatsApp Page</div>} />
            <Route path="/sms"      element={<div className="text-slate-800 font-bold text-xl">SMS Page</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}