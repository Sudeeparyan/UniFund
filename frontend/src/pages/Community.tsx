import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ThumbsUp, ThumbsDown, MessageSquare, PlusCircle, Send, Sparkles } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getCommunityPosts, createCommunityPost, addCommunityComment, voteCommunityPost } from '../services/api'
import type { CommunityPost } from '../types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }

const intentColor = { OFFERING: 'success' as const, SEEKING: 'warning' as const, GENERAL: 'neutral' as const }
const intentEmoji = { OFFERING: '🟢', SEEKING: '🟡', GENERAL: '🔵' }
const filterOptions = ['All', 'OFFERING', 'SEEKING', 'GENERAL']

export default function Community() {
  const fetcher = useCallback(() => getCommunityPosts(), [])
  const { data, loading, refetch } = useApi(fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postIntent, setPostIntent] = useState<'OFFERING' | 'SEEKING' | 'GENERAL'>('GENERAL')
  const [postTags, setPostTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterIntent, setFilterIntent] = useState('All')
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [votedPosts, setVotedPosts] = useState<Record<string, 'up' | 'down'>>({})

  if (loading || !data) return <LoadingSkeleton count={4} />

  const filtered = filterIntent === 'All' ? data : data.filter((p: CommunityPost) => p.intent === filterIntent)

  const handleSubmitPost = async () => {
    if (!postContent.trim()) return
    setSubmitting(true)
    try {
      await createCommunityPost({
        author: 'Jaya D.',
        content: postContent,
        tags: postTags.split(',').map((t) => t.trim()).filter(Boolean),
        intent: postIntent,
      })
      setPostContent('')
      setPostTags('')
      setShowCreate(false)
      refetch()
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    try {
      await voteCommunityPost(postId, direction)
      setVotedPosts((prev) => ({ ...prev, [postId]: direction }))
      refetch()
    } catch { /* ignore */ }
  }

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) return
    try {
      await addCommunityComment(postId, { author: 'Jaya D.', content: commentText.trim() })
      setCommentText('')
      setCommentingOn(null)
      refetch()
    } catch { /* ignore */ }
  }

  const renderAIContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-stash-text">$1</strong>')
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stash-primary/10 flex items-center justify-center">
              <Users size={18} className="text-stash-primary" />
            </div>
            Community
          </h1>
          <p className="text-sm text-stash-text-secondary mt-1">
            Connect with fellow students in Dublin
            <span className="ml-2 text-stash-primary inline-flex items-center gap-1"><Sparkles size={12} className="inline" /> AI-powered matching</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3.5 py-2 rounded-xl bg-stash-primary/15 text-stash-primary text-sm font-medium hover:bg-stash-primary/25 transition-colors flex items-center gap-1.5 border border-stash-primary/20"
        >
          <PlusCircle size={16} /> Post
        </button>
      </motion.div>

      {/* AI Matchmaker Info Banner */}
      <motion.div variants={item}>
        <AiInsightCard feature="community" accentColor="stash-primary" compact />
      </motion.div>

      {/* Create Post Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="space-y-3.5">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind? Share deals, offer a sublet, seek a room..."
                className="w-full bg-stash-elevated/50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted resize-none min-h-[100px] border border-stash-border focus:border-stash-primary/40 transition-colors"
              />
              <div>
                <div className="text-xs text-stash-text-muted mb-1.5">What type of post?</div>
                <div className="flex gap-2">
                  {(['OFFERING', 'SEEKING', 'GENERAL'] as const).map((intent) => (
                    <button
                      key={intent}
                      onClick={() => setPostIntent(intent)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        postIntent === intent
                          ? intent === 'OFFERING' ? 'bg-stash-success/20 text-stash-success shadow-lg shadow-stash-success/10' : intent === 'SEEKING' ? 'bg-stash-warning/20 text-stash-warning shadow-lg shadow-stash-warning/10' : 'bg-stash-elevated text-stash-text shadow-lg'
                          : 'bg-stash-elevated/50 text-stash-text-secondary border border-stash-border hover:border-stash-primary/30'
                      }`}
                    >
                      {intentEmoji[intent]} {intent}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="Tags (comma-separated): accommodation, free, events"
                className="w-full bg-stash-elevated/50 rounded-xl px-4 py-2.5 text-xs outline-none placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-colors"
              />
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stash-elevated/50 text-sm text-stash-text-secondary hover:bg-stash-elevated border border-stash-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPost}
                  disabled={!postContent.trim() || submitting}
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-stash-primary to-stash-accent font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {submitting ? 'Posting... (AI analyzing)' : 'Post & Auto-Match'}
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intent Filter */}
      <motion.div variants={item}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterIntent(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterIntent === opt
                  ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20'
                  : 'bg-stash-elevated/60 text-stash-text-secondary border border-stash-border hover:border-stash-primary/30'
              }`}
            >
              {opt === 'All' ? `All (${data.length})` : `${intentEmoji[opt as keyof typeof intentEmoji] || ''} ${opt}`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Posts */}
      {filtered.map((post: CommunityPost) => (
        <motion.div key={post.id} variants={item}>
          <Card>
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stash-primary to-stash-secondary flex items-center justify-center text-xs font-bold shrink-0">
                {post.avatar}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{post.author}</div>
                <div className="text-xs text-stash-text-muted">{new Date(post.createdAt).toLocaleDateString()}</div>
              </div>
              <Badge variant={intentColor[post.intent]}>
                {intentEmoji[post.intent]} {post.intent}
              </Badge>
            </div>

            {/* Post Content */}
            <p className="text-sm text-stash-text-secondary mb-3 leading-relaxed">{post.content}</p>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-stash-elevated/50 px-2.5 py-0.5 rounded-full text-stash-text-muted border border-stash-border">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* AI Match Banner */}
            {post.aiMatch && (
              <div className="bg-gradient-to-r from-stash-primary/8 to-stash-accent/5 rounded-xl p-3 mb-3 border border-stash-primary/15">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-stash-primary" />
                  <span className="text-xs font-semibold text-stash-primary">AI Matchmaker</span>
                </div>
                <p className="text-sm text-stash-text-secondary">{post.aiMatch}</p>
              </div>
            )}

            {/* Comments */}
            {post.comments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {post.comments.map((c) => (
                  <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg ${
                    c.isAI ? 'bg-stash-primary/8 border border-stash-primary/15' : 'bg-stash-elevated/50'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      c.isAI ? 'bg-gradient-to-br from-stash-primary to-stash-accent' : 'bg-stash-elevated/60 border border-stash-border'
                    }`}>
                      {c.isAI ? <Sparkles size={10} className="text-white" /> : c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{c.author}</span>
                        {c.isAI && (
                          <Badge variant="primary" className="text-[9px]">AI</Badge>
                        )}
                        <span className="text-[10px] text-stash-text-muted">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-stash-text-secondary mt-0.5 leading-relaxed">
                        {renderAIContent(c.content)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-stash-border/60">
              <button
                onClick={() => handleVote(post.id, 'up')}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  votedPosts[post.id] === 'up' ? 'text-stash-success' : 'text-stash-text-muted hover:text-stash-success'
                }`}
              >
                <ThumbsUp size={14} /> {post.upvotes}
              </button>
              <button
                onClick={() => handleVote(post.id, 'down')}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  votedPosts[post.id] === 'down' ? 'text-stash-danger' : 'text-stash-text-muted hover:text-stash-danger'
                }`}
              >
                <ThumbsDown size={14} />
              </button>
              <button
                onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                className="flex items-center gap-1 text-xs text-stash-text-muted hover:text-stash-primary transition-colors"
              >
                <MessageSquare size={14} /> {post.comments.length} {post.comments.length === 1 ? 'reply' : 'replies'}
              </button>
            </div>

            {/* Inline Comment Input */}
            <AnimatePresence>
              {commentingOn === post.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-stash-border/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                      JD
                    </div>
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-stash-elevated/50 rounded-xl px-3 py-2 text-xs outline-none placeholder-stash-text-muted focus:ring-1 focus:ring-stash-primary/50 border border-stash-border focus:border-stash-primary/40 transition-colors"
                      autoFocus
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!commentText.trim()}
                      className="p-1.5 rounded-lg bg-stash-primary text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stash-text-muted">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>No posts in this category yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-stash-primary/15 text-stash-primary text-sm border border-stash-primary/20 hover:bg-stash-primary/25 transition-colors"
          >
            Be the first to post!
          </button>
        </div>
      )}
    </motion.div>
  )
}
