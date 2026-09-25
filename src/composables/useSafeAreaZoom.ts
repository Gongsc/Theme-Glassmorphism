import { onScopeDispose } from 'vue'
import { UI_CONFIG } from '@/constants/ui'

function isNear(value: number, target: number, epsilon = 0.02): boolean {
  return Math.abs(value - target) <= epsilon
}

/**
 * Safari 网页缩放（aA 50%/75%）会缩小 CSS，但灵动岛 / Home Indicator 的物理尺寸不变，
 * `env(safe-area-inset-*)` 也不会跟着放大。
 *
 * 不能用横屏 `innerWidth / screen.width`：iOS 的 screen.width 常是竖屏短边，横屏会误判成 ~2。
 * aA 缩小时 layout 短边变大，visualViewport.scale 却常常仍是 1，要用 layout / visual 短边比。
 */
export function getSafeAreaZoomOutFactor(): number {
  if (typeof window === 'undefined')
    return 1

  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const clientWidth = document.documentElement.clientWidth
  const clientHeight = document.documentElement.clientHeight
  const visualViewport = window.visualViewport
  const visualWidth = visualViewport?.width
  const visualHeight = visualViewport?.height
  const pinchScale = visualViewport?.scale
  const ratios = [1]

  const cssShort = Math.min(innerWidth, innerHeight)
  const layoutShort = clientWidth > 0 && clientHeight > 0
    ? Math.min(cssShort, Math.min(clientWidth, clientHeight))
    : cssShort
  const screenShort = Math.min(screenWidth, screenHeight)
  if (cssShort > 0 && screenShort > 0)
    ratios.push(cssShort / screenShort)

  if (innerWidth > 0 && clientWidth > 0)
    ratios.push(innerWidth / clientWidth)

  const pinch = typeof pinchScale === 'number' && pinchScale > 0 ? pinchScale : 1
  if (pinch < 1)
    ratios.push(1 / pinch)

  const visualShort = visualWidth && visualHeight
    ? Math.min(visualWidth, visualHeight)
    : visualWidth

  // 双指放大时 visual 变小，不能当成网页缩小去加大 inset。
  if (isNear(pinch, 1) && visualShort && visualShort > 0) {
    if (layoutShort > visualShort)
      ratios.push(layoutShort / visualShort)
    if (screenShort > 0 && visualShort > screenShort)
      ratios.push(visualShort / screenShort)
  }

  const factor = Math.max(...ratios)
  return Math.min(UI_CONFIG.safeArea.zoomOutFactorMax, Math.round(factor * 100) / 100)
}

export function applySafeAreaZoomOutFactor(): void {
  if (typeof document === 'undefined')
    return
  document.documentElement.style.setProperty('--komari-safe-area-zoom', String(getSafeAreaZoomOutFactor()))
}

export function useSafeAreaZoom(): void {
  if (typeof window === 'undefined')
    return

  let raf = 0

  function applySoon(): void {
    applySafeAreaZoomOutFactor()
    if (raf)
      cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      raf = 0
      applySafeAreaZoomOutFactor()
    })
  }

  applySafeAreaZoomOutFactor()

  const visualViewport = window.visualViewport
  window.addEventListener('resize', applySoon)
  window.addEventListener('orientationchange', applySoon)
  visualViewport?.addEventListener('resize', applySoon)
  visualViewport?.addEventListener('scroll', applySoon)

  onScopeDispose(() => {
    if (raf)
      cancelAnimationFrame(raf)
    window.removeEventListener('resize', applySoon)
    window.removeEventListener('orientationchange', applySoon)
    visualViewport?.removeEventListener('resize', applySoon)
    visualViewport?.removeEventListener('scroll', applySoon)
  })
}
