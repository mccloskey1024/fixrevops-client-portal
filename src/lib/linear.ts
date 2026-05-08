// Thin wrapper around Linear's GraphQL API.
// Personal API keys are sent in the Authorization header verbatim (no Bearer).
// Docs: https://developers.linear.app/docs/graphql/working-with-the-graphql-api

const LINEAR_ENDPOINT = 'https://api.linear.app/graphql'

type LinearResult<T> = { ok: boolean; data?: T; error?: string }

async function callLinear<T>(query: string, variables: Record<string, unknown>): Promise<LinearResult<T>> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) return { ok: false, error: 'LINEAR_API_KEY not configured' }

  try {
    const res = await fetch(LINEAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Linear ${res.status}: ${text.slice(0, 300)}` }
    }

    const data = (await res.json()) as { errors?: Array<{ message: string }>; data?: T }
    if (data.errors && data.errors.length) {
      return { ok: false, error: data.errors.map((e) => e.message).join('; ').slice(0, 300) }
    }
    if (!data.data) return { ok: false, error: 'Linear returned no data' }
    return { ok: true, data: data.data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown Linear error' }
  }
}

// ---------- Issue creation ----------

export type CreateLinearIssueArgs = {
  title: string
  description?: string | null
  projectId: string
  teamId: string
}

export type LinearIssue = { id: string; identifier: string; url: string }

export async function createLinearIssue(args: CreateLinearIssueArgs): Promise<LinearResult<LinearIssue>> {
  const query = `mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url }
    }
  }`
  const result = await callLinear<{ issueCreate?: { success: boolean; issue?: LinearIssue } }>(
    query,
    {
      input: {
        title: args.title,
        description: args.description ?? undefined,
        projectId: args.projectId,
        teamId: args.teamId,
      },
    }
  )
  if (!result.ok) return result
  if (!result.data?.issueCreate?.success || !result.data.issueCreate.issue) {
    return { ok: false, error: 'Linear issueCreate did not succeed' }
  }
  return { ok: true, data: result.data.issueCreate.issue }
}

// ---------- Project creation ----------

export type CreateLinearProjectArgs = {
  name: string
  description?: string | null
  teamId: string
  /** Optional Linear user ID to set as project lead */
  leadId?: string
}

export type LinearProject = { id: string; name: string; url: string }

export async function createLinearProject(
  args: CreateLinearProjectArgs
): Promise<LinearResult<LinearProject>> {
  const query = `mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project { id name url }
    }
  }`
  const result = await callLinear<{ projectCreate?: { success: boolean; project?: LinearProject } }>(
    query,
    {
      input: {
        name: args.name,
        description: args.description ?? undefined,
        teamIds: [args.teamId],
        leadId: args.leadId ?? undefined,
      },
    }
  )
  if (!result.ok) return result
  if (!result.data?.projectCreate?.success || !result.data.projectCreate.project) {
    return { ok: false, error: 'Linear projectCreate did not succeed' }
  }
  return { ok: true, data: result.data.projectCreate.project }
}
