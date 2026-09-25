import assert from 'node:assert/strict'
import { configFields, defaultConfig, fitsConfigField, getSiteConfig, importConfig, loadConfig, saveConfig } from './config.ts'

const originalFetch = globalThis.fetch
const requests: { url: string, init?: RequestInit }[] = []
let saved: Record<string, unknown> = {}
let getStatus = 200
let putStatus = 200
let offline = false
let malformed = false
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  requests.push({ url: String(url), init })
  if (offline) throw new Error('offline')
  if (init?.method === 'PUT') {
    if (putStatus === 200) saved = JSON.parse(String(init.body))
    return json({}, putStatus)
  }
  return malformed ? new Response('not json') : json(saved, getStatus)
}) as typeof fetch

try {
  const fields = configFields.filter(f => f.type !== 'title')
  assert.equal(new Set(fields.map(f => f.key)).size, fields.length)
  assert.ok(fields.every(f => f.key && fitsConfigField(f, f.default)))
  assert.ok(!fields.some(f => ['rpcTransportMode', 'exportSecondaryPassword'].includes(f.key!)))
  saved = { alertTitle: 'Hub 公告', hideEarth: true, backgroundOverlay: 0, homepageMultiPingCount: 999, backgroundType: 'invalid', otherVersion: 'keep' }
  const loaded = await loadConfig()
  assert.equal(loaded.alertTitle, 'Hub 公告')
  assert.equal(loaded.hideEarth, true)
  assert.equal(loaded.homepageMultiPingCount, defaultConfig.homepageMultiPingCount)
  assert.equal(loaded.backgroundType, defaultConfig.backgroundType)
  assert.equal('otherVersion' in loaded, false)
  assert.ok(requests.every(r => r.url === '/api/themes/glassmorphism/config'))
  assert.ok(requests.every(r => r.init?.credentials === 'same-origin'))
  for (const status of [401, 404, 500]) {
    getStatus = status
    assert.deepEqual(await loadConfig(), defaultConfig)
  }
  getStatus = 200
  offline = true
  assert.deepEqual(await loadConfig(), defaultConfig)
  offline = false
  malformed = true
  assert.deepEqual(await loadConfig(), defaultConfig)
  malformed = false
  saved = { hideEarth: true, otherVersion: { keep: true } }
  requests.length = 0
  await saveConfig({ ...defaultConfig, alertTitle: '新公告', visitorInfoEnabled: false })
  assert.deepEqual(saved, { otherVersion: { keep: true }, alertTitle: '新公告', visitorInfoEnabled: false })
  assert.deepEqual(requests.map(r => r.init?.method ?? 'GET'), ['GET', 'PUT'])
  assert.equal(getSiteConfig().alertTitle, '新公告')
  await saveConfig({ ...defaultConfig })
  assert.deepEqual(saved, { otherVersion: { keep: true } })

  for (const status of [400, 401, 403, 404, 413, 500]) {
    const before = getSiteConfig()
    putStatus = status
    await assert.rejects(saveConfig({ ...defaultConfig, alertTitle: '失败不可冒充已保存' }))
    assert.deepEqual(getSiteConfig(), before)
  }
  putStatus = 200
  requests.length = 0
  getStatus = 500
  await assert.rejects(saveConfig(defaultConfig))
  assert.ok(!requests.some(r => r.init?.method === 'PUT'))
  getStatus = 200
  requests.length = 0
  await assert.rejects(saveConfig({ ...defaultConfig, alertContent: '中'.repeat(23000) }), /64 KiB/)
  assert.ok(!requests.some(r => r.init?.method === 'PUT'))
  await assert.rejects(saveConfig({ ...defaultConfig, homepageMultiPingCount: 9 }), /最多显示线路数/)
  await assert.rejects(saveConfig({ ...defaultConfig, backgroundOverlay: NaN }))
  assert.equal(importConfig({ themeOptions: { alertTitle: '旧配置', exportSecondaryPassword: 'secret' } }).alertTitle, '旧配置')
  assert.equal('exportSecondaryPassword' in importConfig({ exportSecondaryPassword: 'secret' }), false)
  assert.throws(() => importConfig({ themeOptions: [] }))
  assert.throws(() => importConfig({ homepageMultiPingCount: 0 }))
  assert.equal(importConfig({ alertTitle: '直接对象' }).alertTitle, '直接对象')

  // Old per-browser settings must never override the hub's site settings.
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ alertTitle: '旧浏览器公告' }) } })
  try {
    saved = { alertTitle: '站点公告' }
    assert.equal((await loadConfig()).alertTitle, '站点公告')
  }
  finally {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
  console.log('Monitor config: manifest validation, fallback, sparse PUT, unknown keys, failures, byte limit and file import passed')
}
finally { globalThis.fetch = originalFetch }
