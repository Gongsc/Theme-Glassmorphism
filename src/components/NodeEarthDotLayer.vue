<script setup lang="ts">
import {
  useDocumentVisibility,
  useElementSize,
  useElementVisibility,
  usePreferredReducedMotion,
  useRafFn,
} from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'

export interface DotMarker {
  id: string
  x: number
  y: number
  servers: number
  online: boolean
}

const props = defineProps<{
  markers: DotMarker[]
  width: number
  height: number
  northLat: number
  southLat: number
  maskSrc: string
}>()

const appStore = useAppStore()

// 栅格以 viewBox 单位计：1440 宽 → 144 列圆点
const PITCH = 10
const DOT_RADIUS = PITCH * 0.24
const SEA_RADIUS = DOT_RADIUS * 0.7
const SCAN_HALF_WIDTH = 60
const SCAN_SPEED = 0.11 // viewBox 单位/毫秒
const RIPPLE_PERIOD = 1800
const RIPPLE_SPREAD = PITCH * 6

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const { width: containerWidth, height: containerHeight } = useElementSize(containerRef)
const documentVisibility = useDocumentVisibility()
const elementVisible = useElementVisibility(containerRef)
const reducedMotion = usePreferredReducedMotion()
const animated = computed(() => reducedMotion.value !== 'reduce' && !appStore.stopEarth)
const shouldRender = computed(() => documentVisibility.value === 'visible' && elementVisible.value)

// 浅色背景是半透明的浅蓝玻璃，陆地用深蓝实色、海洋加深，保证点阵对比度
const palette = computed(() => appStore.isDark
  ? { land: '96 165 250', landAlpha: 0.85, sea: '148 163 184', seaAlpha: 0.1, scan: '96 165 250', online: '52 211 153', offline: '251 113 133' }
  : { land: '30 64 175', landAlpha: 0.9, sea: '51 65 85', seaAlpha: 0.2, scan: '14 165 233', online: '5 150 105', offline: '225 29 72' })

const cols = Math.floor(props.width / PITCH)
const rows = Math.floor(props.height / PITCH)
// 每个格点是否为陆地；遮罩加载前全部视为海洋
let landGrid: Uint8Array | null = null
let baseLayer: HTMLCanvasElement | null = null
let layout = { dpr: 1, scale: 1, offsetX: 0, offsetY: 0 }
const startTime = performance.now()

function cellCenter(col: number, row: number): [number, number] {
  return [(col + 0.5) * PITCH, (row + 0.5) * PITCH]
}

function loadLandGrid() {
  const image = new Image()
  image.onload = () => {
    const sampleWidth = 720
    const sampleHeight = 360
    const canvas = document.createElement('canvas')
    canvas.width = sampleWidth
    canvas.height = sampleHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
      return
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight)
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data
    const grid = new Uint8Array(cols * rows)
    for (let row = 0; row < rows; row++) {
      const [, y] = cellCenter(0, row)
      const lat = props.northLat - (y / props.height) * (props.northLat - props.southLat)
      const sy = Math.min(sampleHeight - 1, Math.max(0, Math.floor((90 - lat) / 180 * sampleHeight)))
      for (let col = 0; col < cols; col++) {
        const [x] = cellCenter(col, 0)
        const sx = Math.min(sampleWidth - 1, Math.floor(x / props.width * sampleWidth))
        // 水体遮罩：白色为海洋，深色为陆地
        grid[row * cols + col] = pixels[(sy * sampleWidth + sx) * 4 + 1]! < 128 ? 1 : 0
      }
    }
    landGrid = grid
    rebuildBase()
  }
  image.src = props.maskSrc
}

function updateLayout(): boolean {
  const canvas = canvasRef.value
  const width = containerWidth.value
  const height = containerHeight.value
  if (!canvas || width <= 0 || height <= 0)
    return false
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  // 与 SVG 的 preserveAspectRatio="xMidYMid meet" 保持一致
  const scale = Math.min(width / props.width, height / props.height)
  layout = {
    dpr,
    scale,
    offsetX: (width - props.width * scale) / 2,
    offsetY: (height - props.height * scale) / 2,
  }
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  return true
}

function applyTransform(context: CanvasRenderingContext2D) {
  const { dpr, scale, offsetX, offsetY } = layout
  context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY)
}

