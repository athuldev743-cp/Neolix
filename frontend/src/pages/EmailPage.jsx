import { useState, useEffect } from 'react'
import { Send, RefreshCw, Loader2, Edit3, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'

export default function EmailPage() {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [activeItem, setActiveItem] = useState(null) // For Editor
  const [submitting, setSubmitting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  // 1. Commit Batch Matrix: Generates and shows preview
  const commitBatch = async () => {
    if (!form.campaign_name || !form.campaign_info) return toast.error('Required fields')
    setSubmitting(true)
    try {
      const { data } = await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      setActiveCampaign(data.campaign_id) // We store the ID to poll this specific campaign
      toast.success('Matrix generated!')
    } finally { setSubmitting(false) }
  }

  // 2. Poll for the matrix data once we have an activeCampaign
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!activeCampaign) return
    const interval = setInterval(async () => {
      const { data } = await api.get(`/campaigns/${activeCampaign}`)
      setData(data)
    }, 3000)
    return () => clearInterval(interval)
  }, [activeCampaign])

  // 3. Final Launch: Sends the emails
  const handleLaunch = async () => {
    setIsDeploying(true)
    try {
      await api.post(`/campaigns/${activeCampaign}/start`)
      toast.success('Batch deployed successfully!')
      setActiveCampaign(null)
      setData(null)
    } finally { setIsDeploying(false) }
  }

  // If no campaign started, show creation view
  if (!activeCampaign) {
    return (
      <div className="card p-6 max-w-2xl mx-auto mt-10">
        <h2 className="text-lg font-bold mb-4">Create Campaign</h2>
        <input className="input w-full mb-3" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
        <textarea className="textarea w-full mb-3" placeholder="Context..." value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
        <LeadSelector selected={selected} onChange={setSelected} />
        <button onClick={commitBatch} disabled={submitting} className="btn-primary w-full mt-4">
          {submitting ? <Loader2 className="animate-spin" /> : 'Commit Batch Matrix'}
        </button>
      </div>
    )
  }

  // Preview & Editor View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{data?.name || 'Generating...'}</h2>
        {data?.status === 'draft' && (
          <button onClick={handleLaunch} disabled={isDeploying} className="btn-primary flex items-center gap-2">
            {isDeploying ? <Loader2 className="animate-spin" /> : <Send size={14} />} Launch & Send
          </button>
        )}
      </div>

      {activeItem && (
        <div className="card border-2 border-blue-500 p-5 bg-slate-900 text-white">
          <input className="input w-full mb-2 bg-slate-950" value={activeItem.subject} onChange={e => setActiveItem({...activeItem, subject: e.target.value})} />
          <textarea className="textarea w-full h-32 mb-2 bg-slate-950" value={activeItem.body} onChange={e => setActiveItem({...activeItem, body: e.target.value})} />
          <button onClick={async () => {
            await api.post('/campaigns/draft/save', { queue_item_id: activeItem.id, updated_subject: activeItem.subject, updated_body: activeItem.body })
            setActiveItem(null)
          }} className="btn-primary">Save Draft</button>
        </div>
      )}

      <table className="w-full card">
        <thead><tr><th>Lead</th><th>Subject</th><th>Action</th></tr></thead>
        <tbody>
          {(data?.leads_preview || []).map((l, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{l.email}</td>
              <td className="p-3 text-xs">{l.subject}</td>
              <td className="p-3"><button onClick={() => setActiveItem(l)} className="text-blue-600 font-bold">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}