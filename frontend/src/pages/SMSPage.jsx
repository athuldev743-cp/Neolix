import { useState, useEffect, useRef } from 'react'
import {
  Inbox, Loader2, Eye, X, MessageSquare, Sparkles, CheckCheck, Reply,
  FileText, Zap, Search, Upload, ShieldCheck, Check, ChevronRight, 
  ClipboardList, RefreshCw, Plus, ChevronLeft, Smartphone, Save, Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'
import API, { waApi, leadsApi, repliesApi } from '../services/api'
import { useUnreadReplies } from '../hooks/useUnreadReplies'

const statusBadge = { 
  running: 'badge-blue', 
  completed: 'badge-green', 
  queued: 'badge-gray', 
  failed: 'badge-red', 
  paused: 'badge-orange',
  draft: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse'
}

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) return `91${digits}`
  return digits
}

function timeAgo(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── UPGRADED LOCAL COMPONENT: CUSTOM INLINE DRAFT PREVIEW TABLE ──────────────
function SMSQueueTable({ logs, onRefresh }) {
  const [activeItem, setActiveItem] = useState(null)
  const [editedBody, setEditedBody] = useState('')
  const [approving, setApproving] = useState(false)

  const openDraftEditor = (msg) => {
    setActiveItem(msg)
    setEditedBody(msg.message_body || '')
  }

  const handleApproveDraft = async () => {
    if (!activeItem) return
    setApproving(true)
    try {
      await API.post('/sms/draft/approve', {
        msg_id: activeItem._id,
        updated_body: editedBody
      })
      toast.success('SMS content approved and released to native outbox queue!')
      setActiveItem(null)
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to authorize draft content.')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dynamic Inline Layout Split Workspace Preview Block */}
      {activeItem && (
        <div className="card border border-blue-500/30 bg-slate-900 p-5 space-y-4 rounded-2xl fade-up text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Edit3 size={14} className="text-blue-400" /> Review Background SMS Draft Copy
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Modifying active payload parameters for: <span className="font-bold text-slate-300">{activeItem.lead_name} (+{activeItem.phone_number})</span></p>
            </div>
            <button onClick={() => setActiveItem(null)} className="text-slate-500 hover:text-slate-400"><X size={16} /></button>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS Text Body Copy</label>
            <textarea 
              className="textarea mt-1 w-full bg-slate-950 border-slate-800 text-slate-200 text-xs h-24 resize-none leading-relaxed" 
              value={editedBody} 
              onChange={e => setEditedBody(e.target.value)} 
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setActiveItem(null)} className="btn-secondary px-4 py-1.5 text-xs text-slate-300">Dismiss</button>
            <button onClick={handleApproveDraft} disabled={approving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-1.5 px-4 font-bold text-xs flex items-center gap-1 transition-all">
              {approving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Approve & Release to Device Node
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden bg-white border rounded-2xl shadow-2xs">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Live Hardware Outbox Stream</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3">Recipient Node</th>
                <th className="p-3">Cellular Handle</th>
                <th className="p-3">Status</th>
                <th className="p-3">Generated Message Preview</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => {
                const currentStatus = l.status?.toLowerCase()
                return (
                  <tr key={i} className="border-t hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{l.lead_name || 'Direct Input'}</td>
                    <td className="p-3 text-slate-500 font-mono">+{l.phone_number}</td>
                    <td className="p-3">
                      <span className={statusBadge[currentStatus] || 'badge-gray'}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600 font-medium">{l.message_body}</td>
                    <td className="p-3">
                      {currentStatus === 'draft' ? (
                        <button onClick={() => openDraftEditor(l)} className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all">
                          <Eye size={11} /> Review Draft
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 italic pl-1">Polled / Locked</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">Outbox tracking history is currently empty.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CampaignLeadSelector({ selected, onChange }) {
  const [activePanel, setActivePanel] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState({ phone: '', name: '', company: '', business_details: '' })
  const [bulkText, setBulkText] = useState('')
  const uploadRef = useRef()
  const scanRef = useRef()

  const addLeadToSelection = (lead) => {
    const id = lead.id || `manual-${Date.now()}-${Math.random()}`
    const next = new Map(selected)
    next.set(id, { ...lead, id })
    onChange(next)
  }

  const addIdsToSelection = (ids) => {
    const next = new Map(selected)
    ids.forEach(id => {
      if (!next.has(id)) next.set(id, { id })
    })
    onChange(next)
  }

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await leadsApi.search(query, 50)
      const leads = (data.leads || data || []).filter(l => l.phone)
      setResults(leads)
      if (!leads.length) toast('No leads with valid mobile number found')
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const toggle = (lead) => {
    const next = new Map(selected)
    if (next.has(lead.id)) next.delete(lead.id)
    else next.set(lead.id, lead)
    onChange(next)
  }

  const addManual = async () => {
    const phone = normalizePhone(manual.phone)
    if (phone.length < 10) {
      return toast.error('Enter a valid mobile number')
    }

    setLoading(true)
    try {
      const payload = {
        phone,
        contact_name: manual.name,
        company_name: manual.company,
        business_details: manual.business_details,
        source: 'sms_manual',
        email: `${phone}@neolix-sms.local` 
      }

      const { data } = await leadsApi.addSingle(payload)
      
      if (data.lead_ids?.length) {
        addIdsToSelection(data.lead_ids)
      } else {
        addLeadToSelection({
          id: data.id || data.lead_id || `manual-${Date.now()}`,
          phone: phone,
          contact_name: manual.name || 'Direct Input',
          company_name: manual.company || '',
          business_details: manual.business_details || ''
        })
      }

      toast.success('SMS recipient contact synced successfully!')
      setManual({ phone: '', name: '', company: '', business_details: '' })
    } catch (err) {
      addLeadToSelection({ 
        id: `manual-${Date.now()}`,
        phone, 
        contact_name: manual.name || 'Direct Input', 
        company_name: manual.company || '', 
        business_details: manual.business_details || '' 
      })
      toast.success('SMS contact added locally')
      setManual({ phone: '', name: '', company: '', business_details: '' })
    } finally {
      setLoading(false)
    }
  }

  const addBulk = async () => {
    if (!bulkText.trim()) return toast.error('Paste contacts first')
    setLoading(true)
    try {
      const { data } = await leadsApi.addBulk(bulkText)
      if (data.lead_ids?.length) {
        addIdsToSelection(data.lead_ids)
        toast.success(`${data.lead_ids.length} contacts appended`)
      } else {
        toast.success('Bulk contacts processed')
      }
      setBulkText('')
    } catch {
      const rows = bulkText.split('\n').map(x => x.trim()).filter(Boolean)
      const next = new Map(selected)
      rows.forEach((row, i) => {
        const parts = row.split(/[|,;\t]/).map(s => s.trim()).filter(Boolean)
        const phonePart = parts.find(p => /^\+?\d[\d\s-]{7,}$/.test(p))
        if (!phonePart) return
        const phone = normalizePhone(phonePart)
        next.set(`bulk-${Date.now()}-${i}`, {
          id: `bulk-${Date.now()}-${i}`,
          phone,
          contact_name: parts[1] || '',
          company_name: parts[2] || '',
          business_details: parts.slice(3).join(' '),
        })
      })
      onChange(next)
      toast.success('Bulk contacts appended locally')
      setBulkText('')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      if (data.lead_ids?.length) addIdsToSelection(data.lead_ids)
      toast.success('Contacts successfully compiled')
    } catch {
      toast.error('Upload parser crash')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (file) => {
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { data } = await leadsApi.scanCard(reader.result.split(',')[1])
        if (data.phone || data.extracted?.phone) {
          const extracted = data.extracted || data
          addLeadToSelection({
            phone: normalizePhone(extracted.phone),
            contact_name: extracted.contact_name || '',
            company_name: extracted.company_name || '',
            business_details: extracted.business_details || extracted.business_type || '',
          })
          toast.success('Card processed')
        }
      } catch {
        toast.error('AI OCR engine timeout')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const PANELS = [
    { id: 'search', label: 'Search DB', icon: <Search size={12} /> },
    { id: 'single', label: 'Single', icon: <Smartphone size={12} /> },
    { id: 'bulk', label: 'Bulk Paste', icon: <ClipboardList size={12} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={12} /> },
    { id: 'scan', label: 'Scan Card', icon: <Smartphone size={12} /> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {PANELS.map(p => (
          <button key={p.id} type="button" onClick={() => setActivePanel(p.id)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activePanel === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {p.icon}{p.label}
          </button>
        ))}
      </div>

      {activePanel === 'search' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-900 transition-all">
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search database leads..." className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <button type="button" onClick={search} className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map(l => (
                <div key={l.id} onClick={() => toggle(l)} className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${selected.has(l.id) ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                  <div><p className="font-bold">{l.contact_name || l.company_name || 'Unknown'}</p><p className="text-slate-400">+{l.phone}</p></div>
                  {selected.has(l.id) && <Check size={12} className="text-blue-600" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activePanel === 'single' && (
        <div className="space-y-2">
          <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Mobile Number *" value={manual.phone} onChange={e => setManual(p => ({ ...p, phone: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Name" value={manual.name} onChange={e => setManual(p => ({ ...p, name: e.target.value }))} />
            <input className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs" placeholder="Company" value={manual.company} onChange={e => setManual(p => ({ ...p, company: e.target.value }))} />
          </div>
          <textarea className="w-full p-3 border border-slate-200 rounded-xl text-xs h-16 resize-none" placeholder="AI Custom Personalization Parameters..." value={manual.business_details} onChange={e => setManual(p => ({ ...p, business_details: e.target.value }))} />
          <button type="button" onClick={addManual} className="w-full bg-slate-900 text-white rounded-xl py-1.5 font-bold text-xs">Append Recipient Node</button>
        </div>
      )}

      {activePanel === 'bulk' && (
        <div className="space-y-2">
          <textarea className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs h-24 resize-none" placeholder="9876543210 | Athul Dev | OmniAgent | SaaS Platform Engine" value={bulkText} onChange={e => setBulkText(e.target.value)} />
          <button type="button" onClick={addBulk} className="w-full bg-slate-900 text-white rounded-xl py-1.5 font-bold text-xs">Ingest Bulk Dataset Matrix</button>
        </div>
      )}

      {activePanel === 'upload' && (
        <button type="button" onClick={() => uploadRef.current?.click()} className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
          <Upload size={16} className="mb-1" /> Import CSV/Excel Architecture
          <input ref={uploadRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
        </button>
      )}

      {activePanel === 'scan' && (
        <button type="button" onClick={() => scanRef.current?.click()} className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
          <Smartphone size={16} className="mb-1" /> Trigger Card Vision Scanner Module
          <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleScan(e.target.files[0])} />
        </button>
      )}

      <div className="flex items-center justify-between pt-2 border-t text-xs">
        <span><strong>{selected.size}</strong> recipients targeted</span>
        {selected.size > 0 && <button type="button" onClick={() => onChange(new Map())} className="text-red-500">Clear</button>}
      </div>
    </div>
  )
}

// ── UPGRADED COMPONENT: INTEGRATED ASYNCHRONOUS BLUEPRINT SCHEDULER ───────────
function SMSCampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', template: '', daily_limit: 150 })
  const [selectedLeads, setSelectedLeads] = useState(new Map())
  const [previews, setPreviews] = useState({}) // Stores {lead_id: message}
  const [activeLeadIndex, setActiveLeadIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const leadArray = Array.from(selectedLeads.values())

  // Generate previews whenever template or leads change
  useEffect(() => {
    const newPreviews = {}
    leadArray.forEach(lead => {
      // Basic AI-style personalization logic
      newPreviews[lead.id] = form.template
        .replace('{lead_name}', lead.contact_name || 'there')
        .replace('{lead_company}', lead.company_name || 'your company')
        .replace('{details}', lead.business_details || '')
    })
    setPreviews(newPreviews)
  }, [form.template, selectedLeads])

  const handleDeploy = async () => {
    if (!form.campaign_name || selectedLeads.size === 0) return toast.error('Check fields')
    
    setLoading(true)
    try {
      // Direct deployment without individual review per-item
      await API.post('/sms/campaign/deploy', {
        campaign_name: form.campaign_name,
        messages: leadArray.map(l => ({
          lead_id: l.id,
          phone: l.phone,
          body: previews[l.id]
        }))
      })
      toast.success('Strategy deployed! Messages are hitting the hardware queue.')
      onDone()
    } catch {
      toast.error('Deployment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Input */}
        <div className="col-span-1 space-y-4">
          <input className="input w-full" placeholder="Campaign Name" value={form.campaign_name} onChange={e => setForm({...form, campaign_name: e.target.value})} />
          <textarea className="textarea w-full h-40" placeholder="Hi {lead_name}, regarding {lead_company}..." value={form.template} onChange={e => setForm({...form, template: e.target.value})} />
          <CampaignLeadSelector selected={selectedLeads} onChange={setSelectedLeads} />
        </div>

        {/* Right: Preview Taps */}
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Lead Previews ({selectedLeads.size})</h3>
            <div className="flex gap-2">
              <button onClick={() => setActiveLeadIndex(Math.max(0, activeLeadIndex - 1))} className="btn-icon"><ChevronLeft size={16}/></button>
              <span className="text-xs font-bold pt-2">{activeLeadIndex + 1} / {leadArray.length || 1}</span>
              <button onClick={() => setActiveLeadIndex(Math.min(leadArray.length - 1, activeLeadIndex + 1))} className="btn-icon"><ChevronRight size={16}/></button>
            </div>
          </div>
          
          <div className="bg-slate-950 text-white p-6 rounded-2xl min-h-[200px] font-mono text-sm shadow-inner">
            {leadArray.length > 0 ? previews[leadArray[activeLeadIndex].id] : "Select leads to see previews..."}
          </div>

          <button onClick={handleDeploy} disabled={loading || leadArray.length === 0} className="w-full mt-6 btn-primary py-3">
            {loading ? <Loader2 className="animate-spin"/> : "Deploy Matrix Strategy"}
          </button>
        </div>
      </div>
    </div>
  )
}

function MainSMSDashboard({ onStartCampaign, metrics, logs, refreshDashboard }) {
  const [newNodeId, setNewNodeId] = useState('')
  const [nodes, setNodes] = useState([])
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => { fetchNodes() }, [])

  const fetchNodes = async () => {
    try {
      const res = await API.get('/sms/gateway-nodes')
      setNodes(res.data)
    } catch {}
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!newNodeId.trim()) return
    try {
      await API.post('/sms/register-node', { device_id: newNodeId.trim().toLowerCase() })
      toast.success('Hardware Node Signature Verification Link established!')
      setNewNodeId('')
      fetchNodes()
    } catch {
      toast.error('Signature mapping rejected.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900">Android Mobile Node Pipeline</h2>
          <p className="text-xs text-slate-400">Route AI lead context payloads natively over cellular hardware switches.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://neolix-neolix-backend.hf.space/static/neolix_sms.apk" download="neolix-gateway.apk" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors">
            <Smartphone size={13} /> Download Gateway APK
          </a>
          <button type="button" onClick={onStartCampaign} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs">
            <Plus size={12} /> Init Cluster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" /> Authorized Hardware Matrices
            </h3>
            <form onSubmit={handleRegister} className="flex gap-2">
              <input required className="flex-1 px-3 py-1.5 border rounded-xl font-mono text-xs uppercase bg-slate-50 focus:border-slate-900 outline-none" placeholder="e.g. 8516a3de3bfec38b" value={newNodeId} onChange={e => setNewNodeId(e.target.value)} />
              <button type="submit" className="px-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Link</button>
            </form>
            <div className="space-y-1.5">
              {nodes.map((n, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border rounded-xl font-mono text-[11px] font-bold text-slate-600">
                  <span>{n.device_id}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              ))}
              {nodes.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No active gateway links initialized.</p>}
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-2xs space-y-3">
            <button type="button" onClick={() => setShowInstructions(!showInstructions)} className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 outline-none">
              <span className="flex items-center gap-1"><Sparkles size={13} className="text-blue-500" /> Device Setup Guide</span>
              <span className="text-slate-400">{showInstructions ? 'Hide' : 'Show'}</span>
            </button>
            
            {showInstructions && (
              <div className="text-xs text-slate-600 space-y-2.5 pt-2 border-t border-dashed transition-all">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">1. Install Package</p>
                  <p className="text-slate-500">Download and open the APK on your Android device. Tap allow when prompted to approve system permissions.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">2. Register Token Signature</p>
                  <p className="text-slate-500">Copy the unique alphanumeric <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">Device Node ID</span> from the app screen, paste it into the box above, and click Link.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">3. Lock Background Thread (Crucial)</p>
                  <p className="text-slate-500">Long-press the app icon ──► App Info ──► Battery Usage. Change the setting to <span className="font-bold text-slate-800">No Restrictions / Allow Background Activity</span>.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">4. Unblock Network Doze Sleep</p>
                  <p className="text-slate-500">Go to phone Settings ──► Battery ──► More Settings. Turn <span className="font-bold text-slate-800">Sleep Standby Optimization OFF</span> to maintain real-time background queues.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">5. Go Live</p>
                  <p className="text-slate-500">Flip the application toggle to <span className="text-emerald-600 font-bold">ON</span>. A permanent sync icon will mount onto your status bar drawer.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <SMSQueueTable logs={logs} onRefresh={refreshDashboard} />
        </div>
      </div>
    </div>
  )
}

function ThreadView({ replyId, onClose }) {
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const bottomRef = useRef()

  const load = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.thread(replyId); setThread(data) }
    catch { toast.error('Failed to load thread') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [replyId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const send = async () => {
    if (!replyText.trim()) { toast.error('Write a reply first'); return }
    setSending(true)
    try {
      await repliesApi.respond(replyId, { body: replyText, use_ai: false })
      toast.success('Reply sent!')
      setReplyText('')
      await load()
    } catch { toast.error('Failed to send') } finally { setSending(false) }
  }

  const draftAI = async () => {
    setAiLoading(true)
    try {
      const { data } = await repliesApi.respond(replyId, { body: '', use_ai: true })
      const { data: fresh } = await repliesApi.thread(replyId)
      setReplyText(fresh.reply?.our_reply || '')
      setThread(fresh)
      toast.success('AI draft ready — edit and send')
    } catch { toast.error('AI failed') } finally { setAiLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
  if (!thread) return null
  const { reply, sent_item } = thread

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{reply.from_name || reply.from_email}</p>
          <p className="text-xs text-slate-400">{reply.from_email}</p>
        </div>
        <span className={reply.status === 'responded' ? 'badge-green' : reply.status === 'unread' ? 'badge-blue' : 'badge-gray'}>
          {reply.status}
        </span>
        <button onClick={onClose} className="btn-icon p-1.5"><X size={15} /></button>
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-400 uppercase font-medium tracking-wide mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-slate-800">{reply.subject}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-white">
        {sent_item && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Your Outbox SMS · {timeAgo(sent_item.sent_at)}</p>
            <div className="bubble-sent">{sent_item.body}</div>
          </div>
        )}
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{reply.from_name || 'Their reply'} · {timeAgo(reply.received_at)}</p>
          <div className="bubble-recv whitespace-pre-wrap">{reply.body_text}</div>
        </div>
        {reply.status === 'responded' && reply.our_reply && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">You · {timeAgo(reply.replied_at)}</p>
            <div className="bubble-sent whitespace-pre-wrap">{reply.our_reply}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {reply.status !== 'responded' ? (
        <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-white space-y-3">
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply…" className="textarea h-24 text-sm" />
          <div className="flex gap-2">
            <button onClick={send} disabled={sending || !replyText.trim()} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />}
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button onClick={draftAI} disabled={aiLoading} className="btn-secondary">
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-blue-500" />}
              AI draft
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-emerald-50">
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCheck size={15} /> Replied {timeAgo(reply.replied_at)}
          </p>
        </div>
      )}
    </div>
  )
}

function RepliesTab() {
  const [subTab, setSubTab]   = useState('inbox')
  const [inbox, setInbox]     = useState([])
  const [sent, setSent]       = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSent, setSelectedSent] = useState(null)
  const [polling, setPolling] = useState(false)
  const [search, setSearch]   = useState('')

  const loadInbox = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.inbox(null, 'sms'); setInbox(data) }
    catch { toast.error('Failed to load inbox') } finally { setLoading(false) }
  }
  const loadSent = async () => {
    setLoading(true)
    try { const { data } = await repliesApi.sent(null, 'sms'); setSent(data) }
    catch { toast.error('Failed to load sent') } finally { setLoading(false) }
  }

  useEffect(() => { subTab === 'inbox' ? loadInbox() : loadSent() }, [subTab])

  const poll = async () => {
    setPolling(true)
    try { await repliesApi.poll(); toast.success('Syncing inbox…'); setTimeout(loadInbox, 2000) }
    catch { toast.error('Poll failed') } finally { setPolling(false) }
  }

  const filteredInbox = inbox.filter(i =>
    !search || i.from_email.toLowerCase().includes(search.toLowerCase()) ||
    i.from_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredSent = sent.filter(i =>
    !search || i.to_email?.toLowerCase().includes(search.toLowerCase()) ||
    i.to_company?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const statusDot = { unread: 'bg-blue-500', read: 'bg-slate-300', responded: 'bg-emerald-400' }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex items-center gap-0 border-b border-slate-200 mb-0 flex-shrink-0">
        {[{ id: 'inbox', label: 'Inbox' }, { id: 'sent', label: 'Sent' }].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSelectedId(null); setSelectedSent(null) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${subTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="bg-transparent text-sm outline-none placeholder-slate-400 w-36" />
          </div>
          {subTab === 'inbox' && (
            <button onClick={poll} disabled={polling} className="btn-icon" title="Sync inbox">
              <RefreshCw size={14} className={polling ? 'animate-spin text-blue-500' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-slate-200 rounded-xl mt-3">
        <div className="w-80 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-white">
          {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}

          {subTab === 'inbox' && !loading && filteredInbox.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No replies yet</p>
              <button onClick={poll} className="text-xs text-blue-600 mt-2">Sync inbox</button>
            </div>
          )}
          {subTab === 'inbox' && filteredInbox.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedId === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDot[item.status] || 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-1 mb-0.5">
                    <p className={`text-sm truncate ${item.status === 'unread' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {item.from_name || item.from_email}
                    </p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.received_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.preview}</p>
                </div>
              </div>
            </button>
          ))}

          {subTab === 'sent' && !loading && filteredSent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No sent SMS yet</p>
            </div>
          )}
          {subTab === 'sent' && filteredSent.map(item => (
            <button key={item.id} onClick={() => setSelectedSent(item)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-all
                ${selectedSent?.id === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                  {(item.to_company || item.to_name || item.to_email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.to_company || item.to_name || item.to_email}</p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(item.sent_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          {subTab === 'inbox' && selectedId && <ThreadView replyId={selectedId} onClose={() => setSelectedId(null)} />}
          {subTab === 'inbox' && !selectedId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Reply size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select a reply to read</p>
            </div>
          )}
          {subTab === 'sent' && selectedSent && (
            <div className="p-6 fade-up overflow-y-auto h-full">
              <p className="font-semibold text-slate-900 mb-1">{selectedSent.subject}</p>
              <p className="text-xs text-slate-400 mb-5">
                To: <span className="text-blue-600">{selectedSent.to_email}</span>
                {selectedSent.to_company ? ` · ${selectedSent.to_company}` : ''}
                {' · '}{timeAgo(selectedSent.sent_at)}
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{selectedSent.body}</p>
              </div>
            </div>
          )}
          {subTab === 'sent' && !selectedSent && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Inbox size={32} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Select an SMS to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SMSPage() {
  const [view, setView] = useState('list') 
  const [metrics, setMetrics] = useState({ pending_count: 0, processing_count: 0, sent_today: 0, daily_limit: 150 })
  const [logs, setLogs] = useState([])

  const { smsUnread } = useUnreadReplies();

  useEffect(() => {
    refreshDashboard()
    const iv = setInterval(refreshDashboard, 8000)
    return () => clearInterval(iv)
  }, [])

  const refreshDashboard = async () => {
    try {
      const mRes = await API.get('/sms/queue-status')
      setMetrics(mRes.data)
      const lRes = await API.get('/sms/logs')
      setLogs(lRes.data)
    } catch {}
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      <div className="flex items-center gap-4 border-b pb-1 -mt-2">
        <button onClick={() => setView('list')} className={`px-4 py-2 font-bold text-sm border-b-2 ${view === 'list' || view === 'create' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}>
          Gateway Monitor
        </button>
        <button onClick={() => setView('replies')} className={`px-4 py-2 font-bold text-sm border-b-2 flex items-center gap-2 ${view === 'replies' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}>
          <span>Replies Channel</span>
          {smsUnread > 0 && (
            <span className="bg-red-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
              {smsUnread} New
            </span>
          )}
        </button>
      </div>

      {view === 'list' && <MainSMSDashboard metrics={metrics} logs={logs} refreshDashboard={refreshDashboard} onStartCampaign={() => setView('create')} />}
      {view === 'create' && <SMSCampaignCreate onBack={() => setView('list')} onDone={() => setView('list')} />}
      {view === 'replies' && <RepliesTab />}
    </div>
  )
}