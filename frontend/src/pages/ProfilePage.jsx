import { useState, useEffect } from 'react'
import { profileApi } from '../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../components/layout/PageHeader'
import {
  User, Building, Globe, Mail, Phone, MapPin, Linkedin,
  MessageSquare, Sparkles, Save, RefreshCw, CheckCircle, 
  FileText, Image, X, UploadCloud
} from 'lucide-react'

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Formal, polished' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm, approachable' },
  { value: 'formal',       label: 'Formal',       desc: 'Corporate, precise' },
  { value: 'casual',       label: 'Casual',       desc: 'Relaxed, conversational' },
]

const FIELD_GROUPS = [
  {
    id: 'identity',
    label: 'Your Identity',
    icon: User,
    desc: 'Used as the sender context in every generated message',
    color: 'neon-blue',
    fields: [
      { key: 'full_name',    label: 'Full Name',    placeholder: 'Alex Johnson',           type: 'text' },
      { key: 'designation',  label: 'Designation',  placeholder: 'Business Dev Manager',   type: 'text' },
      { key: 'email',        label: 'Email',        placeholder: 'alex@company.com',       type: 'email' },
      { key: 'phone',        label: 'Phone',        placeholder: '+91 98765 43210',        type: 'text' },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    icon: Building,
    desc: 'Shown in outreach as your organisation details',
    color: 'neon-green',
    fields: [
      { key: 'company_name',    label: 'Company Name',    placeholder: 'Acme Corp',           type: 'text' },
      { key: 'company_tagline', label: 'Tagline',         placeholder: 'We automate your...',  type: 'text' },
      { key: 'industry',        label: 'Industry',        placeholder: 'SaaS / B2B',           type: 'text' },
      { key: 'website',         label: 'Website',         placeholder: 'https://acme.com',     type: 'url'  },
    ],
  },
  {
    id: 'location',
    label: 'Location & Links',
    icon: MapPin,
    desc: 'Optional — adds credibility to messages',
    color: 'neon-violet',
    fields: [
      { key: 'city',         label: 'City',         placeholder: 'Mumbai',                 type: 'text' },
      { key: 'country',      label: 'Country',      placeholder: 'India',                  type: 'text' },
      { key: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'linkedin.com/in/alex',   type: 'url'  },
    ],
  },
]

const OUTREACH_FIELDS = [
  { key: 'intro_line',        label: 'Intro Line',        placeholder: "I'm reaching out because I noticed your company...", rows: 2 },
  { key: 'value_proposition', label: 'Value Proposition', placeholder: "We help B2B companies increase qualified leads by 3x through...", rows: 3 },
]

export default function ProfilePage() {
  const [form, setForm]       = useState({ product_description: '', product_photos: [], product_pdfs: [] })
  const [tone, setTone]       = useState('professional')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      const { data } = await profileApi.get()
      // Enforce array baseline fallback pointers cleanly
      setForm({
        ...data,
        product_description: data.product_description || '',
        product_photos: data.product_photos || [],
        product_pdfs: data.product_pdfs || []
      })
      setTone(data.preferred_tone || 'professional')
    } catch {
      toast.error('Could not load profile configuration settings')
    } finally {
      setLoading(false)
    }
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  // ✅ Helper converter: Transforms files to base64 encoding sequences asynchronously
  const parseFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (err) => reject(err)
    })
  }

  const handleAssetUpload = async (e, typeField) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    try {
      const parsedArray = await Promise.all(files.map(f => parseFileToBase64(f)))
      const existingAssets = form[typeField] || []
      set(typeField, [...existingAssets, ...parsedArray])
      toast.success(`Loaded ${files.length} material asset elements into the memory buffer.`)
    } catch {
      toast.error('File compilation error while mapping base64 parameters')
    }
  };

  const removeAssetNode = (typeField, targetIndex) => {
    const activeList = form[typeField] || []
    set(typeField, activeList.filter((_, idx) => idx !== targetIndex))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await profileApi.update({ ...form, preferred_tone: tone })
      toast.success('Profile saved — outreach context updated!')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      window.__profileRefresh?.()
    } catch {
      toast.error('Save failed — check API connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  return (
    <div className="animate-slide-up max-w-3xl pb-12">
      <PageHeader
        badge="Module 1 · Core Foundation"
        title="Your Profile"
        subtitle="This profile is the source of truth — every AI-generated email and WhatsApp message pulls from here."
        action={
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <RefreshCw size={15} className="animate-spin" /> :
             saved   ? <CheckCircle size={15} className="text-neon-green" /> :
                       <Save size={15} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
          </button>
        }
      />

      <div className="card-sm border-neon-cyan/20 p-4 mb-8 flex items-start gap-3">
        <Sparkles size={16} className="text-neon-cyan mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-slate-300 font-medium mb-0.5">Live outreach context</p>
          <p className="text-xs text-ink-300 leading-relaxed">
            {form.full_name
              ? `"${form.full_name}${form.designation ? ', ' + form.designation : ''}${form.company_name ? ' at ' + form.company_name : ''}" — this is injected into every generated email and WhatsApp message.`
              : 'Fill in your details below. The AI will use them to write personalised outreach on your behalf.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {FIELD_GROUPS.map(group => (
          <FieldGroup key={group.id} group={group} form={form} onChange={set} />
        ))}

        {/* Tone selector */}
        <div className="card p-6">
          <GroupHeader icon={MessageSquare} label="Outreach Tone" color="neon-amber" desc="Sets the writing style for all AI-generated messages" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {TONES.map(t => (
              <button key={t.value} onClick={() => setTone(t.value)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${tone === t.value ? 'bg-neon-amber/10 border-neon-amber/40 text-neon-amber' : 'border-white/8 text-slate-400 hover:border-white/15 hover:text-slate-300'}`}>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[11px] mt-0.5 opacity-70">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Brand New Product Showcase Vault Section Field Layout (Day 3 Automated Dependency) */}
        <div className="card p-6 space-y-5">
          <GroupHeader icon={FileText} label="Product Showcase Vault (Day 3 Sequence Dependency)" color="neon-cyan" desc="Stored assets are automatically injected on Day 3 of the automation sequence without manual oversight." />
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Product / Service Specification Copy Text</label>
            <textarea className="textarea font-normal text-xs" rows={4} placeholder="Describe your specifications here... e.g. Core automated lead scraping modules with dynamic B2B multi-tenant setup engines." value={form.product_description || ''} onChange={e => set('product_description', e.target.value)} />
          </div>

          {/* Media Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photos Sub-Vault */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Product Photos (WhatsApp Layer Only)</label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center relative hover:bg-white/5 transition-all">
                <UploadCloud size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-[11px] text-slate-400">Click to append image files</p>
                <input type="file" multiple accept="image/*" onChange={e => handleAssetUpload(e, 'product_photos')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              
              {/* Photo Previews List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(form.product_photos || []).map((img, index) => (
                  <div key={index} className="w-14 h-14 rounded-lg border border-white/10 bg-cover bg-center relative group" style={{ backgroundImage: `url(${img})` }}>
                    <button type="button" onClick={() => removeAssetNode('product_photos', index)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PDFs Document Sub-Vault */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Product PDFs Brochures / Portfolios</label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center relative hover:bg-white/5 transition-all">
                <UploadCloud size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-[11px] text-slate-400">Click to append document files</p>
                <input type="file" multiple accept=".pdf" onChange={e => handleAssetUpload(e, 'product_pdfs')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              {/* Document Nodes Previews List */}
              <div className="space-y-1">
                {(form.product_pdfs || []).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-1.5 rounded bg-white/5 text-[10px] text-slate-300">
                    <span className="flex items-center gap-1"><FileText size={11} className="text-red-400" /> Brochure Asset #{index + 1}.pdf</span>
                    <button type="button" onClick={() => removeAssetNode('product_pdfs', index)} className="text-slate-400 hover:text-red-500">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Outreach copy fields */}
        <div className="card p-6">
          <GroupHeader icon={Sparkles} label="AI Outreach Copy" color="neon-violet" desc="These lines are used to seed every AI-generated email and WhatsApp message" />
          <div className="space-y-4 mt-5">
            {OUTREACH_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
                <textarea className="textarea" rows={f.rows} placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Email signature */}
        <div className="card p-6">
          <GroupHeader icon={Mail} label="Email Signature (HTML)" color="neon-blue" desc="Appended to the bottom of every outreach email" />
          <div className="mt-5">
            <textarea className="textarea font-mono text-xs" rows={5} placeholder={'<p>Best regards,<br/><strong>Alex Johnson</strong><br/>Business Dev · Acme Corp</p>'} value={form.email_signature_html || ''} onChange={e => set('email_signature_html', e.target.value)} />
            {form.email_signature_html && (
              <div className="mt-3 p-3 rounded-lg bg-ink-700 border border-white/5">
                <p className="section-label mb-2">Preview</p>
                <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.email_signature_html }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

function FieldGroup({ group, form, onChange }) {
  const Icon = group.icon
  return (
    <div className="card p-6">
      <GroupHeader icon={Icon} label={group.label} color={group.color} desc={group.desc} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {group.fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
            <input type={f.type} className="input" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupHeader({ icon: Icon, label, color, desc }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg bg-${color}/10 border border-${color}/20 flex items-center justify-center flex-shrink-0`}>
        <Icon size={14} className={`text-${color}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {desc && <p className="text-[11px] text-ink-300 mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <div className="h-8 bg-ink-700 rounded-xl w-48" />
      {[1,2,3].map(i => (
        <div key={i} className="card p-6 space-y-4">
          <div className="h-4 bg-ink-700 rounded w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(j => <div key={j} className="h-10 bg-ink-700 rounded-xl" />)}
          </div>
        </div>
      ))}
    </div>
  )
}