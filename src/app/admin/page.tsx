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

type Tier = 'audit' | 'project' | 'retainer'

const TIER_OPTIONS: Array<{ value: Tier; label: string; blurb: string }> = [
  { value: 'audit', label: 'Audit', blurb: '1–2 weeks · One-time engagement' },
  { value: 'project', label: 'Project', blurb: '2–8 weeks · Defined scope' },
  { value: 'retainer', label: 'Retainer', blurb: 'Monthly · Ongoing support' },
]

type OnboardingStep = { ok: boolean; detail?: string; error?: string }
type OnboardingResult = {
  client: { id: string; name: string }
  engagement: { id: string; name: string; tier: string; tasksSeeded: number }
  magicLink: string
  linearProjectId: string | null
  linearProjectUrl: string | null
  hubspotDealId: string | null
  steps: Record<string, OnboardingStep>
}

type Mode = null | 'onboard' | 'quick'

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<OnboardingResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [onboardForm, setOnboardForm] = useState({
    clientName: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    tier: 'audit' as Tier,
    engagementName: '',
  })
  const [quickForm, setQuickForm] = useState({
    name: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  })

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    try {
      const response = await fetch('/api/admin/clients')
      if (response.ok) setClients(await response.json())
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    } finally {
      setLoading(false)
    }
  }

  function setModeAndReset(next: Mode) {
    setMode(next)
    setLastResult(null)
    setSubmitError(null)
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setLastResult(null)
    try {
      const response = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...onboardForm, engagementName: onboardForm.engagementName.trim() || undefined }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${response.status})`)
      }
      const data = (await response.json()) as OnboardingResult
      setLastResult(data)
      setOnboardForm({
        clientName: '',
        primaryContactName: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        tier: 'audit',
        engagementName: '',
      })
      fetchClients()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Onboarding failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/portal/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickForm),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${response.status})`)
      }
      const data = await response.json()
      const emailNote = data.email?.sent
        ? `\n\nWelcome email sent to ${quickForm.primaryContactEmail}.`
        : data.email?.error
          ? `\n\nEmail send FAILED: ${data.email.error}`
          : ''
      alert(`Client created.\n\nMagic link:\n${data.magicLink}${emailNote}`)
      setQuickForm({ name: '', primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '' })
      setMode(null)
      fetchClients()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Quick add failed')
    } finally {
      setSubmitting(false)
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
    if (!confirm(`Delete "${client.name}" and ALL of their engagements, tasks, files, and comments? This cannot be undone.`)) return
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

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">FixRevOps Admin</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setModeAndReset(mode === 'onboard' ? null : 'onboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {mode === 'onboard' ? 'Cancel' : '+ Onboard Client'}
            </button>
            <button
              onClick={() => setModeAndReset(mode === 'quick' ? null : 'quick')}
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-50"
            >
              {mode === 'quick' ? 'Cancel' : '+ Quick Add'}
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

        {mode === 'onboard' && !lastResult && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Onboard New Client</h2>
            <form onSubmit={handleOnboard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client / Company Name</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.clientName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, clientName: e.target.value })}
                    placeholder="Acme Corp"
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Name</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.primaryContactName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactName: e.target.value })}
                    placeholder="Jane Doe"
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Email</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.primaryContactEmail}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactEmail: e.target.value })}
                    placeholder="jane@acme.com"
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Phone <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="tel"
                    value={onboardForm.primaryContactPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactPhone: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Tier</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {TIER_OPTIONS.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setOnboardForm({ ...onboardForm, tier: t.value })}
                      className={`text-left rounded-lg border p-4 transition ${
                        onboardForm.tier === t.value
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{t.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{t.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Engagement Name <span className="text-gray-400">(optional · auto-named if blank)</span>
                </label>
                <input
                  type="text"
                  value={onboardForm.engagementName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, engagementName: e.target.value })}
                  placeholder={`${onboardForm.clientName || 'Client Name'} — ${TIER_OPTIONS.find(t => t.value === onboardForm.tier)?.label}`}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">When you click Onboard, the system will:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Create the client and generate a magic link</li>
                  <li>Create a matching Linear project under the Dijitlcraft team</li>
                  <li>Seed the engagement with the {TIER_OPTIONS.find(t => t.value === onboardForm.tier)?.label} task template</li>
                  <li>Create a closed-won HubSpot deal and contact</li>
                  <li>Send the welcome email with the portal link</li>
                </ul>
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 rounded p-3">
                  Onboarding failed: {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Onboarding…' : 'Onboard Client'}
              </button>
            </form>
          </div>
        )}

        {mode === 'quick' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-1">Quick Add Client</h2>
            <p className="text-sm text-gray-500 mb-4">
              Creates a client + magic link and sends the welcome email. No Linear project, HubSpot deal, or seeded tasks. Add an engagement manually from the client&apos;s management page later.
            </p>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client / Company Name</label>
                  <input
                    type="text"
                    required
                    value={quickForm.name}
                    onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Name</label>
                  <input
                    type="text"
                    required
                    value={quickForm.primaryContactName}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactName: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Email</label>
                  <input
                    type="email"
                    required
                    value={quickForm.primaryContactEmail}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactEmail: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact Phone <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="tel"
                    value={quickForm.primaryContactPhone}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactPhone: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 rounded p-3">
                  Quick add failed: {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding…' : 'Add Client'}
              </button>
            </form>
          </div>
        )}

        {lastResult && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              ✅ {lastResult.client.name} onboarded
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Magic link:</span>{' '}
                <a href={lastResult.magicLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                  {lastResult.magicLink}
                </a>{' '}
                <button
                  onClick={() => handleCopyLink(lastResult.magicLink)}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Copy
                </button>
              </p>
              <ul className="space-y-1">
                {Object.entries(lastResult.steps).map(([name, s]) => (
                  <li key={name} className="flex items-start gap-2">
                    <span className={s.ok ? 'text-green-600' : 'text-red-600'}>{s.ok ? '✓' : '✗'}</span>
                    <span className="font-medium text-gray-700 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-gray-600">
                      {s.ok ? (s.detail || 'done') : (s.error || 'failed')}
                    </span>
                  </li>
                ))}
              </ul>
              {lastResult.linearProjectUrl && (
                <p>
                  <span className="font-medium">Linear project:</span>{' '}
                  <a href={lastResult.linearProjectUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {lastResult.linearProjectUrl}
                  </a>
                </p>
              )}
              {lastResult.hubspotDealId && (
                <p>
                  <span className="font-medium">HubSpot deal ID:</span> <code className="text-gray-700">{lastResult.hubspotDealId}</code>
                </p>
              )}
              <p className="pt-2">
                <a href={`/admin/clients/${lastResult.client.id}`} className="text-blue-600 hover:underline">
                  → Manage this client
                </a>
              </p>
            </div>
            <button
              onClick={() => { setLastResult(null); setMode(null) }}
              className="mt-4 px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Done
            </button>
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
                      No clients yet. Click <strong>+ Onboard Client</strong> for the full flow, or <strong>+ Quick Add</strong> for a minimal entry.
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
