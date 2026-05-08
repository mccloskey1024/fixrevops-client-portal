// Thin wrapper around Linear's GraphQL API.
// Personal API keys are sent in the Authorization header verbatim (no Bearer).
// Docs: https://developers.linear.app/docs/graphql/working-with-the-graphql-api

const LINEAR_ENDPOINT = 'https://api.linear.app/graphql'

export type CreateLinearIssueArgs = {
  title: string
  description?: string | null
  projectId: string
  teamId: string
}

export type CreateLinearIssueResult = {
  ok: boolean
  issue?: { id: string; identifier: string; url: string }
  error?: string
}

export async function createLinearIssue(
  args: CreateLinearIssueArgs
): Promise<CreateLinearIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) return { ok: false, error: 'LINEAR_API_KEY not configured' }

  const query = `mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url }
    }
  }`

  try {
    const res = await fetch(LINEAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            title: args.title,
            description: args.description ?? undefined,
            projectId: args.projectId,
            teamId: args.teamId,
          },
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Linear ${res.status}: ${text.slice(0, 300)}` }
    }

    const data = (await res.json()) as {
      errors?: Array<{ message: string }>
      data?: { issueCreate?: { success: boolean; issue?: { id: string; identifier: string; url: string } } }
    }

    if (data.errors && data.errors.length) {
      return { ok: false, error: data.errors.map((e) => e.message).join('; ').slice(0, 300) }
    }
    if (!data.data?.issueCreate?.success || !data.data.issueCreate.issue) {
      return { ok: false, error: 'Linear issueCreate did not succeed' }
    }
    return { ok: true, issue: data.data.issueCreate.issue }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown Linear error' }
  }
}
