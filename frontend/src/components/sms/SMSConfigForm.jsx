import { useState, useEffect } from 'react'
import { Key, ShieldAlert, Check, Loader2, Link2, Sliders } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../api' // Uses your configured Vercel axios client instance

export default function SMSConfigForm({ onConfigUpdated }) {
  const [config, setConfig] = useState({ gateway_login: '', gateway_password: '', daily_cap: 150, timezone: 'Asia/Kolkata' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCurrentConfig()
  }, [])

  const fetchCurrentConfig = async () => {
    try {
      const { data } = await API.get('/api/v1/sms/config')
      if (data) {
        setConfig({
          gateway_login: data.gateway_login || '',
          gateway_password: data.gateway_password || '',
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
      await API.post('/api/v1/sms/config', config)
      toast.success('SMS Credentials saved and synced successfully!')
      if (onConfigUpdated) onConfigUpdated()
    } catch (err) {
      toast.error('Failed to write configuration updates to database.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Link Device API Credentials</h3>
          <p className="text-xs text-slate-500">Input security pairs exactly as shown inside your mobile handset application UI context.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              Gateway Login ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g., app_login_123"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-medium text-slate-800 transition"
              value={config.gateway_login}
              onChange={e => setConfig({ ...config, gateway_login: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Gateway Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••••"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-medium text-slate-800 transition tracking-wide"
              value={config.gateway_password}
              onChange={e => setConfig({ ...config, gateway_password: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Daily Safety Limit Ceiling
          </label>
          <div className="relative rounded-xl shadow-xs">
            <input
              type="number"
              required
              min="1"
              max="500"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-semibold text-slate-800 transition"
              value={config.daily_cap}
              onChange={e => setConfig({ ...config, daily_cap: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              <strong>Carrier Guardrail Recommendation:</strong> Standard residential mobile connections track bulk text spikes. Keep output under <strong>150 to 200 daily messages</strong> to safeguard personal hardware accounts.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Gateway Configuration
            </>
          )}
        </button>
      </form>
    </div>
  )
}