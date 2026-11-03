<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  size?: number | string
  stroke?: number | string
  show?: boolean
  description?: string
  contentClass?: HTMLAttributes['class']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  stroke: 2,
  show: true,
})

function toSize(v: number | string) {
  return typeof v === 'number' ? `${v}px` : v
}

// 短暂加载（缓存命中、切换时间区间）不弹遮罩，避免一闪而过；一旦显示至少保留一小段时间，避免刚出现就消失
const SHOW_DELAY_MS = 150
const MIN_VISIBLE_MS = 300
const visible = ref(props.show)
let shownAt = props.show ? Date.now() : 0
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer(): void {
  if (timer != null)
    clearTimeout(timer)
  timer = null
}

watch(() => props.show, (show) => {
  clearTimer()
  if (show) {
    if (!visible.value) {
      timer = setTimeout(() => {
        visible.value = true
        shownAt = Date.now()
      }, SHOW_DELAY_MS)
    }
    return
  }
  const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt)
  if (!visible.value || remaining <= 0)
    visible.value = false
  else
    timer = setTimeout(() => visible.value = false, remaining)
})

onBeforeUnmount(clearTimer)
</script>

<template>
  <div
    :class="cn('spinner-root relative', props.class)"
    :data-busy="visible || undefined"
  >
    <slot />
    <Transition name="spinner-fade">
      <div
        v-if="visible"
        data-spinner-overlay
        :class="cn(
          'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-card/30',
          props.contentClass,
        )"
      >
        <span
          class="inline-block animate-spin rounded-full border-solid"
          :style="{
            width: toSize(size),
            height: toSize(size),
            borderWidth: toSize(stroke),
            borderColor: 'color-mix(in srgb, currentColor 18%, transparent)',
            borderTopColor: 'currentColor',
          }"
        />
        <span v-if="description || $slots.description" class="text-sm text-muted-foreground">
          <slot name="description">{{ description }}</slot>
        </span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 加载中只把原内容轻微压暗，保留上一份数据可见，换成新数据时再淡回 */
.spinner-root > :slotted(:not([data-spinner-overlay])) {
  transition: opacity 220ms ease, filter 220ms ease;
}

.spinner-root[data-busy] > :slotted(:not([data-spinner-overlay])) {
  opacity: 0.55;
  filter: saturate(0.8);
}

.spinner-fade-enter-active,
.spinner-fade-leave-active {
  transition: opacity 220ms ease;
}

.spinner-fade-enter-from,
.spinner-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .spinner-root > :slotted(:not([data-spinner-overlay])),
  .spinner-fade-enter-active,
  .spinner-fade-leave-active {
    transition: none;
  }
}
</style>
