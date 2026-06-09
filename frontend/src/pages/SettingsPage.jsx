import { useState, useContext, useEffect } from 'react'
import { User, Building2, Sparkles, PenLine, Loader2, Save, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ProfileContext } from '../App' 

function Section({ title, icon: Icon, desc, children }) {
  return (
    <div className="card p-6 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-100 text-sm">{title}</p>
          {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function F({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1 font-medium leading-relaxed"><Info size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useContext(ProfileContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const saveProfile = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      await refreshProfile()
      toast.success('Configuration saved!')
      navigate('/')
    } catch (err) {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Profile & AI Persona</h1>
        <p className="text-xs text-slate-400 mt-1">Configure your outreach engine context.</p>
      </div>

      <Section title="Personal Identity" icon={User}>
        <div className="grid grid-cols-2 gap-4">
          <F label="Full Name"><input className="input" value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} /></F>
          <F label="Job Title"><input className="input" value={form.designation || ''} onChange={e => set('designation', e.target.value)} /></F>
        </div>
      </Section>

      <Section title="Company Details" icon={Building2}>
        <div className="space-y-4">
          <F label="Company Name"><input className="input" value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} /></F>
          <F label="Industry"><input className="input" value={form.industry || ''} onChange={e => set('industry', e.target.value)} /></F>
        </div>
      </Section>

      <Section title="Product Offering" icon={PenLine}>
        <F label="Product Description"><textarea className="textarea h-32" value={form.product_description || ''} onChange={e => set('product_description', e.target.value)} /></F>
      </Section>

      <div className="flex justify-end pt-6 border-t border-slate-800">
        <button onClick={saveProfile} disabled={saving} className="btn-primary w-full sm:w-auto px-10 py-3 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}