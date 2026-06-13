import { useState, useEffect } from 'react'
import { Send, Loader2, Edit3, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from './LeadSelector' // Ensure this path is correct

export default function EmailPage() {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [activeItem, setActiveItem] = useState(null)
  const [data, setData] = useState(null)

  // 1. Commit Batch Matrix: Creates campaign and starts generation
  const commitBatch = async () => {
    if (!form.campaign_name || !form.campaign_info) return toast.error('Required')
    try {
      const { data } = await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      setActiveCampaign(data.campaign_id)
      toast.success('Matrix committed! AI preview generating...')
    } catch { toast.error('Creation failed') }
  }

  // 2. Poll for the matrix data (The Preview)
  useEffect(() => {
    if (!activeCampaign) return
    const iv = setInterval(async () => {
      const { data } = await api.get(`/campaigns/${activeCampaign}`)
      setData(data)
    }, 3000)
    return () => clearInterval(iv)
  }, [activeCampaign])

  return (
    <div className="p-6">
      {!activeCampaign ? (
        // Creation View
        <div className="card p-6 max-w-2xl mx-auto">
          <input className="input w-full mb-3" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
          <textarea className="textarea w-full mb-3" placeholder="Context..." value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
          <LeadSelector selected={selected} onChange={setSelected} />
          <button onClick={commitBatch} className="btn-primary w-full mt-4">Commit Batch Matrix</button>
        </div>
      ) : (
        // Preview & Edit View
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{data?.name || 'Generating...'}</h2>
            {data?.status === 'draft' && (
              <button onClick={async () => { await api.post(`/campaigns/${activeCampaign}/start`); toast.success('Sending...'); }} 
                      className="btn-primary flex items-center gap-2"><Send size={14} /> Launch & Send</button>
            )}
          </div>

          {activeItem && (
            <div className="card bg-slate-900 p-5 text-white">
              <input className="input w-full mb-2 bg-slate-950" value={activeItem.subject} onChange={e => setActiveItem({...activeItem, subject: e.target.value})} />
              <textarea className="textarea w-full h-32 mb-2 bg-slate-950" value={activeItem.body} onChange={e => setActiveItem({...activeItem, body: e.target.value})} />
              <button onClick={async () => {
                await api.post('/campaigns/draft/save', { queue_item_id: activeItem.id, updated_subject: activeItem.subject, updated_body: activeItem.body })
                setActiveItem(null)
              }} className="btn-primary">Save Changes</button>
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
      )}
    </div>
  )
}