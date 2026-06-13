import { useState, useEffect, useRef } from 'react'
import { Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft, Eye, Zap, X, Save, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, api } from '../services/api'
import LeadSelector from '../components/LeadSelector'
import { useUnreadReplies } from '../hooks/useUnreadReplies'

// ── Status Badge Map ─────────────────────────────────────────────────────────
const statusBadge = { 
  generating: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse',
  draft: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold',
  running: 'badge-blue', 
  completed: 'badge-green', 
  queued: 'badge-gray', 
  failed: 'badge-red' 
}

// ── Campaign Detail Component (The Preview & Deploy Screen) ──────────────────
function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeItem, setActiveItem] = useState(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  const load = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`)
      setData(res.data)
    } catch { toast.error('Failed to load drafts') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      await api.post('/campaigns/draft/save', {
        queue_item_id: activeItem.id,
        updated_subject: editedSubject,
        updated_body: editedBody
      })
      toast.success('Draft saved.')
      setActiveItem(null)
      load()
    } catch { toast.error('Failed to save.') } finally { setIsSaving(false) }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      await api.post(`/campaigns/${id}/start`)
      toast.success('Deployment initiated! Emails are now sending.')
      load()
    } catch { toast.error('Deployment failed.') } finally { setIsDeploying(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" /></div>
  
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2"><ChevronLeft size={16} /> Back</button>
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{data.name}</h2>
        <div className="flex gap-3 items-center">
          <span className={statusBadge[data.status]}>{data.status?.toUpperCase()}</span>
          {data.status === 'draft' && (
            <button onClick={handleDeploy} disabled={isDeploying} className="btn-primary flex items-center gap-2">
              {isDeploying ? <Loader2 className="animate-spin" /> : <Send size={14} />} Deploy & Send
            </button>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {activeItem && (
        <div className="card border-2 border-blue-500 bg-slate-900 p-5 text-white">
          <h3 className="font-bold mb-3">Edit Draft for {activeItem.email}</h3>
          <input className="input w-full mb-3 bg-slate-950 text-white" value={editedSubject} onChange={e => setEditedSubject(e.target.value)} />
          <textarea className="textarea w-full h-40 mb-3 bg-slate-950 text-white" value={editedBody} onChange={e => setEditedBody(e.target.value)} />
          <button onClick={handleSaveDraft} disabled={isSaving} className="btn-primary">Save Changes</button>
        </div>
      )}

      {/* Drafts List */}
      <div className="card">
        <table className="w-full text-left">
          <thead><tr className="border-b"><th>Lead</th><th>Subject</th><th>Action</th></tr></thead>
          <tbody>
            {(data.leads_preview || []).map((l, i) => (
              <tr key={i} className="border-b">
                <td className="p-3 text-sm">{l.email}</td>
                <td className="p-3 text-xs text-slate-500">{l.subject}</td>
                <td className="p-3">
                  <button onClick={() => { setActiveItem(l); setEditedSubject(l.subject); setEditedBody(l.body); }} className="text-blue-600 font-bold">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Campaign Create Component ───────────────────────────────────────────────
function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
      toast.success('Drafts generated. Reviewing now...')
      onDone()
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <input className="input" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
      <textarea className="textarea" placeholder="Context: Met at Startup Fest..." value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
      <LeadSelector selected={selected} onChange={setSelected} />
      <button onClick={submit} disabled={submitting} className="btn-primary">Launch & Generate Drafts</button>
    </div>
  )
}

// ── Root Export ─────────────────────────────────────────────────────────────
export default function EmailPage() {
  const [campView, setCampView] = useState('list')
  const [detailId, setDetailId] = useState(null)

  if (campView === 'create') return <CampaignCreate onBack={() => setCampView('list')} onDone={() => setCampView('list')} />
  if (campView === 'detail') return <CampaignDetail id={detailId} onBack={() => setCampView('list')} />
  return <CampaignList onCreate={() => setCampView('create')} onDetail={id => { setDetailId(id); setCampView('detail') }} />
}