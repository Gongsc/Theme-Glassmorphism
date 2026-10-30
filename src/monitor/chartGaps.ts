/** Preserve real timestamps and insert an explicit break for missing samples. */
export function insertChartGaps<T extends { time: string }>(rows: T[], empty: (time: string) => T, intervalMs?: number): T[] {
  const sorted = rows.filter(row => Number.isFinite(Date.parse(row.time))).slice().sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const gaps = sorted.slice(1).map((row, i) => Date.parse(row.time) - Date.parse(sorted[i]!.time)).filter(gap => gap > 0).sort((a, b) => a - b)
  // Prefer the supplied bucket cadence; otherwise infer it from observed samples.
  const cadence = intervalMs && intervalMs > 0 ? intervalMs : gaps[Math.floor((gaps.length - 1) / 2)]
  if (!cadence) return sorted
  return sorted.flatMap((row, i) => {
    const previous = sorted[i - 1]
    if (previous && Date.parse(row.time) - Date.parse(previous.time) > cadence * 1.5)
      return [empty(new Date(Date.parse(previous.time) + cadence).toISOString()), row]
    return [row]
  })
}
