// HubSpot CRM v3/v4 wrapper for the onboarding flow.
// Auth: Bearer token from a HubSpot Private App (HUBSPOT_PRIVATE_APP_TOKEN).
// Docs: https://developers.hubspot.com/docs/api/crm/deals
//       https://developers.hubspot.com/docs/api/crm/contacts
//       https://developers.hubspot.com/docs/api/crm/associations
//
// Project object lives at type ID 0-970 (HubSpot first-party Projects feature).
// Pipeline and stage IDs come from env so we don't hard-code them in case
// they ever change in HubSpot.

const HS_BASE = 'https://api.hubapi.com'

type HsResult<T> = { ok: boolean; data?: T; error?: string }

function getAuthHeader(): string | null {
  const t = process.env.HUBSPOT_PRIVATE_APP_TOKEN
  return t ? `Bearer ${t}` : null
}

async function hsRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<HsResult<T>> {
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
    // Some endpoints (associations PUT) can return an empty body.
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: true, data: data as T }
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
  const search = await hsRequest<HsSearchResponse>('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: args.email }] }],
    properties: ['email', 'firstname', 'lastname', 'phone'],
    limit: 1,
  })
  if (!search.ok) return { ok: false, error: search.error }
  if (search.data && search.data.total > 0 && search.data.results[0]) {
    return { ok: true, data: search.data.results[0] }
  }

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

// ---------- Projects (object type 0-970) ----------

export type HsProjectArgs = {
  name: string
  pipelineId: string
  stageId: string
  ownerId?: string
}

export async function createHubspotProject(
  args: HsProjectArgs
): Promise<HsResult<HsObject>> {
  const objectType = process.env.HUBSPOT_PROJECT_OBJECT_TYPE || '0-970'
  const props: Record<string, string> = {
    // HubSpot's first-party Projects object uses `hs_project_name` for the
    // title and `hs_pipeline` / `hs_pipeline_stage` for routing. If the
    // property names differ in your account, you'll see a 400 from HubSpot
    // pointing to the unknown property — easy to swap.
    hs_project_name: args.name,
    hs_pipeline: args.pipelineId,
    hs_pipeline_stage: args.stageId,
  }
  if (args.ownerId) props.hubspot_owner_id = args.ownerId
  return hsRequest<HsObject>('POST', `/crm/v3/objects/${objectType}`, { properties: props })
}

// ---------- Associations ----------

// Creates a default association from one object to another via the v4
// associations API. The "default" path auto-resolves to whichever association
// type HubSpot has configured as default for the pair, so we don't have to
// hard-code association type IDs per object pair.
// Docs: https://developers.hubspot.com/docs/api/crm/associations
export async function associateObjectsDefault(
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectId: string
): Promise<HsResult<unknown>> {
  return hsRequest(
    'PUT',
    `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/default/${toObjectType}/${toObjectId}`
  )
}

// ---------- High-level helper ----------

export type RecordOnboardedDealResult = {
  dealId: string
  contactId: string
  projectId?: string
  projectError?: string
}

export async function recordOnboardedDeal(args: {
  clientName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  tierLabel: string
}): Promise<HsResult<RecordOnboardedDealResult>> {
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

  // Best-effort Project creation + associations. Failures here don't
  // invalidate the Deal — admin can manually create one if needed.
  const projectPipelineId = process.env.HUBSPOT_PROJECT_PIPELINE_ID
  const projectStageId = process.env.HUBSPOT_PROJECT_STAGE_ID
  let projectId: string | undefined
  let projectError: string | undefined

  if (!projectPipelineId || !projectStageId) {
    projectError = 'HUBSPOT_PROJECT_PIPELINE_ID and HUBSPOT_PROJECT_STAGE_ID not configured'
  } else {
    const projectRes = await createHubspotProject({
      name: `${args.clientName} — ${args.tierLabel}`,
      pipelineId: projectPipelineId,
      stageId: projectStageId,
    })
    if (!projectRes.ok || !projectRes.data) {
      projectError = projectRes.error || 'Project creation failed'
    } else {
      projectId = projectRes.data.id
      const objectType = process.env.HUBSPOT_PROJECT_OBJECT_TYPE || '0-970'
      const dealAssoc = await associateObjectsDefault(
        objectType,
        projectId,
        '0-3',
        dealRes.data.id
      )
      const contactAssoc = await associateObjectsDefault(
        objectType,
        projectId,
        '0-1',
        contactRes.data.id
      )
      const assocFailures = [dealAssoc, contactAssoc]
        .filter((r) => !r.ok)
        .map((r) => r.error)
        .filter(Boolean)
      if (assocFailures.length > 0) {
        projectError = `Project created (${projectId}) but associations failed: ${assocFailures.join('; ')}`
      }
    }
  }

  return {
    ok: true,
    data: {
      dealId: dealRes.data.id,
      contactId: contactRes.data.id,
      projectId,
      projectError,
    },
  }
}
