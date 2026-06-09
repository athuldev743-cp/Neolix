import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout        from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import EmailPage     from './pages/EmailPage'
import WhatsAppPage  from './pages/WhatsAppPage'
import SMSPage       from './pages/SMSPage' 
import SettingsPage  from './pages/SettingsPage'
import { profileApi, api } from './services/api' // ✅ Extracted the global api axios instance

export const ProfileContext = createContext(null)

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

  // ✅ Global interceptor mutation: dynamically appends multi-tenant context signature headers
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

  // ✅ URL Sniffer Handler: Parses Google Console redirect success matrices cleanly on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const loginSuccess = urlParams.get('login_success')
    const emailPayload = urlParams.get('email')

    if (loginSuccess === 'true' && emailPayload) {
      localStorage.setItem('neolix_auth_email', emailPayload.trim().lower())
      setActiveUserEmail(emailPayload.trim().lower())
      
      // Strips query strings clean from visual viewpoint bounds to look secure and professional
      const cleanUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    // If no test user email has been assigned yet, bypass server checks to prevent 401 intercept drops
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

  // Simple mock layout container wrapper prompting verification fallback if storage email tracking isn't live
  if (!activeUserEmail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-4 text-center">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm animate-pulse">💎</div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Welcome to Neolix Hub Hub</h2>
        <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">Please connect your test workspace workspace account via Google API validation strings to build context.</p>
        <button 
          onClick={() => {
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neolix-neolix-backend.hf.space/api/v1'
            window.location.href = `${apiBaseUrl}/auth/google/login`
          }}
          className="mt-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 px-6 font-bold text-xs shadow-md shadow-blue-600/10 transition-all"
        >
          Authorize Google Cloud User Account
        </button>
      </div>
    )
  }

  if (waking && loading) return <WakingUp />

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
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/email/*"    element={<EmailPage />} />
            <Route path="/whatsapp/*" element={<WhatsAppPage />} />
            <Route path="/sms/*"      element={<SMSPage />} /> 
            <Route path="/settings"   element={<SettingsPage />} />
            <Route path="/profile"    element={<SettingsPage />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}