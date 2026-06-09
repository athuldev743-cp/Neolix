import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Loader2, User, Building2, Server, Sparkles, PenLine, Check, Save, Mail, RefreshCw, Link2, AlertTriangle, Info } from 'lucide-react';

// ── MOCK SERVICES ────────────────────────────────────────────────────────────
const mockProfileApi = {
  get: async () => ({
    data: {
      id: "getomniagent@gmail.com",
      full_name: "Athul Dev",
      designation: "Founder",
      company_name: "Neolix Hub",
      company_tagline: "Autonomous Omnichannel Sales & Outreach",
      industry: "B2B SaaS",
      website: "https://neolix.co",
      email: "admin.neolix@gmail.com",
      phone: "+91 98765 43210",
      city: "Kochi",
      country: "India",
      linkedin_url: "https://linkedin.com/in/athuldev",
      preferred_tone: "professional",
      intro_line: "Hi {lead_name}, noticed your team at {lead_company}...",
      value_proposition: "We help firms automate outreach operations...",
      email_signature_html: "<p>Best regards,<br/><strong>Athul Dev</strong></p>",
      product_description: "Core automated lead scraping modules with dynamic B2B multi-tenant setup engines.",
      google_oauth: { status: "connected", connected_email: "admin.neolix@gmail.com" }
    }
  }),
  update: async (data) => ({ data })
};

export const ProfileContext = createContext(null);

// ── COMPONENTS (Consolidated) ────────────────────────────────────────────────

function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await mockProfileApi.update(form);
      await refreshProfile();
      toast.success('Profile saved!');
      navigate('/');
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <input className="block w-full p-2 bg-slate-800 rounded" value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Name" />
        <button onClick={saveProfile} className="px-4 py-2 bg-blue-600 rounded">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function DashboardPage() { return <div className="p-8 text-white">Dashboard Content</div>; }
function EmailPage() { return <div className="p-8 text-white">Email Page</div>; }
function WhatsAppPage() { return <div className="p-8 text-white">WhatsApp Page</div>; }
function SMSPage() { return <div className="p-8 text-white">SMS Page</div>; }
function Layout() { return <div className="min-h-screen bg-slate-950 text-white"><Routes><Route path="*" element={<div>Layout Wrapper</div>} /></Routes></div>; }

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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/sms" element={<SMSPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProfileContext.Provider>
  );
}