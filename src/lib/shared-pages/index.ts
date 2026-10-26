// Standalone pages served at /p/[slug], with shared state saved through
// /api/p/[slug]/state. The slug is the access key, so keep it unguessable.
import { RR_LUNCHBOX_HTML } from './rr-lunchbox'

export const SHARED_PAGES: Record<string, { title: string; html: string }> = {
  'rr-lunchbox-lidrhvgm': { title: 'R & R Lunchbox: Opening Packet', html: RR_LUNCHBOX_HTML },
}
