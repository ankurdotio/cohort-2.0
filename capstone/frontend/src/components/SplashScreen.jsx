import { useState, useEffect } from 'react'

export default function SplashScreen({ onSandboxCreated }) {
  const [ loading, setLoading ] = useState(false)
  const [ error, setError ] = useState(null)
  const [ dots, setDots ] = useState('')

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [ loading ])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sandbox/start', { method: 'POST' })
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data = await res.json()
      onSandboxCreated(data)
    } catch (err) {
      setError(err.message || 'Failed to create sandbox')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,211,238,0.06) 0%, transparent 70%)'
        }}
      />

      {/* Floating particles */}
      {[ ...Array(12) ].map((_, i) => (
        <div key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            background: '#22d3ee',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animation: `pulse-glow ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: Math.random() * 2 + 's'
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center animate-fadeIn">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(8,145,178,0.08))',
              border: '1px solid rgba(34,211,238,0.3)',
              boxShadow: '0 0 40px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="14" height="14" rx="2" fill="#22d3ee" opacity="0.9" />
              <rect x="22" y="4" width="14" height="14" rx="2" fill="#22d3ee" opacity="0.4" />
              <rect x="4" y="22" width="14" height="14" rx="2" fill="#22d3ee" opacity="0.4" />
              <rect x="22" y="22" width="14" height="14" rx="2" fill="#22d3ee" opacity="0.9" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }}>
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-3"
            style={{
              background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
            Sandbox IDE
          </h1>
          <p className="text-lg" style={{ color: '#64748b' }}>
            Spin up an isolated coding environment in seconds
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[ 'AI-Powered', 'Live Preview', 'Terminal Access', 'File Explorer' ].map(f => (
            <span key={f} className="px-3 py-1 text-xs font-medium rounded-full"
              style={{
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.2)',
                color: '#94a3b8'
              }}>
              {f}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        {!loading ? (
          <button onClick={handleCreate}
            className="group relative px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
              color: '#070b14',
              boxShadow: '0 0 30px rgba(34,211,238,0.3), 0 4px 20px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(34,211,238,0.5), 0 4px 30px rgba(0,0,0,0.4)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.3), 0 4px 20px rgba(0,0,0,0.3)'}
          >
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Create Sandbox
            </span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 px-8 py-4 rounded-xl"
              style={{
                background: 'rgba(34,211,238,0.06)',
                border: '1px solid rgba(34,211,238,0.2)'
              }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#22d3ee', borderTopColor: 'transparent' }} />
              <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Initializing sandbox{dots}
              </span>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              Setting up your isolated environment
            </p>
          </div>
        )}

        {error && (
          <div className="px-5 py-3 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5'
            }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Bottom brand */}
      <div className="absolute bottom-6 text-xs" style={{ color: '#334155' }}>
        Powered by AI • Isolated Runtime • Zero Config
      </div>
    </div>
  )
}
