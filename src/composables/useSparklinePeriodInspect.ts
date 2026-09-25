import { onScopeDispose, ref, watch } from 'vue'
import { sparklineIndexAt } from '@/monitor/sparkline'

export interface SparklinePeriodInspect {
  rowKey: string | number
  index: number
  /** 触屏点按后停留，点其他地方才关闭；鼠标悬停离开即关闭。 */
  sticky: boolean
}

// 触屏点按后浏览器会补发兼容 mouse 事件，这段时间内忽略，避免提示闪一下就消失。
const MOUSE_COMPAT_MS = 700

function isCoarse(event: PointerEvent): boolean {
  return event.pointerType === 'touch' || event.pointerType === 'pen'
}

/**
 * Sparkline 时段查看：悬停或点按折线显示该时段的时间、延迟与丢包。
 * 移植自 towersip/komari-theme-Glassmorphism 3.3.19。
 */
export function useSparklinePeriodInspect() {
  const inspect = ref<SparklinePeriodInspect | null>(null)
  let host: HTMLElement | null = null
  let lastCoarseAt = 0

  const isCompatMouse = (event: PointerEvent) =>
    event.pointerType === 'mouse' && lastCoarseAt > 0 && performance.now() - lastCoarseAt < MOUSE_COMPAT_MS

  function set(event: PointerEvent, rowKey: string | number, count: number, sticky: boolean) {
    const target = event.currentTarget
    if (!(target instanceof HTMLElement))
      return
    const rect = target.getBoundingClientRect()
    host = target
    inspect.value = {
      rowKey,
      index: rect.width > 0 ? sparklineIndexAt((event.clientX - rect.left) / rect.width, count) : 0,
      sticky,
    }
  }

  function clear() {
    inspect.value = null
    host = null
  }

  function onPointerDown(event: PointerEvent, rowKey: string | number, count: number) {
    const sticky = isCoarse(event)
    if (sticky)
      lastCoarseAt = performance.now()
    set(event, rowKey, count, sticky)
  }

  function onPointerMove(event: PointerEvent, rowKey: string | number, count: number) {
    if (isCompatMouse(event) || (isCoarse(event) && !inspect.value))
      return
    set(event, rowKey, count, inspect.value?.sticky === true || isCoarse(event))
  }

  function onPointerLeave(event: PointerEvent, rowKey: string | number) {
    if (inspect.value?.sticky || isCoarse(event) || isCompatMouse(event) || inspect.value?.rowKey !== rowKey)
      return
    clear()
  }

  function onDocumentPointerDown(event: PointerEvent) {
    if (host && event.target instanceof Node && host.contains(event.target))
      return
    clear()
  }

  watch(() => inspect.value?.sticky === true, (sticky) => {
    if (sticky)
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
    else
      document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  })

  onScopeDispose(() => document.removeEventListener('pointerdown', onDocumentPointerDown, true))

  return { inspect, onPointerDown, onPointerMove, onPointerLeave, clear }
}
