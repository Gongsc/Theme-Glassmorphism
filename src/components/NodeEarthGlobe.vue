<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed, defineAsyncComponent, useAttrs } from 'vue'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  nodes?: NodeData[]
}>()

const attrs = useAttrs()
const appStore = useAppStore()

const NodeEarthCobeGlobe = defineAsyncComponent(() => import('@/components/NodeEarthCobeGlobe.vue'))
const NodeEarthRealisticGlobe = defineAsyncComponent(() => import('@/components/NodeEarthRealisticGlobe.vue'))
const NodeEarthTiledMap = defineAsyncComponent(() => import('@/components/NodeEarthTiledMap.vue'))

const earthComponent = computed(() => {
  const components = {
    realistic: NodeEarthRealisticGlobe,
    cobe: NodeEarthCobeGlobe,
    tiled: NodeEarthTiledMap,
    dots: NodeEarthTiledMap,
  }
  return components[appStore.earthRenderer] ?? NodeEarthRealisticGlobe
})
// 点阵平铺地图复用平铺地图的布局与图例
const earthProps = computed(() => appStore.earthRenderer === 'dots' ? { dots: true } : {})
</script>

<template>
  <component :is="earthComponent" v-bind="{ ...attrs, ...earthProps }" :nodes="props.nodes" />
</template>
