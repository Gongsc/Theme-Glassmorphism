<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { ConfigRequestError, configFields, defaultConfig, fitsConfigField, getSiteConfig, importConfig, mergeConfig, readSavedConfig, saveConfig } from '@/monitor/config'
import { message } from '@/utils/message'

const store = useAppStore()
const dialog = ref<HTMLDialogElement>()
const file = ref<HTMLInputElement>()
const values = ref<Record<string, unknown>>({ ...defaultConfig })
const baseline = ref<Record<string, unknown>>(getSiteConfig())
const busy = ref(false)
const opened = ref(false)
const notice = ref('')
const errorText = ref('')
let alive = true
const dirty = computed(() => JSON.stringify(values.value) !== JSON.stringify(baseline.value))
const invalidField = computed(() => configFields.find(field => field.key && !fitsConfigField(field, values.value[field.key])))

function preview() {
  if (store.privateFeaturesAllowed && store.publicSettings)
    store.publicSettings.theme_settings = mergeConfig(values.value)
}
function report(error: unknown) {
  errorText.value = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  if (error instanceof ConfigRequestError && error.status === 401) {
    message.error(errorText.value)
    store.updateLoginState(false)
  }
}
async function open() {
  if (!store.privateFeaturesAllowed || busy.value) return
  baseline.value = { ...(store.publicSettings?.theme_settings ?? getSiteConfig()) }
  values.value = { ...baseline.value }
  errorText.value = ''
  notice.value = '正在读取站点配置…'
  opened.value = true
  dialog.value?.showModal()
  busy.value = true
  try {
    const current = mergeConfig(await readSavedConfig())
    if (!alive || !store.privateFeaturesAllowed) return
    baseline.value = current
    values.value = { ...current }
    preview()
    notice.value = '修改可预览；保存到站点后，访客刷新即可看到。'
  }
  catch (error) { if (alive) { notice.value = '当前显示已加载的配置，尚未保存。'; report(error) } }
  finally { busy.value = false }
}
function update(key: string, value: unknown) {
  if (busy.value || !store.privateFeaturesAllowed) return
  values.value = { ...values.value, [key]: value }
  errorText.value = ''
  notice.value = '修改尚未保存到站点。'
  preview()
}
function close() {
  if (busy.value) return
  dialog.value?.close()
}
function restorePreview() {
  if (opened.value && store.publicSettings)
    store.publicSettings.theme_settings = { ...baseline.value }
  opened.value = false
}
function reset() {
  values.value = { ...defaultConfig }
  errorText.value = ''
  notice.value = '已预览默认配置，点击“保存到站点”后生效。'
  preview()
}
async function save() {
  if (!store.privateFeaturesAllowed || busy.value || invalidField.value) return
  busy.value = true
  errorText.value = ''
  notice.value = '正在保存…'
  try {
    const saved = await saveConfig({ ...values.value })
    if (!alive) return
    baseline.value = saved
    values.value = { ...saved }
    preview()
    notice.value = '已保存到站点，访客刷新即可看到。'
  }
  catch (error) { if (alive) { notice.value = '尚未保存，修改已保留，可重试或导出。'; report(error) } }
  finally { busy.value = false }
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ themeOptions: values.value }, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'glass-config.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function stageImport(config: Record<string, unknown>) {
  values.value = config
  errorText.value = ''
  notice.value = '已导入预览，请检查后点击“保存到站点”。'
  preview()
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  input.value = ''
  if (!selected || busy.value || !store.privateFeaturesAllowed) return
  busy.value = true
  try {
    if (selected.size > 131072) throw new Error('配置文件超过 128 KiB')
    const config = importConfig(JSON.parse(await selected.text()))
    if (alive && store.privateFeaturesAllowed) stageImport(config)
  }
  catch (error) { if (alive) report(error) }
  finally { busy.value = false }
}
onBeforeUnmount(() => { alive = false; restorePreview() })
</script>
<template>
  <Button v-if="store.privateFeaturesAllowed" variant="ghost" size="icon-sm" aria-label="主题设置" @click="open"><Icon icon="tabler:adjustments" width="18" /></Button>
  <dialog ref="dialog" class="monitor-settings" aria-labelledby="monitor-settings-title" :aria-busy="busy" @cancel.prevent="close" @close="restorePreview">
    <header><div><h2 id="monitor-settings-title">Glassmorphism 主题设置</h2><p>站点共用设置 · 保存到 Hub</p></div><Button variant="ghost" :disabled="busy" aria-label="关闭设置" @click="close">{{ dirty ? '放弃修改并关闭' : '关闭' }}</Button></header>
    <fieldset class="settings-fields" :disabled="busy || !store.privateFeaturesAllowed">
      <template v-for="(field,index) in configFields" :key="field.key ?? index">
        <h3 v-if="field.type === 'title'">{{ field.label }}</h3>
        <label v-else-if="field.key && !(values.backgroundType === 'bing' && (field.key === 'lightBackgroundUrl' || field.key === 'darkBackgroundUrl'))" class="settings-field">
          <span>{{ field.label }}</span>
          <input v-if="field.type === 'boolean'" type="checkbox" :checked="Boolean(values[field.key])" @change="update(field.key,($event.target as HTMLInputElement).checked)">
          <select v-else-if="field.type === 'select'" :value="values[field.key]" @change="update(field.key,($event.target as HTMLSelectElement).value)"><option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option></select>
          <input v-else-if="field.type === 'number'" type="number" step="any" :min="field.min" :max="field.max" :value="values[field.key]" :aria-invalid="!fitsConfigField(field, values[field.key])" @input="update(field.key,($event.target as HTMLInputElement).valueAsNumber)">
          <textarea v-else-if="field.type === 'text'" :value="String(values[field.key] ?? '')" @input="update(field.key,($event.target as HTMLTextAreaElement).value)" />
          <input v-else type="text" :value="values[field.key]" @input="update(field.key,($event.target as HTMLInputElement).value)">
          <small>{{ field.help }}</small>
        </label>
      </template>
    </fieldset>
    <footer>
      <p v-if="errorText || invalidField" role="alert" class="text-destructive">{{ errorText || `${invalidField?.label}的值不符合要求` }}</p>
      <p role="status">{{ notice }}</p>
      <div>
        <Button :disabled="busy || !!invalidField || !store.privateFeaturesAllowed" @click="save">{{ busy ? '处理中…' : '保存到站点' }}</Button>
        <Button variant="outline" :disabled="busy" @click="download">导出配置</Button>
        <Button variant="outline" :disabled="busy" @click="file?.click()">导入配置</Button>
        <Button variant="outline" :disabled="busy" @click="reset">恢复默认</Button>
      </div>
      <input ref="file" type="file" accept=".json" hidden @change="upload">
    </footer>
  </dialog>
