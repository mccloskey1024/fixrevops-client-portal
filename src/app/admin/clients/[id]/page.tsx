'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import Card from '@/components/Card'

type Task = {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  dueDate: string | null
  assignedTo: string | null
  completedAt: string | null
}

type FileRow = {
  id: string
  fileName: string
  fileSize: number
  mimeType: string | null
  uploadedBy: string
  storageProvider: string
  storagePath: string
  uploadedAt: string
}

type Comment = {
  id: string
  author: string
  authorName: string
  content: string
  isInternal: boolean
  createdAt: string
}

type Engagement = {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  targetEndDate: string | null
  hubspotPortalId: string | null
  linearProjectId: string | null
  tasks: Task[]
  files: FileRow[]
  comments: Comment[]
}

type Client = {
  id: string
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string | null
  magicLinkToken: string
  magicLinkExpiresAt: string
  magicLink: string
  engagements: Engagement[]
}

type LinearIssue = {
  id: string
  identifier: string
  title: string
  url: string
  priority: number | null
  stateName: string
  stateType: string
  labels: string[]
}

const STATUS_OPTIONS = ['planning', 'active', 'on-hold', 'completed', 'cancelled']
const TASK_STATUS_OPTIONS = ['pending', 'in-progress', 'completed']

const inputCls =
  'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40'
const labelCls = 'mb-1.5 block text-sm font-medium text-neutral-700'
const primaryBtnCls =
  'inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'
