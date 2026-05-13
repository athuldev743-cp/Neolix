export default function PageHeader({ title, subtitle, badge, action }) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-in">
      <div>
        {badge && (
          <span className="badge bg-neon-blue/10 text-neon-blue border border-neon-blue/20 mb-3">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-semibold text-slate-100 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-300 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}