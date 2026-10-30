import assert from 'node:assert/strict'
import { insertChartGaps } from './chartGaps.ts'
const row = (seconds: number, value: number | null = seconds) => ({ time: new Date(seconds * 1000).toISOString(), value })
const empty = (time: string) => ({ time, value: null })
assert.deepEqual(insertChartGaps([], empty), [])
assert.deepEqual(insertChartGaps([row(0), row(60), row(120)], empty), [row(0), row(60), row(120)])
assert.deepEqual(insertChartGaps([row(600), row(0), row(60)], empty), [row(0), row(60), row(120, null), row(600)])
assert.deepEqual(insertChartGaps([row(0), row(60, null), row(120)], empty), [row(0), row(60, null), row(120)])
assert.equal(insertChartGaps([row(0), row(3600), row(7200)], empty, 3600000).length, 3)
assert.equal(insertChartGaps([row(0), row(61), row(120)], empty, 60000).length, 3)
assert.equal(insertChartGaps([row(0), row(600)], empty, 60000)[1]!.value, null)
console.log('Chart gaps: missing intervals, explicit null, jitter, sorting and bucket cadence passed')
