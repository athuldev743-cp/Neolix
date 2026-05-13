import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, createContext } from 'react'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import { LeadsPage, ScannerPage, OutreachPage, SettingsPage } from './pages/PlaceholderPages'
import { profileApi } from './services/api'

// 1. Create a Context for the Profile
export const ProfileContext = createContext(null)

export default function App() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await profileApi.get()
      setProfile(data)
    } catch (err) {
      console.error("Failed to fetch profile:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    refreshProfile() 
  }, [refreshProfile])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading }}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1C2035',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '13px',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#10F5A0', secondary: '#1C2035' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#1C2035' } },
          }}
        />
        
        <Routes>
          {/* Wrap only the authenticated routes in the Layout */}
          <Route element={<Layout />}>
            <Route path="/"         element={<DashboardPage />} />
            <Route path="/profile"  element={<ProfilePage />} />
            <Route path="/leads"    element={<LeadsPage />} />
            <Route path="/scanner"  element={<ScannerPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          
          {/* Example of a page without Sidebar (Future-proofing) */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  )
}