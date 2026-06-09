import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout        from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import EmailPage     from './pages/EmailPage'
import WhatsAppPage  from './pages/WhatsAppPage'
import SMSPage       from './pages/SMSPage' 
import SettingsPage  from './pages/SettingsPage'
import { profileApi, api } from './services/api'
import { LogIn, Sparkles, ShieldCheck } from 'lucide-react'

export const ProfileContext = createContext(null)

// ── 🔒 Clean, Modern Login Component Page ──────────────────────────────────
function LoginPage() {
  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neolix-neolix-backend.hf.space/api/v1'
    window.location.href = `${apiBaseUrl}/auth/google/login`
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Background Subtle Tech Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md card bg-slate-900 border border-slate-800/80 p-8 shadow-2xl relative z-10 rounded-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto text-xl shadow-lg shadow-blue-500/10">
            ⚡
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight pt-1">Welcome to Neolix Hub</h2>
          <p className="text-xs text-slate-400">Autonomous Omnichannel Sales & Outreach Orchestrator</p>
        </div>

        {/* Value Proposition Micro Bullet Badges */}
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

        {/* Action Button */}
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
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'100vh', background:'#f8fafc', gap:16
    }}>
      <div style={{
        width:44, height:44, borderRadius:12,
        background:'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        border:'1px solid #bfdbfe', display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:22
      }}>⚡</div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontWeight:700, fontSize:16, color:'#1e293b', margin:0 }}>
          Starting Neolix Hub{dots}
        </p>
        <p style={{ fontSize:13, color:'#94a3b8', marginTop:6 }}>
          Backend waking up — takes ~30s on first load
        </p>
      </div>
      <div style={{ width:200, height:4, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
        <div style={{
          height:'100%', background:'#3b82f6', borderRadius:99,
          animation:'progress 2.5s ease-in-out infinite'
        }} />
      </div>
      <style>{`@keyframes progress{0%{width:0%;margin-left:0%}50%{width:70%;margin-left:0%}100%{width:0%;margin-left:100%}}`}</style>
    </div>
  )
}

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
      // ✅ Fixed: Changed Python .lower() to JavaScript .toLowerCase()
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

  if (waking && loading) return <WakingUp />

  // Dynamic evaluation for onboarding check gates
  const isOnboarded = !!(profile && profile.company_name && profile.product_description);

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