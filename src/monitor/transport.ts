import type { Node } from './types'
import { mapNode } from './mapping.ts'
let snapshot: Node[] = []
let received = 0
let pending: Promise<Node[]> | undefined
const historyCache = new Map<string, { time: number, promise: Promise<History> }>()
export async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`/api${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, credentials: 'same-origin' })
  if (response.status === 401) location.assign('/admin/')
  if (!response.ok) throw new Error(`Monitor API ${response.status}`)
  return response.json()
}
// Hub 1.3.2 起 /api/me 下发保留天数 history_days（1–365），metrics 的 hours 上限是它 × 24，登录与匿名相同；
// 旧 Hub 没有这个字段，沿用原来的上限：匿名 168、登录 2160
export function historyHours(days: unknown, authed: boolean): number {
  if (typeof days === 'number' && Number.isInteger(days) && days >= 1) return Math.min(days, 365) * 24
  return authed ? 2160 : 168
}
// 时间范围按钮：小于保留期的整档位，最后加上保留期本身；保留期比某档多不到四分之一时去掉那一档，免得「30 天」「31 天」并列
export function historyWindows(presets: number[], maxHours: number): number[] {
  const hours = presets.filter(h => h === maxHours || h * 1.25 <= maxHours)
  if (maxHours > (presets[0] ?? 0) && !hours.includes(maxHours)) hours.push(maxHours)
  return hours
}
export function windowLabel(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24} 天` : `${hours} 小时`
}
export function acceptNodes(nodes: Node[]) {
  if (!Array.isArray(nodes)) throw new Error('无效节点快照')
  snapshot = nodes; received = Date.now()
  return nodes
}
export async function readNodes() {
  if (Date.now() - received < 1500) return snapshot
  pending ??= request<{ nodes: Node[] }>('/nodes').then(d => acceptNodes(d.nodes)).finally(() => { pending = undefined })
  return pending
}
export function mappedNodes(nodes: Node[]) {
  const entries = nodes.map(mapNode)
  return { clients: Object.fromEntries(entries.map(n => [n.client.uuid, n.client])), statuses: Object.fromEntries(entries.map(n => [n.client.uuid, n.status])) }
}
// net_rx_max / net_tx_max（Hub 1.3.1 起）、cpu_max（1.3.2 起）：桶内最高值，其余是桶内平均
// step：每个点覆盖的秒数（1.3.2 起；7 天以上的窗口读小时汇总，至少 3600）；minutes：桶内有数据的分钟数
type History = { step?: number; metrics: { ts: number; cpu: number; cpu_max?: number; mem_used: number; disk_used: number; net_rx: number; net_tx: number; net_rx_max?: number; net_tx_max?: number; minutes?: number }[]; ping: { ts: number; task_id: number; latency: number | null; loss?: number }[]; probes: Record<string,string>; loss?: Record<string,number> }
async function history(id: string, hours: number, series: string, points = 600) {
  if (!/^\d+$/.test(id)) throw new Error('无效节点编号')
  const path = `/nodes/${id}/metrics?${new URLSearchParams({ hours: String(hours), points: String(points), series })}`
  const cached = historyCache.get(path)
  if (cached && Date.now()-cached.time < 15000) return cached.promise
  const promise = request<History>(path).catch(e => {historyCache.delete(path); throw e})
  if (historyCache.size > 100) historyCache.clear()
  historyCache.set(path, { time: Date.now(), promise })
  return promise
}
async function mapLimited<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let next = 0
  await Promise.all(Array.from({length: Math.min(4, items.length)}, async () => {
    while (next < items.length) {const index = next++; output[index] = await worker(items[index]!)}
  }))
  return output
}
export function probeOrder(h: Pick<History, 'ping' | 'probes'>): [string, string][] {
  const ids = [...new Set([...h.ping.map(p => String(p.task_id)), ...Object.keys(h.probes)])]
  return ids.filter(id => id in h.probes).map(id => [id, h.probes[id]!])
}
export async function records(params: Record<string, unknown>, ping = false) {
  const nodes = await readNodes()
  const ids = params.uuid ? nodes.filter(n => String(n.id) === String(params.uuid)) : nodes
  const result = await mapLimited(ids, async n => {
    const h = await history(String(n.id), Number(params.hours ?? 1), ping ? 'ping' : 'metrics', Number(params.max_count ?? params.maxCount ?? 600))
    if (ping) return {
      records: h.ping.filter(p => !params.task_id || String(p.task_id) === String(params.task_id)).map(p => ({ client: String(n.id), task_id: p.task_id, time: new Date(p.ts*1000).toISOString(), value: p.latency ?? -1, monitor_window_loss: h.loss?.[String(p.task_id)] ?? 0, monitor_bucket_loss: p.loss ?? 0 })),
      // Hub 1.3.1 起 ping 行按面板排序逐个输出；probes 是对象，整数键会被 JS 按大小重排，所以顺序取自 ping 行，无数据的排在后面
      tasks: probeOrder(h).map(([id,name]) => {
        const values = h.ping.filter(p => String(p.task_id) === id && p.latency !== null).map(p => p.latency!)
        return {id:Number(id), name, interval:60, loss:h.loss?.[id] ?? 0, clients:[String(n.id)], avg: values.length ? values.reduce((a,b)=>a+b,0)/values.length : undefined, min: values.length ? Math.min(...values) : undefined, max: values.length ? Math.max(...values) : undefined}
      }),
    }
    return { records: h.metrics.map(p => ({ client:String(n.id), time:new Date(p.ts*1000).toISOString(), cpu:p.cpu, ram:p.mem_used, ram_total:n.mem_total, disk:p.disk_used, disk_total:n.disk_total, net_in:p.net_rx, net_out:p.net_tx, ...(h.step == null ? {} : {step:h.step}), ...(p.cpu_max == null ? {} : {cpu_peak:p.cpu_max}), ...(p.net_rx_max == null ? {} : {net_in_peak:p.net_rx_max}), ...(p.net_tx_max == null ? {} : {net_out_peak:p.net_tx_max}) })) }
  })
  const all = result.flatMap<Record<string, unknown>>(r => r.records)
  return { records: all, count: all.length, tasks: result.flatMap(r => 'tasks' in r ? r.tasks ?? [] : []) }
}
export async function dispatch(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  if (method === 'rpc.ping') {await readNodes(); return 'pong'}
  if (method === 'common:getNodes') return mappedNodes(await readNodes()).clients
  if (method === 'common:getNodesLatestStatus') return mappedNodes(await readNodes()).statuses
  if (method === 'public:getNodesInformation') return Object.values(mappedNodes(await readNodes()).clients)
  if (method === 'public:getRecordsByUUID' || method === 'public:getClientRecentRecords' || method === 'common:getNodeRecentStatus') {
    const r = await records(params)
    return method === 'public:getClientRecentRecords' ? r.records : r
  }
  if (method === 'common:getRecords') return records(params, params.type === 'ping')
  if (method === 'public:getPingRecords') return records(params, true)
  if (method === 'public:getPublicPingTasks') {
    const r = await records({hours:1},true)
    const tasks = new Map<number,typeof r.tasks[number]>()
    for (const t of r.tasks) {const prev=tasks.get(t.id); tasks.set(t.id,{...t,clients:[...new Set([...(prev?.clients??[]),...t.clients])]})}
    return [...tasks.values()]
  }
  throw new Error(`Monitor 不提供此能力：${method}`)
}
