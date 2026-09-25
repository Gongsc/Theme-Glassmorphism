<script setup lang="ts">
import { computed, onDeactivated } from 'vue'
import { useSparklinePeriodInspect } from '@/composables/useSparklinePeriodInspect'
import { sparklinePointPercent } from '@/monitor/sparkline'
import Sparkline from './Sparkline.vue'

// 延迟曲线 + 时段查看：悬停或点按显示 tips[index]。values 与 tips 按槽位一一对应。
const props = defineProps<{
  values: Array<number | null>
  tips: string[]
  color: string
}>()

const { inspect, onPointerDown, onPointerMove, onPointerLeave, clear } = useSparklinePeriodInspect()
const count = computed(() => props.values.length)
const percent = computed(() => inspect.value ? sparklinePointPercent(inspect.value.index, count.value) : 0)
// 靠近两端时提示贴边对齐，避免溢出卡片。
const tipShift = computed(() => percent.value < 20 ? '0%' : percent.value > 80 ? '-100%' : '-50%')
const tip = computed(() => inspect.value ? props.tips[inspect.value.index] : undefined)

onDeactivated(clear)
defineExpose({ clear })
</script>

<template>
  <span
    class="ping-sparkline" :style="{ color: props.color }" data-ping-sparkline
    @pointerdown="count && onPointerDown($event, 0, count)"
    @pointermove="count && onPointerMove($event, 0, count)"
    @pointerleave="onPointerLeave($event, 0)"
    @click.stop
  >
    <span class="ping-sparkline-line"><Sparkline :values="props.values" /></span>
    <template v-if="tip">
      <span class="ping-sparkline-marker" :style="{ left: `${percent}%` }" />
      <span class="ping-sparkline-tip" role="tooltip" :style="{ 'left': `${percent}%`, '--tip-shift': tipShift }">{{ tip }}</span>
    </template>
  </span>
</template>

<style scoped>
.ping-sparkline{position:relative;display:block;height:16px;min-width:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:crosshair;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.ping-sparkline-line{position:absolute;inset:0;pointer-events:none}
.ping-sparkline-marker{position:absolute;top:0;bottom:0;width:2px;border-radius:999px;background:currentColor;transform:translateX(-50%);pointer-events:none}
.ping-sparkline-tip{position:absolute;bottom:calc(100% + 4px);z-index:30;width:max-content;max-width:14rem;transform:translateX(var(--tip-shift,-50%));white-space:pre-line;border-radius:4px;padding:3px 6px;background:color-mix(in srgb,var(--foreground) 85%,transparent);color:var(--background);font-size:10px;line-height:1.35;text-align:center;pointer-events:none;box-shadow:0 4px 12px rgb(0 0 0/.18)}
@media (pointer:coarse),(max-width:420px){.ping-sparkline{min-height:32px;margin-block:-8px}.ping-sparkline-line{inset:8px 0}}
</style>
