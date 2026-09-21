import schema from '../theme-schema.json'
export const configFields = schema.configuration.data.filter(f => !['rpcTransportMode', 'exportSecondaryPassword'].includes(f.key ?? ''))
export const defaultConfig: Record<string, unknown> = Object.fromEntries(configFields.filter(f => f.key).map(f => [f.key!, f.default]))
// Monitor does not expose GPU metrics, visitor IP, or Komari audit endpoints.
defaultConfig.visitorInfoEnabled = false
export const CONFIG_KEY = 'monitor:glassmorphism:original:v2'
let siteConfig: Record<string, unknown> = { ...defaultConfig }
export function sanitizeConfig(input: unknown) {
  const result: Record<string, unknown> = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配置必须为对象')
  const values = input as Record<string,unknown>
  for (const field of configFields) {
    if (!field.key) continue
    const value = values[field.key]
    if (field.type === 'switch' && typeof value === 'boolean') result[field.key] = value
    if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) result[field.key] = value
    if (['string','richtext'].includes(field.type) && typeof value === 'string') result[field.key] = value.slice(0, 20000)
    if (field.type === 'select' && typeof value === 'string' && field.options?.split(',').includes(value)) result[field.key] = value
  }
  return result
}
export function localConfig() {
  try {return sanitizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'))} catch {return {}}
}
export async function loadConfig() {
  try {const res = await fetch('/glass-config.json'); if (res.ok) siteConfig = {...defaultConfig,...sanitizeConfig((await res.json()).themeOptions)}} catch { /* built-in defaults */ }
  return {...siteConfig,...localConfig()}
}
export function getSiteConfig() {return {...siteConfig}}
