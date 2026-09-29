import assert from 'node:assert/strict'
import { mapNode } from './mapping.ts'
import { probeOrder } from './transport.ts'
import type { Node } from './types.ts'
const node = {
  id: 7, name: 'JP', sort: 2, country: 'JP', online: true, last_seen: 1700000000,
  cpu_name: 'CPU', cpu_cores: 4, os: 'Linux', arch:'x86_64', kernel:'6', virt:'kvm',
  mem_total: 800, swap_total: 100, disk_total: 1600, agent_version: '1', price: 5,
  currency: 'USD', billing_cycle:'yearly', expires_at:null, traffic_limit:10000, traffic_mode:'max',
  total_tx:900, total_rx:1800, month_tx:90, month_rx:180,
  metrics: {cpu:25,mem_used:200,swap_used:2,disk_used:500,load:[1,2,3],net_rx:120,net_tx:60,tcp:5,udp:2,procs:10,uptime:86400},
} as Node
const {client,status} = mapNode(node)
assert.equal(client.uuid,'7'); assert.equal(client.billing_cycle,365)
assert.equal(client.region,'JP'); assert.equal(client.expired_at,'')
assert.equal(status.ram,200); assert.equal(status.net_in,120); assert.equal(status.net_out,60)
assert.equal(status.traffic_up,90); assert.equal(status.net_total_up,900)
assert.equal(status.traffic_down,180); assert.equal(status.net_total_down,1800)
// month_used 是 Hub 按计费方式算好的本周期用量，优先于按上下行重新计算；旧版 Hub 没有该字段
assert.equal('traffic_used' in status,false)
assert.equal(mapNode({...node,traffic_mode:'up',month_used:95}).status.traffic_used,95)
assert.equal(status.connections_udp,2)
const offline = mapNode({...node,online:false})
assert.equal(offline.status.online,false); assert.equal(offline.status.net_in,0)
assert.equal(offline.status.net_total_down,1800)
assert.equal(mapNode({...node,billing_cycle:'once'}).client.billing_cycle,-1)
for (const [cycle, days] of [['60m',1825],['18m',540],['4m',120],['0m',0],['1201m',0],['weekly',0]] as const)
  assert.equal(mapNode({...node,billing_cycle:cycle}).client.billing_cycle,days,cycle)
assert.equal(mapNode({...node,remark:'主节点；高带宽'}).client.remark,'主节点；高带宽')
assert.equal('ipv4' in client,false); assert.equal('ipv6' in client,false)
const panel = mapNode({...node,ipv4:'10.0.0.2',ipv6:'',addresses:[{address:'203.0.113.7',source:'interface'},{address:'2001:db8::7',source:'manual'}]}).client
assert.equal(panel.ipv4,'203.0.113.7'); assert.equal(panel.ipv6,'2001:db8::7')
// 旧版 Hub 没有 addresses：网卡公网地址优先，NAT 后的内网地址换成连接来源，全是内网时照常显示
assert.equal(mapNode({...node,ipv4:'198.51.100.3',ipv6:''}).client.ipv4,'198.51.100.3')
assert.equal('ipv6' in mapNode({...node,ipv4:'198.51.100.3',ipv6:''}).client,false)
assert.equal(mapNode({...node,ip:'203.0.113.9',ipv4:'10.0.0.5',ipv6:''}).client.ipv4,'203.0.113.9')
const natV6 = mapNode({...node,ip:'2001:db8::9',ipv4:'10.0.0.5',ipv6:'2001:db8::5'}).client
assert.equal('ipv4' in natV6,false); assert.equal(natV6.ipv6,'2001:db8::5')
assert.equal(mapNode({...node,ip:'192.168.1.2',ipv4:'192.168.1.5',ipv6:''}).client.ipv4,'192.168.1.5')
assert.equal(mapNode({...node,ip:'203.0.113.9'}).client.ipv4,'203.0.113.9')
console.log('Monitor mapping: identity, billing, live metrics, offline state, monthly/total traffic and public metadata passed')

