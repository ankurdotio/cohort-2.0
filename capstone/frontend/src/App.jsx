import { useState, useRef, useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import TopBar from './components/TopBar'
import FileExplorer from './components/FileExplorer'
import PreviewFrame from './components/PreviewFrame'
import FileViewer from './components/FileViewer'
import Terminal from './components/Terminal'
import AiChat from './components/AiChat'

export default function App() {
  // Sandbox state
  const [sandbox, setSandbox] = useState(null) // { sandboxId, previewUrl, agentBase }
  const [status, setStatus] = useState('ready')

  // UI state
  const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'files'
  const [activeFile, setActiveFile] = useState(null)
  const [fileRefreshKey, setFileRefreshKey] = useState(0)

  // Terminal resize
  const [terminalHeight, setTerminalHeight] = useState(220)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

  const handleSandboxCreated = useCallback((data) => {
    const agentBase = `http://${data.sandboxId}.agent.localhost`
    setSandbox({ sandboxId: data.sandboxId, previewUrl: data.previewUrl, agentBase })
    setStatus('ready')
  }, [])

  const handleFilesChanged = useCallback(() => {
    setFileRefreshKey(k => k + 1)
  }, [])

  const handleFileSelect = useCallback((path) => {
    setActiveFile(path)
    setActiveTab('files')
  }, [])

  // Drag to resize terminal
  const handleDragStart = (e) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartH.current = terminalHeight

    const onMove = (ev) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - ev.clientY
      const newH = Math.min(Math.max(dragStartH.current + delta, 80), 500)
      setTerminalHeight(newH)
    }
    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Landing / splash
  if (!sandbox) {
    return <SplashScreen onSandboxCreated={handleSandboxCreated} />
  }

  const { sandboxId, previewUrl, agentBase } = sandbox

  return (
    <div className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: '#070b14' }}>

      {/* Top bar */}
      <TopBar
        sandboxId={sandboxId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        status={status}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* File Explorer sidebar */}
        <FileExplorer
          agentBase={agentBase}
          activeFile={activeFile}
          onFileSelect={handleFileSelect}
          refreshKey={fileRefreshKey}
        />

        {/* Center — main content + terminal */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <PreviewFrame previewUrl={previewUrl} />
            ) : (
              <FileViewer agentBase={agentBase} filePath={activeFile} />
            )}
          </div>

          {/* Drag handle */}
          <div
            className="shrink-0 flex items-center justify-center cursor-row-resize select-none"
            style={{ height: '6px', background: '#0d1424', borderTop: '1px solid #1e2d45', borderBottom: '1px solid #1e2d45', zIndex: 10 }}
            onMouseDown={handleDragStart}
            title="Drag to resize terminal">
            <div className="w-12 h-0.5 rounded-full" style={{ background: '#2a3f60' }} />
          </div>

          {/* Terminal */}
          <div className="shrink-0 overflow-hidden" style={{ height: `${terminalHeight}px` }}>
            <Terminal sandboxId={sandboxId} />
          </div>
        </div>

        {/* Right — AI Chat */}
        <div className="shrink-0 overflow-hidden" style={{ width: '340px' }}>
          <AiChat
            sandboxId={sandboxId}
            onFilesChanged={handleFilesChanged}
          />
        </div>
      </div>
    </div>
  )
}
