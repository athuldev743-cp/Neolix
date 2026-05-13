import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout from './components/layout/Layout'
import DashboardPage  from './pages/DashboardPage'
import ProfilePage    from './pages/ProfilePage'
import LeadsPage      from './pages/LeadsPage'
import CampaignPage   from './pages/CampaignPage'
import RepliesPage    from './pages/RepliesPage'
import WhatsAppPage   from './pages/WhatsAppPage'
import SettingsPage   from './pages/SettingsPage'
import { profileApi } from './services/api'

export const ProfileContext = createContext(null)

export default function App() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
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
            success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"          element={<DashboardPage />} />
            <Route path="/leads"     element={<LeadsPage />} />
            <Route path="/campaigns" element={<CampaignPage />} />
            <Route path="/replies"   element={<RepliesPage />} />
            <Route path="/whatsapp"  element={<WhatsAppPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="/profile"   element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}