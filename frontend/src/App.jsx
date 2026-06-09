import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import axios from 'axios';
import { 
  LogIn, Sparkles, ShieldCheck, Loader2, LayoutDashboard, Mail, Phone, MessageSquare, 
  Settings, LogOut, RefreshCw, Plus, ChevronLeft, Eye, Zap, X, Check, CheckCheck, 
  Search, Reply, FileText, Image, PenLine, AlertTriangle, Link2, Save, Info, Smartphone, Edit3, ArrowRight
} from 'lucide-react';

// ── 🌐 MOCK SERVICE LOGIC (Consolidated) ──────────────────────────────────
const api = axios.create({ baseURL: 'https://neolix-neolix-backend.hf.space/api/v1', timeout: 30000 });

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
};

export const campaignApi = {
  list: () => api.get('/campaigns/list'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns/create', data),
  preview: (data) => api.post('/campaigns/preview', data),
};

export const waApi = {
  status: () => api.get('/whatsapp/status'),
  campaignList: () => api.get('/whatsapp/campaign/list'),
  campaignDetail: (id) => api.get(`/whatsapp/campaign/${id}`),
  campaignCreate: (data) => api.post('/whatsapp/campaign/create', data),
};

export const repliesApi = {
  inbox: () => api.get('/replies/inbox'),
  thread: (id) => api.get(`/replies/${id}`),
  respond: (id, data) => api.post(`/replies/${id}/respond`, data),
};

// ── 🧩 PLACEHOLDER PAGES (Consolidated) ──────────────────────────────────
const DashboardPage = () => <div className="p-8 text-2xl font-bold">Dashboard (Placeholder)</div>;
const EmailPage = () => <div className="p-8 text-2xl font-bold">Email Outreach (Placeholder)</div>;
const WhatsAppPage = () => <div className="p-8 text-2xl font-bold">WhatsApp Outreach (Placeholder)</div>;
const SMSPage = () => <div className="p-8 text-2xl font-bold">SMS Gateway (Placeholder)</div>;

// ── 🎛️ SHARED LAYOUT ──────────────────────────────────────────────────────
function Layout() {
  const { profile, setActiveUserEmail } = useContext(ProfileContext);
  const navigate = useNavigate();
  
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/email', label: 'Email', icon: Mail },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { to: '/sms', label: 'SMS', icon: Phone },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-6">
        <div className="text-xl font-black text-slate-100 mb-8">⚡ NEOLIX HUB</div>
        <nav className="space-y-2">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
              <item.icon size={15} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8"><Outlet /></main>
    </div>
  );
}

// ── 🏎️ APP BOOTSTRAP ──────────────────────────────────────────────────────
export const ProfileContext = createContext(null);

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserEmail, setActiveUserEmail] = useState(() => localStorage.getItem('neolix_auth_email') || '');

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (activeUserEmail) config.headers['X-User-Email'] = activeUserEmail;
      return config;
    });
    return () => api.interceptors.request.eject(requestInterceptor);
  }, [activeUserEmail]);

  const refreshProfile = useCallback(async () => {
    if (!activeUserEmail) { setLoading(false); return; }
    try {
      const { data } = await profileApi.get();
      setProfile(data);
    } catch (e) {
      console.error('Profile fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [activeUserEmail]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  if (!activeUserEmail) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><button onClick={() => window.location.href = 'https://neolix-neolix-backend.hf.space/api/v1/auth/google/login'} className="bg-blue-600 px-6 py-3 rounded-xl font-bold">Sign in with Google</button></div>;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  const isOnboarded = !!(profile?.company_name?.trim() && profile?.product_description?.trim());

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, activeUserEmail, setActiveUserEmail }}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={isOnboarded ? <DashboardPage /> : <Navigate to="/settings" replace />} />
            <Route path="/email/*" element={isOnboarded ? <EmailPage /> : <Navigate to="/settings" replace />} />
            <Route path="/whatsapp/*" element={isOnboarded ? <WhatsAppPage /> : <Navigate to="/settings" replace />} />
            <Route path="/sms/*" element={isOnboarded ? <SMSPage /> : <Navigate to="/settings" replace />} />
            <Route path="/settings" element={<div className="p-8 text-xl font-bold">Settings (Placeholders)</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  );
}