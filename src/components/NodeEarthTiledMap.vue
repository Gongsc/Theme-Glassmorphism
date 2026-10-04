<script setup lang="ts">
import type { DotMarker } from '@/components/NodeEarthDotLayer.vue'
import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import NodeEarthDotLayer from '@/components/NodeEarthDotLayer.vue'
import { useNodeGeoClusters } from '@/composables/useNodeGeoClusters'

const props = defineProps<{
  nodes?: NodeData[]
  // 点阵模式：贴图换成圆点栅格，节点由点亮的像素表示
  dots?: boolean
}>()

const MAP_WIDTH = 1440
const MAP_HEIGHT = 720
const MAP_PADDING = 18
const VISIBLE_NORTH_LAT = 74
const VISIBLE_SOUTH_LAT = -58
const TEXTURE_FULL_HEIGHT = MAP_HEIGHT * 180 / (VISIBLE_NORTH_LAT - VISIBLE_SOUTH_LAT)
const TEXTURE_SOURCE_Y = TEXTURE_FULL_HEIGHT * (90 - VISIBLE_NORTH_LAT) / 180
const EARTH_DAY_TEXTURE = '/images/earth/earth-blue-marble.jpg'
const EARTH_BUMP_MAP = '/images/earth/earth-topology.png'
const EARTH_SPECULAR_MAP = '/images/earth/earth-water.png'

interface MapPoint {
  x: number
  y: number
}

interface ClusterMarker {
  id: string
  index: number
  code: string
  label: string
  meta: string
  x: number
  y: number
  servers: number
  onlineServers: number
  statusClass: string
}

const {
  regionClusters,
  totalServers,
  onlineServers,
  offlineServers,
} = useNodeGeoClusters({ nodes: () => props.nodes })

