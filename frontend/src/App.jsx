import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import EmailPage     from './pages/EmailPage'
import WhatsAppPage  from './pages/WhatsAppPage'
import SettingsPage  from './pages/SettingsPage'
import { profileApi } from './services/api'

export const ProfileContext = createContext(null)

export default function App() {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } catch (e) {
      console.error('profile fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading }}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"         element={<DashboardPage />} />
            <Route path="/email/*"  element={<EmailPage />} />
            <Route path="/whatsapp/*" element={<WhatsAppPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}