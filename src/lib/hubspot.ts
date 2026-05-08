// HubSpot CRM v3 wrapper for the onboarding flow.
// Auth: Bearer token from a HubSpot Private App (HUBSPOT_PRIVATE_APP_TOKEN).
// Docs: https://developers.hubspot.com/docs/api/crm/deals
//       https://developers.hubspot.com/docs/api/crm/contacts

const HS_BASE = 'https://api.hubapi.com'

type HsResult<T> = { ok: boolean; data?: T; error?: string }

function getAuthHeader(): string | null {
  const t = process.env.HUBSPOT_PRIVATE_APP_TOKEN
  return t ? `Bearer ${t}` : null
}

async function hsRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<HsResult<T>> {
  const auth = getAuthHeader()
  if (!auth) return { ok: false, error: 'HUBSPOT_PRIVATE_APP_TOKEN not configured' }

  try {
    const res = await fetch(`${HS_BASE}${path}`, {
      method,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HubSpot ${res.status}: ${text.slice(0, 400)}` }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown HubSpot error' }
  }
}

// ---------- Contacts ----------

type HsObject = { id: string; properties: Record<string, string | null> }
type HsSearchResponse = { total: number; results: HsObject[] }

export async function findOrCreateContact(args: {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  companyName?: string
}): Promise<HsResult<HsObject>> {
  // 1) Search by email first to avoid duplicates
  const search = await hsRequest<HsSearchResponse>('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: args.email }] }],
    properties: ['email', 'firstname', 'lastname', 'phone'],
    limit: 1,
  })
  if (!search.ok) return search
  if (search.data && search.data.total > 0 && search.data.results[0]) {
    return { ok: true, data: search.data.results[0] }
  }

  // 2) Create if not found
  const props: Record<string, string> = { email: args.email }
  if (args.firstName) props.firstname = args.firstName
  if (args.lastName) props.lastname = args.lastName
  if (args.phone) props.phone = args.phone
  if (args.companyName) props.company = args.companyName

  return hsRequest<HsObject>('POST', '/crm/v3/objects/contacts', { properties: props })
}

// ---------- Deals ----------

export async function createDeal(args: {
  dealname: string
  pipelineId: string
  stageId: string
  amount?: number
  closeDate?: Date
  associatedContactIds?: string[]
}): Promise<HsResult<HsObject>> {
  const props: Record<string, string> = {
    dealname: args.dealname,
    pipeline: args.pipelineId,
    dealstage: args.stageId,
  }
  if (typeof args.amount === 'number') props.amount = String(args.amount)
  if (args.closeDate) props.closedate = args.closeDate.toISOString()

  const body: Record<string, unknown> = { properties: props }
  if (args.associatedContactIds && args.associatedContactIds.length > 0) {
    // Default association type ID for deal→contact is 3
    body.associations = args.associatedContactIds.map((cid) => ({
      to: { id: cid },
      types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
    }))
  }

  return hsRequest<HsObject>('POST', '/crm/v3/objects/deals', body)
}

// ---------- High-level helper ----------

export async function recordOnboardedDeal(args: {
  clientName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  tierLabel: string
}): Promise<HsResult<{ dealId: string; contactId: string }>> {
  const pipelineId = process.env.HUBSPOT_DEAL_PIPELINE_ID
  const stageId = process.env.HUBSPOT_DEAL_STAGE_ID
  if (!pipelineId || !stageId) {
    return {
      ok: false,
      error: 'HUBSPOT_DEAL_PIPELINE_ID and HUBSPOT_DEAL_STAGE_ID must be configured',
    }
  }

  // Split contact name into first/last for HubSpot
  const parts = args.contactName.trim().split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ')

  const contactRes = await findOrCreateContact({
    email: args.contactEmail,
    firstName,
    lastName,
    phone: args.contactPhone,
    companyName: args.clientName,
  })
  if (!contactRes.ok || !contactRes.data) return { ok: false, error: contactRes.error }

  const dealRes = await createDeal({
    dealname: `${args.clientName} — ${args.tierLabel}`,
    pipelineId,
    stageId,
    amount: 0,
    closeDate: new Date(),
    associatedContactIds: [contactRes.data.id],
  })
  if (!dealRes.ok || !dealRes.data) return { ok: false, error: dealRes.error }

  return { ok: true, data: { dealId: dealRes.data.id, contactId: contactRes.data.id } }
}
