'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Logo from '@/components/Logo'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'

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

const inputCls =
  'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40'
const primaryBtnCls =
  'inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryBtnCls =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50'

export default function PortalPage() {
  const params = useParams()
  // useParams() returns the URL-encoded segment (colons arrive as %3A);
  // decode before use so encodeURIComponent in fetch paths doesn't double-encode.
  const token = decodeURIComponent(params.token as string)
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-[#F5A623]"></div>
          <p className="text-sm text-neutral-500">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <Logo size="md" theme="light" />
          </div>
          <p className="mb-1 text-lg font-bold tracking-tight text-neutral-900">
            Access error
          </p>
          <p className="text-sm text-neutral-500">
            {error || 'Invalid or expired link'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-[#0D0D0D]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo size="md" theme="dark" />
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Client portal
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {data.name}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {data.engagements.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-neutral-400">No active engagements</p>
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
    <Card className="p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {engagement.name}
        </h2>
        <StatusBadge status={engagement.status} />
      </div>

      {engagement.startDate && (
        <p className="mb-6 text-sm text-neutral-500">
          Started: {new Date(engagement.startDate).toLocaleDateString()}
          {engagement.targetEndDate && ` · Target: ${new Date(engagement.targetEndDate).toLocaleDateString()}`}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left column: client action items + live "what we're working on" from Linear */}
        <div className="space-y-8">
          <ClientActionList
            tasks={engagement.tasks.filter((t) => t.type === 'client_action')}
            token={token}
            onChange={refresh}
          />
          <LinearWorkList issues={engagement.linearIssues ?? []} />
        </div>

        {/* Files Section */}
        <div>
          <h3 className="mb-3 text-base font-semibold text-neutral-900">Files</h3>
          {engagement.files.length > 0 ? (
            <div className="space-y-1">
              {engagement.files.slice(0, 5).map((file) => (
                <a
                  key={file.id}
                  href={file.storagePath}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center rounded-lg px-2 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
                >
                  <svg className="mr-2.5 h-4 w-4 shrink-0 text-neutral-400 transition group-hover:text-[#F5A623]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate font-medium group-hover:text-neutral-900">{file.fileName}</span>
                </a>
              ))}
              {engagement.files.length > 5 && (
                <p className="px-2 pt-1 text-sm text-neutral-400">+{engagement.files.length - 5} more files</p>
              )}
            </div>
          ) : (
            <EmptyState>No files uploaded yet</EmptyState>
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
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <h3 className="mb-4 text-base font-semibold text-neutral-900">Messages</h3>
        {engagement.comments.length > 0 ? (
          <div className="mb-5 flex flex-col gap-3">
            {engagement.comments.map((comment) => {
              const isAdmin = comment.author === 'internal'
              return (
                <div
                  key={comment.id}
                  className={`max-w-[88%] rounded-lg border p-3 sm:max-w-[75%] ${
                    isAdmin
                      ? 'self-end border-amber-200 bg-amber-50'
                      : 'self-start border-neutral-200 bg-white shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm text-neutral-900">{comment.content}</p>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    {comment.authorName} · {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mb-5 text-sm text-neutral-400">No messages yet — say hello below.</p>
        )}
        <MessageForm
          engagementId={engagement.id}
          token={token}
          defaultAuthor={clientName}
          onSent={refresh}
        />
      </div>
    </Card>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center">
      <span className="mb-1.5 block h-1.5 w-1.5 rounded-full bg-neutral-300" aria-hidden="true" />
      <p className="text-sm text-neutral-400">{children}</p>
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
    <form onSubmit={send} className="space-y-2.5">
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Your name"
        className={inputCls}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message…"
        rows={3}
        className={inputCls}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className={primaryBtnCls}
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
    <div className="mt-8 border-t border-neutral-200 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900">Requests</h3>
        {canSubmit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? secondaryBtnCls : primaryBtnCls}
          >
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        )}
      </div>

      {!canSubmit && (
        <p className="mb-3 text-sm text-neutral-400">
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
            <li key={r.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm">
              <StatusBadge status={r.status} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-900">{r.title}</div>
                {r.description && (
                  <div className="mt-1 whitespace-pre-wrap text-xs text-neutral-500">{r.description}</div>
                )}
                <div className="mt-1.5 text-xs text-neutral-400">
                  {r.submittedBy} · {new Date(r.createdAt).toLocaleString()}
                  {r.linearIssueId && ' · '}
                  {r.linearIssueId && (
                    r.linearIssueUrl
                      ? <a href={r.linearIssueUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-600 hover:underline">{r.linearIssueId}</a>
                      : <span className="font-mono">{r.linearIssueId}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        canSubmit && !showForm && (
          <EmptyState>No requests yet — need something? Submit one above.</EmptyState>
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
    <form onSubmit={send} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-900">New request</p>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-700">Your name</label>
        <input
          type="text"
          value={submittedBy}
          onChange={(e) => setSubmittedBy(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-700">What do you need?</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary…"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-700">Details (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any context, deadlines, or links."
          rows={3}
          className={inputCls}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !title.trim()}
          className={primaryBtnCls}
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
      <h3 className="mb-3 text-base font-semibold text-neutral-900">Your action items</h3>
      {tasks.length === 0 ? (
        <EmptyState>Nothing on your plate right now.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const isCompleted = t.status === 'completed'
            const busy = busyIds.has(t.id)
            return (
              <li
                key={t.id}
                className={`flex items-start rounded-lg border p-3 transition ${
                  isCompleted
                    ? 'border-neutral-200 bg-neutral-50'
                    : 'border-neutral-200 bg-white shadow-sm hover:bg-neutral-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  disabled={busy}
                  onChange={() => toggle(t)}
                  className="checkbox-brand mt-0.5"
                />
                <div className="ml-3 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-900'
                    }`}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-500">{t.description}</p>
                  )}
                  {t.dueDate && (
                    <p className="mt-1 text-xs text-neutral-400">
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

// Maps a Linear workflow state type to an indicator dot color.
function stateDotColor(stateType: string) {
  switch (stateType) {
    case 'started':
      return 'bg-[#F5A623]'
    case 'backlog':
      return 'bg-neutral-300'
    case 'completed':
      return 'bg-green-500'
    case 'canceled':
      return 'bg-red-400'
    default:
      return 'bg-blue-400' // unstarted / triage
  }
}

// Renders the live mirror of Linear issues for this engagement's project.
// Issues labeled "Internal" are filtered out server-side, so anything that
// reaches us here is fair game to show. We surface anything in-progress at
// the top, with the rest collapsed underneath.
function LinearWorkList({ issues }: { issues: LinearIssue[] }) {
  if (issues.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-base font-semibold text-neutral-900">What we&apos;re working on</h3>
        <EmptyState>Nothing active on our side right now.</EmptyState>
      </div>
    )
  }

  // Active = started; Upcoming = backlog/unstarted/triage; we don't render
  // completed/canceled separately because the API already filters them out.
  const active = issues.filter((i) => i.stateType === 'started')
  const upcoming = issues.filter((i) => i.stateType !== 'started')

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-neutral-900">What we&apos;re working on</h3>

      {active.length > 0 && (
        <ul className="mb-3 space-y-2">
          {active.map((i) => (
            <LinearIssueRow key={i.id} issue={i} prominent />
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <details className="text-sm" open={active.length === 0}>
          <summary className="cursor-pointer select-none text-sm font-medium text-neutral-500 transition hover:text-neutral-900">
            {active.length > 0 ? `Upcoming (${upcoming.length})` : `Queued up (${upcoming.length})`}
          </summary>
          <ul className="mt-2 space-y-2">
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
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        prominent ? 'border-neutral-200 bg-white shadow-sm' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${stateDotColor(issue.stateType)}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{issue.title}</p>
        <p className="mt-0.5 text-xs text-neutral-400">{issue.stateName}</p>
      </div>
    </li>
  )
}
