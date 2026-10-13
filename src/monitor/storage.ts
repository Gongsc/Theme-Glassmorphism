// 浏览器对站点禁用数据时，连读 localStorage 这个属性都会抛 SecurityError，store 初始化跟着失败就是整页白屏。
// 这里读写失败都退回内存：页面照常可用，只是偏好不跨会话保存。写成功的键不留内存副本，别的标签页改了仍能读到
const memory = new Map<string, string>()

function local(): Storage | undefined {
  try {return globalThis.localStorage ?? undefined} catch {return undefined}
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (memory.has(key)) return memory.get(key)!
    try {return local()?.getItem(key) ?? null} catch {return null}
  },
  setItem(key: string, value: string): void {
    try {
      const storage = local()
      if (storage) {storage.setItem(key, value); memory.delete(key); return}
    } catch {}
    memory.set(key, value)
  },
  removeItem(key: string): void {
    memory.delete(key)
    try {local()?.removeItem(key)} catch {}
  },
}
