import { useState, useEffect } from 'react'

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  css: 'css', html: 'html', json: 'json', md: 'markdown',
  py: 'python', sh: 'bash', yml: 'yaml', yaml: 'yaml',
}

function getLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return LANGUAGE_MAP[ext] || 'plaintext'
}

export default function FileViewer({ agentBase, filePath }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!agentBase || !filePath) return
    const fetchFile = async () => {
      setLoading(true)
      setError(null)
      setContent(null)
      try {
        const res = await fetch(`${agentBase}/read-files?files=${encodeURIComponent(filePath)}`)
        const data = await res.json()
        const fileData = data.files?.[0]
        if (fileData) {
          const fileContent = Object.values(fileData)[0]
          setContent(fileContent)
        } else {
          setError('File not found or empty')
        }
      } catch (err) {
        setError('Failed to load file')
      } finally {
        setLoading(false)
      }
    }
    fetchFile()
  }, [agentBase, filePath])

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: '#334155' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p className="text-sm">Select a file from the explorer</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* File tab bar */}
      <div className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: '36px', background: '#070b14', borderBottom: '1px solid #1e2d45' }}>
        <div className="flex items-center gap-2 px-3 py-1 rounded-t"
          style={{ background: '#0d1424', border: '1px solid #1e2d45', borderBottom: 'none', marginBottom: '-1px' }}>
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            {filePath.split('/').pop()}
          </span>
          <span className="text-xs px-1 rounded"
            style={{ background: 'rgba(34,211,238,0.08)', color: '#475569' }}>
            {getLanguage(filePath)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative" style={{ background: '#070b14' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent"
              style={{ borderColor: '#22d3ee', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {error && (
          <div className="p-6 text-sm" style={{ color: '#ef4444' }}>{error}</div>
        )}
        {content !== null && !loading && (
          <pre className="p-4 text-xs leading-relaxed overflow-auto h-full"
            style={{ color: '#94a3b8', fontFamily: '"JetBrains Mono", "Fira Code", monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
