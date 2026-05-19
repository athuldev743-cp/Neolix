import { useState, useEffect } from 'react'
import { 
  Smartphone, Send, Loader2, MessageSquare, 
  Zap, RefreshCw, Layers, Sparkles, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../services/api'
import SMSConfigForm from '../components/sms/SMSConfigForm'
import SMSQueueTable from '../components/sms/SMSQueueTable'

export default function SMSPage() {
  const [metrics, setMetrics] = useState({ pending_count: 0, processing_count: 0, sent_today: 0, daily_limit: 150 })
  const [logs, setLogs] = useState([])
  const [manualSMS, setManualSMS] = useState({ phone_number: '', message_body: '', lead_name: '' })
  const [sending, setSending] = useState(false)
  
  const [registeredNodes, setRegisteredNodes] = useState([])
  const [newNodeId, setNewNodeId] = useState('')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    refreshDashboard()
    fetchRegisteredNodes()
    const pollInterval = setInterval(refreshDashboard, 8000)
    return () => clearInterval(pollInterval)
  }, [])

  const refreshDashboard = async () => {
    try {
      const metricRes = await API.get('/sms/queue-status')
      setMetrics(metricRes.data)
      const logRes = await API.get('/sms/logs')
      setLogs(logRes.data)
    } catch (err) {
      console.error('Failed to update tracking metrics:', err)
    }
  }

  const fetchRegisteredNodes = async () => {
    try {
      const res = await API.get('/sms/gateway-nodes')
      setRegisteredNodes(res.data)
    } catch (err) {
      console.error('Failed to fetch gateway nodes:', err)
    }
  }

  const handleRegisterNode = async (e) => {
    e.preventDefault()
    if (!newNodeId.trim()) return
    setRegistering(true)
    try {
      await API.post('/sms/register-node', { device_id: newNodeId.trim() })
      toast.success('Wireless Gateway Node linked successfully!')
      setNewNodeId('')
      fetchRegisteredNodes()
    } catch (err) {
      toast.error('Failed to register hardware node.')
    } finally {
      setRegistering(false)
    }
  }

  const handleManualEnqueue = async (e) => {
    e.preventDefault()
    if (!manualSMS.phone_number || !manualSMS.message_body) return
    setSending(true)
    try {
      await API.post('/sms/enqueue', manualSMS)
      toast.success('Message injected safely into pacing queue stream.')
      setManualSMS({ phone_number: '', message_body: '', lead_name: '' })
      refreshDashboard()
    } catch (err) {
      toast.error('Failed to append message to outbound pipeline.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Android SMS Gateway</h1>
          <p className="text-xs text-slate-500 mt-0.5">Route automated sales texts free using your local SIM package.</p>
        </div>
        <button 
          onClick={refreshDashboard}
          className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          Refresh Status
        </button>
      </div>

      {/* APK ONBOARDING CARD */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[11px] font-bold tracking-wider uppercase text-slate-300">
            <Sparkles className="h-3 w-3 text-amber-400" /> Native Hardware Link
          </div>
          
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Deploy Native Wireless Gateway Client</h2>
            <p className="text-xs text-slate-400 mt-1">Runs completely headlessly in your handset's background task layout.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
              <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center font-black text-white text-xs">1</div>
              <p className="font-bold text-white">Sideload Mobile APK</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">Download our custom production binary directly onto your Android device below.</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
              <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center font-black text-white text-xs">2</div>
              <p className="font-bold text-white">Unrestrict App Settings</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">Go to phone Settings ──► Apps ──► Permissions, unrestrict settings, and enable SMS rules.</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
              <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center font-black text-white text-xs">3</div>
              <p className="font-bold text-white">Link Device Node ID</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">Copy the alphanumeric identifier string displayed on your phone UI and register it below.</p>
            </div>
          </div>

          <div className="pt-2">
            <a 
              href="https://neolix-hub.vercel.app/downloads/neolix-gateway.apk" 
              className="inline-flex items-center gap-2 h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <Smartphone className="h-4 w-4" />
              Download Gateway Node APK (.apk)
            </a>
          </div>
        </div>
      </div>

      {/* METRICS DISPLAY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Awaiting Queue', val: metrics.pending_count, sub: 'Messages in stream', icon: Layers, css: 'text-amber-600 bg-amber-50 border-amber-100' },
          { title: 'Current Task', val: metrics.processing_count, sub: 'In flight to relay', icon: RefreshCw, css: 'text-sky-600 bg-sky-50 border-sky-100' },
          { title: 'Dispatched Today', val: `${metrics.sent_today} / ${metrics.daily_limit}`, sub: 'Ceiling cap allocations', icon: MessageSquare, css: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { title: 'Pacing Engine', val: '45s - 90s', sub: 'Randomized Jitter active', icon: Zap, css: 'text-slate-700 bg-slate-50 border-slate-200/80' }
        ].map((item, id) => {
          const Icon = item.icon
          return (
            <div key={id} className={`p-4 border rounded-2xl shadow-xs flex items-center justify-between ${item.css}`}>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">{item.title}</span>
                <p className="text-xl font-black tracking-tight">{item.val}</p>
                <p className="text-[10px] opacity-80 font-medium">{item.sub}</p>
              </div>
              <div className="p-2.5 bg-white/60 border border-white/80 rounded-xl shadow-xs">
                <Icon className="h-4 w-4 opacity-90" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          
          {/* HARDWARE GATEWAY LINK FORM */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Register Wireless Node
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Authorize a physical phone interface array via its signature key.</p>
            </div>

            <form onSubmit={handleRegisterNode} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Hardware Device Node ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 8516a3de3bfec38b"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-mono font-bold uppercase text-slate-800"
                  value={newNodeId}
                  onChange={e => setNewNodeId(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={registering}
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Authorize Signature Bridge'}
              </button>
            </form>

            {registeredNodes.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Client Hardware Clusters</span>
                <div className="space-y-1">
                  {registeredNodes.map((node, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-600">
                      <span>{node.device_id}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SMSConfigForm onConfigUpdated={refreshDashboard} />

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-slate-500" />
                Manual Lead Dispatch
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Inject an ad-hoc test text task entry directly into the pacing loop.</p>
            </div>

            <form onSubmit={handleManualEnqueue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Lead Identity (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Athul Dev"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-medium text-slate-800"
                  value={manualSMS.lead_name}
                  onChange={e => setManualSMS({ ...manualSMS, lead_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., +919876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-mono font-bold text-slate-800"
                  value={manualSMS.phone_number}
                  onChange={e => setManualSMS({ ...manualSMS, phone_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Text Message Context</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type message context here..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-medium text-slate-700 resize-none leading-relaxed"
                  value={manualSMS.message_body}
                  onChange={e => setManualSMS({ ...manualSMS, message_body: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Queue Outbound Text Task'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 h-full">
          <SMSQueueTable logs={logs} />
        </div>
      </div>
    </div>
  )
}