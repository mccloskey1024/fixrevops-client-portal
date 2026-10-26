import { NextRequest } from 'next/server'
import { SHARED_PAGES } from '@/lib/shared-pages'

// Serves a standalone shared page (see src/lib/shared-pages). Its edits are
// saved through /api/p/[slug]/state.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const page = Object.prototype.hasOwnProperty.call(SHARED_PAGES, slug)
    ? SHARED_PAGES[slug]
    : null

  if (!page) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(page.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
