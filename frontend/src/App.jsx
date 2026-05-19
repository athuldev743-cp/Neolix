import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout        from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import EmailPage     from './pages/EmailPage'
import WhatsAppPage  from './pages/WhatsAppPage'
import SMSPage       from './pages/SMSPage' // Import the new SMS Gateway panel layout
import SettingsPage  from './pages/SettingsPage'
import { profileApi } from './services/api'

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

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } catch (e) {
      console.error('profile fetch failed:', e)
    } finally {
      setLoading(false)
      setWaking(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (loading) setWaking(true) }, 4000)
    refreshProfile()
    return () => clearTimeout(t)
  }, [refreshProfile])

  if (waking && loading) return <WakingUp />

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading }}>
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
            <Route path="/sms/*"      element={<SMSPage />} /> {/* Route added to process SMS views */}
            <Route path="/settings"   element={<SettingsPage />} />
            <Route path="/profile"    element={<SettingsPage />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}