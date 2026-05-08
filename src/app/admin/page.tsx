'use client'

import { useEffect, useState } from 'react'

interface Client {
  id: string
  name: string
  primaryContactName: string
  primaryContactEmail: string
  magicLink: string
  magicLinkExpiresAt: string
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  })

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const response = await fetch('/api/admin/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/portal/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })

      if (response.ok) {
        const data = await response.json()
        const emailStatus = data.email?.sent
          ? `\n\nWelcome email sent to ${data.email && newClient.primaryContactEmail}.`
          : data.email?.error
            ? `\n\nEmail send FAILED: ${data.email.error}`
            : ''
        alert(`Client created! Magic link:\n${data.magicLink}${emailStatus}`)
        setNewClient({ name: '', primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '' })
        setShowNewClientForm(false)
        fetchClients()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to create client')
    }
  }

  async function handleCopyLink(link: string) {
    await navigator.clipboard.writeText(link)
    alert('Magic link copied to clipboard!')
  }

  async function handleRotateLink(client: Client) {
    if (!confirm(`Generate a NEW magic link for "${client.name}"? The current link will stop working immediately.`)) return
    try {
      const r = await fetch(`/api/admin/clients/${client.id}/rotate-link`, { method: 'POST' })
      if (r.ok) {
        const data = await r.json()
        await navigator.clipboard.writeText(data.magicLink).catch(() => {})
        alert(`New magic link generated and copied to clipboard:\n\n${data.magicLink}`)
        fetchClients()
      } else {
        const err = await r.json().catch(() => ({}))
        alert(`Rotate failed: ${err.error || 'unknown'}`)
      }
    } catch {
      alert('Rotate failed (network error)')
    }
  }

  async function handleDeleteClient(client: Client) {
    if (!confirm(`Delete "${client.name}" and ALL of their engagements, tasks, files, and comments? This cannot be undone.`)) {
      return
    }
    try {
      const r = await fetch(`/api/admin/clients/${client.id}`, { method: 'DELETE' })
      if (r.ok) {
        fetchClients()
      } else {
        const err = await r.json().catch(() => ({}))
        alert(`Delete failed: ${err.error || 'unknown'}`)
      }
    } catch {
      alert('Delete failed (network error)')
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">FixRevOps Admin</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewClientForm(!showNewClientForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showNewClientForm ? 'Cancel' : '+ New Client'}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' })
                window.location.href = '/admin/login'
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showNewClientForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Client</h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Name</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  value={newClient.primaryContactName}
                  onChange={(e) => setNewClient({ ...newClient, primaryContactName: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Contact Email</label>
                <input
                  type="email"
                  required
                  value={newClient.primaryContactEmail}
                  onChange={(e) => setNewClient({ ...newClient, primaryContactEmail: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Contact Phone (optional)</label>
                <input
                  type="tel"
                  value={newClient.primaryContactPhone}
                  onChange={(e) => setNewClient({ ...newClient, primaryContactPhone: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Create Client & Generate Magic Link
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Clients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magic Link</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No clients yet. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.primaryContactName}<br />
                        <span className="text-gray-400">{client.primaryContactEmail}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm truncate max-w-xs">
                        <a
                          href={client.magicLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {client.magicLink}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.magicLinkExpiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => handleCopyLink(client.magicLink)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRotateLink(client)}
                          className="text-amber-600 hover:text-amber-800"
                          title="Generate a new link and invalidate the current one"
                        >
                          Rotate
                        </button>
                        <a
                          href={`/admin/clients/${client.id}`}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Manage →
                        </a>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
