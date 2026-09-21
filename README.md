# Glassmorphism for 极简探针

将 [sanrokamlan-prog/komari-theme-Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism) 原主题移植到 [极简探针 Monitor](https://github.com/monitor-probe/monitor)。基于原版 v3.3.7 的 Vue 源码、组件、样式与资源，使用 Monitor REST / WebSocket 适配层替换 Komari 数据源。LuminaPlus 仅作为本机设置与静态配置的实现参考。

2.0 取代此前自行设计的 React 界面；保留原项目 MIT 许可和作者署名。

## 已保留的原版界面与功能

- 原版动态渐变背景、翡翠/柔和/高对比/午夜/自定义玻璃配色，浅色/深色/北京时间自动日夜模式。
- 首页贴图地球、Cobe 点阵地球、平铺世界地图；节点国家标记、自动旋转开关与地球隐藏。
- 首页概览卡片方案与自定义顺序、公告、快捷筛选、节点收藏。
- mini / compact / comfortable / large 节点卡片、列表、搜索、离线置底。
- 原版节点详情、资源负载图、延迟图、费用计算、节点对比及快照等组件。
- 原主题配置 schema 对应的设置面板，图片/视频背景、布局、数值格式等设置；本机保存、配置导入导出和恢复默认。

## Monitor 接口适配与差异

`src/monitor/` 是适配层，调用同源 `/api/me`、`/api/nodes`、`/api/nodes/{id}/metrics`、`/api/ws`。不需要 Komari 服务器，也不发送 Komari RPC 请求。

- 节点数字 ID 映射为原主题 UUID 字符串；内存/磁盘保留字节单位。
- 首页和列表配额使用 Monitor 本月上传/下载计数，累计上传/下载保留生命周期总计。
- 后端未公开 IP，因此地球按国家中心坐标定位，不宣称机房/城市精确位置。不向第三方发送节点 IP。
- 原版 GPU、节点分组/自定义标签、ASN/BGP、审计日志等依赖额外后端数据。Monitor 未提供的字段不可获得；审计工具入口已移除，拓扑仅能利用公开节点元数据，GPU 数据不代表真实上报。
- 历史接口提供 CPU、内存、磁盘、上下行速率、Ping。未提供的历史字段保留为空值，不以累计计数或当前值伪造历史曲线。实时连接数、交换内存等仍使用节点实时快照。
- Ping 摘要使用响应中的窗口丢包率，详情任务使用后端 `loss`。短条历史采用对应返回桶的丢包信息；不将其平均当作整个窗口丢包率。
- 访客信息查询默认关闭；用户开启后使用原主题的第三方访客 IP 查询。原主题汇率、图标加载也保留外部服务依赖。
- 私有高级工具仍以 `/api/me` 登录状态校验；极简探针后台由 `/admin/` 接管，安装包不携带 Komari 后台。

## 安装 / 手动更新

后台「主题」→「上传主题包」，选择 `release/theme.tar.gz`。相同 `short=glassmorphism` 会替换已有主题；首次安装后选择启用。

包根目录直接包含：

```text
theme.json
LICENSE
dist/
  index.html
  glass-config.json
  assets/
  images/
```

也可手动解压到 `<themes-dir>/glassmorphism/`。

主题卡片上的 GitHub 更新需要在本仓库发布正式 Release，并上传名称精确为 `theme.tar.gz` 的附件。仅推送源码不会形成在线更新；Release 标签去掉 `v` 后应与 `theme.json` 的版本一致。

## 开发

Node.js 24+，npm：

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
npm run package
```

`/api` 默认代理到 `127.0.0.1:9911`。没有真实 hub 时，可另开终端运行 `python3 scripts/demo-server.py`；它提供标记为演示的数据和历史，WebSocket 不可用时回退轮询。生产安装包不包含演示接口。

## 配置

顶部「主题设置」使用原主题 `src/theme-schema.json` 字段，修改保存在当前浏览器。站点默认值位于 `public/glass-config.json`，打包后为 `dist/glass-config.json`。

统一站点配置：导出 JSON → 替换 `public/glass-config.json` → 重新打包上传。已有本机设置的浏览器需点击「恢复默认」。Monitor 不提供原主题管理设置 API，因此没有后端保存按钮。原 Komari RPC 传输选择不适用于此移植版。

## 验证

执行 Vue/TypeScript 检查、生产构建、适配层 lint 与字段映射回归测试。浏览器使用演示接口验证地球/地图及设置。尚未连接用户真实 hub 部署验收，不能据此宣称所有高级工具已完成生产验证。