// 地区少时单列，多了改双列再逐级收紧
const legendDensityClass = computed(() => {
  const count = regionClusters.value.length
  if (count > 36)
    return 'legend-ultra-dense'
  if (count > 24)
    return 'legend-very-dense'
  if (count > 11)
    return 'legend-dense'
  return ''
})
const onlineRate = computed(() => {
  if (totalServers.value === 0)
    return 0
  return Math.round((onlineServers.value / totalServers.value) * 100)
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function projectCoord(coord: [number, number]): MapPoint {
  const [lat, lng] = coord
  const visibleLat = clamp(lat, VISIBLE_SOUTH_LAT, VISIBLE_NORTH_LAT)
  return {
    x: clamp(((lng + 180) / 360) * MAP_WIDTH, MAP_PADDING, MAP_WIDTH - MAP_PADDING),
    y: clamp(((VISIBLE_NORTH_LAT - visibleLat) / (VISIBLE_NORTH_LAT - VISIBLE_SOUTH_LAT)) * MAP_HEIGHT, MAP_PADDING, MAP_HEIGHT - MAP_PADDING),
  }
}

function formatClusterMeta(cluster: { code: string }): string {
  return cluster.code || 'NODE'
}

const clusterMarkers = computed<ClusterMarker[]>(() => regionClusters.value.map((cluster, index) => {
  const point = projectCoord(cluster.coord)
  return {
    id: cluster.id,
    index: index + 1,
    code: cluster.code,
    label: cluster.label,
    meta: formatClusterMeta(cluster),
    x: point.x,
    y: point.y,
    servers: cluster.servers,
    onlineServers: cluster.onlineServers,
    statusClass: cluster.onlineServers === 0 ? 'is-offline' : cluster.onlineServers < cluster.servers ? 'is-partial' : 'is-online',
  }
}))

const dotMarkers = computed<DotMarker[]>(() => clusterMarkers.value.map(marker => ({
  id: marker.id,
  x: marker.x,
  y: marker.y,
  servers: marker.servers,
  online: marker.onlineServers > 0,
})))

// 点阵模式下节点点亮范围更大，国旗相应上移
const flagOffsetY = computed(() => props.dots ? 44 : 34)
</script>

<template>
  <div class="earth-map-scroll relative z-0 h-full w-full overflow-x-auto overflow-y-visible pointer-events-auto">
    <div class="earth-map-shell relative mx-auto h-full w-full overflow-hidden rounded-[1.5rem] border border-white/35 bg-background/35 shadow-[0_24px_80px_rgb(15_23_42/0.18)] backdrop-blur-2xl dark:border-cyan-200/10 dark:bg-slate-950/35">
      <div class="earth-map relative h-full min-w-0 overflow-hidden" :class="{ 'is-dots': props.dots }">
        <NodeEarthDotLayer
          v-if="props.dots"
          :markers="dotMarkers"
          :width="MAP_WIDTH"
          :height="MAP_HEIGHT"
          :north-lat="VISIBLE_NORTH_LAT"
          :south-lat="VISIBLE_SOUTH_LAT"
          :mask-src="EARTH_SPECULAR_MAP"
        />
        <svg class="map-svg absolute inset-0 size-full" :viewBox="`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="props.dots ? '点阵节点世界地图' : '真实地球贴图节点世界地图'">
          <defs v-if="!props.dots">
            <filter id="earth-relief" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#ffffff" flood-opacity="0.14" />
              <feDropShadow dx="0" dy="-5" stdDeviation="9" flood-color="#082f49" flood-opacity="0.16" />
            </filter>
          </defs>

          <template v-if="!props.dots">
            <image :href="EARTH_DAY_TEXTURE" x="0" :y="-TEXTURE_SOURCE_Y" :width="MAP_WIDTH" :height="TEXTURE_FULL_HEIGHT" preserveAspectRatio="none" class="earth-image earth-image-base" />
            <image :href="EARTH_BUMP_MAP" x="0" :y="-TEXTURE_SOURCE_Y" :width="MAP_WIDTH" :height="TEXTURE_FULL_HEIGHT" preserveAspectRatio="none" class="earth-image earth-image-bump" filter="url(#earth-relief)" />
            <image :href="EARTH_SPECULAR_MAP" x="0" :y="-TEXTURE_SOURCE_Y" :width="MAP_WIDTH" :height="TEXTURE_FULL_HEIGHT" preserveAspectRatio="none" class="earth-image earth-image-water" />
            <rect :width="MAP_WIDTH" :height="MAP_HEIGHT" class="earth-overlay" />
          </template>

          <g class="city-points">
            <template v-for="marker in clusterMarkers" :key="`${marker.id}-point`">
              <template v-if="!props.dots">
                <circle :cx="marker.x" :cy="marker.y" r="11" class="city-region" :class="{ 'is-offline': marker.onlineServers === 0 }" />
                <circle :cx="marker.x" :cy="marker.y" r="3.8" class="city-dot" :class="{ 'is-offline': marker.onlineServers === 0 }" />
              </template>
              <image
                v-if="marker.code"
                :href="`/images/flags/${marker.code}.svg`"
                :x="marker.x - 13"
                :y="marker.y - flagOffsetY"
                width="26"
                height="26"
                preserveAspectRatio="xMidYMid slice"
                class="map-flag"
              />
            </template>
          </g>
        </svg>
      </div>

      <aside class="legend-panel" :class="legendDensityClass">
        <header class="legend-head">
          <div class="legend-head-row">
            <span class="legend-label">节点分布</span>
            <span class="legend-regions">{{ clusterMarkers.length }} 个地区</span>
          </div>
          <div class="legend-figure">
            <span class="legend-value">{{ onlineServers }}</span>
            <span class="legend-unit">/ {{ totalServers }} 在线</span>
            <span v-if="totalServers > 0" class="legend-rate" :class="{ 'is-warn': offlineServers > 0 }">{{ onlineRate }}%</span>
          </div>
          <div class="legend-bar">
            <span :style="{ width: `${onlineRate}%` }" />
          </div>
        </header>
        <ul class="legend-list">
          <li v-for="marker in clusterMarkers" :key="marker.id" class="legend-item" :class="marker.statusClass">
            <img v-if="marker.code" :src="`/images/flags/${marker.code}.svg`" :alt="marker.code" class="legend-flag">
            <span v-else class="legend-flag" />
            <span class="legend-name">{{ marker.label || marker.meta }}</span>
            <span v-if="marker.label" class="legend-code">{{ marker.meta }}</span>
            <span class="legend-count" :title="`${marker.onlineServers}/${marker.servers} 在线`">
              <span class="legend-status" />
              {{ marker.onlineServers === marker.servers ? marker.servers : `${marker.onlineServers}/${marker.servers}` }}
            </span>
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.earth-map-shell {
  display: grid;
  isolation: isolate;
  min-height: 18rem;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 26%);
  background: color-mix(in oklab, var(--background) 68%, rgb(56 189 248 / 0.24));
}

.earth-map {
  min-height: 18rem;
  border-right: 1px solid rgb(255 255 255 / 0.24);
}

.earth-map::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 18% 18%, rgb(255 255 255 / 0.18), transparent 32%),
    linear-gradient(135deg, rgb(255 255 255 / 0.1), transparent 38%, rgb(15 23 42 / 0.08));
  content: '';
  pointer-events: none;
}

