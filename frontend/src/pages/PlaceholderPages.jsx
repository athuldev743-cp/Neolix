import { Link } from 'react-router-dom'
import { Users, ScanLine, Send, Settings, ArrowLeft, Clock } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'

function ComingSoonPage({ icon: Icon, module, title, desc, features, color }) {
  return (
    <div className="animate-slide-up max-w-2xl">
      <PageHeader
        badge={`${module} · Coming Soon`}
        title={title}
        subtitle={desc}
      />
      <div className="card p-8 text-center">
        <div className={`w-16 h-16 rounded-2xl bg-${color}/10 border border-${color}/20 flex items-center justify-center mx-auto mb-5`}>
          <Icon size={32} className={`text-${color}`} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock size={14} className="text-ink-300" />
          <p className="text-sm text-ink-300">Building next after Module 1</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
          {features.map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-slate-400 bg-white/3 rounded-lg px-3 py-2">
              <span className={`w-1 h-1 rounded-full bg-${color} flex-shrink-0`} />
              {f}
            </div>
          ))}
        </div>
        <Link to="/" className="btn-ghost">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function LeadsPage() {
  return <ComingSoonPage
    icon={Users} module="M2" title="Lead Management" color="neon-green"
    desc="Search and manage your 1M+ lead database in Aiven PostgreSQL"
    features={[
      'Full-text + \\y regex search', 'CSV upload & bulk paste',
      'Lead CRUD with status tracking', 'GIN index for sub-100ms queries',
      'Paginated lead table', 'Filter by status, industry, source',
    ]}
  />
}

export function ScannerPage() {
  return <ComingSoonPage
    icon={ScanLine} module="M3" title="Business Card Scanner" color="neon-amber"
    desc="Drag & drop business card images — OCR extracts all contact fields instantly"
    features={[
      'Drag & drop or paste image', 'Tesseract OCR fallback',
      'Google Vision API primary', 'Review & edit extracted fields',
      'One-click save to leads DB', 'Bulk card scanning',
    ]}
  />
}

export function OutreachPage() {
  return <ComingSoonPage
    icon={Send} module="M4" title="Outreach Engine" color="neon-violet"
    desc="AI composes personalised emails and WhatsApp messages using your profile + lead data"
    features={[
      'Profile context from MongoDB', 'Lead data from PostgreSQL',
      'AI-generated HTML email', 'Multi-part WhatsApp messages',
      'SMTP sending via profile creds', 'Baileys WhatsApp session',
      'Live HTML email preview', 'Edit before sending',
    ]}
  />
}

export function SettingsPage() {
  return <ComingSoonPage
    icon={Settings} module="M5" title="Settings & Analytics" color="text-slate-400"
    desc="Configure SMTP, WhatsApp session, and view outreach performance"
    features={[
      'SMTP credential manager', 'WhatsApp QR code scanner',
      'Outreach log viewer', 'Delivery stats dashboard',
      'Per-lead message history', 'Export logs as CSV',
    ]}
  />
}