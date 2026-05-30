import { useState, useRef, useEffect, useCallback } from 'react'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#22d3ee',
            animation: 'typing-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} />
      ))}
    </div>
  )
}

function ActivityLog({ lines }) {
  if (!lines.length) return null
  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e2d45' }}>
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-1"
          style={{ borderBottom: i < lines.length - 1 ? '1px solid rgba(30,45,69,0.5)' : 'none' }}>
          <span className="text-xs shrink-0 mt-px" style={{ color: '#475569' }}>
            {line.type === 'reading' ? '📖' : line.type === 'updating' ? '✏️' : line.type === 'success' ? '✅' : '💬'}
          </span>
          <span className="text-xs font-mono break-all" style={{ color: '#64748b' }}>{line.text}</span>
        </div>
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg shrink-0 mr-2 flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(8,145,178,0.1))', border: '1px solid rgba(34,211,238,0.3)', marginTop: '2px' }}>
          ✦
        </div>
      )}
      <div className="max-w-[85%]">
        <div className="px-3 py-2 rounded-xl text-sm leading-relaxed"
          style={isUser ? {
            background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(8,145,178,0.08))',
            border: '1px solid rgba(34,211,238,0.25)',
            color: '#e2e8f0',
            borderBottomRightRadius: '4px'
          } : {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #1e2d45',
            color: '#cbd5e1',
            borderBottomLeftRadius: '4px'
          }}>
          {msg.content}
        </div>
        {msg.activity && msg.activity.length > 0 && (
          <ActivityLog lines={msg.activity} />
        )}
        <div className="text-xs mt-1 px-1" style={{ color: '#334155' }}>
          {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function parseActivityLine(line) {
  if (!line.trim()) return null
  if (line.startsWith('Reading files')) return { type: 'reading', text: line }
  if (line.startsWith('Updating files')) return { type: 'updating', text: line }
  if (line.toLowerCase().includes('success')) return { type: 'success', text: line }
  return { type: 'info', text: line }
}

export default function AiChat({ sandboxId, onFilesChanged }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can modify your sandbox project. Describe what you want to build or change, and I\'ll update the code for you.',
      activity: [],
      time: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || !sandboxId) return

    setInput('')
    setStreaming(true)

    const userMsg = { role: 'user', content: text, activity: [], time: Date.now() }
    setMessages(prev => [...prev, userMsg])

    // Add placeholder AI message
    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', activity: [], time: Date.now(), pending: true }])

    let aiContent = ''
    let activityLines = []

    try {
      // Use fetch with SSE manually
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, projectId: sandboxId })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateMsg = () => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: aiContent || '…', activity: [...activityLines], pending: !aiContent }
            : m
        ))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = parseActivityLine(line)
          if (parsed) {
            activityLines = [...activityLines, parsed]
            // If looks like final AI text response
            if (parsed.type === 'info' && line.length > 30) {
              aiContent = line
            }
          }
          updateMsg()
        }
      }

      // If no textual content came through, construct a summary
      if (!aiContent) {
        const updates = activityLines.filter(l => l.type === 'success')
        aiContent = updates.length
          ? 'Done! Files have been updated successfully.'
          : 'Changes applied to your project.'
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: aiContent, activity: activityLines, pending: false }
          : m
      ))

      // Trigger file explorer refresh
      onFilesChanged?.()
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Error: ${err.message}`, activity: activityLines, pending: false }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, sandboxId, onFilesChanged])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full"
      style={{ background: '#0d1424', borderLeft: '1px solid #1e2d45' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid #1e2d45' }}>
        <div className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(8,145,178,0.1))', border: '1px solid rgba(34,211,238,0.3)' }}>
          ✦
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>AI Assistant</h2>
          <p className="text-xs" style={{ color: '#475569' }}>Powered by Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span className="text-xs" style={{ color: '#475569' }}>Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i}>
            {msg.pending && !msg.content ? (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg shrink-0 mr-2 flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(8,145,178,0.1))', border: '1px solid rgba(34,211,238,0.3)', marginTop: '2px' }}>
                  ✦
                </div>
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d45' }}>
                  <TypingIndicator />
                  {msg.activity && msg.activity.length > 0 && <ActivityLog lines={msg.activity} />}
                </div>
              </div>
            ) : (
              <Message msg={msg} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3 pt-2"
        style={{ borderTop: '1px solid #1e2d45' }}>
        <div className="flex items-end gap-2 rounded-xl p-2"
          style={{
            background: '#070b14',
            border: '1px solid #1e2d45',
            transition: 'border-color 0.2s'
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = '#1e2d45'}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sandboxId ? 'Describe what you want to build…' : 'Create a sandbox first…'}
            disabled={!sandboxId || streaming}
            rows={1}
            className="flex-1 resize-none text-sm outline-none bg-transparent"
            style={{
              color: '#e2e8f0',
              caretColor: '#22d3ee',
              maxHeight: '120px',
              lineHeight: '1.5',
              fontFamily: 'inherit'
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !sandboxId || streaming}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={{
              background: input.trim() && sandboxId && !streaming
                ? 'linear-gradient(135deg, #22d3ee, #0891b2)'
                : 'rgba(255,255,255,0.06)',
              color: input.trim() && sandboxId && !streaming ? '#070b14' : '#334155',
              boxShadow: input.trim() && sandboxId && !streaming ? '0 0 15px rgba(34,211,238,0.3)' : 'none'
            }}>
            {streaming ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent"
                style={{ borderColor: '#22d3ee', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: '#334155' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