// Contract test: history is obtained exclusively from Monitor REST endpoints.
const { acceptNodes, records, dispatch } = await import('./transport.ts')
acceptNodes([node])
const oldFetch = globalThis.fetch
const requests: string[] = []
globalThis.fetch = (async (url: string | URL | Request) => {
  requests.push(String(url))
  return new Response(JSON.stringify({
    metrics: [{ts:1700000000,cpu:25,mem_used:200,disk_used:500,net_rx:120,net_tx:60,net_rx_max:480,net_tx_max:90},{ts:1700000060,cpu:25,mem_used:200,disk_used:500,net_rx:100,net_tx:50}],
    ping: [{ts:1700000000,task_id:1,latency:20,loss:50},{ts:1700000060,task_id:1,latency:null,loss:100}],
    probes: {'1':'Probe'}, loss: {'1':7.69},
  }),{status:200,headers:{'content-type':'application/json'}})
}) as typeof fetch
try {
  const ping = await records({uuid:'7',hours:1},true)
  assert.equal(ping.records[0]?.monitor_window_loss,7.69)
  assert.equal(ping.records[1]?.value,-1)
  assert.equal(ping.tasks[0]?.loss,7.69)
  const history = await records({uuid:'7',hours:1})
  assert.equal(history.records[0]?.net_in,120)
  assert.equal(history.records[0]?.net_in_peak,480); assert.equal(history.records[0]?.net_out_peak,90)
  assert.equal('net_in_peak' in history.records[1]!,false)
  assert.equal('net_total_up' in history.records[0]!,false)
  assert.ok(requests.every(url => url.startsWith('/api/nodes/7/metrics?')))
  await assert.rejects(dispatch('admin:getLogs'), /Monitor 不提供/)
} finally {globalThis.fetch = oldFetch}
console.log('Monitor history: endpoints, timeout samples, exact window loss and missing historical metrics and bucket peaks passed')

// The hub's calendar is authoritative, even when the browser date disagrees.
const { getDaysUntilExpired, getExpireStatus, getExpireText, getRemainingValue } = await import('../utils/tagHelper.ts')
const past = '2000-01-01'
const future = '2999-01-01'
for (const days of [undefined, null, 0, -3, 7]) {
  assert.equal(mapNode({ ...node, expires_in: days }).client.expires_in, days)
}
assert.equal(getDaysUntilExpired(past, 7), 7)
assert.notEqual(getExpireStatus(past, 7), 'expired')
assert.equal(getExpireStatus(past, 0), 'critical')
assert.equal(getExpireText(past, 'zh-CN', 0), '今天到期')
assert.equal(getExpireText(past, 'en-US', 0), 'Expires today')
assert.equal(getExpireStatus(future, -3), 'expired')
assert.equal(getDaysUntilExpired(future, -3), -3)
assert.equal(getExpireStatus(future, null), 'unknown')
assert.equal(getExpireText(future, 'zh-CN', null), '-')
assert.equal(getExpireStatus(past), 'expired')
assert.equal(getExpireStatus(future), 'long_term')
assert.equal(getExpireStatus('invalid'), 'unknown')
assert.equal(getExpireStatus(future, NaN), 'unknown')
assert.equal(getRemainingValue(30, 30, past, 7), 7)
assert.equal(getRemainingValue(30, 30, future, null), 0)
console.log('Monitor expiry: server days, today, expired, unset and legacy fallback passed')

const { buildGroupTabs, groupTabId, isNodeInGroup, parseNodeGroups, ALL_GROUPS, UNGROUPED } = await import('../utils/groupHelper.ts')
const groupNames = ['all', 'none', '*', '全部', '未分组', '全部节点', 'group:all', 'ungrouped', '甲;乙', ' 空格 ']
const groupedNodes = groupNames.map((group, index) => mapNode({ ...node, id: index + 1, group }).client)
assert.equal(mapNode(node).client.group, '')
assert.deepEqual(parseNodeGroups('甲;乙'), ['甲;乙'])
assert.deepEqual(parseNodeGroups(' 空格 '), [' 空格 '])
assert.deepEqual(buildGroupTabs([{}, { group: '' }]), [{ tab: '全部节点', name: ALL_GROUPS }])
const tabs = buildGroupTabs([...groupedNodes, groupedNodes[0]!, { group: '' }])
assert.deepEqual(tabs.map(tab => tab.name), [ALL_GROUPS, ...groupNames.map(groupTabId), UNGROUPED])
assert.equal(new Set(tabs.map(tab => tab.name)).size, tabs.length)
for (const name of groupNames) {
  assert.deepEqual(groupedNodes.filter(n => isNodeInGroup(n.group, groupTabId(name))).map(n => n.group), [name])
}
assert.equal(isNodeInGroup(undefined, UNGROUPED), true)
assert.equal(isNodeInGroup('未分组', UNGROUPED), false)
assert.equal(isNodeInGroup('all', ALL_GROUPS), true)
assert.equal(isNodeInGroup('', groupTabId('all')), false)
assert.deepEqual(buildGroupTabs([...groupedNodes].reverse()).slice(1).map(t => t.name), [...groupNames].reverse().map(groupTabId))
console.log('Monitor groups: intact names, collision-free tabs, ordering, ungrouped, legacy fallback passed')

// 面板把 12 排到 3 前面；探测 7 没有数据，排在最后；已删除的 99 不出现
const ping = [{ts:0,task_id:12,latency:1},{ts:60,task_id:12,latency:1},{ts:0,task_id:3,latency:2},{ts:0,task_id:99,latency:3}]
assert.deepEqual(probeOrder({ping, probes:{'3':'b','7':'c','12':'a'}}), [['12','a'],['3','b'],['7','c']])
console.log('Probe order: panel order from ping rows, idle probes last passed')