</template>
<style scoped>
.monitor-settings{position:fixed;inset:16px 16px 16px auto;margin:0;width:min(600px,calc(100vw - 32px));height:calc(100dvh - 32px);max-height:none;border:1px solid var(--glass-border);border-radius:20px;padding:0;background:var(--background);color:var(--foreground)}
.monitor-settings[open]{display:flex;flex-direction:column}.monitor-settings::backdrop{background:#07101c88;backdrop-filter:blur(5px)}header{display:flex;justify-content:space-between;gap:16px;padding:22px}h2{font-size:19px;font-weight:650}header p,small,footer p{font-size:12px;opacity:.75;line-height:1.7}.settings-fields{border:0;margin:0;overflow:auto;padding:0 22px;flex:1;min-height:0}h3{font-size:15px;font-weight:650;padding:24px 0 12px;border-bottom:1px solid #8883}.settings-field{display:grid;grid-template-columns:1fr minmax(100px,45%);align-items:center;gap:10px;padding:14px 0;font-size:13px}.settings-field small{grid-column:1/-1}.settings-field input:not([type=checkbox]),select,textarea{width:100%;padding:8px;border:1px solid #8885;border-radius:8px;background:var(--background);color:inherit}.settings-field input[type=checkbox]{justify-self:end;width:18px;height:18px}textarea{min-height:80px;grid-column:1/-1}footer{padding:16px 22px;border-top:1px solid #8883}footer>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}@media(max-width:600px){header,.settings-fields,footer{padding-left:16px;padding-right:16px}h2{font-size:16px}}
</style>
