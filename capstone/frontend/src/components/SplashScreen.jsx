import { useState, useEffect } from 'react'

export default function SplashScreen({ onSandboxCreated }) {
  const [ loading, setLoading ] = useState(false)
  const [ loadingProjectId, setLoadingProjectId ] = useState(null) // id being opened
  const [ error, setError ] = useState(null)
  const [ dots, setDots ] = useState('')
  const [ title, setTitle ] = useState('')
  const [ loadingStep, setLoadingStep ] = useState('') // 'project' | 'sandbox'

  // Existing projects
  const [ projects, setProjects ] = useState([])
  const [ projectsLoading, setProjectsLoading ] = useState(true)

  // Fetch existing projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/sandbox/project', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch {
        // Silently ignore — user may not be logged in yet
      } finally {
        setProjectsLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Animated dots while loading
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [ loading ])

  // Start sandbox for an existing project
  const handleOpenProject = async (projectId) => {
    setLoadingProjectId(projectId)
    setError(null)
    try {
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to start sandbox')
      setLoadingProjectId(null)
    }
  }

  // Create new project then start its sandbox
  const handleCreate = async () => {
    const projectTitle = title.trim()
    if (!projectTitle) {
      setError('Please enter a project name')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Step 1: Create the project
      setLoadingStep('project')
      const projectRes = await fetch('/api/sandbox/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: projectTitle })
      })
      if (!projectRes.ok) throw new Error(`Failed to create project (${projectRes.status})`)
      const projectData = await projectRes.json()
      const projectId = projectData.project._id

      // Step 2: Start the sandbox
      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to create sandbox')
      setLoading(false)
      setLoadingStep('')
    }
  }

  const isAnyLoading = loading || loadingProjectId !== null

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
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center animate-fadeIn w-full" style={{ maxWidth: '480px' }}>
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

        {/* Existing projects list */}
        {!isAnyLoading && (
          <>
            {projectsLoading ? (
              <div className="w-full flex justify-center py-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'rgba(34,211,238,0.4)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : projects.length > 0 && (
              <div className="w-full" style={{ maxWidth: '420px' }}>
                <p className="text-xs font-medium uppercase tracking-widest mb-3 text-left" style={{ color: '#475569' }}>
                  Recent Projects
                </p>
                <div className="flex flex-col gap-2">
                  {projects.map(project => (
                    <button
                      key={project._id}
                      onClick={() => handleOpenProject(project._id)}
                      disabled={isAnyLoading}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer group"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid #1e2d45',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(34,211,238,0.05)'
                        e.currentTarget.style.borderColor = 'rgba(34,211,238,0.25)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = '#1e2d45'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{project.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingProjectId === project._id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-t-transparent"
                            style={{ borderColor: '#22d3ee', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"
                            style={{ transition: 'stroke 0.2s' }}
                            className="group-hover:stroke-cyan-400">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: '#1e2d45' }} />
                  <span className="text-xs" style={{ color: '#334155' }}>or create new</span>
                  <div className="flex-1 h-px" style={{ background: '#1e2d45' }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* New project input + CTA */}
        {!isAnyLoading ? (
          <div className="flex flex-col items-center gap-4 w-full" style={{ maxWidth: '420px' }}>
            <div className="w-full rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(34,211,238,0.2)',
                transition: 'border-color 0.2s'
              }}
              onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'}
              onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'}
            >
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="New project name…"
                className="w-full outline-none bg-transparent px-5 py-3.5 text-sm"
                style={{ color: '#e2e8f0', caretColor: '#22d3ee' }}
                autoFocus={projects.length === 0}
              />
            </div>
            <button onClick={handleCreate}
              className="group relative w-full py-4 rounded-xl text-base font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                color: '#070b14',
                boxShadow: '0 0 30px rgba(34,211,238,0.3), 0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(34,211,238,0.5), 0 4px 30px rgba(0,0,0,0.4)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.3), 0 4px 20px rgba(0,0,0,0.3)'}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create New Project
              </span>
            </button>
          </div>
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
                {loadingProjectId
                  ? `Starting sandbox${dots}`
                  : loadingStep === 'project'
                    ? `Creating project${dots}`
                    : `Starting sandbox${dots}`}
              </span>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              {loadingProjectId
                ? 'Spinning up your isolated environment…'
                : loadingStep === 'project'
                  ? 'Registering your project…'
                  : 'Spinning up your isolated environment…'}
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
