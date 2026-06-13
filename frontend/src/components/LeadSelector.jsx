/**
 * LeadSelector — Universal Reusable Lead Search + Deduplication Add Panel
 * Dynamically filters lead validation matrices based on active campaign channels.
 * When BOTH phone-based (whatsapp/sms) AND email channels are active, collects
 * both a phone number and an email address per row.
 *
 * Props:
 * selected: Map<id, lead>
 * onChange: (newMap) => void
 * requiredChannels: String — comma separated fields (e.g. "email" or "whatsapp,email")
 */
import { useState, useRef, useCallback } from 'react'
import {  Search, Upload, CreditCard, ClipboardList,  X, Check, Plus, Loader2} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../services/api'

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) return `91${digits}`
  return digits
}

// ── Smart Spreadsheet Paste Ingestion Panel ──────────────────────────────────
function SmartInsertionPanel({ onAdded, requiredChannels }) {
  const [rows, setRows] = useState([{ phone: '', email: '', name: '', company: '', businessDesc: '' }])
  const [showClipboard, setShowClipboard] = useState(false)
  const [clipboardData, setRawClipboardData] = useState('')
  const [loading, setLoading] = useState(false)

  const needsPhone = requiredChannels.includes('whatsapp') || requiredChannels.includes('sms')
  const needsEmail = requiredChannels.includes('email')
  // Both required → dual-field mode
  const dualMode = needsPhone && needsEmail

  const handleInputChange = (index, field, value) => {
    const updatedRows = [...rows]
    updatedRows[index][field] = value
    setRows(updatedRows)
  }

  const handleAddRow = () => {
    setRows([...rows, { phone: '', email: '', name: '', company: '', businessDesc: '' }])
  }

  const handleRemoveRow = (index) => {
    if (rows.length === 1) {
      setRows([{ phone: '', email: '', name: '', company: '', businessDesc: '' }])
      return
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleClipboardParse = () => {
    if (!clipboardData.trim()) return toast.error('Paste raw dataset text blocks first')
    const textLines = clipboardData.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const dynamicallyParsedRows = []

    textLines.forEach(line => {
      const components = line.split(/[|\t,;]/).map(c => c.trim()).filter(Boolean)
      const phoneIdx = components.findIndex(c => /^\+?\d[\d\s-]{6,14}$/.test(c.replace(/\D/g, '')))
      const emailIdx = components.findIndex(c => EMAIL_RE.test(c))
      const phoneVal = phoneIdx !== -1 ? components[phoneIdx] : ''
      const emailVal = emailIdx !== -1 ? components[emailIdx] : ''

      // Skip line if required field(s) missing
      if (needsPhone && !phoneVal) return
      if (needsEmail && !phoneVal && !emailVal && !needsPhone) {
        if (!emailVal) return
      }
      if (needsEmail && !needsPhone && !emailVal) return
      if (!needsPhone && !needsEmail) return

      const usedIdx = new Set([phoneIdx, emailIdx].filter(i => i !== -1))
      const restOfData = components.filter((_, i) => !usedIdx.has(i))
      dynamicallyParsedRows.push({
        phone: phoneVal,
        email: emailVal,
        name: restOfData[0] || '',
        company: restOfData[1] || '',
        businessDesc: restOfData.slice(2).join(' ') || ''
      })
    })

    if (dynamicallyParsedRows.length === 0) {
      return toast.error('Could not map matching data rows for the required channel fields')
    }

    setRows(dynamicallyParsedRows)
    setRawClipboardData('')
    setShowClipboard(false)
    toast.success(`Populated ${dynamicallyParsedRows.length} inline matrix fields!`)
  }

  const rowIsValid = (r) => {
    const phoneOk = normalizePhone(r.phone).length >= 10
    const emailOk = r.email.includes('@') && EMAIL_RE.test(r.email)
    if (needsPhone && needsEmail) return phoneOk && emailOk
    if (needsPhone) return phoneOk
    if (needsEmail) return emailOk
    return phoneOk || emailOk
  }

  const handleBatchSubmit = async () => { 
    const validRows = rows.filter(rowIsValid);
    if (validRows.length === 0) {
      let msg = 'Provide at least one valid row';
      return toast.error(msg);
    }

    setLoading(true);
    let processedCount = 0;
    const aggregatedIds = [];

    try {
      await Promise.all(
        validRows.map(async (row) => {
          const phone = normalizePhone(row.phone);
          const email = row.email.toLowerCase().trim();
          const payload = {
            contact_name: row.name,
            company_name: row.company,
            business_details: row.businessDesc,
            source: dualMode ? 'omni_smart_batch' : needsPhone ? 'whatsapp_smart_batch' : 'email_smart_batch'
          };
          if (needsPhone) payload.phone = phone;
          if (needsEmail) {
            payload.email = email;
          } else if (needsPhone) {
            payload.email = `${phone}@neolix-channel.local`;
          }
          
          try {
            const { data } = await leadsApi.addSingle(payload);
            if (data.lead_ids?.length) aggregatedIds.push(...data.lead_ids);
            else if (data.id || data.lead_id) aggregatedIds.push(data.id || data.lead_id);
            processedCount++;
          } catch (e) {
            console.error('Database insertion error:', e);
          }
        })
      );

      if (aggregatedIds.length > 0) {
        onAdded(aggregatedIds);
        toast.success(`Successfully registered ${processedCount} new contacts!`);
      }
      setRows([{ phone: '', email: '', name: '', company: '', businessDesc: '' }]);
    } catch (err) {
      toast.error('Batch registration pipeline error');
    } finally {
      setLoading(false);
    }
  

    setLoading(true)
    let processedCount = 0
    const aggregatedIds = []
    try {
      await Promise.all(
        validRows.map(async (row) => {
          const phone = normalizePhone(row.phone)
          const email = row.email.toLowerCase().trim()
          const payload = {
            contact_name: row.name,
            company_name: row.company,
            business_details: row.businessDesc,
            source: dualMode ? 'omni_smart_batch' : needsPhone ? 'whatsapp_smart_batch' : 'email_smart_batch'
          }
          if (needsPhone) payload.phone = phone
          if (needsEmail) {
            payload.email = email
          } else if (needsPhone) {
            // Channel doesn't need email but our DB schema requires one — synthesize
            payload.email = `${phone}@neolix-channel.local`
          }
          try {
            const { data } = await leadsApi.addSingle(payload)
            if (data.lead_ids?.length) {
              aggregatedIds.push(...data.lead_ids)
            } else if (data.id || data.lead_id) {
              aggregatedIds.push(data.id || data.lead_id)
            }
            processedCount++
          } catch (e) {
            console.error('Database insertion error:', e)
          }
        })
      )
      if (aggregatedIds.length > 0) onAdded(aggregatedIds)
      toast.success(`Successfully registered ${processedCount} new contacts!`)
      setRows([{ phone: '', email: '', name: '', company: '', businessDesc: '' }])
    } catch {
      toast.error('Batch registration pipeline error')
    } finally {
      setLoading(false)
    }
  }

  const clipboardPlaceholder = dualMode
    ? "9876543210 \t john@acme.com \t John Smith \t Acme Corp"
    : needsPhone
      ? "9876543210 \t John Smith \t Acme Corp"
      : "john@acme.com \t John Smith \t Acme Corp"

  return (
    <div className="p-3 space-y-3">
      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Automated Excel Grid Integration</span>
        <button type="button" onClick={() => setShowClipboard(!showClipboard)} className="text-[11px] font-bold text-blue-600 bg-white border px-2.5 py-1 rounded-lg transition-all shadow-3xs">
          {showClipboard ? 'Close Ingestion Box' : '⚡ Auto-Fill Spreadsheet Block'}
        </button>
      </div>

      {showClipboard && (
        <div className="p-2.5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-2 fade-up">
          <textarea value={clipboardData} onChange={e => setRawClipboardData(e.target.value)} className="textarea h-20 text-xs font-mono bg-white placeholder-slate-400" placeholder={clipboardPlaceholder} />
          <button type="button" onClick={handleClipboardParse} className="w-full bg-blue-600 text-white rounded-lg py-1 font-bold text-xs">Parse and Populate Layout Matrices</button>
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 border-b border-dashed pb-2">
        {rows.map((row, index) => (
          <div key={index} className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2 relative shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded-md">User Entry #{index + 1}</span>
              <button type="button" onClick={() => handleRemoveRow(index)} className="text-red-500 text-xs font-bold">
                {rows.length === 1 ? 'Reset fields' : '❌ Remove'}
              </button>
            </div>
            {/* Contact fields: phone and/or email depending on active channels */}
            <div className={`grid grid-cols-1 ${dualMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2`}>
              {needsPhone && (
                <input required className="input text-xs bg-white" type="tel" placeholder="Mobile Number *"
                  value={row.phone} onChange={e => handleInputChange(index, 'phone', e.target.value)} />
              )}
              {needsEmail && (
                <input required className="input text-xs bg-white" type="email" placeholder="Email Address *"
                  value={row.email} onChange={e => handleInputChange(index, 'email', e.target.value)} />
              )}
              <input className="input text-xs bg-white" placeholder="Contact Name" value={row.name} onChange={e => handleInputChange(index, 'name', e.target.value)} />
              <input className="input text-xs bg-white" placeholder="Company" value={row.company} onChange={e => handleInputChange(index, 'company', e.target.value)} />
            </div>
            <textarea className="textarea h-12 text-xs bg-white resize-none" placeholder="AI Personalization Custom Context Parameters..." value={row.businessDesc} onChange={e => handleInputChange(index, 'businessDesc', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleAddRow} className="flex-1 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1 bg-white">
          <Plus size={13} /> ➕ Add Row
        </button>
        <button type="button" disabled={loading} onClick={handleBatchSubmit} className="flex-1 bg-slate-900 text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Commit Batch Matrix
        </button>
      </div>
    </div>
  )
}

function UploadPanel({ onAdded }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef()
  const handle = async (file) => {
    setLoading(true)
    try {
      const { data } = await leadsApi.uploadFile(file)
      toast.success('Leads extracted from file asset dataset')
      onAdded(data.lead_ids || [])
    } catch {
       toast.error('Upload parser file error')
     } finally {
       setLoading(false)
     }
  }

  return (
    <div className="p-3">
      <div onClick={() => ref.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f) }} className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50 transition-all group">
        {loading ? <Loader2 size={20} className="animate-spin mx-auto text-slate-800" /> : (
          <>
            <Upload size={20} className="mx-auto mb-1.5 text-slate-300 group-hover:text-slate-800" />
            <p className="text-xs font-medium text-slate-600">Click or drop sheets</p>
            <p className="text-[10px] text-slate-400 mt-0.5">CSV, XLSX, PDF, TXT, JSON</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" className="hidden" accept=".csv,.xlsx,.xls,.txt,.pdf,.json" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
    </div>
  )
}

function ScanPanel({ onAdded, requiredChannels }) {
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const isPhoneRequired = requiredChannels.includes('whatsapp') || requiredChannels.includes('sms')

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = s
      videoRef.current.srcObject = s
      setStreaming(true)
    } catch { toast.error('Camera capture array access blocked') }
  }

  const capture = async () => {
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const b64 = c.toDataURL('image/jpeg').split(',')[1]
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStreaming(false); setLoading(true)
    try {
      const { data } = await leadsApi.scanCard(b64)
      if (data.total_found > 0 || data.phone || data.email) {
        toast.success('Card data extracted accurately')
        onAdded(data.lead_ids || [])
      } else {
         toast.error(isPhoneRequired ? 'No valid mobile phone number found' : 'No valid email address found')
       }
    } catch {
       toast.error('AI vision system error')
     } finally {
       setLoading(false)
     }
  }

  return (
    <div className="p-3 space-y-2">
      {!streaming && !loading && (
        <div onClick={openCamera} className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50 transition-all">
          <CreditCard size={20} className="mx-auto mb-1.5 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">Scan Hardware OCR Business Card</p>
        </div>
      )}
      {streaming && (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border" />
          <button onClick={capture} className="btn-primary w-full justify-center">Parse Viewport Frame Target</button>
        </>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Deconstructing card text layout parameters...
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// ── Master Export Component Context ──────────────────────────────────────────
export default function LeadSelector({ selected, onChange, requiredChannels = 'email' }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const isPhoneRequired = requiredChannels.includes('whatsapp') || requiredChannels.includes('sms')

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      // ✅ Pass active channels configuration layout masks straight to your updated database query filters
      const activeContext = isPhoneRequired ? 'whatsapp' : 'email'
      const { data } = await leadsApi.search(query, 50, activeContext, requiredChannels)
            
      let leads = data.leads || data || []
      setResults(leads)
      if (leads.length === 0) toast('No uncontacted leads match your active channel requirements!')
    } catch {
       toast.error('Search index lookup timeout')
     } finally {
       setSearching(false)
     }
  }

  const toggle = useCallback((lead) => {
    const next = new Map(selected)
    if (next.has(lead.id)) next.delete(lead.id)
    else next.set(lead.id, lead)
    onChange(next)
  }, [selected, onChange])

  const handleAdded = (ids) => {
    const next = new Map(selected)
    ids.forEach(id => { if (!next.has(id)) next.set(id, { id }) })
    onChange(next)
  }

  const selectAll = () => {
    const next = new Map(selected)
    // ✅ Re-clones object properties correctly to prevent template injection errors later
    results.forEach(l => {
      next.set(l.id, {
        id: l.id,
        phone: l.phone,
        email: l.email,
        contact_name: l.contact_name,
        company_name: l.company_name,
        business_details: l.business_details || l.business_description || ''
      })
    })
    onChange(next)
    toast.success(`Selected all ${results.length} valid omnichannel leads!`)
  }

  const PANELS = [
    { id: 'upload', icon: Upload,        label: 'Upload File' },
    { id: 'scan',   icon: CreditCard,    label: 'Scan Card' },
    { id: 'smart_insert', icon: ClipboardList, label: 'Smart Insertion Grid' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-400 transition-all">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder={isPhoneRequired ? "Search parameters via mobile numbers index..." : "Search criteria over email handle indexes..."}
            className="flex-1 bg-transparent text-xs outline-none placeholder-slate-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={doSearch} className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
          {searching ? <Loader2 size={14} className="animate-spin text-slate-800" /> : <Search size={14} />}
        </button>
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          {PANELS.map(p => (
            <button key={p.id} type="button"
              onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
              title={p.label}
              className={`p-2 rounded-xl transition-all ${activePanel === p.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              <p.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {activePanel && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white fade-up">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {PANELS.find(p => p.id === activePanel)?.label} Configuration Module
            </span>
            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
          {activePanel === 'smart_insert' && <SmartInsertionPanel onAdded={handleAdded} requiredChannels={requiredChannels} />}
          {activePanel === 'upload' && <UploadPanel onAdded={handleAdded} />}
          {activePanel === 'scan'   && <ScanPanel   onAdded={handleAdded} requiredChannels={requiredChannels} />}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{results.length} matching entries found</p>
            <button type="button" onClick={selectAll} className="text-xs text-blue-600 font-bold hover:underline">Select all matching leads</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border p-1 rounded-xl bg-slate-50/50">
            {results.map(lead => (
              <div key={lead.id} onClick={() => toggle(lead)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${selected.has(lead.id) ? 'bg-white border-slate-400 shadow-2xs' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                <div>
                  <p className="font-bold text-slate-800">{lead.company_name || lead.contact_name || 'Anonymous Contact'}</p>
                  <p className="text-slate-400 text-[11px]">
                    {lead.email || 'No Email'} · {lead.phone ? `+${lead.phone}` : 'No Phone'}
                  </p>
                </div>
                {selected.has(lead.id) && <Check size={14} className="text-slate-900" strokeWidth={3} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}