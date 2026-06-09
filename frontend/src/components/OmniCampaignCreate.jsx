/**
 * OmniCampaignCreate — 9-Day Omnichannel Automation Cadence Builder
 * Features live connection safety checks and dynamic dual-handle lead selector masking arrays.
 */
import { useState, useEffect } from 'react'
import { ChevronLeft, Send, Loader2, Mail, Smartphone, MessageSquare, ShieldCheck, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { omniApi, profileApi, waApi } from '../services/api'
import LeadSelector from './LeadSelector'

export default function OmniCampaignCreate({ onBack, onDone }) {
  const [form, setForm] = useState({ campaign_name: '', campaign_info: '', daily_limit: 50 })
  const [selectedChannels, setSelectedChannels] = useState(['email']) // Default channel baseline
  const [selectedLeads, setSelectedLeads] = useState(new Map())
  const [submitting, setSubmitting] = useState(false)
  
  // Gateways Connection Verification State Holders
  const [gateways, setGateways] = useState({ email: false, whatsapp: false, sms: true }) // SMS is native hardware
  const [checkingGateways, setCheckingGateways] = useState(true)

  useEffect(() => {
    const verifyIntegrations = async () => {
      try {
        const [profRes, waRes] = await Promise.allSettled([
          profileApi.get(),
          waApi.status()
        ])

        const hasEmail = profRes.status === 'fulfilled' && !!profRes.value.data?.smtp?.host
        const hasWA = waRes.status === 'fulfilled' && !!waRes.value.data?.connected

        setGateways({
          email: hasEmail,
          whatsapp: hasWA,
          sms: true // SIM Card APK is self-polling
        })

        // Auto-adjust channel array mask selection if SMTP parameter sets are empty
        if (!hasEmail && hasWA) setSelectedChannels(['whatsapp'])
      } catch {
        toast.error('Could not parse live gateway link states')
      } finally {
        setCheckingGateways(false)
      }
    }
    verifyIntegrations()
  }, [])

  const handleChannelToggle = (channel, isConnected) => {
    if (!isConnected) return // Block toggle interaction for offline protocols
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length === 1) {
        toast.error('Select at least one validation channel pipeline')
        return
      }
      setSelectedChannels(selectedChannels.filter(c => c !== channel))
    } else {
      setSelectedChannels([...selectedChannels, channel])
    }
    // Wipe selected lead vectors to clear invalid data configurations upon mask mutation
    setSelectedLeads(new Map())
  }

  const submitOmniCampaign = async () => {
    if (!form.campaign_name.trim() || !form.campaign_info.trim()) {
      return toast.error('Provide a Campaign Name and Campaign Info Event String Context.')
    }
    if (selectedLeads.size === 0) {
      return toast.error('Select at least one validated lead from the search parameters.')
    }

    setSubmitting(true)
    try {
      await omniApi.create({
        campaign_name: form.campaign_name,
        campaign_info: form.campaign_info,
        selected_channels: selectedChannels,
        lead_ids: Array.from(selectedLeads.keys()),
        daily_limit: parseInt(form.daily_limit) || 50
      })
      toast.success('Omnichannel 9-Day Automations Campaign Sequence Activated!')
      setTimeout(onDone, 800)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Omni pipeline execution rejection failure')
    } finally {
      setSubmitting(false)
    }
  }

  // Map comma separated validation masks array to inject into your updated LeadSelector
  const activeValidationMaskString = selectedChannels.join(',')

  if (checkingGateways) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-800" size={24} /></div>
  }

  return (
    <div className="fade-up">
      <button onClick={onBack} className="btn-ghost -ml-2 mb-4"><ChevronLeft size={16} /> Back to Hub</button>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Create Omnichannel Campaign Sequence</h2>
        <p className="text-xs text-slate-400 mt-0.5">Launches a 9-day step cadence follow-up across all active system channels simultaneously.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Hand Data Configurations Layout Inputs Column */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="field-label">Campaign Name</label>
              <input className="input" placeholder="e.g., TechExpo 2026 Core Variant Outreach" value={form.campaign_name} onChange={e => setForm({...form, campaign_name: e.target.value})} />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="field-label mb-0">Campaign Info / Event Context Contextual Parameters</label>
                <div className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
                  <HelpCircle size={13} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal leading-normal shadow-md">
                    AI engine uses this string context data parameter directly inside the Day 0 greeting text sequence ("Hey, remember we met at...")
                  </span>
                </div>
              </div>
              <input className="input" placeholder="e.g., Medical Physiotherapy Function, Kochi" value={form.campaign_info} onChange={e => setForm({...form, campaign_info: e.target.value})} />
            </div>

            <div>
              <label className="field-label">Daily Outbox Processing Allocation Limit</label>
              <input type="number" className="input" min={1} max={200} value={form.daily_limit} onChange={e => setForm({...form, daily_limit: e.target.value})} />
            </div>

            {/* Target Interface Safeguard Gateway Selection Blocks Grid */}
            <div className="pt-2 border-t">
              <label className="field-label mb-2 block">Activate Transmission Pipelines</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail, connected: gateways.email, badge: 'SMTP' },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, connected: gateways.whatsapp, badge: 'Baileys' },
                  { id: 'sms', label: 'SMS', icon: Smartphone, connected: gateways.sms, badge: 'Android APK' }
                ].map(ch => {
                  const isChecked = selectedChannels.includes(ch.id)
                  return (
                    <button key={ch.id} type="button" disabled={!ch.connected} onClick={() => handleChannelToggle(ch.id, ch.connected)}
                      className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-24 transition-all relative overflow-hidden ${!ch.connected ? 'opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed' : isChecked ? 'border-blue-600 bg-blue-50/20 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start w-full">
                        <ch.icon size={16} className={isChecked ? 'text-blue-600' : 'text-slate-400'} />
                        <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${ch.connected ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                          {ch.connected ? ch.badge : 'Offline'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ch.label}</p>
                        <p className="text-[9px] text-slate-400">{isChecked && ch.connected ? 'Pipeline Active' : ch.connected ? 'Idle Stream' : 'Requires Config'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Lead Selector Panel Injected with Channel Masks array properties */}
          <div className="card p-5">
            <label className="field-label mb-2 block">Enroll Recipient Lead Set Matrix Profiles</label>
            <p className="text-[10px] text-slate-400 mb-3">Leads lacking required fields for any active channel are hidden from search to prevent sequence errors.</p>
            <LeadSelector selected={selectedLeads} onChange={setSelectedLeads} requiredChannels={activeValidationMaskString} />
          </div>
        </div>

        {/* Right Hand 9-Day Automation Sequences Flowchart Column */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-6 bg-slate-50/50 space-y-4 border border-dashed">
            <p className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5"><ShieldCheck size={14} className="text-blue-500" /> Automation Sequence Preview</p>
            
            <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-5">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 0 — Interactive Hook Phase</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">Fires an event-tailored prompt to your leads over all selected networks: <span className="italic font-medium text-slate-600">"Hey, remember we met at {form.campaign_info || '[Campaign Info]'}?"</span></p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 3 — Value Profile Showcasing</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">System automatically fetches data fields from your Showcase Profile. Email transmits HTML copy, while WhatsApp attaches the asset file folders natively.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-800">Day 6 — Closing Call-To-Action</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">Sends low-friction calendar blocking invitations to capture slots without manual work.</p>
              </div>
            </div>

            <div className="pt-4 border-t flex items-center gap-2">
              <button onClick={submitOmniCampaign} disabled={submitting || selectedLeads.size === 0} className="btn-primary w-full justify-center py-2.5 text-xs font-bold">
                {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : <Send size={14} className="mr-1" />}
                Activate Campaign for {selectedLeads.size} Omnichannel Targets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}