const panelTitleCls = 'text-xs font-semibold uppercase tracking-wider text-neutral-500'

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

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewEngagement, setShowNewEngagement] = useState(false)
  const [newEngagement, setNewEngagement] = useState({
    name: '',
    description: '',
    status: 'planning',
    startDate: '',
    targetEndDate: '',
    linearProjectId: '',
  })

  useEffect(() => {
    refresh()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    try {
      const r = await fetch(`/api/admin/clients/${id}`)
      if (r.ok) setClient(await r.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function createEngagement(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin/engagements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newEngagement, clientId: id }),
    })
    if (r.ok) {
      setNewEngagement({ name: '', description: '', status: 'planning', startDate: '', targetEndDate: '', linearProjectId: '' })
      setShowNewEngagement(false)
      refresh()
    } else {
      const err = await r.json().catch(() => ({}))
      alert(`Error: ${err.error || 'failed'}`)
    }
  }

  async function updateEngagementStatus(eid: string, status: string) {
    const r = await fetch(`/api/admin/engagements/${eid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await r.json().catch(() => null)
    if (data?.hubspotSync?.attempted && !data.hubspotSync.ok) {
      alert(`Status saved, but HubSpot deal sync failed:\n${data.hubspotSync.error || 'Unknown error'}`)
    }
    refresh()
  }

  async function deleteEngagement(eid: string) {
    if (!confirm('Delete engagement and all its tasks/files/comments? This cannot be undone.')) return
    await fetch(`/api/admin/engagements/${eid}`, { method: 'DELETE' })
    refresh()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-[#F5A623]"></div>
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      </div>
    )
  }
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Client not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Logo size="md" theme="dark" />
              <nav className="flex items-center gap-4">
                <a href="/admin" className="text-sm font-medium text-neutral-400 transition hover:text-white">
                  ← Clients
                </a>
              </nav>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(client.magicLink)
                alert('Magic link copied to clipboard.')
              }}
              className="inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Copy Magic Link
            </button>
          </div>
          <div className="mt-4 pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{client.name}</h1>
            <div className="mt-1 text-sm text-neutral-400">
              {client.primaryContactName} · {client.primaryContactEmail}
              {client.primaryContactPhone && <> · {client.primaryContactPhone}</>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Engagements</h2>
          <button
            onClick={() => setShowNewEngagement((v) => !v)}
            className={
              showNewEngagement
                ? 'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50'
                : primaryBtnCls
            }
          >
            {showNewEngagement ? 'Cancel' : '+ New Engagement'}
          </button>
        </div>

        {showNewEngagement && (
          <Card className="p-6">
            <form onSubmit={createEngagement} className="space-y-5">
              <h3 className="text-lg font-bold tracking-tight text-neutral-900">New Engagement</h3>
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  required
                  value={newEngagement.name}
                  onChange={(e) => setNewEngagement({ ...newEngagement, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={newEngagement.description}
                  onChange={(e) => setNewEngagement({ ...newEngagement, description: e.target.value })}
                  className={inputCls}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={newEngagement.status}
                    onChange={(e) => setNewEngagement({ ...newEngagement, status: e.target.value })}
                    className={inputCls}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input
                    type="date"
                    value={newEngagement.startDate}
                    onChange={(e) => setNewEngagement({ ...newEngagement, startDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Target End Date</label>
                  <input
                    type="date"
                    value={newEngagement.targetEndDate}
                    onChange={(e) => setNewEngagement({ ...newEngagement, targetEndDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  Linear Project ID <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newEngagement.linearProjectId}
                  onChange={(e) => setNewEngagement({ ...newEngagement, linearProjectId: e.target.value })}
                  placeholder="e.g. abc123-def456-..."
                  className={inputCls}
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  Paste a Linear project ID here to enable client-submitted service requests on this engagement.
                </p>
              </div>
              <button type="submit" className={primaryBtnCls}>
                Create Engagement
              </button>
            </form>
          </Card>
        )}

        {client.engagements.length === 0 && !showNewEngagement && (
          <Card className="p-10 text-center">
            <span className="mx-auto mb-2 block h-1.5 w-1.5 rounded-full bg-neutral-300" aria-hidden="true" />
            <p className="text-sm text-neutral-400">
              No engagements yet. Click <strong className="font-semibold text-neutral-600">+ New Engagement</strong> to add one.
            </p>
          </Card>
        )}

        {client.engagements.map((e) => (
          <EngagementCard
            key={e.id}
            engagement={e}
            onStatusChange={(s) => updateEngagementStatus(e.id, s)}
            onDelete={() => deleteEngagement(e.id)}
            onChange={refresh}
          />
        ))}
      </main>
    </div>
  )
}

function EngagementCard({
  engagement,
  onStatusChange,
  onDelete,
  onChange,
}: {
  engagement: Engagement
  onStatusChange: (s: string) => void
  onDelete: () => void
  onChange: () => void
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-neutral-900">{engagement.name}</h3>
          {engagement.description && <p className="mt-1 text-sm text-neutral-500">{engagement.description}</p>}
          <div className="mt-2 text-xs text-neutral-400">
            {engagement.startDate && <>Start: {new Date(engagement.startDate).toLocaleDateString()} · </>}
            {engagement.targetEndDate && <>Target end: {new Date(engagement.targetEndDate).toLocaleDateString()}</>}
          </div>
          <LinearProjectIdEditor engagement={engagement} onChange={onChange} />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={engagement.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 shadow-sm transition focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-2">
        <TasksPanel engagement={engagement} onChange={onChange} scope="client_action" />
        <LinearIssuesPanel engagement={engagement} />
        <FilesPanel engagement={engagement} onChange={onChange} />
        <CommentsPanel engagement={engagement} onChange={onChange} />
      </div>
    </Card>
  )
}

function LinearProjectIdEditor({
  engagement,
  onChange,
}: {
  engagement: Engagement
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(engagement.linearProjectId || '')

  async function save() {
    await fetch(`/api/admin/engagements/${engagement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linearProjectId: value.trim() || null }),
    })
    setEditing(false)
    onChange()
  }

  if (!editing) {
    return (
      <div className="mt-1 text-xs text-neutral-400">
        Linear project: {engagement.linearProjectId
          ? <code className="font-mono text-neutral-600">{engagement.linearProjectId.slice(0, 8)}…</code>
          : <span className="text-neutral-400">not connected</span>}
        {' · '}
        <button onClick={() => setEditing(true)} className="font-medium text-amber-600 hover:underline">
          {engagement.linearProjectId ? 'change' : 'connect'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Linear project ID"
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 shadow-sm transition focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
        autoFocus
      />
      <button onClick={save} className="text-xs font-medium text-amber-600 hover:underline">Save</button>
      <button onClick={() => { setEditing(false); setValue(engagement.linearProjectId || '') }} className="text-xs text-neutral-500 hover:underline">Cancel</button>
    </div>
  )
}

function TasksPanel({
  engagement,
  onChange,
  scope,
}: {
  engagement: Engagement
  onChange: () => void
  scope: 'client_action'
}) {
  const [newTitle, setNewTitle] = useState('')
  const tasks = engagement.tasks.filter((t) => t.type === 'client_action')
  void scope

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engagementId: engagement.id,
        title: newTitle,
        type: 'client_action',
      }),
    })
    setNewTitle('')
    onChange()
  }

  async function toggleTask(t: Task) {
    const next = t.status === 'completed' ? 'pending' : 'completed'
    await fetch(`/api/admin/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    onChange()
  }

  async function deleteTask(t: Task) {
    if (!confirm(`Delete task "${t.title}"?`)) return
    await fetch(`/api/admin/tasks/${t.id}`, { method: 'DELETE' })
    onChange()
  }

  return (
    <div>
      <h4 className={`${panelTitleCls} mb-3`}>
        Client action items ({tasks.length})
      </h4>
      <ul className="mb-3 space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="group flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={t.status === 'completed'}
              onChange={() => toggleTask(t)}
              className="checkbox-brand mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className={t.status === 'completed' ? 'text-neutral-400 line-through' : 'font-medium text-neutral-900'}>
                {t.title}
              </div>
              {t.dueDate && <div className="text-xs text-neutral-400">Due {new Date(t.dueDate).toLocaleDateString()}</div>}
            </div>
            <button
              onClick={() => deleteTask(t)}
              className="shrink-0 rounded px-1.5 text-sm text-neutral-300 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
              aria-label={`Delete task ${t.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addTask} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New client task…"
          className={`${inputCls} flex-1`}
        />
        <button type="submit" className={primaryBtnCls}>Add</button>
      </form>
    </div>
  )
}

