import { useState, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'

export default function EmailPage() {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  // 1. Commit Batch Matrix: Generates and shows preview
  const commitBatch = async () => {
    if (!form.campaign_name || !form.campaign_info) return toast.error('Fill Name & Context')
    setLoading(true)
    try {
      const { data } = await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      setActiveCampaign(data.campaign_id) // This switches the UI to show the preview
      toast.success('Matrix committed! Generating drafts...')
    } catch { toast.error('Creation failed') } finally { setLoading(false) }
  }

  // 2. Poll for the preview matrix
  useEffect(() => {
    if (!activeCampaign) return
    const iv = setInterval(async () => {
      const res = await api.get(`/campaigns/${activeCampaign}`)
      setData(res.data)
    }, 2000)
    return () => clearInterval(iv)
  }, [activeCampaign])

  // 3. Launch & Send
  const handleLaunch = async () => {
    try {
      await api.post(`/campaigns/${activeCampaign}/start`)
      toast.success('Batch sent to queue!')
      setActiveCampaign(null) // Reset flow
    } catch { toast.error('Launch failed') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* CREATION VIEW (Hidden once activeCampaign is set) */}
      {!activeCampaign && (
        <div className="card p-6">
          <input className="input w-full mb-3" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
          <textarea className="textarea w-full mb-3" placeholder="Context..." value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
          <LeadSelector selected={selected} onChange={setSelected} />
          <button onClick={commitBatch} className="btn-primary w-full mt-4">Commit Batch Matrix</button>
        </div>
      )}

      {/* PREVIEW VIEW (Shown immediately after clicking Commit) */}
      {activeCampaign && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{data?.name || 'Generating Matrix...'}</h2>
            
            {/* The Launch Button: Only appears when AI is finished (status is draft) */}
            {data?.status === 'draft' ? (
              <button onClick={handleLaunch} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                <Send size={16} /> Launch & Send
              </button>
            ) : (
              <span className="text-amber-500 font-bold animate-pulse">Generating drafts...</span>
            )}
          </div>

          <table className="w-full card">
            <thead><tr className="border-b"><th>Lead</th><th>Subject</th></tr></thead>
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
      )}
    </div>
  )
}