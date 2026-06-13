import { useState, useEffect } from 'react'
import { Send, Loader2, Plus, ChevronLeft, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'

// ── 1. Component Definitions (Must be outside EmailPage) ─────────────────────

function CampaignList({ onCreate, onDetail }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await campaignApi.list(); setCamps(data) }
    catch { toast.error('Failed to load') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Campaigns</h2>
        <button onClick={onCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> New</button>
      </div>
      {loading ? <Loader2 className="animate-spin mx-auto" /> : (
        <div className="space-y-2">
          {camps.map(c => (
            <div key={c.id} onClick={() => onDetail(c.id)} className="card p-4 cursor-pointer hover:bg-slate-50">
              <p className="font-bold">{c.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())

  // This is the function passed to onAdded
  const submit = async (leadIds) => {
    if (!form.campaign_name || !form.campaign_info) return toast.error('Required fields missing')
    try {
      // 1. Create the campaign
      const { data } = await campaignApi.create({ ...form, lead_ids: leadIds })
      
      // 2. Notify the parent to switch to the detail view immediately
      toast.success('Matrix committed! Generating preview...')
      onDone(data.campaign_id) 
    } catch { toast.error('Creation failed') }
  }

  return (
    <div className="space-y-4">
      {/* ... inputs ... */}
      <LeadSelector 
        selected={selected} 
        onChange={setSelected} 
        onAdded={submit} // <--- This triggers the pipeline
      />
    </div>
  )
}

function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const res = await api.get(`/campaigns/${id}`); setData(res.data) }
    catch { toast.error('Failed to load') } finally { setLoading(false) }
  }

  useEffect(() => { load(); const iv = setInterval(load, 3000); return () => clearInterval(iv) }, [id])

  const handleLaunch = async () => {
    await api.post(`/campaigns/${id}/start`)
    toast.success('Launched!')
    onBack()
  }

  if (loading) return <Loader2 className="animate-spin" />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="btn-ghost flex items-center"><ChevronLeft /> Back</button>
        <button onClick={handleLaunch} className="btn-primary flex items-center gap-2"><Send size={14} /> Launch & Send</button>
      </div>
      <table className="w-full card">
        <thead><tr><th className="text-left p-3">Email</th><th className="text-left p-3">Subject</th></tr></thead>
        <tbody>
          {(data?.leads_preview || []).map((l, i) => (
            <tr key={i} className="border-t">
              <td className="p-3 text-sm">{l.email}</td>
              <td className="p-3 text-xs text-slate-500">{l.subject}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 2. Main Page Export ───────────────────────────────────────────────────────

export default function EmailPage() {
  const [view, setView] = useState('list') 
  const [detailId, setDetailId] = useState(null)

  return (
    <div>
      {/* ... */}
      {view === 'create' && (
        <CampaignCreate 
          onBack={() => setView('list')} 
          onDone={(id) => { 
            setDetailId(id); // Store the new ID
            setView('detail'); // Switch to preview
          }} 
        />
      )}
      {/* ... */}
    </div>
  )
}