.map-svg {
  padding-inline: 0;
}

.earth-image-base {
  opacity: 0.92;
  filter: saturate(1.08) contrast(1) brightness(1.12);
}

.earth-image-bump {
  opacity: 0.2;
  mix-blend-mode: overlay;
  filter: contrast(1.35) brightness(1.12);
}

.earth-image-water {
  opacity: 0.16;
  mix-blend-mode: screen;
  filter: saturate(0.42) contrast(1.22) brightness(1.04);
}

.earth-overlay {
  fill: rgb(255 255 255 / 0.05);
  mix-blend-mode: soft-light;
}

:global(.dark .earth-image-base) {
  filter: saturate(1.1) contrast(1.04) brightness(0.92);
}

:global(.dark .earth-image-bump) {
  opacity: 0.28;
}

:global(.dark .earth-image-water) {
  opacity: 0.2;
}

.city-region {
  fill: rgb(253 224 71 / 0.24);
  stroke: rgb(253 224 71 / 0.46);
  stroke-width: 1.1;
  vector-effect: non-scaling-stroke;
}

.city-region.is-offline {
  fill: rgb(251 113 133 / 0.14);
  stroke: rgb(251 113 133 / 0.38);
}

.city-dot {
  fill: rgb(253 224 71 / 0.95);
  stroke: rgb(21 128 61 / 0.84);
  stroke-width: 1.3;
  vector-effect: non-scaling-stroke;
}

.city-dot.is-offline {
  fill: rgb(251 113 133 / 0.9);
  stroke: rgb(190 18 60 / 0.8);
}

.map-flag {
  overflow: hidden;
  clip-path: inset(0 round 1.6px);
  filter: drop-shadow(0 3px 5px rgb(15 23 42 / 0.32));
}

/* 图例沿用主题统计卡片的写法：小号灰色标签 + 粗体数字，行内不加底色 */
.legend-panel {
  --legend-columns: 1;
  --legend-row-height: 1.9rem;
  --legend-font-size: 0.78rem;
  --legend-flag-size: 1rem;

  position: relative;
  z-index: 14;
  display: flex;
  min-width: 0;
  max-height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: rgb(255 255 255 / 0.08);
}

.legend-head {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  border-bottom: 1px solid rgb(15 23 42 / 0.08);
  padding: 0.85rem 0.95rem 0.8rem;
}

.legend-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.legend-regions {
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.legend-figure {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  line-height: 1;
}

.legend-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.legend-unit {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
}

.legend-rate {
  margin-left: auto;
  color: rgb(5 150 105);
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.legend-rate.is-warn {
  color: rgb(217 119 6);
}

.legend-bar {
  height: 0.25rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(15 23 42 / 0.08);
}

.legend-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(52 211 153 / 0.75), rgb(16 185 129));
  transition: width 0.4s ease;
}

