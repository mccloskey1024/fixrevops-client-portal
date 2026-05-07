'use client'

import { use, useEffect, useState } from 'react'

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
      setNewEngagement({ name: '', description: '', status: 'planning', startDate: '', targetEndDate: '' })
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

      <div className="grid md:grid-cols-3 gap-6 p-6">
        <TasksPanel engagement={engagement} onChange={onChange} />
        <FilesPanel engagement={engagement} onChange={onChange} />
        <CommentsPanel engagement={engagement} onChange={onChange} />
      </div>
    </div>
  )
}

function TasksPanel({ engagement, onChange }: { engagement: Engagement; onChange: () => void }) {
  const [newTitle, setNewTitle] = useState('')

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engagementId: engagement.id, title: newTitle, type: 'client_action' }),
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
      <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Tasks ({engagement.tasks.length})</h4>
      <ul className="space-y-2 mb-3">
        {engagement.tasks.map((t) => (
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
          placeholder="New task…"
          className="flex-1 text-sm rounded border-gray-300"
        />
        <button type="submit" className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
      </form>
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
        <input type="file" onChange={upload} disabled={uploading} className="hidden" />
      </label>
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
