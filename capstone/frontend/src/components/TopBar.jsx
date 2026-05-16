export default function TopBar({ sandboxId, activeTab, onTabChange, status }) {
  const shortId = sandboxId ? sandboxId.slice(0, 8) + '…' : ''

  const statusConfig = {
    ready: { color: '#10b981', label: 'Ready', dot: true },
    loading: { color: '#f59e0b', label: 'Working…', dot: false },
    error: { color: '#ef4444', label: 'Error', dot: true },
  }
  const s = statusConfig[status] || statusConfig.ready

  return (
    <header className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: '48px',
        background: 'rgba(13,20,36,0.95)',
        borderBottom: '1px solid #1e2d45',
        backdropFilter: 'blur(12px)'
      }}>

      {/* Left — Logo + sandbox ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(8,145,178,0.1))', border: '1px solid rgba(34,211,238,0.3)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="#22d3ee">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1" opacity="0.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1" opacity="0.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Sandbox IDE</span>
        </div>

        {sandboxId && (
          <div className="flex items-center gap-2 px-2 py-0.5 rounded"
            style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            <span className="text-xs font-mono" style={{ color: '#64748b' }}>
              {shortId}
            </span>
          </div>
        )}
      </div>

      {/* Center — Tab switcher */}
      <div className="flex items-center gap-1 p-1 rounded-lg"
        style={{ background: '#0a0f1e', border: '1px solid #1e2d45' }}>
        {[
          { id: 'preview', icon: '⬛', label: 'Preview' },
          { id: 'files', icon: '📄', label: 'Files' }
        ].map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className="px-4 py-1 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer"
            style={activeTab === tab.id ? {
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(8,145,178,0.08))',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)'
            } : {
              color: '#475569',
              border: '1px solid transparent'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {s.dot ? (
            <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: s.color, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          )}
          <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
        </div>
      </div>
    </header>
  )
}
