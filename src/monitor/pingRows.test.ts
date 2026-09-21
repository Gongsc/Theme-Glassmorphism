import assert from 'node:assert/strict'
import { buildPingRows } from './pingRows.ts'
const samples = [
  {task_id:1,time:'2026-09-21T00:00:00Z',value:165,monitor_bucket_loss:50},
  {task_id:1,time:'2026-09-21T00:01:00Z',value:-1,monitor_bucket_loss:100},
  {task_id:2,time:'2026-09-21T00:01:00Z',value:132,monitor_bucket_loss:0},
]
const tasks = [{id:1,name:'电信',loss:7.69},{id:2,name:'移动',loss:0}]
const rows=buildPingRows(samples,tasks,'2,1,9,2',8)
assert.deepEqual(rows.map(r=>r.id),[2,1,9])
assert.equal(rows[0]!.latency,132)
assert.equal(rows[0]!.loss,0)
assert.equal(rows[1]!.loss,7.69) // Must not average 50% and 100% buckets.
assert.equal(rows[1]!.latency,null);assert.equal(rows[1]!.timedOut,true)
assert.equal(rows[2]!.loss,null);assert.equal(rows[2]!.hasData,false)
assert.equal(rows[0]!.bars.length,20);assert.equal(rows[0]!.bars[0]!.latency,null)
assert.equal(rows[1]!.bars.at(-1)!.loss,100)
assert.equal(buildPingRows(samples,tasks,'',1).length,1)
assert.equal(buildPingRows([],tasks,'',3)[0]!.loss,null)
console.log('Multi-ping: per-task isolation, selected order, exact loss, timeouts and missing data passed')

assert.deepEqual(buildPingRows(samples,tasks,'移动，电信',8).map(r=>r.id),[2,1])
assert.deepEqual(buildPingRows(samples,tasks,'移动,2,电信',8).map(r=>r.id),[2,1])
assert.deepEqual(buildPingRows(samples,tasks,'2 1',8).map(r=>r.id),[2,1])
const missing=buildPingRows(samples,tasks,'不存在的线路',8)[0]!
assert.equal(missing.name,'不存在的线路');assert.equal(missing.latency,null)
assert.deepEqual(buildPingRows([], [{id:3,name:'Hong Kong',loss:0}], 'Hong Kong',8).map(r=>r.id),[3])
assert.deepEqual(buildPingRows([], [{id:3,name:'同名',loss:0},{id:4,name:'同名',loss:0}], '同名,同名',8).map(r=>r.id),[3,4])
console.log('Multi-ping names: exact matching, ordering, mixed IDs, spaces, duplicates and missing names passed')
