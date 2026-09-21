<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { configFields, CONFIG_KEY, getSiteConfig, sanitizeConfig } from '@/monitor/config'
const store = useAppStore()
const dialog = ref<HTMLDialogElement>()
const notice = ref('设置保存在当前浏览器；导出配置可写入主题包作为站点默认。')
const file = ref<HTMLInputElement>()
const values = computed(() => store.publicSettings?.theme_settings ?? {})
function update(key: string, value: unknown) {
  const config = sanitizeConfig({ ...values.value, [key]: value })
  if (store.publicSettings) store.publicSettings.theme_settings = config
  if (key === 'themeMode') store.updateThemeMode('auto')
  if (key === 'defaultViewMode') store.nodeViewMode = value as 'card' | 'list'
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); notice.value = '已保存到本机。' } catch {notice.value = '无法写入本机存储，当前设置仅本次有效。'}
}
function reset() {
  try {localStorage.removeItem(CONFIG_KEY)} catch {notice.value = '无法清除本机存储'; return}
  if (store.publicSettings) store.publicSettings.theme_settings = getSiteConfig()
  store.updateThemeMode('auto')
  store.nodeViewMode = values.value.defaultViewMode === 'list' ? 'list' : 'card'
  notice.value = '已恢复主题包默认配置。'
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({themeOptions: values.value},null,2)],{type:'application/json'}))
  const a = document.createElement('a'); a.href=url; a.download='glass-config.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]; input.value=''
  if (!selected) return
  try {
    if (selected.size>131072) throw new Error('配置文件超过 128 KB')
    const config = sanitizeConfig(JSON.parse(await selected.text()).themeOptions)
    const merged = {...getSiteConfig(),...config}
    localStorage.setItem(CONFIG_KEY,JSON.stringify(merged))
    if (store.publicSettings) store.publicSettings.theme_settings = merged
    store.updateThemeMode('auto'); store.nodeViewMode = merged.defaultViewMode === 'list' ? 'list' : 'card'
    notice.value='配置导入成功。'
  } catch(error) {notice.value=`导入失败：${error instanceof Error?error.message:'无效配置'}`}
}
</script>
<template>
  <Button variant="ghost" size="icon-sm" aria-label="主题设置" @click="dialog?.showModal()"><Icon icon="tabler:adjustments" width="18" /></Button>
  <dialog ref="dialog" class="monitor-settings" aria-labelledby="monitor-settings-title">
    <header><div><h2 id="monitor-settings-title">Glassmorphism 主题设置</h2><p>原版主题配置 · 极简探针适配</p></div><Button variant="ghost" aria-label="关闭设置" @click="dialog?.close()">关闭</Button></header>
    <div class="settings-fields">
      <template v-for="(field,index) in configFields" :key="field.key ?? index">
        <h3 v-if="field.type === 'title'">{{ field.name }}</h3>
        <label v-else-if="field.key" class="settings-field">
          <span>{{ field.name }}</span>
          <input v-if="field.type === 'switch'" type="checkbox" :checked="Boolean(values[field.key])" @change="update(field.key,($event.target as HTMLInputElement).checked)">
          <select v-else-if="field.type === 'select'" :value="values[field.key]" @change="update(field.key,($event.target as HTMLSelectElement).value)"><option v-for="option in field.options?.split(',')" :key="option" :value="option">{{ option }}</option></select>
          <input v-else-if="field.type === 'number'" type="number" :value="values[field.key]" @change="update(field.key,Number(($event.target as HTMLInputElement).value))">
          <textarea v-else-if="field.type === 'richtext'" :value="String(values[field.key] ?? '')" @change="update(field.key,($event.target as HTMLTextAreaElement).value)" />
          <input v-else type="text" :value="values[field.key]" @input="update(field.key,($event.target as HTMLInputElement).value)">
          <small>{{ field.help }}</small>
        </label>
      </template>
    </div>
    <footer><p role="status">{{ notice }}</p><div><Button variant="outline" @click="download">导出配置</Button><Button variant="outline" @click="file?.click()">导入配置</Button><Button variant="outline" @click="reset">恢复默认</Button></div><input ref="file" type="file" accept=".json" hidden @change="upload"></footer>
  </dialog>
</template>
<style scoped>
.monitor-settings{position:fixed;inset:16px 16px 16px auto;margin:0;width:min(600px,calc(100vw - 32px));height:calc(100dvh - 32px);max-height:none;border:1px solid var(--glass-border);border-radius:20px;padding:0;background:var(--background);color:var(--foreground)}
.monitor-settings[open]{display:flex;flex-direction:column}.monitor-settings::backdrop{background:#07101c88;backdrop-filter:blur(5px)}header{display:flex;justify-content:space-between;gap:16px;padding:22px}h2{font-size:19px;font-weight:650}header p,small,footer p{font-size:12px;opacity:.75;line-height:1.7}.settings-fields{overflow:auto;padding:0 22px;flex:1;min-height:0}h3{font-size:15px;font-weight:650;padding:24px 0 12px;border-bottom:1px solid #8883}.settings-field{display:grid;grid-template-columns:1fr minmax(100px,45%);align-items:center;gap:10px;padding:14px 0;font-size:13px}.settings-field small{grid-column:1/-1}.settings-field input:not([type=checkbox]),select,textarea{width:100%;padding:8px;border:1px solid #8885;border-radius:8px;background:var(--background);color:inherit}.settings-field input[type=checkbox]{justify-self:end;width:18px;height:18px}textarea{min-height:80px;grid-column:1/-1}footer{padding:16px 22px;border-top:1px solid #8883}footer>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}@media(max-width:600px){header,.settings-fields,footer{padding-left:16px;padding-right:16px}h2{font-size:16px}}
</style>
