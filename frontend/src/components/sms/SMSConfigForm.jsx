import { useState, useEffect } from 'react'
import { ShieldAlert, Check, Loader2, Sliders } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../../services/api'

export default function SMSConfigForm({ onConfigUpdated }) {
  const [config, setConfig] = useState({ webhook_url: '', timezone: 'Asia/Kolkata', daily_cap: 150 })
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [simPhone, setSimPhone] = useState('')

  useEffect(() => {
    fetchCurrentConfig()
  }, [])

  const fetchCurrentConfig = async () => {
    try {
      const { data } = await API.get('/sms/config')
      if (data && data.webhook_url) {
        setConfig(data)
        if (data.webhook_url.includes('||')) {
          const parts = data.webhook_url.split('||')
          setApiKey(parts[0])
          setSimPhone(parts[1])
        }
      }
    } catch (err) {
      console.error('Failed to parse remote gateway settings:', err)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!apiKey || !simPhone) {
      toast.error('Both fields are required.')
      return
    }
    setLoading(true)
    
    const compositeUrl = `${apiKey.trim()}||${simPhone.trim()}`
    
    try {
      await API.post('/sms/config', {
        webhook_url: compositeUrl,
        daily_cap: config.daily_cap,
        timezone: config.timezone
      })
      toast.success('httpSMS configuration synchronized!')
      if (onConfigUpdated) onConfigUpdated()
    } catch (err) {
      toast.error('Failed to update config settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">httpSMS Credentials</h3>
          <p className="text-xs text-slate-500">Sync your credentials straight from your web dashboard.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            httpSMS API Key
          </label>
          <input
            type="password"
            required
            placeholder="Enter your httpSMS API key..."
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-mono text-slate-800 transition"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Your SIM Phone Number
          </label>
          <input
            type="text"
            required
            placeholder="e.g., +919876543210"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-mono text-slate-800 transition"
            value={simPhone}
            onChange={e => setSimPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Daily Safety Limit Ceiling
          </label>
          <input
            type="number"
            required
            min="1"
            max="500"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-bold text-slate-800 transition"
            value={config.daily_cap}
            onChange={e => setConfig({ ...config, daily_cap: parseInt(e.target.value) || 150 })}
          />
          <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              Keep volume below <strong>150 daily messages</strong> to safeguard your physical line from carrier filters.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save and Sync</>}
        </button>
      </form>
    </div>
  )
}