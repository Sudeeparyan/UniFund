import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Sparkles, BookOpen, ChevronDown, RotateCcw, Minimize2 } from 'lucide-react'
import { sendChatMessage } from '../../services/api'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: Date
}

const quickPrompts = [
  { label: "How's my budget?", icon: '💰' },
  { label: "Cheapest groceries?", icon: '🥛' },
  { label: 'When to transfer?', icon: '💱' },
  { label: 'Student discounts', icon: '🎁' },
  { label: 'Dublin transport tips', icon: '🚌' },
  { label: 'My streak status', icon: '🔥' },
]

const WELCOME_MSG: Message = {
  id: 0,
  role: 'assistant',
  content:
    "Hey! I'm **Stash AI** 🤖 — your personal student finance assistant.\n\nI know your budget, spending habits, and Dublin inside out. Ask me anything!",
  timestamp: new Date(),
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for sidebar "AI Assistant" button
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-floating-chat', handler)
    return () => window.removeEventListener('open-floating-chat', handler)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now(), role: 'user', content: text.trim(), timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(text.trim())
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: res.response, sources: res.sources, timestamp: new Date() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: "Sorry, I couldn't process that right now. Please try again!", timestamp: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MSG])
    setInput('')
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let rendered = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-stash-text font-semibold">$1</strong>')
        .replace(/• /g, '<span class="text-stash-accent mr-1">•</span> ')
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  const messageCount = messages.filter(m => m.role === 'user').length

  return (
    <>
      {/* Backdrop overlay on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998] md:bg-black/20"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24, x: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24, x: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed z-[999] bottom-[6.5rem] right-3 md:bottom-6 md:right-6 w-[calc(100vw-1.5rem)] max-w-[400px] h-[75vh] max-h-[580px] flex flex-col rounded-2xl overflow-hidden border border-stash-border/60 bg-stash-dark/98 backdrop-blur-2xl"
            style={{
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.06), 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stash-border/40 bg-gradient-to-r from-stash-card/90 to-stash-card/70 backdrop-blur-xl">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shadow-lg shadow-stash-primary/25 ring-1 ring-white/10">
                  <Sparkles size={18} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-stash-success rounded-full ring-2 ring-stash-card" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold font-display leading-tight tracking-tight">Stash AI</div>
                <div className="text-[10px] text-stash-text-muted font-medium">
                  {loading ? (
                    <span className="text-stash-accent">Typing...</span>
                  ) : (
                    <span>Online · {messageCount} {messageCount === 1 ? 'message' : 'messages'}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg hover:bg-stash-elevated/60 transition-all group"
                  title="Clear chat"
                >
                  <RotateCcw size={14} className="text-stash-text-muted group-hover:text-stash-text transition-colors" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-stash-elevated/60 transition-all group"
                  title="Minimize"
                >
                  <Minimize2 size={14} className="text-stash-text-muted group-hover:text-stash-text transition-colors" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={idx > 0 ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] ${msg.role === 'user' ? '' : 'flex gap-2.5'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-stash-primary/20 ring-1 ring-white/10">
                        <Sparkles size={12} className="text-white" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-stash-accent to-stash-gold text-stash-dark rounded-br-sm shadow-md shadow-stash-accent/15 font-medium'
                            : 'bg-stash-card/80 border border-stash-border/40 rounded-bl-sm text-stash-text-secondary'
                        }`}
                      >
                        {renderMarkdown(msg.content)}
                      </div>
                      <div className={`flex items-center gap-1.5 px-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <span className="text-[9px] text-stash-text-muted/60 font-medium">
                          {formatTime(msg.timestamp)}
                        </span>
                        {msg.sources && msg.sources.length > 0 && (
                          <>
                            <span className="text-stash-text-muted/30">·</span>
                            <BookOpen size={8} className="text-stash-text-muted/50" />
                            <span className="text-[9px] text-stash-text-muted/50 font-medium">
                              {msg.sources.join(' · ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shrink-0 shadow-md shadow-stash-primary/20 ring-1 ring-white/10">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="bg-stash-card/80 border border-stash-border/40 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-stash-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-stash-accent/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-stash-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && (
              <div className="px-4 py-3 border-t border-stash-border/30">
                <div className="text-[10px] uppercase tracking-widest text-stash-text-muted/50 font-bold mb-2">Suggestions</div>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => send(prompt.label)}
                      className="px-3 py-1.5 rounded-full bg-stash-elevated/30 text-[11px] text-stash-text-secondary hover:bg-stash-accent/12 hover:text-stash-accent border border-stash-border/30 hover:border-stash-accent/20 transition-all font-medium flex items-center gap-1.5"
                    >
                      <span>{prompt.icon}</span>
                      <span>{prompt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-stash-border/40 bg-stash-card/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 bg-stash-elevated/30 border border-stash-border/40 rounded-xl px-3.5 py-2.5 focus-within:border-stash-accent/30 focus-within:bg-stash-elevated/50 transition-all duration-250">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send(input)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder-stash-text-muted/60 min-w-0 text-stash-text"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-lg bg-gradient-to-br from-stash-accent to-stash-gold text-stash-dark disabled:opacity-20 hover:shadow-lg hover:shadow-stash-accent/20 transition-all shrink-0 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </motion.button>
              </div>
              <div className="text-center mt-1.5">
                <span className="text-[9px] text-stash-text-muted/30 font-medium">Powered by UniFund AI</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed z-[999] bottom-[6.5rem] right-3 md:bottom-6 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-stash-accent via-stash-gold to-stash-accent-light ring-1 ring-stash-accent/30 cursor-pointer"
            style={{
              boxShadow: '0 8px 32px rgba(212,175,55,0.25), 0 2px 8px rgba(0,0,0,0.3)',
            }}
            aria-label="Chat with Stash AI"
          >
            <MessageSquare size={22} className="text-stash-dark" />

            {/* Unread badge */}
            {hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-stash-danger rounded-full ring-2 ring-stash-dark flex items-center justify-center"
              >
                <span className="text-[8px] font-bold text-white">1</span>
              </motion.span>
            )}

            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl animate-ping bg-stash-accent/20 pointer-events-none" style={{ animationDuration: '3s' }} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
