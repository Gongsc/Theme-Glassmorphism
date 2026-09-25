<script setup lang="ts">
import { computed, useId } from 'vue'
import { buildSparklineGeometry } from '@/monitor/sparkline'

const props = withDefaults(defineProps<{
  values?: Array<number | null>
  fill?: boolean
}>(), {
  values: () => [],
  fill: true,
})

const gradientId = `sparkline-fill-${useId().replace(/[^\w-]/g, '')}`
const geometry = computed(() => buildSparklineGeometry(props.values))
</script>

<template>
  <svg
    class="block h-full w-full overflow-hidden"
    :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="props.fill && geometry.fillPaths.length">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.28" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <path v-for="(path, index) in geometry.fillPaths" :key="`fill-${index}`" :d="path" :fill="`url(#${gradientId})`" />
    </template>
    <path
      v-for="(path, index) in geometry.linePaths"
      :key="`line-${index}`"
      :d="path"
      fill="none"
      stroke="currentColor"
      stroke-width="1.35"
      stroke-linejoin="round"
      stroke-linecap="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
