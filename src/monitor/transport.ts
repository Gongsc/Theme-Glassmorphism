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
type History = { metrics: { ts: number; cpu: number; mem_used: number; disk_used: number; net_rx: number; net_tx: number }[]; ping: { ts: number; task_id: number; latency: number | null; loss?: number }[]; probes: Record<string,string>; loss?: Record<string,number> }
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
export async function records(params: Record<string, unknown>, ping = false) {
  const nodes = await readNodes()
  const ids = params.uuid ? nodes.filter(n => String(n.id) === String(params.uuid)) : nodes
  const result = await mapLimited(ids, async n => {
    const h = await history(String(n.id), Number(params.hours ?? 1), ping ? 'ping' : 'metrics', Number(params.max_count ?? params.maxCount ?? 600))
    if (ping) return {
      records: h.ping.filter(p => !params.task_id || String(p.task_id) === String(params.task_id)).map(p => ({ client: String(n.id), task_id: p.task_id, time: new Date(p.ts*1000).toISOString(), value: p.latency ?? -1, monitor_window_loss: h.loss?.[String(p.task_id)] ?? 0, monitor_bucket_loss: p.loss ?? 0 })),
      tasks: Object.entries(h.probes).map(([id,name]) => {
        const values = h.ping.filter(p => String(p.task_id) === id && p.latency !== null).map(p => p.latency!)
        return {id:Number(id), name, interval:60, loss:h.loss?.[id] ?? 0, clients:[String(n.id)], avg: values.length ? values.reduce((a,b)=>a+b,0)/values.length : undefined, min: values.length ? Math.min(...values) : undefined, max: values.length ? Math.max(...values) : undefined}
      }),
    }
    return { records: h.metrics.map(p => ({ client:String(n.id), time:new Date(p.ts*1000).toISOString(), cpu:p.cpu, ram:p.mem_used, ram_total:n.mem_total, disk:p.disk_used, disk_total:n.disk_total, net_in:p.net_rx, net_out:p.net_tx })) }
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
