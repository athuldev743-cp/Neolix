import { useState } from 'react'
import { Calendar, User, MessageSquare, ClipboardList, AlertCircle } from 'lucide-react'
import API from '../../services/api'

export default function SMSQueueTable({ logs }) {
  const [currentFilter, setCurrentFilter] = useState('ALL')

  const filteredLogs = logs.filter(log => {
    if (currentFilter === 'ALL') return true
    return log.status === currentFilter
  })

  const getBadgeStyles = (status) => {
    switch (status) {
      case 'SENT': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'PROCESSING': return 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
      case 'FAILED': return 'bg-rose-50 text-rose-700 border-rose-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            Outbound Delivery Logs
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status tracking of automated sales dispatches.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          {['ALL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED'].map((status) => (
            <button
              key={status}
              onClick={() => setCurrentFilter(status)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                currentFilter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-slate-500 font-bold border-b border-slate-200 text-xs tracking-wider uppercase">
              <th className="p-4">Lead</th>
              <th className="p-4">Destination</th>
              <th className="p-4">Message Body</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No messages found matching the selected pipeline state filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                        {log.lead_name ? log.lead_name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="truncate max-w-[120px]">{log.lead_name || 'Direct Input'}</p>
                        <span className="text-[10px] text-slate-400 font-medium block flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                    {log.phone_number}
                  </td>
                  <td className="p-4 text-slate-600 max-w-xs md:max-w-md">
                    <p className="line-clamp-2 text-xs leading-relaxed" title={log.message_body}>
                      {log.message_body}
                    </p>
                    {log.error_message && (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        {log.error_message}
                      </span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getBadgeStyles(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}