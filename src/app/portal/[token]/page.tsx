'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Task {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  dueDate: string | null
  completedAt: string | null
  assignedTo: string | null
}

interface FileRow {
  id: string
  fileName: string
  fileSize?: number
  storagePath: string
  uploadedBy: string
  uploadedAt: string
}

interface Comment {
  id: string
  author?: string
  authorName: string
  content: string
  createdAt: string
}

interface Engagement {
  id: string
  name: string
  status: string
  startDate: string | null
  targetEndDate: string | null
  tasks: Task[]
  files: FileRow[]
  comments: Comment[]
}

interface ClientData {
  id: string
  name: string
  engagements: Engagement[]
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPortalData = useCallback(async () => {
    try {
      const response = await fetch(`/api/portal/${encodeURIComponent(token)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load portal')
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portal')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPortalData()
  }, [fetchPortalData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Access Error</p>
          <p className="text-gray-600">{error || 'Invalid or expired link'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-gray-600 mt-1">Client Portal</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {data.engagements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No active engagements</p>
          </div>
        ) : (
          <div className="space-y-8">
            {data.engagements.map((engagement) => (
              <EngagementCard
                key={engagement.id}
                engagement={engagement}
                token={token}
                clientName={data.name}
                refresh={fetchPortalData}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EngagementCard({
  engagement,
  token,
  clientName,
  refresh,
}: {
  engagement: Engagement
  token: string
  clientName: string
  refresh: () => void | Promise<void>
}) {
  const pendingTasks = engagement.tasks.filter((t) => t.status !== 'completed')
  const completedTasks = engagement.tasks.filter((t) => t.status === 'completed')

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">{engagement.name}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          engagement.status === 'completed' ? 'bg-green-100 text-green-800' :
          engagement.status === 'on_hold' || engagement.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
          engagement.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {engagement.status.replace(/[_-]/g, ' ')}
        </span>
      </div>

      {engagement.startDate && (
        <p className="text-sm text-gray-600 mb-4">
          Started: {new Date(engagement.startDate).toLocaleDateString()}
          {engagement.targetEndDate && ` • Target: ${new Date(engagement.targetEndDate).toLocaleDateString()}`}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Tasks</h3>
          {pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">All tasks completed!</p>
          )}
          {completedTasks.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">
                {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Files Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Files</h3>
          {engagement.files.length > 0 ? (
            <div className="space-y-2">
              {engagement.files.slice(0, 5).map((file) => (
                <a
                  key={file.id}
                  href={file.storagePath}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{file.fileName}</span>
                </a>
              ))}
              {engagement.files.length > 5 && (
                <p className="text-sm text-gray-500">+{engagement.files.length - 5} more files</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No files uploaded</p>
          )}
        </div>
      </div>

      {/* Messages Section — always shown so clients can start a thread */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Messages</h3>
        {engagement.comments.length > 0 ? (
          <div className="space-y-3 mb-4">
            {engagement.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded p-3">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {comment.authorName} • {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">No messages yet — say hello below.</p>
        )}
        <MessageForm
          engagementId={engagement.id}
          token={token}
          defaultAuthor={clientName}
          onSent={refresh}
        />
      </div>
    </div>
  )
}

function MessageForm({
  engagementId,
  token,
  defaultAuthor,
  onSent,
}: {
  engagementId: string
  token: string
  defaultAuthor: string
  onSent: () => void | Promise<void>
}) {
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState(defaultAuthor)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          authorName: authorName || defaultAuthor,
          content,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }
      setContent('')
      await onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className="space-y-2">
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Your name"
        className="w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message…"
        rows={3}
        className="w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}

function TaskItem({ task }: { task: Task }) {
  const isCompleted = task.status === 'completed'

  return (
    <div className={`flex items-start p-3 rounded border ${
      isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
    }`}>
      <input
        type="checkbox"
        checked={isCompleted}
        readOnly
        className="mt-1 h-4 w-4 text-blue-600 rounded"
      />
      <div className="ml-3 flex-1">
        <p className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className="text-xs text-gray-500 mt-1">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
