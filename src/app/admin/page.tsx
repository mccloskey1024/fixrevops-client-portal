'use client'

import { useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import Card from '@/components/Card'

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

const inputCls =
  'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40'
const labelCls = 'mb-1.5 block text-sm font-medium text-neutral-700'
const primaryBtnCls =
  'inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'

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
      const response = await fetch('/api/admin/clients', {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-[#F5A623]"></div>
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-[#0D0D0D]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo size="md" theme="dark" />
            <nav className="flex items-center gap-4">
              <a href="/admin" className="text-sm font-medium text-white">
                Clients
              </a>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setModeAndReset(mode === 'onboard' ? null : 'onboard')}
              className="inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {mode === 'onboard' ? 'Cancel' : '+ Onboard Client'}
            </button>
            <button
              onClick={() => setModeAndReset(mode === 'quick' ? null : 'quick')}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
            >
              {mode === 'quick' ? 'Cancel' : '+ Quick Add'}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' })
                window.location.href = '/admin/login'
              }}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/10 hover:text-neutral-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {mode === 'onboard' && !lastResult && (
          <Card className="mb-8 p-6">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-neutral-900">Onboard New Client</h2>
            <form onSubmit={handleOnboard} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Client / Company Name</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.clientName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, clientName: e.target.value })}
                    placeholder="Acme Corp"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Name</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.primaryContactName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactName: e.target.value })}
                    placeholder="Jane Doe"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Email</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.primaryContactEmail}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactEmail: e.target.value })}
                    placeholder="jane@acme.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Phone <span className="font-normal text-neutral-400">(optional)</span></label>
                  <input
                    type="tel"
                    value={onboardForm.primaryContactPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, primaryContactPhone: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelCls} mb-2`}>Service Tier</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {TIER_OPTIONS.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setOnboardForm({ ...onboardForm, tier: t.value })}
                      className={`rounded-lg border p-4 text-left transition ${
                        onboardForm.tier === t.value
                          ? 'border-[#F5A623] bg-amber-50 ring-1 ring-[#F5A623]'
                          : 'border-neutral-300 bg-white hover:border-neutral-400'
                      }`}
                    >
                      <div className="font-semibold text-neutral-900">{t.label}</div>
                      <div className="mt-1 text-xs text-neutral-500">{t.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Engagement Name <span className="font-normal text-neutral-400">(optional · auto-named if blank)</span>
                </label>
                <input
                  type="text"
                  value={onboardForm.engagementName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, engagementName: e.target.value })}
                  placeholder={`${onboardForm.clientName || 'Client Name'} — ${TIER_OPTIONS.find(t => t.value === onboardForm.tier)?.label}`}
                  className={inputCls}
                />
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
                <p className="mb-1.5 font-semibold text-neutral-700">When you click Onboard, the system will:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Create the client and generate a magic link</li>
                  <li>Create a matching Linear project under the Dijitlcraft team</li>
                  <li>Seed the engagement with the {TIER_OPTIONS.find(t => t.value === onboardForm.tier)?.label} task template</li>
                  <li>Create a closed-won HubSpot deal and contact</li>
                  <li>Send the welcome email with the portal link</li>
                </ul>
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  Onboarding failed: {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={primaryBtnCls}
              >
                {submitting ? 'Onboarding…' : 'Onboard Client'}
              </button>
            </form>
          </Card>
        )}

        {mode === 'quick' && (
          <Card className="mb-8 p-6">
            <h2 className="mb-1 text-lg font-bold tracking-tight text-neutral-900">Quick Add Client</h2>
            <p className="mb-5 text-sm text-neutral-500">
              Creates a client + magic link and sends the welcome email. No Linear project, HubSpot deal, or seeded tasks. Add an engagement manually from the client&apos;s management page later.
            </p>
            <form onSubmit={handleQuickAdd} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Client / Company Name</label>
                  <input
                    type="text"
                    required
                    value={quickForm.name}
                    onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Name</label>
                  <input
                    type="text"
                    required
                    value={quickForm.primaryContactName}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Email</label>
                  <input
                    type="email"
                    required
                    value={quickForm.primaryContactEmail}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactEmail: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact Phone <span className="font-normal text-neutral-400">(optional)</span></label>
                  <input
                    type="tel"
                    value={quickForm.primaryContactPhone}
                    onChange={(e) => setQuickForm({ ...quickForm, primaryContactPhone: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  Quick add failed: {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={primaryBtnCls}
              >
                {submitting ? 'Adding…' : 'Add Client'}
              </button>
            </form>
          </Card>
        )}

        {lastResult && (
          <Card className="mb-8 p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-neutral-900">
              ✅ {lastResult.client.name} onboarded
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-neutral-700">Magic link:</span>{' '}
                <a href={lastResult.magicLink} target="_blank" rel="noreferrer" className="break-all font-medium text-amber-600 hover:underline">
                  {lastResult.magicLink}
                </a>{' '}
                <button
                  onClick={() => handleCopyLink(lastResult.magicLink)}
                  className="ml-2 font-medium text-amber-600 hover:underline"
                >
                  Copy
                </button>
              </p>
              <ul className="space-y-1.5">
                {Object.entries(lastResult.steps).map(([name, s]) => (
                  <li key={name} className="flex items-start gap-2">
                    <span className={s.ok ? 'text-green-600' : 'text-red-600'}>{s.ok ? '✓' : '✗'}</span>
                    <span className="font-medium capitalize text-neutral-700">{name.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-neutral-500">
                      {s.ok ? (s.detail || 'done') : (s.error || 'failed')}
                    </span>
                  </li>
                ))}
              </ul>
              {lastResult.linearProjectUrl && (
                <p>
                  <span className="font-medium text-neutral-700">Linear project:</span>{' '}
                  <a href={lastResult.linearProjectUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-600 hover:underline">
                    {lastResult.linearProjectUrl}
                  </a>
                </p>
              )}
              {lastResult.hubspotDealId && (
                <p>
                  <span className="font-medium text-neutral-700">HubSpot deal ID:</span> <code className="font-mono text-neutral-700">{lastResult.hubspotDealId}</code>
                </p>
              )}
              <p className="pt-2">
                <a href={`/admin/clients/${lastResult.client.id}`} className="font-medium text-amber-600 hover:underline">
                  → Manage this client
                </a>
              </p>
            </div>
            <button
              onClick={() => { setLastResult(null); setMode(null) }}
              className="mt-5 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Done
            </button>
          </Card>
        )}

        <Card>
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">Clients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Magic Link</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-neutral-400">
                      No clients yet. Click <strong className="font-semibold text-neutral-600">+ Onboard Client</strong> for the full flow, or <strong className="font-semibold text-neutral-600">+ Quick Add</strong> for a minimal entry.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="transition hover:bg-neutral-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-neutral-900">
                        {client.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">
                        {client.primaryContactName}<br />
                        <span className="text-neutral-400">{client.primaryContactEmail}</span>
                      </td>
                      <td className="max-w-xs truncate whitespace-nowrap px-6 py-4 text-sm">
                        <a
                          href={client.magicLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-amber-600 hover:underline"
                        >
                          {client.magicLink}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {new Date(client.magicLinkExpiresAt).toLocaleDateString()}
                      </td>
                      <td className="space-x-3 whitespace-nowrap px-6 py-4 text-sm">
                        <button
                          onClick={() => handleCopyLink(client.magicLink)}
                          className="font-medium text-neutral-600 transition hover:text-neutral-900"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRotateLink(client)}
                          className="font-medium text-amber-600 transition hover:text-amber-700"
                          title="Generate a new link and invalidate the current one"
                        >
                          Rotate
                        </button>
                        <a
                          href={`/admin/clients/${client.id}`}
                          className="font-medium text-neutral-600 transition hover:text-neutral-900"
                        >
                          Manage →
                        </a>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="font-medium text-red-600 transition hover:text-red-700"
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
        </Card>
      </main>
    </div>
  )
}
