import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { getSharedApi } from '@/utils/api'
import { abortNodes, acceptNodes, mappedNodes, readNodes } from '@/monitor/transport'
let socket: WebSocket | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let reconnect: ReturnType<typeof setTimeout> | undefined
let stopped = false
let generation = 0
function apply(nodes: Awaited<ReturnType<typeof readNodes>>) {
  const data = mappedNodes(nodes)
  useNodesStore().initNodes(data.clients, data.statuses)
  useAppStore().connectionError = false
}
async function poll(current = generation) {
  if (stopped || current !== generation) return
  try {const nodes = await readNodes(); if (current === generation && !stopped) apply(nodes)} catch {if (current === generation && !stopped) useAppStore().connectionError = true}
  if (!stopped && current === generation) timer = setTimeout(() => poll(current), Math.max(1000, useAppStore().dataUpdateInterval * 1000))
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
  generation++; clearTimeout(timer); clearTimeout(reconnect); abortNodes()
  if (socket) {socket.onclose = null; socket.close(); socket = undefined}
}
function onVisibility() {
  // 首次加载由 initApp 自己收尾，它结束时会启动轮询和推送
  if (stopped || useAppStore().loading) return
  pause()
  if (!document.hidden) {connect(); void poll()}
}
export async function initApp() {
  destroyInitManager(); stopped = false
  document.addEventListener('visibilitychange', onVisibility)
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
export function destroyInitManager() {stopped = true; document.removeEventListener('visibilitychange', onVisibility); pause()}
export function getInitManager() {return null}
