import { useRef, useState } from 'react'

export default function PreviewFrame({ previewUrl }) {
  const iframeRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const handleRefresh = () => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: '36px', background: '#070b14', borderBottom: '1px solid #1e2d45' }}>
        
        {/* Traffic light dots */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', opacity: 0.7 }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b', opacity: 0.7 }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981', opacity: 0.7 }} />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center px-3 rounded"
          style={{
            background: '#0d1424',
            border: '1px solid #1e2d45',
            height: '24px'
          }}>
          {loading && (
            <div className="w-3 h-3 rounded-full border border-t-transparent mr-2 shrink-0"
              style={{ borderColor: '#22d3ee', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          )}
          <span className="text-xs truncate" style={{ color: '#475569', fontFamily: 'monospace' }}>
            {previewUrl}
          </span>
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh}
          className="p-1 rounded transition-colors cursor-pointer"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          title="Refresh preview">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>

        {/* Open in new tab */}
        <a href={previewUrl} target="_blank" rel="noreferrer"
          className="p-1 rounded transition-colors cursor-pointer"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          title="Open in new tab">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      {/* iFrame */}
      <div className="flex-1 relative">
        <iframe
          key={refreshKey}
          ref={iframeRef}
          src={previewUrl}
          className="w-full h-full border-0"
          style={{ background: '#fff' }}
          title="Sandbox Preview"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  )
}
