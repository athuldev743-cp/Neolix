import { useState, useEffect } from 'react'
import { ShieldAlert, Check, Loader2, Sliders } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../../services/api'

export default function SMSConfigForm({ onConfigUpdated }) {
  const [config, setConfig] = useState({ webhook_url: '', daily_cap: 150, timezone: 'Asia/Kolkata' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCurrentConfig()
  }, [])

  const fetchCurrentConfig = async () => {
    try {
      const { data } = await API.get('/sms/config')
      if (data) {
        setConfig({
          webhook_url: data.webhook_url || '',
          daily_cap: data.daily_cap || 150,
          timezone: data.timezone || 'Asia/Kolkata'
        })
      }
    } catch (err) {
      console.error('Failed to parse remote gateway settings:', err)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await API.post('/sms/config', config)
      toast.success('Termux gateway node synced successfully!')
      if (onConfigUpdated) onConfigUpdated()
    } catch (err) {
      toast.error('Failed to update cloud network variables.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Termux Gateway Endpoint</h3>
          <p className="text-xs text-slate-500">Input the public secure URL tunnel string generated inside Termux shell layers.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Gateway Node URL
          </label>
          <input
            type="url"
            required
            placeholder="https://neolix-sms-node.localtunnel.me"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-mono text-slate-800 transition"
            value={config.webhook_url}
            onChange={e => setConfig({ ...config, webhook_url: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Daily Safety Limit Ceiling
          </label>
          <input
            type="number"
            required
            min="1"
            max="500"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-semibold text-slate-800 transition"
            value={config.daily_cap}
            onChange={e => setConfig({ ...config, daily_cap: parseInt(e.target.value) || 150 })}
          />
          <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Keep target volume capped below <strong>150 to 200 daily runs</strong> to insulate the hardware SIM channel from automatic carrier filters.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Network Mapping</>}
        </button>
      </form>
    </div>
  )
}