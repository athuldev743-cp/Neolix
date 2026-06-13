import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Inbox, RefreshCw, Plus, Loader2, ChevronLeft,
  Eye, Zap, X, Check, CheckCheck, Search, Reply, Edit3, Save, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignApi, repliesApi, api, leadsApi } from '../services/api'
import LeadSelector from '../components/LeadSelector'
import { useUnreadReplies } from '../hooks/useUnreadReplies'

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = { 
  generating: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse',
  draft: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold',
  running: 'badge-blue', 
  completed: 'badge-green', 
  queued: 'badge-gray', 
  failed: 'badge-red', 
  paused: 'badge-orange' 
}

function timeAgo(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

// ── Campaign Components ───────────────────────────────────────────────────────

function CampaignList({ onCreate, onDetail }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await campaignApi.list(); setCamps(data) }
    catch { toast.error('Failed to load campaigns') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Email Campaigns</h2>
        </div>
        <button onClick={onCreate} className="btn-primary"><Plus size={16} /> New Campaign</button>
      </div>
      {loading ? <div className="text-center py-10"><Loader2 className="animate-spin" /></div> : (
        <div className="space-y-3">
          {camps.map(c => (
            <div key={c.id} onClick={() => onDetail(c.id)} className="card p-5 cursor-pointer hover:bg-slate-50">
              <p className="font-bold">{c.name}</p>
              <span className={statusBadge[c.status] || 'badge-gray'}>{c.status?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [activeItem, setActiveItem] = useState(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')

  const load = async () => {
    try { const res = await api.get(`/campaigns/${id}`); setData(res.data) }
    catch { toast.error('Load failed') }
  }

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv) }, [id])

  const handleSave = async () => {
    await api.post('/campaigns/draft/save', { queue_item_id: activeItem.id, updated_subject: editedSubject, updated_body: editedBody })
    setActiveItem(null)
    load()
  }

  const handleLaunch = async () => {
    await api.post(`/campaigns/${id}/start`)
    toast.success('Campaign launched!')
    load()
  }

  if (!data) return <Loader2 className="animate-spin" />

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost"><ChevronLeft /> Back</button>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{data.name}</h2>
        {data.status === 'draft' && <button onClick={handleLaunch} className="btn-primary">Launch & Send</button>}
      </div>

      {activeItem && (
        <div className="card p-5 bg-slate-900 text-white">
          <input className="input mb-2 text-black" value={editedSubject} onChange={e => setEditedSubject(e.target.value)} />
          <textarea className="textarea mb-2 text-black" value={editedBody} onChange={e => setEditedBody(e.target.value)} />
          <button onClick={handleSave} className="btn-primary">Save Changes</button>
        </div>
      )}

      <table className="w-full card">
        <tbody>
          {(data.leads_preview || []).map((l, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{l.email}</td>
              <td className="p-3 text-xs">{l.subject}</td>
              <td className="p-3"><button onClick={() => { setActiveItem(l); setEditedSubject(l.subject); setEditedBody(l.body); }} className="text-blue-600">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '' })
  const [selected, setSelected] = useState(new Map())

  const submit = async () => {
    await campaignApi.create({ ...form, lead_ids: Array.from(selected.keys()) })
    onDone()
  }

  return (
    <div className="space-y-4">
      <input className="input" placeholder="Name" value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))} />
      <textarea className="textarea" placeholder="Context" value={form.campaign_info} onChange={e => setForm(p => ({...p, campaign_info: e.target.value}))} />
      <LeadSelector selected={selected} onChange={setSelected} />
      <button onClick={submit} className="btn-primary">Commit Batch Matrix</button>
    </div>
  )
}

// ── Main Page Export ──────────────────────────────────────────────────────────
export default function EmailPage() {
  const [tab, setTab] = useState('campaigns')
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)
  
  return (
    <div>
      {tab === 'campaigns' && view === 'list' && <CampaignList onCreate={() => setView('create')} onDetail={id => { setDetailId(id); setView('detail') }} />}
      {tab === 'campaigns' && view === 'create' && <CampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {tab === 'campaigns' && view === 'detail' && <CampaignDetail id={detailId} onBack={() => setView('list')} />}
    </div>
  )
}