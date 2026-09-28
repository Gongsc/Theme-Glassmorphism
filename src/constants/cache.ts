import { TIME_MS } from './time'

export const CACHE_CONFIG = {
  request: {
    ttl: 5 * TIME_MS.minute,
  },
  promise: {
    ttl: 30 * TIME_MS.second,
  },
  cleanup: {
    interval: 5 * TIME_MS.minute,
  },
} as const
