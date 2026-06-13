import { useState, useEffect } from 'react'
import { Send, Loader2, Plus, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'

export default function EmailPage() {
  const [view, setView] = useState('list') // 'list', 'create', 'detail'
  const [detailId, setDetailId] = useState(null)
  
  return (
    <div>
      {view === 'list' && (
        <CampaignList onCreate={() => setView('create')} onDetail={(id) => { setDetailId(id); setView('detail') }} />
      )}
      {view === 'create' && (
        <CampaignCreate onBack={() => setView('list')} onDone={(id) => { setDetailId(id); setView('detail') }} />
      )}
      {view === 'detail' && (
        <CampaignDetail id={detailId} onBack={() => setView('list')} />
      )}
    </div>
  )
}

function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())

  const submit = async (leadIds) => {
    if (!form.campaign_name || !form.campaign_info) return toast.error('Required fields missing')
    try {
      const { data } = await campaignApi.create({ ...form, lead_ids: leadIds })
      toast.success('Matrix committed! Previewing...')
      onDone(data.campaign_id)
    } catch { toast.error('Creation failed') }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost"><ChevronLeft size={16} /> Back</button>
      <input className="input" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
      <textarea className="textarea" placeholder="Context" value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
      
      {/* LeadSelector: Pass the submission trigger via onAdded */}
      <LeadSelector selected={selected} onChange={setSelected} onAdded={submit} />
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
    toast.success('Campaign launched successfully!')
    onBack()
  }

  if (loading) return <Loader2 className="animate-spin" />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="btn-ghost"><ChevronLeft /> Back</button>
        <button onClick={handleLaunch} className="btn-primary flex items-center gap-2"><Send size={14} /> Launch & Send</button>
      </div>

      <table className="w-full card">
        <thead><tr><th>Email</th><th>Subject</th></tr></thead>
        <tbody>
          {(data?.leads_preview || []).map((l, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{l.email}</td>
              <td className="p-3 text-xs">{l.subject}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}