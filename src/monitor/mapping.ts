import type { Node } from './types'
const PRIVATE_V4 = /^(0\.|10\.|127\.|169\.254\.|192\.168\.|192\.0\.0\.|198\.1[89]\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/
const PRIVATE_V6 = /^(::1?$|f[cd]|fe[89ab])/i
const isV6 = (a: string) => a.includes(':')
const isPublic = (a: string, v6: boolean) => Boolean(a) && isV6(a) === v6 && !(v6 ? PRIVATE_V6 : PRIVATE_V4).test(a)
/**
 * 仅登录后 Hub 才返回地址。优先使用 Hub 为面板选出的 addresses；旧版 Hub 没有该字段时按同样规则挑选：
 * 每个协议族优先用网卡上的公网地址，网卡只有内网地址（NAT）时用连接来源地址，都没有公网地址时才显示内网地址。
 */
function nodeAddresses(n: Node): { ipv4?: string, ipv6?: string } {
  let list: string[]
  if (n.addresses) {
    list = n.addresses.map(a => a.address)
  }
  else {
    const ip = n.ip ?? '', held = [n.ipv4 ?? '', n.ipv6 ?? '']
    const family = (a: string, v6: boolean) => isPublic(a, v6) ? a : a && isPublic(ip, v6) ? ip : ''
    list = [family(held[0]!, false), family(held[1]!, true)].filter(Boolean)
    if (!list.length)
      list = held.filter(Boolean)
    if (!list.length && ip)
      list = [ip]
  }
  const ipv4 = list.find(a => a && !isV6(a)), ipv6 = list.find(a => a && isV6(a))
  return { ...(ipv4 ? { ipv4 } : {}), ...(ipv6 ? { ipv6 } : {}) }
}
const NAMED_CYCLES: Record<string, number> = { monthly: 30, quarterly: 90, semiannual: 180, yearly: 365, biennial: 730, triennial: 1095, once: -1 }
// 付款周期 → 天数；Hub 1.3.1 起任意月数存为 `<n>m`（1–1200），整年按 365 天，其余按 30 天/月
export function cycleDays(cycle: string): number {
  if (cycle in NAMED_CYCLES) return NAMED_CYCLES[cycle]!
  const match = /^(\d+)m$/.exec(cycle)
  const months = match ? Number(match[1]) : 0
  if (months < 1 || months > 1200) return 0
  return months % 12 === 0 ? months / 12 * 365 : months * 30
}
// 卡片备注：公开备注在前；私有备注 remark 只有登录后 Hub 才下发，跟在后面一起显示，重复的项只留一个
export function nodeRemark(n: Pick<Node, 'public_remark' | 'remark'>): string {
  const parts = [n.public_remark, n.remark].flatMap(r => typeof r === 'string' ? r.split(/[;；]/) : []).map(p => p.trim()).filter(Boolean)
  return [...new Set(parts)].join('；')
}
export function mapNode(n: Node) {
  const m = n.online ? n.metrics : null
  const client = {
    uuid: String(n.id), name: n.name, cpu_name: n.cpu_name, virtualization: n.virt, arch: n.arch,
    cpu_cores: n.cpu_cores, os: n.os, kernel_version: n.kernel, region: n.country,
    remark: nodeRemark(n), mem_total: n.mem_total, swap_total: n.swap_total, disk_total: n.disk_total,
    version: n.agent_version, weight: n.sort, price: n.price, currency: n.currency,
    billing_cycle: cycleDays(n.billing_cycle), auto_renewal: false, expired_at: n.expires_at || '', expires_in: n.expires_in,
    group: typeof n.group === 'string' ? n.group : '', hidden: false, traffic_limit: n.traffic_limit, traffic_limit_type: n.traffic_mode,
    created_at: '', updated_at: '', ...nodeAddresses(n),
  }
  const status = {
    client: String(n.id), time: new Date(n.last_seen * 1000).toISOString(), online: n.online,
    cpu: m?.cpu ?? 0, ram: m?.mem_used ?? 0, ram_total: n.mem_total,
    swap: m?.swap_used ?? 0, swap_total: n.swap_total, disk: m?.disk_used ?? 0, disk_total: n.disk_total,
    load: m?.load?.[0] ?? 0, load5: m?.load?.[1] ?? 0, load15: m?.load?.[2] ?? 0,
    net_in: m?.net_rx ?? 0, net_out: m?.net_tx ?? 0,
    net_total_up: n.total_tx, net_total_down: n.total_rx, traffic_up: n.month_tx, traffic_down: n.month_rx,
    ...(typeof n.month_used === 'number' ? { traffic_used: n.month_used } : {}),
    connections: m?.tcp ?? 0, connections_udp: m?.udp ?? 0, process: m?.procs ?? 0, uptime: m?.uptime ?? 0,
  }
  return { client, status }
}
