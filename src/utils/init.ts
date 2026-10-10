import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { getSharedApi } from '@/utils/api'
import { abortNodes, acceptNodes, mappedNodes, readNodes } from '@/monitor/transport'
let socket: WebSocket | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let reconnect: ReturnType<typeof setTimeout> | undefined
let stopped = false
let generation = 0
// 连续失败到这个次数才亮「连接错误」。iOS 从后台恢复的头一两秒网络常常还没就绪，请求会立刻失败，单次失败不算数
const FAILURE_LIMIT = 3
let failures = 0
let updatedAt = 0
let resumedAt = 0
function interval() {return Math.max(1000, useAppStore().dataUpdateInterval * 1000)}
function apply(nodes: Awaited<ReturnType<typeof readNodes>>) {
  const data = mappedNodes(nodes)
  useNodesStore().initNodes(data.clients, data.statuses)
  useAppStore().connectionError = false
  failures = 0; updatedAt = Date.now()
}
async function poll(current = generation) {
  if (stopped || current !== generation) return
  let delay = interval()
  try {const nodes = await readNodes(); if (current === generation && !stopped) apply(nodes)} catch {
    if (current === generation && !stopped) {
      failures++
      if (failures >= FAILURE_LIMIT) useAppStore().connectionError = true
      // 还没到报错次数时按 1s、2s… 尽快重试，不等满一个刷新间隔
      else delay = Math.min(delay, failures * 1000)
    }
  }
  if (!stopped && current === generation) timer = setTimeout(() => poll(current), delay)
}
function connect() {
  if (stopped) return
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`)
  const activeSocket = socket
  socket.onopen = () => {useNodesStore().wsConnectionState = 'connected'}
  socket.onmessage = event => {
    try {apply(acceptNodes(JSON.parse(event.data).nodes))} catch {useAppStore().connectionError = true}
  }
  socket.onerror = () => activeSocket.close()
  socket.onclose = () => {
    useNodesStore().wsConnectionState = 'disconnected'
    if (!stopped) reconnect = setTimeout(connect, 10000)
    // HTTP polling remains available when proxies do not support WebSocket.
  }
}
// 手机把切到后台的页面挂起时会悄悄掐断连接：切回来时 WebSocket 可能仍显示已连接却收不到数据，挂起前发出的请求也会失败，
// 亮出「连接错误」。所以页面隐藏时停掉轮询和推送、中止在途请求；回到前台立即拉一次并重新连接
function pause() {
  generation++; clearTimeout(timer); clearTimeout(reconnect); abortNodes(); failures = 0
  if (socket) {socket.onclose = null; socket.close(); socket = undefined}
}
function resume() {pause(); resumedAt = Date.now(); connect(); void poll()}
function onVisibility() {
  // 首次加载由 initApp 自己收尾，它结束时会启动轮询和推送
  if (stopped || useAppStore().loading) return
  if (document.hidden) pause()
  else resume()
}
// 添加到主屏幕的 iOS Web App 从后台恢复时，visibilitychange 有时不触发或来得太晚；
// 用 pageshow（含往返缓存恢复）和 focus 兜底：只要页面可见且数据已经超过两个刷新间隔没更新，就当作刚恢复。
// 切回标签页时 visibilitychange 和 focus 前后脚到达，刚恢复过就不再重来，否则会中止刚发出的请求，连带延迟卡片一起失败
function onWake() {
  if (stopped || useAppStore().loading || document.hidden) return
  if (Date.now() - Math.max(updatedAt, resumedAt) > interval() * 2) resume()
}
export async function initApp() {
  destroyInitManager(); stopped = false
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onWake)
  window.addEventListener('focus', onWake)
  const current = ++generation
  const store = useAppStore()
  store.loading = true
  try {
    const api = getSharedApi()
    const [settings, me, nodes] = await Promise.all([api.getPublicSettings(), api.getMe(), readNodes()])
    if (current !== generation) return
    store.publicSettings = settings
    store.updateLoginState(me.logged_in, me)
    document.title = settings.sitename
    apply(nodes)
    connect()
  } catch {store.connectionError = true}
  finally {store.loading = false; if (current === generation) void poll()}
}
export async function retryInitApp() {await initApp(); return !useAppStore().connectionError}
export function destroyInitManager() {
  stopped = true
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pageshow', onWake)
  window.removeEventListener('focus', onWake)
  pause()
}
export function getInitManager() {return null}