// Live mirror of an engagement's Linear project for admin view.
// Unlike the client portal, admin sees ALL active issues — including ones
// labeled "Internal" and any [ClientName]-prefixed mirrors of service requests.
// An "Internal" badge marks the ones that are hidden from the client.
function LinearIssuesPanel({ engagement }: { engagement: Engagement }) {
  const [issues, setIssues] = useState<LinearIssue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState<boolean>(Boolean(engagement.linearProjectId))

  const load = useCallback(async () => {
    if (!engagement.linearProjectId) {
      setConnected(false)
      setIssues([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/engagements/${engagement.id}/linear-issues`)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `Failed (${r.status})`)
      }
      const j = (await r.json()) as { connected: boolean; issues: LinearIssue[] }
      setConnected(j.connected)
      setIssues(j.issues)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setIssues([])
    } finally {
      setLoading(false)
    }
  }, [engagement.id, engagement.linearProjectId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className={panelTitleCls}>
          What we&apos;re working on{issues && ` (${issues.length})`}
        </h4>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!connected && (
        <p className="text-xs text-neutral-400">
          Connect a Linear project (above) to see live issues here.
        </p>
      )}

      {connected && error && (
        <p className="text-xs text-red-600">Linear: {error}</p>
      )}

      {connected && !error && issues && issues.length === 0 && (
        <p className="text-xs text-neutral-400">No active issues right now.</p>
      )}

      {connected && issues && issues.length > 0 && (
        <ul className="space-y-2">
          {issues.map((i) => {
            const isInternal = i.labels.includes('Internal')
            return (
              <li key={i.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${stateDotColor(i.stateType)}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-neutral-900 transition hover:text-amber-600 hover:underline"
                  >
                    {i.title}
                  </a>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <span className="font-mono">{i.identifier}</span>
                    <span>{i.stateName}</span>
                    {isInternal && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-purple-700">
                        Internal
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FilesPanel({ engagement, onChange }: { engagement: Engagement; onChange: () => void }) {
  const [uploading, setUploading] = useState(false)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('engagementId', engagement.id)
      fd.append('uploadedBy', 'internal')
      const r = await fetch('/api/admin/files/upload', { method: 'POST', body: fd })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert(`Upload failed: ${err.error || 'unknown'} ${err.details || ''}`)
      }
      onChange()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function fileUrl(f: FileRow) {
    return f.storageProvider === 'drive'
      ? `https://drive.google.com/file/d/${f.storagePath}/view`
      : f.storagePath
  }

  return (
    <div>
      <h4 className={`${panelTitleCls} mb-3`}>Files ({engagement.files.length})</h4>
      <ul className="mb-3 space-y-1">
        {engagement.files.map((f) => (
          <li key={f.id} className="rounded-lg px-2 py-1.5 text-sm transition hover:bg-neutral-50">
            <a href={fileUrl(f)} target="_blank" rel="noreferrer" className="block truncate font-medium text-neutral-900 transition hover:text-amber-600 hover:underline">
              {f.fileName}
            </a>
            <div className="text-xs text-neutral-400">
              {(f.fileSize / 1024).toFixed(0)} KB · {f.uploadedBy} · {new Date(f.uploadedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
      <label className="block text-sm">
        <span className="block cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-2 text-center font-medium text-neutral-700 transition hover:bg-neutral-50">
          {uploading ? 'Uploading…' : 'Upload file'}
        </span>
        <input
          type="file"
          onChange={upload}
          disabled={uploading}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.md,.csv,.tsv,.json,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.zip,.mp4,.mov,.mp3,.wav"
        />
      </label>
      <p className="mt-2 text-xs text-neutral-400">Max 50 MB. PDF, Office, images, zip, or short media clip.</p>
    </div>
  )
}

function CommentsPanel({ engagement, onChange }: { engagement: Engagement; onChange: () => void }) {
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    await fetch('/api/admin/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engagementId: engagement.id,
        author: 'internal',
        authorName: 'Admin',
        content,
        isInternal,
      }),
    })
    setContent('')
    setIsInternal(false)
    onChange()
  }

  return (
    <div>
      <h4 className={`${panelTitleCls} mb-3`}>Comments ({engagement.comments.length})</h4>
      <ul className="mb-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {engagement.comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg border p-3 text-sm ${
              c.author === 'internal'
                ? 'border-amber-200 bg-amber-50'
                : 'border-neutral-200 bg-white shadow-sm'
            }`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
              <span className="font-medium text-neutral-500">{c.authorName}</span>
              <span>({c.author})</span>
              {c.isInternal && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                  Internal
                </span>
              )}
              <span>· {new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap text-neutral-900">{c.content}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={addComment} className="space-y-2.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className={inputCls}
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="checkbox-brand"
            />
            Internal only (hidden from client)
          </label>
          <button type="submit" className={primaryBtnCls}>
            Post
          </button>
        </div>
      </form>
    </div>
  )
}

void TASK_STATUS_OPTIONS
