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

interface ServiceRequest {
  id: string
  title: string
  description: string | null
  submittedBy: string
  status: string
  linearIssueId: string | null
  linearIssueUrl: string | null
  createdAt: string
}

interface LinearIssue {
  id: string
  identifier: string
  title: string
  url: string
  priority: number | null
  stateName: string
  stateType: string
  labels: string[]
}

interface Engagement {
  id: string
  name: string
  status: string
  startDate: string | null
  targetEndDate: string | null
  linearProjectConnected?: boolean
  tasks: Task[]
  files: FileRow[]
  comments: Comment[]
  serviceRequests?: ServiceRequest[]
  linearIssues?: LinearIssue[]
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
        {/* Left column: client action items + live "what we're working on" from Linear */}
        <div className="space-y-5">
          <ClientActionList
            tasks={engagement.tasks.filter((t) => t.type === 'client_action')}
            token={token}
            onChange={refresh}
          />
          <LinearWorkList issues={engagement.linearIssues ?? []} />
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

      {/* Service Requests — submit new asks that route to Linear */}
      <RequestsSection
        engagement={engagement}
        token={token}
        clientName={clientName}
        refresh={refresh}
      />

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

function RequestsSection({
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
  const [showForm, setShowForm] = useState(false)
  const requests = engagement.serviceRequests ?? []
  const canSubmit = engagement.linearProjectConnected !== false

  return (
    <div className="mt-6 pt-6 border-t">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-900">Requests</h3>
        {canSubmit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        )}
      </div>

      {!canSubmit && (
        <p className="text-sm text-gray-500 mb-3">
          New request submission isn&apos;t set up for this engagement yet.
        </p>
      )}

      {canSubmit && showForm && (
        <div className="mb-4">
          <RequestForm
            engagementId={engagement.id}
            token={token}
            defaultAuthor={clientName}
            onSent={async () => { setShowForm(false); await refresh() }}
          />
        </div>
      )}

      {requests.length > 0 ? (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-start gap-3 text-sm bg-gray-50 rounded p-3">
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                r.status === 'completed' ? 'bg-green-100 text-green-800' :
                r.status === 'in_progress' || r.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {r.status.replace(/[_-]/g, ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{r.title}</div>
                {r.description && (
                  <div className="text-xs text-gray-600 whitespace-pre-wrap mt-1">{r.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {r.submittedBy} • {new Date(r.createdAt).toLocaleString()}
                  {r.linearIssueId && ' • '}
                  {r.linearIssueId && (
                    r.linearIssueUrl
                      ? <a href={r.linearIssueUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.linearIssueId}</a>
                      : <span>{r.linearIssueId}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        canSubmit && !showForm && (
          <p className="text-sm text-gray-500">No requests yet.</p>
        )
      )}
    </div>
  )
}

function RequestForm({
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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submittedBy, setSubmittedBy] = useState(defaultAuthor)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          title,
          description,
          submittedBy: submittedBy || defaultAuthor,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }
      setTitle('')
      setDescription('')
      await onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className="bg-gray-50 rounded p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Your name</label>
        <input
          type="text"
          value={submittedBy}
          onChange={(e) => setSubmittedBy(e.target.value)}
          className="w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">What do you need?</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary…"
          className="w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Details (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any context, deadlines, or links."
          rows={3}
          className="w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </form>
  )
}

function ClientActionList({
  tasks,
  token,
  onChange,
}: {
  tasks: Task[]
  token: string
  onChange: () => void | Promise<void>
}) {
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  async function toggle(task: Task) {
    if (busyIds.has(task.id)) return
    setBusyIds((s) => new Set(s).add(task.id))
    try {
      const targetCompleted = task.status !== 'completed'
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: targetCompleted }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Couldn't update: ${err.error || res.status}`)
      }
      await onChange()
    } finally {
      setBusyIds((s) => {
        const next = new Set(s)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-3">Your action items</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm">Nothing on your plate right now.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const isCompleted = t.status === 'completed'
            const busy = busyIds.has(t.id)
            return (
              <li
                key={t.id}
                className={`flex items-start p-3 rounded border ${
                  isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  disabled={busy}
                  onChange={() => toggle(t)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded cursor-pointer disabled:cursor-wait"
                />
                <div className="ml-3 flex-1">
                  <p
                    className={`text-sm ${
                      isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{t.description}</p>
                  )}
                  {t.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(t.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Renders the live mirror of Linear issues for this engagement's project.
// Issues labeled "Internal" are filtered out server-side, so anything that
// reaches us here is fair game to show. We surface anything in-progress at
// the top, with the rest collapsed underneath.
function LinearWorkList({ issues }: { issues: LinearIssue[] }) {
  if (issues.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">What we&apos;re working on</h3>
        <p className="text-gray-500 text-sm">Nothing active on our side right now.</p>
      </div>
    )
  }

  // Active = started; Upcoming = backlog/unstarted/triage; we don't render
  // completed/canceled separately because the API already filters them out.
  const active = issues.filter((i) => i.stateType === 'started')
  const upcoming = issues.filter((i) => i.stateType !== 'started')

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-3">What we&apos;re working on</h3>

      {active.length > 0 && (
        <ul className="space-y-2 mb-3">
          {active.map((i) => (
            <LinearIssueRow key={i.id} issue={i} prominent />
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <details className="text-sm" open={active.length === 0}>
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 select-none">
            {active.length > 0 ? `Upcoming (${upcoming.length})` : `Queued up (${upcoming.length})`}
          </summary>
          <ul className="space-y-2 mt-2">
            {upcoming.map((i) => (
              <LinearIssueRow key={i.id} issue={i} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function LinearIssueRow({ issue, prominent = false }: { issue: LinearIssue; prominent?: boolean }) {
  const isStarted = issue.stateType === 'started'
  const badge =
    isStarted
      ? 'bg-yellow-100 text-yellow-800'
      : issue.stateType === 'backlog'
      ? 'bg-gray-100 text-gray-700'
      : 'bg-blue-100 text-blue-800'

  return (
    <li
      className={`flex items-start gap-3 p-3 rounded border ${
        prominent ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${badge}`}>
        {issue.stateName}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{issue.title}</p>
      </div>
    </li>
  )
}