function fillDot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  context.fillStyle = `rgb(${color} / ${alpha.toFixed(3)})`
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

function isLand(col: number, row: number): boolean {
  return landGrid?.[row * cols + col] === 1
}

function rebuildBase() {
  const canvas = canvasRef.value
  if (!canvas || !updateLayout())
    return
  baseLayer ??= document.createElement('canvas')
  baseLayer.width = canvas.width
  baseLayer.height = canvas.height
  const context = baseLayer.getContext('2d')
  if (!context)
    return
  applyTransform(context)
  const { land, landAlpha, sea, seaAlpha } = palette.value
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [x, y] = cellCenter(col, row)
      if (isLand(col, row))
        fillDot(context, x, y, DOT_RADIUS, land, landAlpha)
      else
        fillDot(context, x, y, SEA_RADIUS, sea, seaAlpha)
    }
  }
  drawFrame(performance.now())
}

function litRadius(marker: DotMarker): number {
  return PITCH * (1.1 + Math.min(3, marker.servers) * 0.45)
}

function drawScan(context: CanvasRenderingContext2D, elapsed: number) {
  const scanX = (elapsed * SCAN_SPEED) % (props.width + SCAN_HALF_WIDTH * 2) - SCAN_HALF_WIDTH
  const { scan } = palette.value
  const firstCol = Math.max(0, Math.floor((scanX - SCAN_HALF_WIDTH) / PITCH))
  const lastCol = Math.min(cols - 1, Math.ceil((scanX + SCAN_HALF_WIDTH) / PITCH))
  for (let col = firstCol; col <= lastCol; col++) {
    const [x] = cellCenter(col, 0)
    const strength = 1 - Math.abs(x - scanX) / SCAN_HALF_WIDTH
    if (strength <= 0)
      continue
    for (let row = 0; row < rows; row++) {
      if (isLand(col, row))
        fillDot(context, x, cellCenter(col, row)[1], DOT_RADIUS, scan, strength)
    }
  }
}

function drawMarker(context: CanvasRenderingContext2D, marker: DotMarker, index: number, elapsed: number | null) {
  const { online, offline } = palette.value
  const color = marker.online ? online : offline
  const radius = litRadius(marker)
  const phase = elapsed === null ? null : (elapsed / RIPPLE_PERIOD + index * 0.17) % 1
  const ring = phase === null ? 0 : radius + phase * RIPPLE_SPREAD
  const reach = radius + RIPPLE_SPREAD + PITCH
  const firstCol = Math.max(0, Math.floor((marker.x - reach) / PITCH))
  const lastCol = Math.min(cols - 1, Math.ceil((marker.x + reach) / PITCH))
  const firstRow = Math.max(0, Math.floor((marker.y - reach) / PITCH))
  const lastRow = Math.min(rows - 1, Math.ceil((marker.y + reach) / PITCH))
  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      const [x, y] = cellCenter(col, row)
      const distance = Math.hypot(x - marker.x, y - marker.y)
      if (distance < radius)
        fillDot(context, x, y, DOT_RADIUS * 1.45, color, 1)
      else if (phase !== null && Math.abs(distance - ring) < PITCH * 0.55)
        fillDot(context, x, y, DOT_RADIUS, color, (1 - phase) * 0.9)
    }
  }
}

function drawFrame(now: number) {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context || !baseLayer)
    return
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(baseLayer, 0, 0)
  applyTransform(context)
  const elapsed = animated.value ? now - startTime : null
  if (elapsed !== null)
    drawScan(context, elapsed)
  props.markers.forEach((marker, index) => drawMarker(context, marker, index, elapsed))
}

const { pause, resume } = useRafFn(({ timestamp }) => drawFrame(timestamp), { immediate: false })

function syncAnimation() {
  if (animated.value && shouldRender.value)
    resume()
  else
    pause()
}

onMounted(() => {
  loadLandGrid()
  syncAnimation()
})

watch([containerWidth, containerHeight, palette], rebuildBase)
watch([animated, shouldRender], () => {
  syncAnimation()
  drawFrame(performance.now())
})
watch(() => props.markers, () => drawFrame(performance.now()), { deep: true })
</script>

<template>
  <div ref="containerRef" class="pointer-events-none absolute inset-0">
    <canvas ref="canvasRef" class="absolute inset-0 size-full" aria-hidden="true" />
  </div>
</template>
