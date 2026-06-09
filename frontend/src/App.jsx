import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import axios from 'axios'
import { 
  LogIn, Sparkles, ShieldCheck, Loader2, LayoutDashboard, Mail, Phone, MessageSquare, 
  Settings, LogOut, RefreshCw, Plus, ChevronLeft, Eye, Zap, X, Check, CheckCheck, 
  Search, Reply, FileText, Image, PenLine, AlertTriangle, Link2, Save, Info, Smartphone, Edit3, ArrowRight, Inbox, CreditCard, Upload
} from 'lucide-react'

// ── 🌐 DYNAMIC MULTI-TENANT API SERVICE LAYER ──────────────────────────────────
const apiBaseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8000/api/v1'
  : 'https://neolix-neolix-backend.hf.space/api/v1';

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
  preview: (data) => api.post('/campaigns/preview', data)
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
  search: (q, limit = 50, channelContext = 'email') => api.get('/leads/search', { params: { q, limit, channel_context: channelContext } }),
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
  inbox: (status, channel) => api.get('/replies/inbox', { params: { ...(status ? { status } : {}), ...(channel ? { channel } : {}) } }),
  sent: (cid, channel) => api.get('/replies/sent', { params: { ...(cid ? { campaign_id: cid } : {}), ...(channel ? { channel } : {}) } }),
  thread: (id) => api.get(`/replies/${id}`),
  respond: (id, data) => api.post(`/replies/${id}/respond`, data),
  poll: () => api.post('/replies/poll'),
}

export const ProfileContext = createContext(null)

// ── 🎣 HOOKS ───────────────────────────────────────────────────────────────
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

// ── 🧩 COMPONENTS ───────────────────────────────────────────────────────────
function Layout() {
  const { profile, setActiveUserEmail } = useContext(ProfileContext)
  const navigate = useNavigate()
  const handleLogout = () => { localStorage.removeItem('neolix_auth_email'); setActiveUserEmail(''); navigate('/') }
  
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/email', label: 'Email', icon: Mail },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { to: '/sms', label: 'SMS', icon: Smartphone },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8"><span>⚡</span><span className="font-black text-slate-100 text-sm">NEOLIX HUB</span></div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                <item.icon size={15} />{item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-400"><LogOut size={14} /> Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8"><Outlet /></main>
    </div>
  )
}

// ── 🏎️ APP BOOTSTRAP ──────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeUserEmail, setActiveUserEmail] = useState(() => localStorage.getItem('neolix_auth_email') || '')

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) config.headers['X-User-Email'] = activeUserEmail
      return config
    })
    return () => api.interceptors.request.eject(interceptor)
  }, [activeUserEmail])

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
    } finally { setLoading(false) }
  }, [activeUserEmail])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  if (!activeUserEmail) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
      <button onClick={() => window.location.href = `${apiBaseUrl}/auth/google/login`} className="btn-primary">Sign in with Google</button>
    </div>

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

  const isOnboarded = !!(profile && profile.company_name?.trim() && profile.product_description?.trim())

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, activeUserEmail, setActiveUserEmail }}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={isOnboarded ? <div className="text-2xl font-bold">Dashboard (Placeholder)</div> : <Navigate to="/profile" replace />} />
            <Route path="/profile" element={<div>Settings Page (Onboarding Hub)</div>} />
            <Route path="/email" element={<div>Email Page</div>} />
            <Route path="/whatsapp" element={<div>WhatsApp Page</div>} />
            <Route path="/sms" element={<div>SMS Page</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}