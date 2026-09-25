import manifest from '../../theme.json' with { type: 'json' }

export interface ConfigField {
  key?: string
  type: string
  label: string
  help?: string
  default?: unknown
  options?: { value: string, label: string }[]
  min?: number
  max?: number
}

export const configFields: ConfigField[] = manifest.config
const valueFields = configFields.filter((f): f is ConfigField & { key: string } => f.type !== 'title' && Boolean(f.key))
export const defaultConfig: Record<string, unknown> = Object.fromEntries(valueFields.map(f => [f.key, f.default]))
const configUrl = `/api/themes/${manifest.short}/config`
let siteConfig = { ...defaultConfig }

function configObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('配置必须为对象')
  return input as Record<string, unknown>
}

export function fitsConfigField(field: ConfigField, value: unknown): boolean {
  switch (field.type) {
    case 'boolean': return typeof value === 'boolean'
    case 'number': return typeof value === 'number' && Number.isFinite(value)
      && value >= (field.min ?? -Infinity) && value <= (field.max ?? Infinity)
    case 'select': return Boolean(field.options?.some(option => option.value === value))
    case 'string':
    case 'text': return typeof value === 'string'
    default: return false
  }
}

export function sanitizeConfig(input: unknown): Record<string, unknown> {
  const values = configObject(input)
  return Object.fromEntries(valueFields.filter(f => Object.hasOwn(values, f.key) && fitsConfigField(f, values[f.key])).map(f => [f.key, values[f.key]]))
}

export function mergeConfig(input: unknown): Record<string, unknown> {
  return { ...defaultConfig, ...sanitizeConfig(input) }
}

export class ConfigRequestError extends Error {
  status: number
  constructor(status: number) {
    const messages: Record<number, string> = {
      400: '请先在此 Hub 安装当前主题版本，再保存设置。',
      401: '登录已失效，请重新登录管理员账号。',
      403: '当前账号无权修改站点配置。',
      404: '此 Hub 不支持主题配置，请升级到 1.3.0 或更新版本。',
      413: '配置超过 64 KiB，请缩短公告或其他文本。',
    }
    super(messages[status] ?? `主题配置请求失败（${status}）`)
    this.status = status
  }
}

async function configRequest(init?: RequestInit): Promise<Response> {
  const response = await fetch(configUrl, { ...init, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new ConfigRequestError(response.status)
  return response
}

export async function readSavedConfig(): Promise<Record<string, unknown>> {
  return configObject(await (await configRequest()).json())
}

export async function loadConfig(): Promise<Record<string, unknown>> {
  // Anonymous, legacy and unavailable hubs render defaults without a warning.
  let saved: Record<string, unknown> = {}
  try { saved = await readSavedConfig() }
  catch { /* defaults */ }
  siteConfig = mergeConfig(saved)
  return getSiteConfig()
}

export function getSiteConfig(): Record<string, unknown> { return { ...siteConfig } }

export async function saveConfig(values: Record<string, unknown>): Promise<Record<string, unknown>> {
  for (const field of valueFields) {
    if (!fitsConfigField(field, values[field.key]))
      throw new Error(`${field.label}的值不符合要求`)
  }
  // PUT replaces the whole object. Preserve keys owned by another theme version.
  const next = { ...await readSavedConfig() }
  for (const field of valueFields) {
    if (values[field.key] === field.default) delete next[field.key]
    else next[field.key] = values[field.key]
  }
  const body = JSON.stringify(next)
  if (new TextEncoder().encode(body).byteLength > 64 * 1024)
    throw new ConfigRequestError(413)
  await configRequest({ method: 'PUT', headers: { 'content-type': 'application/json' }, body })
  siteConfig = mergeConfig(values)
  return getSiteConfig()
}

export function importConfig(input: unknown): Record<string, unknown> {
  const object = configObject(input)
  const values = configObject(Object.hasOwn(object, 'themeOptions') ? object.themeOptions : object)
  for (const field of valueFields) {
    if (Object.hasOwn(values, field.key) && !fitsConfigField(field, values[field.key]))
      throw new Error(`${field.label}的值不符合要求`)
  }
  return mergeConfig(values)
}
