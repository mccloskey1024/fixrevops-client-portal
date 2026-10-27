// Standalone pages served at /p/[slug], with shared state saved through
// /api/p/[slug]/state. The slug is the access key, so keep it unguessable.
import { RR_LUNCHBOX_HTML } from './rr-lunchbox'
import { MAC_TRANSPORT_HTML } from './mac-transport'

export const SHARED_PAGES: Record<string, { title: string; html: string }> = {
  'rr-lunchbox-lidrhvgm': { title: 'R & R Lunchbox: Opening Packet', html: RR_LUNCHBOX_HTML },
  'mac-transport-5zuz5hob': { title: 'Transport Tracker', html: MAC_TRANSPORT_HTML },
}
