import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, useCallback, createContext } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import EmailPage from './pages/EmailPage';
import WhatsAppPage from './pages/WhatsAppPage';
import SMSPage from './pages/SMSPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { profileApi, api } from './services/api';

export const ProfileContext = createContext(null);

function AppRoutes() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserEmail, setActiveUserEmail] = useState(
    () => localStorage.getItem('neolix_auth_email') || ''
  );

  // Attach email header to every API request
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) config.headers['X-User-Email'] = activeUserEmail;
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, [activeUserEmail]);

  // Pick up ?email= from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      const clean = email.trim().toLowerCase();
      localStorage.setItem('neolix_auth_email', clean);
      setActiveUserEmail(clean);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!activeUserEmail) { setLoading(false); return; }
    try {
      const { data } = await profileApi.get();
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeUserEmail]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // Not logged in → show auth page (outside Layout, no sidebar)
  if (!activeUserEmail) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // KEY FIX: isOnboarded derived fresh from latest profile on every render
  const isOnboarded = !!(
    profile?.company_name?.trim() &&
    profile?.product_description?.trim()
  );

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, activeUserEmail, isOnboarded }}>
      <Routes>
        <Route element={<Layout />}>
          {/* Root: onboarded → dashboard, else → settings */}
          <Route
            path="/"
            element={isOnboarded ? <DashboardPage /> : <Navigate to="/settings" replace />}
          />
          {/* Protected routes: require onboarding */}
          <Route
            path="/email/*"
            element={isOnboarded ? <EmailPage /> : <Navigate to="/settings" replace />}
          />
          <Route
            path="/whatsapp/*"
            element={isOnboarded ? <WhatsAppPage /> : <Navigate to="/settings" replace />}
          />
          <Route
            path="/sms/*"
            element={isOnboarded ? <SMSPage /> : <Navigate to="/settings" replace />}
          />
          {/* Settings always accessible */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProfileContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppRoutes />
    </BrowserRouter>
  );
}