import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, useCallback, createContext } from 'react';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import EmailPage from './pages/EmailPage';
import WhatsAppPage from './pages/WhatsAppPage';
import SMSPage from './pages/SMSPage';
import SettingsPage from './pages/SettingsPage';
import { profileApi, api } from './services/api';
import { Loader2 } from 'lucide-react';

export const ProfileContext = createContext(null);

// 1. Defined at top-level so all functions can see it
const apiBaseUrl = 'https://neolix-neolix-backend.hf.space/api/v1';

// ── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage() {
  const handleGoogleLogin = () => window.location.href = `${apiBaseUrl}/auth/google/login`;

  return (
    <div className="login-screen-container">
      <div className="login-card">
        <h1>Welcome to Neolix Hub</h1>
        <button onClick={handleGoogleLogin}>Sign in with Google</button>
      </div>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserEmail, setActiveUserEmail] = useState(() => localStorage.getItem('neolix_auth_email') || '');

  // 2. Ensure Interceptor is always active
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) config.headers['X-User-Email'] = activeUserEmail;
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, [activeUserEmail]);

  // Auth Sync
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      localStorage.setItem('neolix_auth_email', cleanEmail);
      setActiveUserEmail(cleanEmail);
      window.history.replaceState({}, document.title, window.location.pathname);
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

  if (loading) return <div className="loading-screen"><Loader2 className="animate-spin" /></div>;
  if (!activeUserEmail) return <LoginPage />;

  const isOnboarded = !!(profile?.company_name?.trim() && profile?.product_description?.trim());

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, activeUserEmail }}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={isOnboarded ? <DashboardPage /> : <Navigate to="/settings" replace />} />
            <Route path="/email/*" element={isOnboarded ? <EmailPage /> : <Navigate to="/settings" replace />} />
            <Route path="/whatsapp/*" element={isOnboarded ? <WhatsAppPage /> : <Navigate to="/settings" replace />} />
            <Route path="/sms/*" element={isOnboarded ? <SMSPage /> : <Navigate to="/settings" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  );
}