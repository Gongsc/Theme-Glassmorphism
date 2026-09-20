import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { Moon, Sun, Wrench, Activity, Search, LayoutGrid, List, ArrowLeft, Server } from "lucide-react"

import { NodeCard } from "@/components/NodeCard"
import { Summary } from "@/components/Summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, useNodes, type Node } from "@/lib/api"

type Me = { authed: boolean; github: boolean; site_name: string; public_page: boolean }

// Split out because recharts is most of this bundle and the list page draws no
// chart. The landing page is 242 kB rather than 629 kB (77 kB gzipped against
// 188 kB), with the rest fetched immediately after it paints.
const loadDetail = () => import("@/components/NodeDetail").then((m) => ({ default: m.NodeDetail }))
const NodeDetail = lazy(loadDetail)

// `/node/{id}` is a real page: it survives a reload, can be linked to, and back
// leaves the detail view rather than the site. The hub serves index.html for any
// unknown path, so no server-side route is required.
function useNodeRoute() {
  const read = () => {
    const match = location.pathname.match(/^\/node\/(\d+)/)
    return match ? Number(match[1]) : null
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const sync = () => setId(read())
    addEventListener("popstate", sync)
    return () => removeEventListener("popstate", sync)
  }, [])
  return [
    id,
    (next: number | null) => {
      history.pushState({}, "", next === null ? "/" : `/node/${next}`)
      setId(next)
      scrollTo(0, 0)
    },
  ] as const
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches
  })
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])
  return [dark, () => setDark((d) => !d)] as const
}

export default function App() {
  const [dark, toggleTheme] = useTheme()
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState("")
  const { nodes, error, closed } = useNodes()
  const [open, go] = useNodeRoute()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [layout, setLayout] = useState("grid")

  const loadMe = useCallback(() => {
    // `|| "..."` because an empty message reads as no error: api() falls back to
    // res.statusText, which HTTP/2 and HTTP/3 removed, so a bodiless 502 from a
    // proxy arrives as "". The check below would then take the loading branch and
    // the retry button would never render.
    return api<Me>("/me")
      .then((next) => { setMe(next); setMeError("") })
      .catch((e: Error) => setMeError(e.message || "网络错误"))
  }, [])

  useEffect(() => {
    loadMe()
    // Warmed here rather than left to Suspense, which requests the chunk only
    // once a render reaches the detail view, itself waiting on /me. Without this
    // the split trades its first paint for a full-page skeleton over the first
    // node opened: 2.6s click-to-chart on 4G against 1.4s unsplit, 1.7s warm.
    void loadDetail()
  }, [loadMe])

  // The status page was closed while this tab was open. `me` holds whatever it
  // reported at load, so it is re-queried; the effect below then directs an
  // anonymous visitor to the panel rather than leaving them on a list that
  // stopped updating with only a red line to explain it.
  useEffect(() => {
    if (closed) void loadMe()
  }, [closed, loadMe])

  useEffect(() => {
    if (me && !me.public_page && !me.authed) location.href = "/admin/"
  }, [me])

  const sorted = [...(nodes ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id)
  const filtered = sorted.filter(n => (status === "all" || n.online === (status === "online")) && `${n.name} ${n.country} ${n.os}`.toLowerCase().includes(query.toLowerCase()))
  const selected = sorted.find((n) => n.id === open)

  // `/node/{id}` is a page people bookmark and share, so the tab needs the node's
  // name. The site name rather than a fixed string, since the hub lets an operator
  // rename the site.
  useEffect(() => {
    document.title = [selected?.name, me?.site_name || "Monitor"].filter(Boolean).join(" · ")
  }, [selected?.name, me?.site_name])

  // Only while there is nothing else to show. Once `me` has loaded, a later
  // failure belongs beside the page rather than over it.
  if (!me) return (
    <div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
      {meError ? <div className="space-y-3 text-center"><p role="alert">加载失败：{meError}</p><Button onClick={loadMe}>重试</Button></div> : "加载中…"}
    </div>
  )

  // The status page is closed and nobody is signed in: redirect to the panel.
  if (!me.public_page && !me.authed) return null

  return (
    <div className="min-h-svh">
      <header className="site-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          {/* The site name is the way back to the list, so a node page needs
              no back button of its own. */}
          <button className="brand flex items-center gap-3 font-semibold transition-opacity hover:opacity-70" onClick={() => go(null)}>
            <span className="brand-mark"><Activity size={22} /></span>{me.site_name || "极简探针"}<span className="brand-tag">GLASS</span>
          </button>
          <div className="flex-1" />
          {/* The panel is a separate app built into the hub, not part of this
              theme, so this is a navigation rather than a route. */}
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/">
              <Wrench /> {me.authed ? "进入后台" : "登录"}
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="切换主题" aria-label="切换明暗主题">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-7 px-4 py-8 sm:px-6">
        {error && <p role="alert" className="glass-alert text-sm text-destructive">连接异常，正在重试。当前显示最后一次数据：{error}</p>}
        {open !== null && <Button variant="ghost" onClick={() => go(null)}><ArrowLeft />返回总览</Button>}

        {open !== null ? (
          !nodes ? (
            <Skeleton className="h-96" />
          ) : selected ? (
            <Suspense fallback={<Skeleton className="h-96" />}>
              <NodeDetail node={selected} />
            </Suspense>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              节点不存在或未公开。<button className="underline" onClick={() => go(null)}>返回列表</button>
            </p>
          )
        ) : !nodes ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <>
            <section className="hero">
              <div><p className="eyebrow">INFRASTRUCTURE / OVERVIEW</p><h1>每一刻，尽在掌握<span>。</span></h1><p className="hero-copy">从资源负载到网络流量，让每一台服务器的状态清晰可见。</p></div>
              <div className="connection"><span className={error ? "status-dot offline" : "status-dot"} />{error ? "连接恢复中" : "自动更新已开启"}<span className="connection-sub">{sorted.length} 个节点已接入</span></div>
            </section>
            <Summary nodes={sorted} />
            <section className="toolbar" aria-label="节点筛选">
              <div className="section-title"><Server size={19} /><h2>我的节点</h2><span>{filtered.length}</span></div>
              <div className="filters"><div className="segmented">{[["all", "全部"], ["online", "在线"], ["offline", "离线"]].map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div>
              <label className="search"><Search size={16}/><input aria-label="搜索节点" placeholder="搜索名称、地区或系统…" value={query} onChange={e => setQuery(e.target.value)} /></label>
              <div className="segmented view-switch"><button aria-label="卡片视图" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={17}/></button><button aria-label="紧凑视图" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={17}/></button></div></div>
            </section>
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{sorted.length ? "没有匹配的节点，请调整搜索或筛选条件。" : "还没有节点，请在后台添加第一台服务器。"}</p>
            ) : (
              <div className={`node-grid grid items-start gap-5 ${layout === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "compact-grid"}`}>
                {filtered.map((n: Node) => (
                  <NodeCard key={n.id} node={n} onOpen={() => go(n.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </main><footer className="site-footer"><span>极简探针 <b>/</b> GLASSMORPHISM</span><span>让基础设施，一目了然。</span></footer>
    </div>
  )
}
