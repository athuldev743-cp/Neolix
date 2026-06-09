import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import axios from 'axios'
import { 
  LogIn, Sparkles, ShieldCheck, Loader2, LayoutDashboard, Mail, Phone, MessageSquare, 
  Settings, LogOut, RefreshCw, Plus, ChevronLeft, Eye, Zap, X, Check, CheckCheck, 
  Search, Reply, FileText, Image, PenLine, AlertTriangle, Link2, Save, Info, Smartphone, Edit3, ArrowRight
} from 'lucide-react'

export const ProfileContext = createContext(null)

// ── 🌐 DYNAMIC MULTI-TENANT API SERVICE LAYER ──────────────────────────────────
const apiBaseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8000/api/v1'
  : 'https://neolix-neolix-backend.hf.space/api/v1';

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
})

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.post('/profile', data)
}

export const campaignApi = {
  list: () => api.get('/campaigns/list'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns/create', data),
  preview: (data) => api.post('/campaigns/preview', data)
}

export const waApi = {
  status: () => api.get('/whatsapp/status'),
  logout: () => api.post('/whatsapp/logout'),
  send: (data) => api.post('/whatsapp/send', data),
  campaignList: () => api.get('/whatsapp/campaign/list'),
  campaignDetail: (id) => api.get(`/whatsapp/campaign/${id}`),
  campaignCreate: (data) => api.post('/whatsapp/campaign/create', data)
}

export const repliesApi = {
  inbox: (limit, channel) => api.get(`/replies/inbox?channel=${channel || ''}`),
  sent: (limit, channel) => api.get(`/replies/sent?channel=${channel || ''}`),
  thread: (id) => api.get(`/replies/thread/${id}`),
  respond: (id, data) => api.post(`/replies/respond/${id}`, data),
  poll: () => api.post('/replies/poll')
}

export const leadsApi = {
  search: (q, limit) => api.get(`/leads/search?q=${q}&limit=${limit || 50}`),
  addSingle: (data) => api.post('/leads/single', data),
  addBulk: (text) => api.post('/leads/bulk', { text }),
  uploadFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/leads/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  scanCard: (base64) => api.post('/leads/scan-card', { image: base64 })
}

// ── 🎣 GLOBAL REAL-TIME UNREAD REPLIES SYNCHRONIZER HOOK ──────────────────────
export function useUnreadReplies() {
  const [unread, setUnread] = useState({ emailUnread: 0, waUnread: 0, smsUnread: 0 })
  const { activeUserEmail } = useContext(ProfileContext) || {}

  useEffect(() => {
    if (!activeUserEmail) return
    const check = async () => {
      try {
        const { data } = await api.get('/replies/unread-counts')
        setUnread({
          emailUnread: data.email || 0,
          waUnread: data.whatsapp || 0,
          smsUnread: data.sms || 0
        })
      } catch { /* fallback */ }
    }
    check()
    const iv = setInterval(check, 10000)
    return () => clearInterval(iv)
  }, [activeUserEmail])

  return unread
}

// ── 🔒 PASSWORDLESS GOOGLE AUTHENTICATION GATED PORTAL ───────────────────────
function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${apiBaseUrl}/auth/google/login`
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden px-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md card bg-slate-900 border border-slate-800/80 p-8 shadow-2xl relative z-10 rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto text-xl shadow-lg shadow-blue-500/10">
            ⚡
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight pt-1">Welcome to Neolix Hub</h2>
          <p className="text-xs text-slate-400">Autonomous Omnichannel Sales & Outreach Orchestrator</p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/40 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <ShieldCheck size={14} className="text-blue-500 flex-shrink-0" />
            <span>Isolated Multi-Tenant Security Sandbox Data Contracts</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
            <span>Frictionless Passwordless Direct Google API Integration</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 px-4 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10"
          >
            <LogIn size={14} strokeWidth={2.5} /> Sign in with Google Account
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-medium">Authorized Test Profiles & Developers Only</p>
        </div>
      </div>
    </div>
  )
}

function WakingUp() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-100 to-blue-200 border border-blue-200 flex items-center justify-center text-lg shadow">⚡</div>
      <div className="text-center space-y-1">
        <p className="font-bold text-slate-800 text-sm">Starting Neolix Hub{dots}</p>
        <p className="text-xs text-slate-400">Backend container waking up — takes ~30s on cold starts</p>
      </div>
      <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative">
        <div className="h-full bg-blue-600 rounded-full absolute left-0 top-0 animate-pulse w-3/4" />
      </div>
    </div>
  )
}

// ── 🎛️ CORE NAVIGATION LAYOUT ROUTER WRAPPER ─────────────────────────────────
function Layout() {
  const { profile, setActiveUserEmail } = useContext(ProfileContext)
  const navigate = useNavigate()
  
  const handleLogout = () => {
    localStorage.removeItem('neolix_auth_email')
    setActiveUserEmail('')
    navigate('/')
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/email', label: 'Email Outreach', icon: Mail },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { to: '/sms', label: 'SMS Gateway', icon: Phone },
    { to: '/profile', label: 'Profile & AI Persona', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xl">⚡</span>
            <span className="font-black text-slate-100 tracking-wider text-sm">NEOLIX HUB</span>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800 space-y-4">
          {profile && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs uppercase">
                {profile.full_name?.slice(0, 2) || 'NE'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate">{profile.full_name || 'Neolix User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{profile.company_name || 'Your Company'}</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={14} />
            Logout Account
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 relative">
        <Outlet />
      </main>
    </div>
  )
}

// ── 📊 METRICS & EXECUTIVE ANALYTICS COMPONENT ──────────────────────────────
function DashboardPage() {
  const { profile } = useContext(ProfileContext)
  const [metrics, setMetrics] = useState({ email: { sent: 0, campaigns: 0 }, whatsapp: { sent: 0, campaigns: 0 }, sms: { sent: 0 } })

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const eRes = await campaignApi.list()
        const wRes = await waApi.campaignList()
        const sRes = await api.get('/sms/queue-status')
        
        const emailSent = eRes.data.reduce((acc, c) => acc + (c.sent || 0), 0)
        const waSent = wRes.data.reduce((acc, c) => acc + (c.sent || 0), 0)
        
        setMetrics({
          email: { sent: emailSent, campaigns: eRes.data.length },
          whatsapp: { sent: waSent, campaigns: wRes.data.length },
          sms: { sent: sRes.data.sent_today }
        })
      } catch { /* fallback */ }
    }
    fetchMetrics()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Welcome back, {profile?.full_name || 'Operator'}. Your autonomous engine status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Campaigns</p>
          <p className="text-3xl font-black text-blue-600">{metrics.email.sent.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-semibold">Sent across {metrics.email.campaigns} active campaigns</p>
        </div>
        <div className="card p-6 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Clusters</p>
          <p className="text-3xl font-black text-emerald-600">{metrics.whatsapp.sent.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-semibold">Sent across {metrics.whatsapp.campaigns} campaigns</p>
        </div>
        <div className="card p-6 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMS Gateway Nodes</p>
          <p className="text-3xl font-black text-indigo-600">{metrics.sms.sent.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-semibold">Transpatched today from mobile nodes</p>
        </div>
      </div>
    </div>
  )
}

// ── 👥 STANDALONE RECIPIENT NODE SELECTOR COMPONENT ──────────────────────────
function LeadSelector({ selected, onChange, requirePhone = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const { data } = await leadsApi.search(query, 30)
      const list = (data.leads || data || []).filter(l => !requirePhone || l.phone)
      setResults(list)
    } catch {
      toast.error('Lead query search failed')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (lead) => {
    const next = new Map(selected)
    if (next.has(lead.id)) {
      next.delete(lead.id)
    } else {
      next.set(lead.id, lead)
    }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input 
          className="input flex-1 text-xs" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Filter target contacts inside active databases..." 
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch} className="btn-secondary px-3 py-1.5 text-xs">
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
          {results.map(l => (
            <div 
              key={l.id} 
              onClick={() => toggle(l)} 
              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${selected.has(l.id) ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-slate-100'}`}
            >
              <div>
                <p className="font-semibold">{l.contact_name || l.company_name || 'Unnamed'}</p>
                <p className="text-[10px] text-slate-400">{l.email || l.phone}</p>
              </div>
              {selected.has(l.id) && <Check size={12} className="text-blue-600" />}
            </div>
          ))}
        </div>
      )}
      <div className="text-[11px] text-slate-400 font-semibold">
        Selected Target Segment Size: <strong>{selected.size}</strong> leads
      </div>
    </div>
  )
}

