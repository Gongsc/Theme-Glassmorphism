# Glassmorphism · 极简探针主题

为 [极简探针 monitor](https://github.com/monitor-probe/monitor) 制作的玻璃拟态主题。视觉参考 [Komari Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism)，接口、历史图表和基础组件基于 MIT 许可的 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default)。保留原作者版权，见 LICENSE。

## 功能

- 柔和渐变背景、毛玻璃卡片、明暗模式（首次跟随系统，手动选择保存在浏览器）。
- 在线节点、最忙 CPU、今日/累计流量、实时上下行概览。
- 名称、国家代码、操作系统搜索，在线/离线筛选，卡片与紧凑视图。
- CPU、内存、磁盘、流量配额、运行时长、到期时间。
- 独立节点详情页、历史资源和网络延迟图表、窗口丢包率。
- WebSocket 实时快照、断线重连及 HTTP 轮询回退。
- 移动端布局、键盘操作、减少动态效果支持。

这是极简探针主题，不能导入 Komari。不包含 Komari 专有的拓扑、费用排行或审计接口。

## 安装

将 `release/monitor-theme-glassmorphism-1.0.0.tar.gz` 解压到 hub 的 `--themes` 目录：

```sh
tar -xzf monitor-theme-glassmorphism-1.0.0.tar.gz -C /path/to/themes
```

目录结构必须是：

```text
/path/to/themes/glassmorphism/
  theme.json
  LICENSE
  dist/
    index.html
    assets/
```

进入极简探针后台「主题」页，切换到 **Glassmorphism · 玻璃拟态**，无需重启。
如果后台有上传功能，请以该版本后台要求为准；此包提供默认主题 README 约定的目录安装结构。

## 开发和打包

需要 Node.js 24+、npm、系统 tar。

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
npm run package
```

开发地址为 `http://127.0.0.1:5173`，`/api` 和 WebSocket 代理到 `http://127.0.0.1:9911`。生产部署由 hub 提供同源 API，不需要运行 Vite。`npm run package` 生成带目录的 tar.gz 和 SHA-256 校验文件。

没有 hub 时，可在另一个终端运行 `python3 scripts/demo-server.py`。该脚本仅监听本机 9911，提供明确标注为「演示」的 6 个节点与历史图，用于 UI 预览；不实现 WebSocket，主题将自动回退为轮询。连接真实 hub 前停止该脚本。演示代码不会进入 dist 或安装包。

## 接口契约

沿用默认主题的 `GET /api/me`、`GET /api/nodes`、`GET /api/nodes/{id}/metrics` 和 `GET /api/ws`。历史查询保留 `hours`、`points`、`series` 参数。丢包率使用后端窗口 `loss`，不对桶百分比取平均。

未登录且关闭公开页面时跳转 `/admin/`。主题不接管后台，不读取私有管理接口。反代/WAF 需要允许 `/node/{id}`，支持详情页直接刷新。

## 验证范围

构建、oxlint、格式化与实时指标异常输入测试；使用演示接口检查搜索、筛选、节点详情、明暗主题及窄屏布局。尚未连接用户的真实 hub 实例进行部署验收。
