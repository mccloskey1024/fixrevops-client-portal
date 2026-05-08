// Tier templates for FixRevOps onboarding. Source: fixrevops.io services page.
// Each tier defines a default engagement description and a list of seed tasks
// that get created when an admin onboards a client at that tier.

export type Tier = 'audit' | 'project' | 'retainer'

export type SeedTask = {
  title: string
  description?: string
  type?: 'client_action' | 'internal' | 'milestone'
}

export type TierTemplate = {
  tier: Tier
  label: string
  description: string
  engagementDescription: string
  seedTasks: SeedTask[]
}

export const TEMPLATES: Record<Tier, TierTemplate> = {
  audit: {
    tier: 'audit',
    label: 'Audit',
    description: '1–2 weeks · One-time engagement. Full RevOps stack diagnostic.',
    engagementDescription:
      'A full diagnostic of your revenue operations stack — finding leaks in the funnel, broken handoffs, and missed opportunities. Delivered in 1–2 weeks.',
    seedTasks: [
      {
        title: 'Provide read-only access to HubSpot and/or Salesforce',
        description: 'Add Shane (shane@fixrevops.io) as a read-only user in your CRM systems so the audit can begin.',
        type: 'client_action',
      },
      {
        title: 'Complete intake questionnaire',
        description: 'Top 3 pain points, current stack, success metrics, recent context. We\'ll send a short form.',
        type: 'client_action',
      },
      {
        title: 'Schedule kickoff call (30 min)',
        description: 'Pick a time on the booking page. Bring whoever should hear the audit findings.',
        type: 'client_action',
      },
      {
        title: 'Audit findings review (60 min)',
        description: 'Walk through the deliverable and prioritize follow-ups. Scheduled at end of week 2.',
        type: 'milestone',
      },
      {
        title: 'Sign off on audit deliverable',
        description: 'Final acknowledgment that the audit findings have been reviewed and accepted.',
        type: 'client_action',
      },
    ],
  },
  project: {
    tier: 'project',
    label: 'Project',
    description: '2–8 weeks · Defined scope. Migrations, workflow builds, integration fixes, data cleanups.',
    engagementDescription:
      'A scoped engagement with clear deliverables and timeline. Migrations, workflow builds, integration fixes, or data cleanups — defined scope, defined timeline, no surprises.',
    seedTasks: [
      {
        title: 'Sign SOW',
        description: 'Review and sign the Statement of Work uploaded to this engagement.',
        type: 'client_action',
      },
      {
        title: 'Provide admin access to systems in scope',
        description: 'HubSpot, Salesforce, and any other systems the project touches. Admin level needed for builds.',
        type: 'client_action',
      },
      {
        title: 'Complete intake questionnaire',
        description: 'Confirm scope, current state, target state, and success metrics.',
        type: 'client_action',
      },
      {
        title: 'Schedule kickoff call (60 min)',
        description: 'Walk through scope, timeline, and stakeholder alignment.',
        type: 'client_action',
      },
      {
        title: 'Midpoint status review (30 min)',
        description: 'Check progress against scope and timeline. Adjust if needed.',
        type: 'milestone',
      },
      {
        title: 'Final handoff + documentation walkthrough',
        description: 'Receive deliverables, walk through documentation, sign off on completion.',
        type: 'milestone',
      },
    ],
  },
  retainer: {
    tier: 'retainer',
    label: 'Retainer',
    description: 'Monthly · Ongoing fractional RevOps support. Embedded with team for optimizations and new builds.',
    engagementDescription:
      'Ongoing fractional RevOps support — monthly engagement. Embedded with your team for optimizations, new builds, and keeping ops running clean.',
    seedTasks: [
      {
        title: 'Sign retainer agreement',
        description: 'Review and sign the monthly retainer agreement uploaded to this engagement.',
        type: 'client_action',
      },
      {
        title: 'Provide ongoing system access',
        description: 'HubSpot, Salesforce, and any other tools we\'ll be operating in monthly.',
        type: 'client_action',
      },
      {
        title: 'Onboarding call + define month-1 priorities (60 min)',
        description: 'Pick the top 3 things to tackle in the first month and align on cadence.',
        type: 'client_action',
      },
      {
        title: 'First-week status check-in',
        description: 'Quick async update on early wins and blockers.',
        type: 'milestone',
      },
      {
        title: 'End-of-month deliverables review',
        description: 'Recap what shipped, plan next month\'s priorities.',
        type: 'milestone',
      },
    ],
  },
}

export function getTemplate(tier: string | undefined | null): TierTemplate | null {
  if (!tier) return null
  if (tier in TEMPLATES) return TEMPLATES[tier as Tier]
  return null
}
