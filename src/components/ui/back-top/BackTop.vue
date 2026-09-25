<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onMounted, onUnmounted, ref } from 'vue'

interface Props {
  visibilityHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  visibilityHeight: 320,
})

const emit = defineEmits<{
  scrolled: [boolean]
}>()

const show = ref(false)

function handleScroll() {
  show.value = window.scrollY > props.visibilityHeight
  emit('scrolled', window.scrollY > 1)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-show="show"
      data-back-top
      class="back-top fixed z-[60] flex size-9 items-center justify-center rounded-full border bg-background/80 text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-accent md:size-10"
      aria-label="返回顶部"
      @click="scrollToTop"
    >
      <Icon icon="tabler:arrow-up" :width="18" :height="18" />
    </button>
  </Transition>
</template>

<style scoped>
.back-top {
  right: calc(0.75rem + env(safe-area-inset-right, 0px));
  right: calc(0.75rem + var(--komari-safe-area-right, env(safe-area-inset-right, 0px)));
  bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
  bottom: calc(4rem + var(--komari-safe-area-bottom, env(safe-area-inset-bottom, 0px)));
}

@media (min-width: 768px) {
  .back-top {
    right: calc(2rem + env(safe-area-inset-right, 0px));
    right: calc(2rem + var(--komari-safe-area-right, env(safe-area-inset-right, 0px)));
    bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
    bottom: calc(2rem + var(--komari-safe-area-bottom, env(safe-area-inset-bottom, 0px)));
  }
}
</style>
