export type PingSample = { task_id: number; time: string; value: number; monitor_bucket_loss?: number }
export type PingTask = { id: number; name: string; loss: number }
export type PingBar = { time: string; latency: number | null; loss: number | null }
export function buildPingRows(records: PingSample[], tasks: PingTask[], selected: string, limit = 3) {
  // Names may contain spaces; retain whitespace-separated IDs from older configs.
  const tokens = selected.trim().split(/[,，;；\n]+/).flatMap(part => {
    const value = part.trim()
    return /^\d+(?:\s+\d+)+$/.test(value) ? value.split(/\s+/) : [value]
  }).filter(Boolean)
  const seen = new Set<number>()
  const ordered = tokens.length ? tokens.flatMap((token,index) => {
    const numericId = /^\d+$/.test(token) && Number(token) > 0 ? Number(token) : null
    const matches = numericId !== null ? tasks.filter(t => t.id === numericId) : tasks.filter(t => t.name === token)
    const candidates = matches.length ? matches : [{id:numericId ?? -(index+1),name:numericId !== null ? `线路 #${numericId}` : token,loss:NaN}]
    return candidates.filter(task => {if (seen.has(task.id)) return false;seen.add(task.id);return true})
  }) : tasks
  return ordered.slice(0, Math.max(1, Math.min(8,limit))).map(task => {
    const points = records.filter(r => r.task_id === task.id && Number.isFinite(Date.parse(r.time)))
      .sort((a,b) => Date.parse(a.time)-Date.parse(b.time))
    const bars: PingBar[] = Array.from({length:20}, () => ({time:'',latency:null,loss:null}))
    // Keep one real backend bucket per segment; never average bucket loss percentages.
    const start = points.length > 20 ? Date.parse(points[0]!.time) : 0
    const end = points.length > 20 ? Date.parse(points.at(-1)!.time) : 0
    points.forEach((point,index) => {
      const slot = points.length <= 20 ? 20-points.length+index : Math.min(19, Math.floor((Date.parse(point.time)-start) / Math.max(1,end-start) * 20))
      bars[slot] = {time:point.time,latency:Number.isFinite(point.value) && point.value >= 0 ? point.value : null,loss: typeof point.monitor_bucket_loss === 'number' && Number.isFinite(point.monitor_bucket_loss) ? point.monitor_bucket_loss : null}
    })
    const latest = points.at(-1)
    return {id:task.id,name:task.name,bars,hasData:points.length>0,
      latency: latest && Number.isFinite(latest.value) && latest.value >= 0 ? latest.value : null,
      timedOut: Boolean(latest && latest.value < 0),
      loss: points.length && Number.isFinite(task.loss) ? task.loss : null}
  })
}
export function pingColor(value: number | null, metric: 'latency' | 'loss') {
  if (value === null) return 'var(--muted-foreground)'
  const thresholds = metric === 'latency' ? [60,100,160,200] : [1,3,6,9]
  const index = thresholds.findIndex(t => value <= t)
  return `var(--signal-${index < 0 ? 5 : index+1})`
}
