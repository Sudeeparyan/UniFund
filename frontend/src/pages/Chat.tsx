import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, BookOpen } from 'lucide-react'
import { sendChatMessage } from '../services/api'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

const quickPrompts = [
  { label: "How's my budget?", icon: "💰" },
  { label: "How do I apply for IRP?", icon: "🪪" },
  { label: "Where's the cheapest milk?", icon: "🥛" },
  { label: "When should I transfer money?", icon: "💱" },
  { label: "Transport tips in Dublin", icon: "🚌" },
  { label: "Show me student discounts", icon: "🎁" },
  { label: "How to find accommodation?", icon: "🏠" },
  { label: "Tell me about my streak", icon: "🔥" },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content:
        "Hey! I'm **Stash AI** 🤖 — your student finance buddy.\n\nI know your budget, spending habits, and Dublin inside out. Ask me anything about:\n\n• 💰 Your finances & budget\n• 🏙️ Dublin living tips\n• 🛒 Grocery prices\n• 💱 Exchange rates\n• 🎁 Student discounts",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now(), role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(text.trim())
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: res.response, sources: res.sources },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: "Sorry, I couldn't process that. Try again!" },
      ])
    } finally {
      setLoading(false)
    }
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-stash-text font-semibold">$1</strong>')
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] max-w-3xl mx-auto -my-5 -mx-4 md:-mx-8">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-stash-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shadow-lg shadow-stash-primary/20">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold font-display">Stash AI</div>
          <div className="text-[11px] text-stash-success flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-stash-success animate-pulse" />
            Online — Knows your finances
          </div>
        </div>
        <div className="text-[11px] text-stash-text-muted bg-stash-elevated px-2.5 py-1 rounded-lg font-medium">
          {messages.length - 1} messages
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? '' : 'flex gap-2.5'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shrink-0 mt-1 shadow-md shadow-stash-primary/15">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-stash-primary to-stash-primary-light text-white rounded-br-md shadow-lg shadow-stash-primary/20'
                        : 'bg-stash-card border border-stash-border rounded-bl-md text-stash-text-secondary'
                    }`}
                  >
                    {renderMarkdown(msg.content)}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 px-1">
                      <BookOpen size={10} className="text-stash-text-muted" />
                      <span className="text-[10px] text-stash-text-muted font-medium">
                        Sources: {msg.sources.join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shrink-0 shadow-md shadow-stash-primary/15">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-stash-card border border-stash-border rounded-2xl rounded-bl-md px-4 py-3.5">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-stash-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-stash-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-stash-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 md:px-6 py-3 border-t border-stash-border/50">
          <div className="text-[11px] text-stash-text-muted mb-2.5 font-semibold uppercase tracking-wider">Try asking</div>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => send(prompt.label)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-stash-card text-xs text-stash-text-secondary hover:bg-stash-primary/10 hover:text-stash-primary hover:border-stash-primary/20 border border-stash-border transition-all flex items-center gap-2.5 font-medium"
              >
                <span className="text-base">{prompt.icon}</span>
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 md:px-6 border-t border-stash-border">
        <div className="flex items-center gap-2.5 bg-stash-card border border-stash-border rounded-2xl px-4 py-2.5 shadow-card">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask anything about your finances, Dublin, or student life..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-stash-text-muted"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-gradient-to-br from-stash-primary to-stash-accent text-white disabled:opacity-30 hover:shadow-lg hover:shadow-stash-primary/25 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
