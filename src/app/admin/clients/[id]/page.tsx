'use client'

import { use, useCallback, useEffect, useState } from 'react'

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

const STATUS_OPTIONS = ['planning', 'active', 'on-hold', 'completed']
const TASK_STATUS_OPTIONS = ['pending', 'in-progress', 'completed']

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
    await fetch(`/api/admin/engagements/${eid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    refresh()
  }

  async function deleteEngagement(eid: string) {
    if (!confirm('Delete engagement and all its tasks/files/comments? This cannot be undone.')) return
    await fetch(`/api/admin/engagements/${eid}`, { method: 'DELETE' })
    refresh()
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8">Loading…</div>
  if (!client) return <div className="min-h-screen bg-gray-50 p-8">Client not found.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">← Back to clients</a>
          <div className="mt-2 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <div className="text-sm text-gray-600 mt-1">
                {client.primaryContactName} · {client.primaryContactEmail}
                {client.primaryContactPhone && <> · {client.primaryContactPhone}</>}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(client.magicLink)
                alert('Magic link copied to clipboard.')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Copy Magic Link
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Engagements</h2>
          <button
            onClick={() => setShowNewEngagement((v) => !v)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            {showNewEngagement ? 'Cancel' : '+ New Engagement'}
          </button>
        </div>

        {showNewEngagement && (
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={createEngagement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={newEngagement.name}
                  onChange={(e) => setNewEngagement({ ...newEngagement, name: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newEngagement.description}
                  onChange={(e) => setNewEngagement({ ...newEngagement, description: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newEngagement.status}
                    onChange={(e) => setNewEngagement({ ...newEngagement, status: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={newEngagement.startDate}
                    onChange={(e) => setNewEngagement({ ...newEngagement, startDate: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target End Date</label>
                  <input
                    type="date"
                    value={newEngagement.targetEndDate}
                    onChange={(e) => setNewEngagement({ ...newEngagement, targetEndDate: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Linear Project ID <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newEngagement.linearProjectId}
                  onChange={(e) => setNewEngagement({ ...newEngagement, linearProjectId: e.target.value })}
                  placeholder="e.g. abc123-def456-..."
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a Linear project ID here to enable client-submitted service requests on this engagement.
                </p>
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Create Engagement
              </button>
            </form>
          </div>
        )}

        {client.engagements.length === 0 && !showNewEngagement && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No engagements yet. Click <strong>+ New Engagement</strong> to add one.
          </div>
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
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{engagement.name}</h3>
          {engagement.description && <p className="text-sm text-gray-600 mt-1">{engagement.description}</p>}
          <div className="text-xs text-gray-500 mt-2">
            {engagement.startDate && <>Start: {new Date(engagement.startDate).toLocaleDateString()} · </>}
            {engagement.targetEndDate && <>Target end: {new Date(engagement.targetEndDate).toLocaleDateString()}</>}
          </div>
          <LinearProjectIdEditor engagement={engagement} onChange={onChange} />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={engagement.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={onDelete} className="text-red-600 text-sm hover:underline">Delete</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        <TasksPanel engagement={engagement} onChange={onChange} scope="client_action" />
        <LinearIssuesPanel engagement={engagement} />
        <FilesPanel engagement={engagement} onChange={onChange} />
        <CommentsPanel engagement={engagement} onChange={onChange} />
      </div>
    </div>
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
      <div className="text-xs text-gray-500 mt-1">
        Linear project: {engagement.linearProjectId
          ? <code className="text-gray-700">{engagement.linearProjectId.slice(0, 8)}…</code>
          : <span className="text-gray-400">not connected</span>}
        {' · '}
        <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline">
          {engagement.linearProjectId ? 'change' : 'connect'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Linear project ID"
        className="text-xs rounded border-gray-300 px-2 py-1"
        autoFocus
      />
      <button onClick={save} className="text-xs text-blue-600 hover:underline">Save</button>
      <button onClick={() => { setEditing(false); setValue(engagement.linearProjectId || '') }} className="text-xs text-gray-500 hover:underline">Cancel</button>
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
      <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">
        Client action items ({tasks.length})
      </h4>
      <ul className="space-y-2 mb-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.status === 'completed'}
              onChange={() => toggleTask(t)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className={t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}>
                {t.title}
              </div>
              {t.dueDate && <div className="text-xs text-gray-500">Due {new Date(t.dueDate).toLocaleDateString()}</div>}
            </div>
            <button onClick={() => deleteTask(t)} className="text-red-600 text-xs hover:underline">×</button>
          </li>
        ))}
      </ul>
      <form onSubmit={addTask} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New client task…"
          className="flex-1 text-sm rounded border-gray-300"
        />
        <button type="submit" className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
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
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold uppercase text-gray-500">
          What we&apos;re working on{issues && ` (${issues.length})`}
        </h4>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!connected && (
        <p className="text-xs text-gray-500">
          Connect a Linear project (above) to see live issues here.
        </p>
      )}

      {connected && error && (
        <p className="text-xs text-red-600">Linear: {error}</p>
      )}

      {connected && !error && issues && issues.length === 0 && (
        <p className="text-xs text-gray-500">No active issues right now.</p>
      )}

      {connected && issues && issues.length > 0 && (
        <ul className="space-y-2">
          {issues.map((i) => {
            const isInternal = i.labels.includes('Internal')
            const isStarted = i.stateType === 'started'
            const badge = isStarted
              ? 'bg-yellow-100 text-yellow-800'
              : i.stateType === 'backlog'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-blue-100 text-blue-800'
            return (
              <li key={i.id} className="flex items-start gap-2 text-sm">
                <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${badge}`}>
                  {i.stateName}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-900 hover:text-blue-700 hover:underline"
                  >
                    {i.title}
                  </a>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span className="font-mono">{i.identifier}</span>
                    {isInternal && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-medium uppercase tracking-wide">
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
      <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Files ({engagement.files.length})</h4>
      <ul className="space-y-2 mb-3">
        {engagement.files.map((f) => (
          <li key={f.id} className="text-sm">
            <a href={fileUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
              {f.fileName}
            </a>
            <div className="text-xs text-gray-500">
              {(f.fileSize / 1024).toFixed(0)} KB · {f.uploadedBy} · {new Date(f.uploadedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
      <label className="block text-sm">
        <span className="block px-3 py-2 text-center bg-gray-100 hover:bg-gray-200 rounded cursor-pointer text-gray-700">
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
      <p className="text-xs text-gray-500 mt-2">Max 50 MB. PDF, Office, images, zip, or short media clip.</p>
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
      <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Comments ({engagement.comments.length})</h4>
      <ul className="space-y-3 mb-3 max-h-64 overflow-y-auto">
        {engagement.comments.map((c) => (
          <li key={c.id} className={`text-sm rounded p-2 ${c.isInternal ? 'bg-yellow-50' : 'bg-gray-50'}`}>
            <div className="text-xs text-gray-500 mb-1">
              {c.authorName} ({c.author}){c.isInternal && ' · internal'} · {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="text-gray-900 whitespace-pre-wrap">{c.content}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={addComment} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="w-full text-sm rounded border-gray-300"
        />
        <div className="flex justify-between items-center">
          <label className="text-xs text-gray-700 flex items-center gap-1">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Internal only (hidden from client)
          </label>
          <button type="submit" className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Post
          </button>
        </div>
      </form>
    </div>
  )
}

void TASK_STATUS_OPTIONS
