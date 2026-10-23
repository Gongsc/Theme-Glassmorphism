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
// 推送还连着或正在连就不动；已经断开、正等 10 秒重连的，立即重连
function ensureSocket() {
  if (socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN) return
  clearTimeout(reconnect)
  if (socket) {socket.onclose = null; socket.close()}
  connect()
}
// 站点设置、登录状态和节点三路互不依赖，哪一路失败都不丢另外两路的结果：节点读失败时站名、主题配置和登录照样生效，
// 不会退回默认配置和兜底站名「Monitor」。有一路失败就亮「连接错误」，返回三路是否全部成功
async function load(current: number) {
  const store = useAppStore()
  const api = getSharedApi()
  const [settings, me, nodes] = await Promise.allSettled([api.getPublicSettings(), api.getMe(), readNodes()])
  if (stopped || current !== generation) return false
  if (settings.status === 'fulfilled') {store.publicSettings = settings.value; document.title = settings.value.sitename}
  if (me.status === 'fulfilled') store.updateLoginState(me.value.logged_in, me.value)
  if (nodes.status === 'fulfilled') apply(nodes.value)
  const ok = settings.status === 'fulfilled' && me.status === 'fulfilled' && nodes.status === 'fulfilled'
  if (!ok) store.connectionError = true
  return ok
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
  try {await load(current)} catch {store.connectionError = true}
  // 首屏没读到节点也照样连推送、开轮询，由它们补上数据
  finally {store.loading = false; if (current === generation) {connect(); void poll()}}
}
// 重试只重新拉设置、登录和节点，不拆掉正在工作的推送和轮询；推送已断开的立即重连
export async function retryInitApp() {ensureSocket(); return load(generation)}
export function destroyInitManager() {
  stopped = true
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pageshow', onWake)
  window.removeEventListener('focus', onWake)
  pause()
}
export function getInitManager() {return null}