// ── 👥 CAMPAIGN & MULTI-CHANNEL OUTREACH COMPONENT INLINES ────────────────────
import SettingsPage from './pages/SettingsPage'
import EmailPage from './pages/EmailPage'
import WhatsAppPage from './pages/WhatsAppPage'
import SMSPage from './pages/SMSPage'

// ── 🏎️ MASTER REACT APP BOOTSTRAP GATEWAY ──────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waking,  setWaking]  = useState(false)
  const [activeUserEmail, setActiveUserEmail] = useState(() => localStorage.getItem('neolix_auth_email') || '')

  // Global request interceptor: Automatically drops the user's header matrix
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) {
        config.headers['X-User-Email'] = activeUserEmail
      }
      return config
    }, (error) => {
      return Promise.reject(error)
    })

    return () => api.interceptors.request.eject(requestInterceptor)
  }, [activeUserEmail])

  // URL Sniffer Callback Handler
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const loginSuccess = urlParams.get('login_success')
    const emailPayload = urlParams.get('email')

    if (loginSuccess === 'true' && emailPayload) {
      const cleanEmail = emailPayload.trim().toLowerCase()
      localStorage.setItem('neolix_auth_email', cleanEmail)
      setActiveUserEmail(cleanEmail)
      
      // Clean url parameters out smoothly
      const cleanUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!activeUserEmail) {
      setLoading(false)
      return
    }
    
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } catch (e) {
      console.error('profile fetch failed:', e)
    } finally {
      setLoading(false)
      setWaking(false)
    }
  }, [activeUserEmail])

  useEffect(() => {
    const t = setTimeout(() => { if (loading && activeUserEmail) setWaking(true) }, 4000)
    refreshProfile()
    return () => clearTimeout(t)
  }, [refreshProfile, loading, activeUserEmail])

  // ✅ Route Protection Guard: Serve the login page first if context is unauthenticated
  if (!activeUserEmail) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage />
      </>
    )
  }

  // ✅ Block evaluation redirects until the profile request has resolved completely
  if (loading) {
    if (waking) return <WakingUp />
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        <p className="text-slate-400 text-xs mt-4 font-medium tracking-wide">Synchronizing profile credentials...</p>
      </div>
    )
  }

  // Dynamic evaluation for onboarding check gates (guaranteed profile is safely loaded now)
  const isOnboarded = !!(profile && profile.company_name?.trim() && profile.product_description?.trim());

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, activeUserEmail, setActiveUserEmail }}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:'#ffffff', color:'#1e293b',
              border:'1px solid #e2e8f0', fontSize:'13px',
              borderRadius:'12px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary:'#10b981', secondary:'#fff' } },
            error:   { iconTheme: { primary:'#ef4444', secondary:'#fff' } },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            {/* If not onboarded, redirect all root requests straight to the profile onboarding view step */}
            <Route path="/"           element={isOnboarded ? <DashboardPage /> : <Navigate to="/profile" replace />} />
            <Route path="/email/*"    element={isOnboarded ? <EmailPage /> : <Navigate to="/profile" replace />} />
            <Route path="/whatsapp/*" element={isOnboarded ? <WhatsAppPage /> : <Navigate to="/profile" replace />} />
            <Route path="/sms/*"      element={isOnboarded ? <SMSPage /> : <Navigate to="/profile" replace />} /> 
            
            {/* The Unified Settings & Profile Onboarding Hub */}
            <Route path="/settings"   element={<SettingsPage />} />
            <Route path="/profile"    element={<SettingsPage />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}