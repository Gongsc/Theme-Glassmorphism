<script setup lang="ts">
import { computed, onActivated, onDeactivated, onBeforeUnmount, ref, watch } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { loadPingRecordsWithTasks } from '@/services/history.service'
import { buildPingRows, pingColor } from '@/monitor/pingRows'
import type { PingRecord, PingTaskInfo } from '@/utils/rpc'
import { useAppStore } from '@/stores/app'
import { DataTooltip } from '@/components/ui/data-tooltip'
const props = defineProps<{ uuid:string; name:string; enabled:boolean }>()
const emit = defineEmits<{open:[]}>()
const store = useAppStore()
const visible = useDocumentVisibility()
const active = ref(true)
const data = ref<{records:PingRecord[];tasks:PingTaskInfo[]}>({records:[],tasks:[]})
const error = ref('')
const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
let sequence = 0
const config = computed(() => store.publicSettings?.theme_settings ?? {})
const rows = computed(() => buildPingRows(data.value.records, data.value.tasks, String(config.value.homepageMultiPingTaskIds ?? ''), Number(config.value.homepageMultiPingCount ?? 3)))
const enabled = computed(() => props.enabled && active.value && visible.value === 'visible')
function stop() {sequence++;clearTimeout(timer)}
async function refresh() {
  stop()
  if (!enabled.value) return
  const current = sequence
  try {
    const next = await loadPingRecordsWithTasks(1,150,props.uuid)
    if (current !== sequence) return
    data.value=next;error.value=''
  } catch {if (current === sequence) error.value='延迟数据暂不可用'}
  finally {
    if (current === sequence) {loading.value=false;timer=setTimeout(refresh,60000)}
  }
}
watch([() => props.uuid,enabled], () => {stop(); if (enabled.value) void refresh()}, {immediate:true})
onActivated(() => {active.value=true})
onDeactivated(() => {active.value=false;stop()})
onBeforeUnmount(stop)
const tooltip = (bar: {time:string;latency:number|null;loss:number|null}, metric:'latency'|'loss') => !bar.time ? '无采样' : `${new Date(bar.time).toLocaleTimeString()} · ${metric === 'latency' ? bar.latency === null ? '超时 / 无有效延迟' : `${bar.latency.toFixed(0)} ms` : bar.loss === null ? '无丢包数据' : `${bar.loss.toFixed(1)}% 丢包`}`
</script>
<template>
  <div class="multi-ping" data-multi-ping @keydown.stop>
    <p v-if="error" class="multi-ping-note" role="status">{{ error }}{{ rows.length ? '，显示上次数据' : '' }}</p>
    <button v-for="row in rows" :key="row.id" type="button" class="multi-ping-row" :aria-label="`${name} ${row.name} 延迟与丢包详情`" @click.stop="emit('open')">
      <div class="multi-ping-half">
        <div class="multi-ping-label"><span :title="row.name">{{ row.name }}</span><strong :style="{'--ping-value-color':pingColor(row.latency,'latency')}">{{ row.latency !== null ? Math.round(row.latency) : row.timedOut ? '超时' : '—' }}<small v-if="row.latency !== null"> ms</small></strong></div>
        <div class="multi-ping-bars" aria-hidden="true"><DataTooltip v-for="(bar,index) in row.bars" :key="index" :content="tooltip(bar,'latency')"><span :style="{background:bar.time && bar.latency === null ? 'var(--signal-5)' : pingColor(bar.latency,'latency'),opacity:bar.time?1:.2}" /></DataTooltip></div>
      </div>
      <div class="multi-ping-half">
        <div class="multi-ping-label multi-ping-loss" :title="`${row.name} 最近 1 小时窗口丢包率`"><span class="sr-only">窗口丢包率</span><strong :style="{'--ping-value-color':pingColor(row.loss,'loss')}">{{ row.loss === null ? '—' : row.loss.toFixed(1) }}<small v-if="row.loss !== null"> %</small></strong></div>
        <div class="multi-ping-bars" aria-hidden="true"><DataTooltip v-for="(bar,index) in row.bars" :key="index" :content="tooltip(bar,'loss')"><span :style="{background:pingColor(bar.loss,'loss'),opacity:bar.loss===null?.2:1}" /></DataTooltip></div>
      </div>
    </button>
    <p v-if="!rows.length" class="multi-ping-note">{{ loading ? '正在读取探测线路…' : error ? '请稍后重试' : '暂无探测线路或采样' }}</p>
  </div>
</template>
<style scoped>
.multi-ping{display:flex;flex-direction:column;gap:10px;padding:8px 2px 4px;border-top:1px solid color-mix(in srgb,currentColor 10%,transparent)}
.multi-ping-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;text-align:left;width:100%;border-radius:4px;cursor:pointer}.multi-ping-row:focus-visible{outline:2px solid var(--ring);outline-offset:4px}.multi-ping-half{min-width:0}.multi-ping-label{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:11px;margin-bottom:5px;line-height:1.3}.multi-ping-label>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted-foreground)}.multi-ping-label strong{color:color-mix(in srgb,var(--ping-value-color) 65%,var(--foreground));font-size:12px;font-variant-numeric:tabular-nums;flex-shrink:0}.multi-ping-label small{font-size:10px;font-weight:400;color:var(--muted-foreground)}.multi-ping-loss{justify-content:flex-end}.multi-ping-bars{display:grid;grid-template-columns:repeat(20,minmax(0,1fr));gap:2px;height:9px}.multi-ping-bars span{display:block;height:9px;width:100%;border-radius:2px}.multi-ping-note{font-size:11px;color:var(--muted-foreground);padding:4px 0}
</style>
