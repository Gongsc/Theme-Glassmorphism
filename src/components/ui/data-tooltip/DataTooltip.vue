<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, useSlots } from 'vue'
import { cn } from '@/lib/utils'

type DataTooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface Props {
  /** 提示文本，留空且无 #content 插槽时不渲染气泡 */
  content?: string
  /** 气泡相对触发元素的方位 */
  placement?: DataTooltipPlacement
  /** 气泡宽度，number 视为 px；默认由内容撑起 */
  width?: number | string
  /** 气泡高度，number 视为 px；默认由内容撑起 */
  height?: number | string
  /** 包裹元素标签，默认 div */
  as?: string
  /** 包裹元素的附加类 */
  class?: HTMLAttributes['class']
  /** 气泡的附加类 */
  contentClass?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  as: 'div',
})

const slots = useSlots()
const hasContent = computed(() => Boolean(props.content || slots.content))

// 气泡挂到 body 上并用 fixed 定位，不会被卡片等 overflow: hidden 的祖先截掉
const GAP = 8
const VIEWPORT_MARGIN = 4
const trigger = ref<HTMLElement | null>(null)
const bubble = ref<HTMLElement | null>(null)
const open = ref(false)
const position = ref<{ left: number, top: number } | null>(null)

function updatePosition(): void {
  if (!trigger.value || !bubble.value)
    return
  const t = trigger.value.getBoundingClientRect()
  const b = bubble.value.getBoundingClientRect()
  let left: number
  let top: number
  if (props.placement === 'top' || props.placement === 'bottom') {
    left = t.left + t.width / 2 - b.width / 2
    top = props.placement === 'top' ? t.top - GAP - b.height : t.bottom + GAP
  }
  else {
    left = props.placement === 'left' ? t.left - GAP - b.width : t.right + GAP
    top = t.top + t.height / 2 - b.height / 2
  }
  const maxLeft = window.innerWidth - b.width - VIEWPORT_MARGIN
  const maxTop = window.innerHeight - b.height - VIEWPORT_MARGIN
  position.value = {
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop)),
  }
}

function hide(): void {
  open.value = false
  position.value = null
  window.removeEventListener('scroll', hide, true)
}

async function show(): Promise<void> {
  if (!hasContent.value || open.value)
    return
  open.value = true
  window.addEventListener('scroll', hide, true)
  await nextTick()
  updatePosition()
}

function handleFocusOut(event: FocusEvent): void {
  if (!trigger.value?.contains(event.relatedTarget as Node | null))
    hide()
}

onBeforeUnmount(hide)

const bubbleStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width != null)
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  if (props.height != null)
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  // 测量完成前先隐身，避免气泡在左上角闪一下
  style.left = `${position.value?.left ?? 0}px`
  style.top = `${position.value?.top ?? 0}px`
  style.transform = 'none'
  style.visibility = position.value ? 'visible' : 'hidden'
  return style
})
</script>

<template>
  <component
    :is="as"
    ref="trigger"
    data-slot="data-tooltip"
    :class="cn('group/data-tooltip relative inline-block', props.class)"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="handleFocusOut"
  >
    <slot />
    <Teleport v-if="open && hasContent" to="body">
      <span
        ref="bubble"
        role="tooltip"
        :class="cn(
          'pointer-events-none fixed z-[1000] block max-w-[calc(100vw-8px)] rounded bg-foreground/80 p-1 text-[10px] leading-none text-background shadow-lg whitespace-normal break-words',
          props.contentClass,
        )"
        :style="bubbleStyle"
      >
        <slot name="content">{{ content }}</slot>
      </span>
    </Teleport>
  </component>
</template>
