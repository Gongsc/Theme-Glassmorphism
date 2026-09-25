// 首页多线路延迟的 Sparkline 折线几何，移植自 towersip/komari-theme-Glassmorphism 3.3.19。
// 纯函数，供 Sparkline.vue 与时段查看共用，Node 测试可直接加载。
export type SparklineGeometry = { linePaths: string[], fillPaths: string[], width: number, height: number }
type Point = { x: number, y: number }

function percentile(sorted: number[], p: number): number {
  const pos = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * p))
  const lo = sorted[Math.floor(pos)]!
  const hi = sorted[Math.ceil(pos)]!
  return lo + (hi - lo) * (pos - Math.floor(pos))
}

/** 纵轴范围：远超 p95 的尖峰会被截顶，避免把其余折线压成一条直线；提示里仍显示真实值。 */
export function robustDomain(values: number[]): { min: number, max: number } {
  if (!values.length) return { min: 0, max: 1 }
  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]!
  const max = sorted.at(-1)!
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.08)
    return { min: min - pad, max: max + pad }
  }
  const p95 = percentile(sorted, 0.95)
  const cappedMax = max > p95 * 1.8 && p95 > min ? p95 + (max - min) * 0.12 : max
  const pad = Math.max((cappedMax - min) * 0.08, 0.5)
  return { min: min - pad, max: cappedMax + pad }
}

function catmullRom(points: Point[]): string {
  const f = (n: number) => n.toFixed(2)
  let path = `M ${f(points[0]!.x)} ${f(points[0]!.y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    path += ` C ${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)}, ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)}, ${f(p2.x)} ${f(p2.y)}`
  }
  return path
}

/** 按槽位等距排布；null（无采样或超时）处断开，不在缺口两侧连线。 */
export function buildSparklineGeometry(values: Array<number | null>, width = 120, height = 28, padding = 2): SparklineGeometry {
  const geometry: SparklineGeometry = { linePaths: [], fillPaths: [], width, height }
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (!finite.length) return geometry
  const { min, max } = robustDomain(finite)
  const inner = Math.max(1, height - padding * 2)
  const baseline = height - padding
  const x = (i: number) => sparklinePointPercent(i, values.length) / 100 * width
  const y = (v: number) => Math.min(baseline, Math.max(padding, padding + (1 - (v - min) / (max - min || 1)) * inner))
  let segment: Point[] = []
  const flush = () => {
    if (!segment.length) return
    if (segment.length === 1) {
      // 孤立点画成短横线，否则看不见。
      const p = segment[0]!
      segment = [{ x: Math.max(0, p.x - 4), y: p.y }, p, { x: Math.min(width, p.x + 4), y: p.y }]
    }
    const line = catmullRom(segment)
    geometry.linePaths.push(line)
    geometry.fillPaths.push(`${line} L ${segment.at(-1)!.x.toFixed(2)} ${baseline.toFixed(2)} L ${segment[0]!.x.toFixed(2)} ${baseline.toFixed(2)} Z`)
    segment = []
  }
  values.forEach((v, i) => {
    if (v !== null && Number.isFinite(v)) segment.push({ x: x(i), y: y(v) })
    else flush()
  })
  flush()
  return geometry
}

/** 第 index 个槽位在折线上的横向位置（百分比），与几何 x 坐标一致。 */
export function sparklinePointPercent(index: number, count: number): number {
  return count <= 1 ? 50 : index / (count - 1) * 100
}

/** 指针横向比例（0–1）对应的最近槽位。 */
export function sparklineIndexAt(ratio: number, count: number): number {
  const last = Math.max(count - 1, 0)
  return Math.min(last, Math.max(0, Math.round(ratio * last)))
}
