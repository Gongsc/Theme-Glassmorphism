import assert from 'node:assert/strict'

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
try {
  // 浏览器禁用站点数据：读 localStorage 属性本身就抛错
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() {throw new DOMException('blocked', 'SecurityError')} })
  const { safeStorage } = await import('./storage.ts')
  assert.equal(safeStorage.getItem('themeMode'), null)
  safeStorage.setItem('themeMode', 'dark')
  assert.equal(safeStorage.getItem('themeMode'), 'dark')
  safeStorage.removeItem('themeMode')
  assert.equal(safeStorage.getItem('themeMode'), null)

  // 可用时直接读写真正的存储，不留内存副本
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => {data.set(k, v)}, removeItem: (k: string) => {data.delete(k)} } })
  safeStorage.setItem('a', '1')
  assert.equal(data.get('a'), '1')
  data.set('a', '2') // 别的标签页改了
  assert.equal(safeStorage.getItem('a'), '2')

  // 写入失败（配额满）时退回内存，读到的仍是新值
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: () => {throw new DOMException('full', 'QuotaExceededError')}, removeItem: (k: string) => {data.delete(k)} } })
  safeStorage.setItem('a', '3')
  assert.equal(safeStorage.getItem('a'), '3')
  console.log('Safe storage: blocked, available and quota fallback passed')
} finally {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
  else Reflect.deleteProperty(globalThis, 'localStorage')
}
