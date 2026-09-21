import type { Node } from './types'
export function mapNode(n: Node) {
  const m = n.online ? n.metrics : null
  const cycle: Record<string, number> = { monthly: 30, quarterly: 90, semiannual: 180, yearly: 365, biennial: 730, triennial: 1095, once: -1 }
  const client = {
    uuid: String(n.id), name: n.name, cpu_name: n.cpu_name, virtualization: n.virt, arch: n.arch,
    cpu_cores: n.cpu_cores, os: n.os, kernel_version: n.kernel, region: n.country,
    public_remark: '', mem_total: n.mem_total, swap_total: n.swap_total, disk_total: n.disk_total,
    version: n.agent_version, weight: n.sort, price: n.price, currency: n.currency,
    billing_cycle: cycle[n.billing_cycle] ?? 0, auto_renewal: false, expired_at: n.expires_at || '',
    group: '', tags: '', hidden: false, traffic_limit: n.traffic_limit, traffic_limit_type: n.traffic_mode,
    created_at: '', updated_at: '',
  }
  const status = {
    client: String(n.id), time: new Date(n.last_seen * 1000).toISOString(), online: n.online,
    cpu: m?.cpu ?? 0, gpu: 0, ram: m?.mem_used ?? 0, ram_total: n.mem_total,
    swap: m?.swap_used ?? 0, swap_total: n.swap_total, disk: m?.disk_used ?? 0, disk_total: n.disk_total,
    load: m?.load?.[0] ?? 0, load5: m?.load?.[1] ?? 0, load15: m?.load?.[2] ?? 0, temp: 0,
    net_in: m?.net_rx ?? 0, net_out: m?.net_tx ?? 0,
    net_total_up: n.total_tx, net_total_down: n.total_rx, traffic_up: n.month_tx, traffic_down: n.month_rx,
    connections: m?.tcp ?? 0, connections_udp: m?.udp ?? 0, process: m?.procs ?? 0, uptime: m?.uptime ?? 0,
  }
  return { client, status }
}
