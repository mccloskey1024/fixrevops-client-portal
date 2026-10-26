import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { enforceRateLimit } from '@/lib/rate-limit'
import { SHARED_PAGES } from '@/lib/shared-pages'

// Shared state for standalone pages at /p/[slug].
// GET returns the whole state object; POST merges a patch of key/value pairs.
// Anyone with the page link can read and write, so only slugs registered in
// SHARED_PAGES are accepted and values are kept small and flat.

const MAX_KEYS = 500
const MAX_VALUE_LENGTH = 4000

type State = Record<string, string | boolean | number | null>

function isKnown(slug: string) {
  return Object.prototype.hasOwnProperty.call(SHARED_PAGES, slug)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!isKnown(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const row = await prisma.sharedPageState.findUnique({ where: { slug } })
  return NextResponse.json(
    { state: (row?.state as State) ?? {}, updatedAt: row?.updatedAt ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!isKnown(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const blocked = enforceRateLimit(`shared-page:write:${slug}`, 120, 60_000)
  if (blocked) return blocked

  let patch: State
  try {
    const body = await request.json()
    patch = body?.patch
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return NextResponse.json({ error: 'Expected { patch: { key: value } }' }, { status: 400 })
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
      return NextResponse.json({ error: `Bad key: ${key}` }, { status: 400 })
    }
    const ok =
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      (typeof value === 'string' && value.length <= MAX_VALUE_LENGTH)
    if (!ok) {
      return NextResponse.json({ error: `Bad value for ${key}` }, { status: 400 })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Lock the row so two people saving at once don't overwrite each other.
    await tx.$executeRaw`
      INSERT INTO "SharedPageState" ("slug", "state", "updatedAt")
      VALUES (${slug}, '{}'::jsonb, NOW())
      ON CONFLICT ("slug") DO NOTHING`
    const rows = await tx.$queryRaw<{ state: State }[]>`
      SELECT "state" FROM "SharedPageState" WHERE "slug" = ${slug} FOR UPDATE`
    const merged: State = { ...(rows[0]?.state ?? {}), ...patch }
    for (const [k, v] of Object.entries(merged)) {
      if (v === null) delete merged[k]
    }
    if (Object.keys(merged).length > MAX_KEYS) {
      throw new Error('too_many_keys')
    }
    return tx.sharedPageState.update({
      where: { slug },
      data: { state: merged as Prisma.InputJsonValue },
    })
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === 'too_many_keys') return null
    throw err
  })

  if (!updated) {
    return NextResponse.json({ error: 'Too many fields' }, { status: 400 })
  }

  return NextResponse.json(
    { state: updated.state, updatedAt: updated.updatedAt },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