.legend-list {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: start;
  grid-template-columns: repeat(var(--legend-columns), minmax(0, 1fr));
  column-gap: 0.75rem;
  overflow-y: auto;
  margin: 0;
  padding: 0.35rem 0.55rem 0.6rem;
  list-style: none;
  scrollbar-width: thin;
}

.legend-item {
  display: flex;
  min-width: 0;
  height: var(--legend-row-height);
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.45rem;
  padding-inline: 0.4rem;
  font-size: var(--legend-font-size);
  transition: background-color 0.15s ease;
}

.legend-item:hover {
  background: rgb(255 255 255 / 0.35);
}

.legend-flag {
  width: var(--legend-flag-size);
  height: calc(var(--legend-flag-size) * 0.75);
  flex: none;
  border-radius: 0.15rem;
  background: rgb(148 163 184 / 0.3);
  box-shadow: 0 0 0 1px rgb(15 23 42 / 0.08);
  object-fit: cover;
}

.legend-name {
  min-width: 0;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-code {
  flex: none;
  color: var(--muted-foreground);
  font-size: 0.85em;
  letter-spacing: 0.04em;
  opacity: 0.75;
}

.legend-count {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  color: var(--muted-foreground);
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
}

.legend-status {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: rgb(16 185 129);
  box-shadow: 0 0 0 3px rgb(16 185 129 / 0.16);
}

.legend-item.is-partial .legend-status {
  background: rgb(245 158 11);
  box-shadow: 0 0 0 3px rgb(245 158 11 / 0.18);
}

.legend-item.is-offline .legend-status {
  background: rgb(244 63 94);
  box-shadow: 0 0 0 3px rgb(244 63 94 / 0.16);
}

.legend-item.is-offline .legend-name,
.legend-item.is-offline .legend-flag {
  opacity: 0.55;
}

.legend-dense {
  --legend-columns: 2;
  --legend-row-height: 1.65rem;
  --legend-font-size: 0.72rem;
  --legend-flag-size: 0.9rem;
}

.legend-very-dense,
.legend-ultra-dense {
  --legend-columns: 2;
  --legend-row-height: 1.35rem;
  --legend-font-size: 0.66rem;
  --legend-flag-size: 0.8rem;
}

.legend-ultra-dense {
  --legend-row-height: 1.15rem;
  --legend-font-size: 0.6rem;
  --legend-flag-size: 0.7rem;
}

.legend-dense .legend-code,
.legend-very-dense .legend-code,
.legend-ultra-dense .legend-code {
  display: none;
}

:global(.dark .earth-map) {
  border-right-color: rgb(125 211 252 / 0.12);
}

:global(.dark .legend-panel) {
  background: rgb(15 23 42 / 0.18);
}

:global(.dark .legend-head) {
  border-bottom-color: rgb(255 255 255 / 0.08);
}

:global(.dark .legend-bar) {
  background: rgb(255 255 255 / 0.1);
}

:global(.dark .legend-rate) {
  color: rgb(110 231 183);
}

:global(.dark .legend-rate.is-warn) {
  color: rgb(252 211 77);
}

:global(.dark .legend-item:hover) {
  background: rgb(255 255 255 / 0.06);
}

:global(.dark .legend-flag) {
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.1);
}

@media (max-width: 640px) {
  .earth-map-scroll {
    touch-action: pan-x pan-y;
  }

  .earth-map-shell {
    min-width: 42rem;
    grid-template-columns: minmax(28rem, 1fr) minmax(11rem, 30%);
  }

  .earth-map {
    min-width: 0;
    min-height: 18rem;
  }

  .map-svg {
    padding-inline: 0;
  }

  .legend-panel,
  .legend-dense,
  .legend-very-dense,
  .legend-ultra-dense {
    --legend-columns: 1;
    --legend-row-height: 1.5rem;
    --legend-font-size: 0.68rem;
    --legend-flag-size: 0.85rem;
  }

  .legend-head {
    padding: 0.7rem 0.75rem 0.65rem;
  }

  .legend-value {
    font-size: 1.25rem;
  }
}
</style>
