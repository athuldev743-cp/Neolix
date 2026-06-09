import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Loader2 } from 'lucide-react';

// ── MOCK SERVICES ────────────────────────────────────────────────────────────
// In your production build, these point to your actual backend.
const mockProfileApi = {
  get: async () => ({
    data: {
      full_name: "Athul Dev",
      company_name: "Neolix Hub",
      product_description: "Automated Lead Scraping",
    }
  }),
  update: async (data) => ({ data })
};

export const ProfileContext = createContext(null);

// ── LAYOUT COMPONENT ─────────────────────────────────────────────────────────
// The Layout wraps children using Outlet. This is why you had a white screen.
function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="p-4 border-b border-slate-800 text-sm font-bold tracking-wider">
        NEOLIX HUB
      </nav>
      <main>
        <Outlet /> 
      </main>
    </div>
  );
}

// ── PAGE COMPONENTS ──────────────────────────────────────────────────────────
function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await mockProfileApi.update({ company_name: "Neolix" });
      await refreshProfile();
      toast.success('Profile saved!');
      navigate('/');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <button onClick={saveProfile} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold">
        {saving ? 'Saving...' : 'Save and Go to Dashboard'}
      </button>
    </div>
  );
}

function DashboardPage() { return <div className="p-8 text-2xl font-bold">Dashboard Content</div>; }
function EmailPage() { return <div className="p-8">Email Page</div>; }
function WhatsAppPage() { return <div className="p-8">WhatsApp Page</div>; }
function SMSPage() { return <div className="p-8">SMS Page</div>; }

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await mockProfileApi.get();
      setProfile(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile }}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Main Layout Route */}
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/sms" element={<SMSPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  );
}