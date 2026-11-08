# YouTube Lite 工程手册

本手册面向要阅读、修改或排查这个项目的开发者，按“请求从哪来 → 代码在哪 → 数据怎么流动”的顺序解释整个实现。

- 代码基线：`main`，版本 `1.3`（`versionCode 4`）
- 上游参考：[prateek-chaubey/YTPro](https://github.com/prateek-chaubey/YTPro)，差异见 [FORK-DIFFERENCES.md](FORK-DIFFERENCES.md)
- 阅读方式：先看第 1–4 章建立整体模型，再按需跳到具体子系统；每章末尾有“常见改动”和“易碎点”。

> 约定：`Java` 指 `app/src/main/java/com/matr1x/youtubelite/`，`assets` 指 `app/src/main/assets/`，`scripts` 指仓库根目录的 `scripts/`。`scripts/*.js` 在构建时由 Gradle 复制到 `assets/`，两边内容必须一致。

---

## 目录

1. [整体架构](#1-整体架构)
2. [进程、线程与状态](#2-进程线程与状态)
3. [启动与导航](#3-启动与导航)
4. [脚本注入与资源拦截](#4-脚本注入与资源拦截)
5. [JavaScript 桥](#5-javascript-桥)
6. [下载子系统](#6-下载子系统)
7. [字幕系统](#7-字幕系统)
8. [更新器](#8-更新器)
9. [播放器、手势、后台播放](#9-播放器手势后台播放)
10. [Gemini](#10-gemini)
11. [RYD、广告、Shorts 与界面清理](#11-ryd广告shorts-与界面清理)
12. [安全模型](#12-安全模型)
13. [生命周期与清理](#13-生命周期与清理)
14. [构建、CI 与调试](#14-构建ci-与调试)
15. [常见修改指南](#15-常见修改指南)
16. [已知限制与易碎点](#16-已知限制与易碎点)

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│ MainActivity (singleTask)                                   │
│  ├─ YTProWebView (WebView, 加载 https://m.youtube.com/)      │
│  ├─ YTProWebViewClient  ← 拦截资源 / 路由链接 / 注入脚本     │
│  ├─ YTProWebChromeClient ← 全屏、媒体权限、控制台            │
│  ├─ WebAppInterface("Android") ← JS → Java 桥               │
│  ├─ CaptioningController ← Android 字幕设置 → captions.js    │
│  ├─ BinaryStreamManager ← WebMessagePort 二进制落盘          │
│  └─ ForegroundService + MediaSession ← 后台播放通知          │
└─────────────────────────────────────────────────────────────┘
            │ 注入
            ▼
┌─────────────────────────────────────────────────────────────┐
│ YouTube mweb 页面 (React/自定义元素 + 播放器)                │
│  constants.js → script.js → bgplay.js → innertube.js         │
│  → player-fixes.js → captions.js → quality.js                │
│  通过 window.Android.* 调用原生能力                          │
└─────────────────────────────────────────────────────────────┘
```

设计要点：

- **单 Activity + WebView**：没有原生播放器，所有播放行为仍由 YouTube 网页控制。
- **能力在原生，界面在 Web**：下载、安装、通知、亮度/音量、PiP 由 Java 提供；按钮、面板、历史列表由注入的 JS 绘制。
- **注入脚本分层**：核心 UI（`script.js`）、InnerTube 与下载器（`innertube.js`）、字幕（`captions.js`）、画质（`quality.js`）、布局修补（`player-fixes.js`）各自独立，靠 `window` 全局对象通信。
- **两套资源来源**：`assets/` 本地优先；同一路径在 `shouldInterceptRequest` 里命中后直接返回本地流，失败再回退 CDN。

### 代码地图

| 路径 | 作用 |
|---|---|
| `MainActivity.java` | WebView 创建、intent 解析、生命周期、PiP |
| `webview/YTProWebViewClient.java` | 主框架重抓、assets 拦截、外链路由、脚本注入 |
| `webview/WebAppInterface.java` | `window.Android` 的全部桥方法 |
| `webview/YTProWebChromeClient.java` | 全屏、媒体权限、控制台消息 |
| `webview/BinaryStreamManager.java` | WebMessagePort → 缓存文件写入 |
| `captions/CaptioningController.java` | 读取系统字幕设置并推给 `captions.js` |
| `utils/DownloadUtils.java` | DownloadManager 入队/状态/文件名 |
| `utils/DownloadPaths.java` | 下载目录解析与清洗 |
| `utils/MediaMuxerUtils.java` | 视频+音频合流 |
| `ForegroundService.java` | 后台播放前台服务与媒体通知 |
| `assets/script.js` | 设置页、Gemini、RYD、手势、更新器、广告清理 |
| `assets/innertube.js` | InnerTube 格式解析、SABR 下载、下载管理器 UI |
| `assets/captions.js` | 字幕双模式运行时 |
| `assets/quality.js` | 画质锁定 |
| `assets/player-fixes.js` | 播放器布局修补 |
| `assets/constants.js` | `YTL.KEY` / `YTL.URL` / `YTL.MS` 常量 |
| `assets/bgplay.js` | 后台播放辅助 |

---

## 2. 进程、线程与状态

- 全部运行在应用主进程；WebView 在 UI 线程，JS 在 WebView 的渲染/JS 线程。
- `@JavascriptInterface` 方法默认在 **WebView 的 JavaBridge 线程**执行，不是 UI 线程：
  - 直接碰 UI（`Toast`、`startActivity`、`requestPermissions`）必须 `activity.runOnUiThread(...)`；
  - 网络/合流等耗时操作要另起线程（`downvid`、`getSNlM0e`、`GeminiClient` 都这么做）。
- 共享状态主要放在 `MainActivity` 的公开字段：
  - `currentUrl`：最近一次 `onPageStarted` 的 URL，桥的信任判断用它（`web.getUrl()` 在回调线程可能为 null，所以不能只依赖它）。
  - `portrait`、`isPlaying`、`mediaSession`、`isPip`：播放/PiP 状态。
  - `streamManager`：`BinaryStreamManager` 实例。
- 页面侧状态：
  - `localStorage`：`subsSys`、`defSubs`、`shorts`、`bgplay`、`prompt`、`ytlUpdChecked`、`ytdlHist` 等。
  - `window` 全局：`YTL`、`YTPRO_CAPTIONS`、`YTPRO_QUALITY`、`ytdlAddHistory`、`ytdlOnMuxDone`、`__ytdlCtx`、`__ytdlNeedNewCard` 等。

> 修改桥方法时先问自己：**这段代码跑在哪个线程？会不会碰 UI？** 这是本项目最常见的崩溃来源。

---

## 3. 启动与导航

### 3.1 冷启动

`MainActivity.onCreate()`：

1. debug 构建开启 `WebView.setWebContentsDebuggingEnabled(true)`（release 不开）。
2. `setContentView(R.layout.main)`，拿到 `splash`，8 秒兜底隐藏。
3. 初始化 `SharedPreferences("YTPRO")` 的 `bgplay` 默认值。
4. Android 13+ 请求 `POST_NOTIFICATIONS`（后台播放通知需要）。
5. `load()` 创建 WebView、桥、Client、`BinaryStreamManager`，然后 `loadUrl(url)`。

`load()` 是幂等的：`web != null` 直接返回，避免旋转/重入时把 `CaptioningController`、广播、返回回调绑到旧 WebView 上。

### 3.2 从外部链接进入

`AndroidManifest.xml` 给 `MainActivity` 注册了三类入口：

- `VIEW` + `BROWSABLE`：`http/https` 的 `youtube.com`、`*.youtube.com`、`youtu.be`；
- `SEND` + `text/plain`：分享菜单里的文本；
- `singleTask`：已运行时不再新建 Activity，而是走 `onNewIntent()`。

`urlFromIntent(intent)` 的解析规则：

| 输入 | 处理 |
|---|---|
| `VIEW` + `http(s)` + YouTube 域 | 原样加载 |
| `VIEW` + `vnd.youtube:` / `youtube:` | 用 `findVideoId()` 取 11 位 ID，拼成 `https://m.youtube.com/watch?v=ID` |
| `SEND` + 文本 | 正则抓第一个 `https?://...`，host 属于 YouTube 才采用 |
| 其他 | 返回 `null`，加载首页 |

`findVideoId()` 用 `[A-Za-z0-9_-]{11}` 匹配并跳过 `watch`/`https` 这类误命中。

### 3.3 页面内导航与外链

`YTProWebViewClient.handleUrl()` 决定一个 URL 是留在 WebView 还是交给系统：

- **留在应用内**：YouTube 各域、`accounts.google.com`、`myaccount.google.com`、`consent.youtube.com`、`youtube-nocookie.com`。
- **Google 跳转**：`google.com/*` 的 `q` / `url` / `u` 参数如果指向 YouTube，直接 `view.loadUrl(target)`，不离开应用。
- **其他**：`Intent.ACTION_VIEW` + `FLAG_ACTIVITY_NEW_TASK` 交给系统浏览器，返回 `true` 表示已处理。

`returns false` 的 URL 会继续由 WebView 加载。

---

## 4. 脚本注入与资源拦截

### 4.1 注入顺序

`onPageFinished()`（`YTProWebViewClient`）只在 YouTube host 上执行：

1. 创建 Trusted Types 的 `default` policy（YouTube 页面启用 Trusted Types 后，内联脚本才能插入）。
2. `evaluateJavascript(constants.js 全文)` —— 同步、最先执行，保证后续脚本能读到 `YTL`。
3. 动态插入三个 `<script>`，`src` 都指向 `https://youtube.com/ytpro_cdn/npm/ytpro@latest/...`：
   - `script.js`
   - `bgplay.js`
   - `innertube.js`（`type="module"`）
4. 同一个 `onPageFinished` 末尾调用 `CaptioningController.onPageFinished()`：
   - 注入 `player-fixes.js` → `captions.js` → `quality.js`（`evaluateJavascript` 全文）；
   - `pushConfig()` 把系统字幕配置写入 `window.__YTPRO_CAPTION_CFG__` 并调用 `YTPRO_CAPTIONS.apply(cfg)`；
   - `nudgeQuality()` 调一次 `YTPRO_QUALITY.apply()`。

> 为什么 `script.js` 用 `<script src>` 而不是 `evaluateJavascript`？因为需要在页面自己的脚本上下文里长期运行，且能通过拦截器返回本地 assets。`constants/*.js` 用 `evaluateJavascript` 是为了保证执行顺序。

### 4.2 assets 拦截

`shouldInterceptRequest()` 按顺序处理：

1. **登录相关 URL 直接放行**（`accounts.google.com`、`google.com/signin`、`SetSID` 等），不重写，避免破坏登录。
2. **主框架 HTML 重抓**（仅 YouTube host）：
   - 用 `HttpsURLConnection` 重新请求，透传请求头（去掉 `Accept-Encoding`），带上 Cookie；
   - 删除响应里的 `Content-Security-Policy` 头与 `<meta http-equiv="Content-Security-Policy">`；
   - 去掉 `content-length` / `content-encoding` / `transfer-encoding`，避免长度不匹配；
   - 15 秒连接/读取超时；异常时回退 `super`。
3. **Google 的 JS/reCAPTCHA**：代理请求并加 `Referer: https://www.youtube.com/` 与 CORS 头。
4. **`youtube.com/ytpro_cdn/npm/ytpro...`**：按文件名映射到本地 assets：
   - `bgplay.js` → `bgplay.js`
   - `innertube.js` → `innertube.js`
   - `constants.js` → `constants.js`
   - 其他（含 `@latest`）→ `script.js`
   - 返回头带 `Cache-Control: no-store`，注入 URL 还带 `?v=Date.now()`，双重防缓存。
5. **其他 `ytpro_cdn` 请求**：把 `ytpro_cdn/npm` 重写到 `cdn.jsdelivr.net`、`ytpro_cdn/esm` 重写到 `esm.sh`，并加 CORS。
6. 其余交给系统。

> 这张拦截表是“本地资源优先、CDN 兜底”的核心；新增 assets 脚本时，除了加 `<script src>`，还要在这里补映射，否则会 404 到 CDN。

### 4.3 页面内（SPA）导航

`doUpdateVisitedHistory()` 会在 YouTube 的 SPA 跳转后调用 `CaptioningController.onHistoryChanged()`：

- 重新注入 `player-fixes.js`、`captions.js`、`quality.js`（YouTube 可能重建了播放器 DOM）；
- 再 `pushConfig()` 与 `nudgeQuality()`。

字幕/画质相关问题优先检查这里是否被触发。

---

## 5. JavaScript 桥

桥对象名固定为 `Android`（`web.addJavascriptInterface(new WebAppInterface(this, web), "Android")`）。

### 5.1 信任模型

`WebAppInterface.trusted()`：

```java
String u = activity.currentUrl;          // onPageStarted 维护
if (u == null || u.isEmpty()) u = web.getUrl();
host ∈ { m.youtube.com, www.youtube.com, youtube.com, *.youtube.com, youtu.be }
```

所有涉及文件、下载、Intent、Cookie、Gemini token 的方法都先 `if (!trusted()) return;`。这样即使页面被导航到任意站点，脚本也无法调用原生能力。

### 5.2 方法分组

| 分组 | 方法 | 说明 |
|---|---|---|
| 启动/UI | `splashReady()`、`showToast()`、`gohome()`、`fullScreen()` | 启动页淡出、Toast、回桌面、记录方向 |
| 信息 | `getInfo()`、`isWebViewSupported()`、`hasStoragePermission()` | 版本号、WebMessage 支持、存储权限 |
| 媒体下载 | `downvid(name,url,mime)`、`setDownloadFolder()`、`requestBinaryPort()`、`muxVideoAudio(...,folder)` | 见第 6 章 |
| 下载管理 | `openDownloadedFile()`、`shareDownloadedFile()`、`deleteDownloadedFile()` | MediaStore，Android 10+ |
| 更新器 | `apkDownload()`、`apkProgress()`、`installApk()` | 见第 8 章 |
| 外链 | `oplink(url)` | 打开外部链接 |
| Gemini | `getSNlM0e(cookies)`、`GeminiClient(url,headers,body)`、`getAllCookies(url)` | 见第 10 章 |
| 媒体 | `getVolume()/setVolume()`、`getBrightness()/setBrightness()`、`pipvid()` | 手势与 PiP |
| 后台播放 | `setBgPlay()`、`bgStart/bgUpdate/bgStop/bgPause/bgPlay/bgBuffer` | 见第 9 章 |

### 5.3 回调约定

Java 完成后通过 `web.evaluateJavascript(...)` 回调页面，页面侧必须用 `window.fn && fn(...)` 防御：

- 下载完成：`ytdlAddHistory(savedName, title, "")`
- 下载失败：`ytdlDownloadFailed(savedName, "download failed")`
- 合流完成：`ytdlOnMuxDone(name, err)`
- Gemini token：`callbackSNlM0e.resolve("...")`
- Gemini 流：`callbackGeminiClient.resolve({...})`

字符串参数一律经过 `JSONObject.quote()`，不要手拼引号。

---

## 6. 下载子系统

这是全项目最复杂的一条链路，分“格式解析 → SABR 拉流 → 二进制落盘 → 合流 → 入库”。

### 6.1 总览

```
用户点下载
  └─ innertube.js: ytproSabrDownload()
       ├─ yt.getBasicInfo(videoId, {client:'WEB'})
       ├─ 解析 adaptive_formats / audio_formats / caption_tracks
       ├─ 选视频 itag + 音频 itag（可选语言）
       └─ downloadSABRStream(videoItag, audioItag, isWebm, langId, enabledTrack)
            ├─ SabrStream(...).start()
            ├─ videoStream → pipeToDisk("name_VIDEO.mp4")
            ├─ audioStream → pipeToDisk("name_AUDIO.mp4")
            └─ Android.muxVideoAudio(video, audio, out, folder)
                 └─ MediaMuxerUtils → MediaStore/Download/Youtube Lite/<folder>/
```

### 6.2 格式与选择

- `yt.getBasicInfo()` 返回 `streaming_data.adaptive_formats`、`player_config...ustreamer_config`。
- `extractSabrConfig()` 取 `server_abr_streaming_url` 与 ustreamer config。
- `buildSabrFormat()` 把 InnerTube 格式转成 `SabrStream` 需要的结构。
- 视频/音频选择：
  - 目标 itag 不存在时回退到“码率最低”的格式（`trashSabrVideo/trashSabrAudio`），避免直接失败。
  - 语言：`langId != "undefined"` 时按 `audioTrackId` 过滤。
- `SabrStream` 参数里 `clientName: 1` 是 WEB，`preferMp4/preferH264` 由 `isWebm` 决定。
- 服务端要求 token 时（`streamProtectionStatusUpdate.status 2/3`），用预先生成的 `fullTokenPromise` 重设 `poToken`。
- 播放器响应过期时（`reloadPlayerResponse`）重新取 `basicInfo` 并更新 URL/config。

### 6.3 二进制落盘（WebMessagePort）

1. JS `createDedicatedPipe(fileName)` 返回 Promise，并调用 `Android.requestBinaryPort(fileName)`。
2. Java `BinaryStreamManager.openStreamForFile()`：
   - 检查 `WebViewFeature.WEB_MESSAGE_ARRAY_BUFFER`；
   - 在 `cacheDir/ytpro_dl/` 创建文件，`fileStreams.put(fileName, FileOutputStream)`；
   - `WebViewCompat.createWebMessageChannel()`，把 JS 端口通过 `postWebMessage("PORT_FOR:"+fileName, ports)` 发给页面；
   - 90 秒守护线程：若一直没收到 `END`，关闭流并移除（页面崩溃/刷新兜底）。
3. JS 侧监听 `window.addEventListener("message", ...)`，取 `event.ports[0]`，resolve 对应 Promise。
4. `pipeToDisk()`：
   - 512 KB 分片 `postMessage(arrayBuffer)`；
   - 每片 `await 5ms` 让出主线程；
   - 每满 1 MB 更新 UI：`已下载MB / 总MB · 速度MB/s` 与百分比；
   - `finally` 发送字符串 `"END"`，Java 关闭文件、销毁端口。

> 端口按文件名区分，同名并发下载会互相踩；`DownloadUtils.uniqueFileName()` 只处理 DownloadManager 的目标名，SABR 临时名由 JS 生成，改名时要同步考虑。

### 6.4 合流与入库

- `Android.muxVideoAudio(video, audio, out, folder)`：
  - 输入：`cacheDir/ytpro_dl/<video|audio>`；
  - 输出：`DownloadPaths.dirFor(folder)`（空则当前全局目录）；
  - `MediaMuxerUtils` 优先绝对路径，找不到再查 MediaStore（`setIncludePending`），成功后删输入。
- 成功后回调 `ytdlOnMuxDone(name, "")`；失败回调 `ytdlOnMuxDone(name, msg)`。
- 历史写在 JS：`localStorage.ytdlHist = [{n,t,th,v}]`，由 Java 在 DownloadManager 真正成功后调用 `ytdlAddHistory` 写入；失败调用 `ytdlDownloadFailed`，不会产生脏记录。

### 6.5 目录与命名

`DownloadPaths`：

- 根目录 `Youtube Lite`，用户可 `setDownloadFolder()` 指定子目录；
- `sanitizeFolder()` 过滤 `\/:*?"<>|` 与控制字符，截断 80；
- `relativeDir()` = `Download/Youtube Lite`；`dir()` / `dirFor(folder)` 返回绝对路径。

`DownloadUtils`：

- `sanitizeFileName()`：保留扩展名，整体不超过 120；
- `uniqueFileName()`：`synchronized`，重名追加 ` (n)`；
- `enqueue()` 返回 DownloadManager id；`statusOf()` 查询状态。

后缀约定：

| 类型 | 后缀 |
|---|---|
| 视频+音频合流 | `_FULL.mp4` |
| 纯视频 | `_VIDEO.mp4` |
| 纯音频 | `_AUDIO.mp4` |

### 6.6 下载管理器 UI

`innertube.js` 里：

- `createDownloaderStatus()` 创建 `#ytProDownloaderDiv`（底部面板）；
- `ytdlNewCard()` 按视频分组卡片，`ytdlAddHistory` 追加文件行；
- `ytdlOpenDetail()` / `__ytdlOpenDetailDOM()` 打开详情；
- `ytdlShowFileMenu()` 长按菜单：Open / Share / Delete；
- `ytdlDeleteFile()` 调 `Android.deleteDownloadedFile`，同时过滤 `ytdlHist` 并刷新卡片；
- `ytdlRenderHistory()` 从 localStorage 重建列表。

---

## 7. 字幕系统

两套 runtime，由设置页 `Subtitle system` 选择，持久化在 `localStorage.subsSys`：

- `system`（默认）：Android 字幕桥，跟随系统字幕开关/语言/字号/颜色；
- `native`：YouTube 原生 CC，只改样式（黄字、软阴影、透明背景）。

### 7.1 Java 侧：CaptioningController

- 构造时注册 `CaptioningManager.CaptioningChangeListener`（enabled/style/fontScale/locale 变化）。
- `onPageFinished()/onHistoryChanged()`：
  - `injectRuntime()`：注入 `player-fixes.js`、`captions.js`、`quality.js`；
  - `pushConfig()`：`buildConfig()` 读取系统设置，生成 JSON：
    `enabled / autoEnable / fontScale / locale / foreground / background / window / edgeType / edgeColor / has*`；
    然后 `window.__YTPRO_CAPTION_CFG__ = cfg; YTPRO_CAPTIONS.apply(cfg)`。
- 颜色统一转 `rgba(...)`；`fontScale` 限制 0.5–3；所有异常只记日志，不抛出。

### 7.2 JS 侧：captions.js

关键函数：

| 函数 | 作用 |
|---|---|
| `systemMode()` | `localStorage.subsSys !== 'native'` |
| `wantCaptions()` | `cfg.enabled || localStorage.defSubs === 'true'` |
| `ensureStyle()` | 注入/更新样式表；native 与 system 两套 CSS |
| `enableCaptions()` | 点 CC 按钮 / 菜单选轨、开关字幕 |
| `tick()` | 每 1200ms 检查一次，最多 10 次；native 模式还会 `enforceNativeStyle()` |
| `apply(cfg)` | 保存配置、按模式决定是否开字幕 |
| `setMode(mode)` | 切换模式；native 停止自动开启并撤样式，system 重新 apply |
| `buildCss(cfg)` | system 模式：字号 = 测量基准 × fontScale，颜色/背景来自 cfg |
| `buildNativeCss()` | native 模式：`#FFD400` 文字、透明背景、`0 2px 6px rgba(0,0,0,.85)` 阴影 |
| `enforceNativeStyle()` | 对 `.ytp-caption-segment` 等内联 `!important`，压过 YouTube 的样式 |

字号：

- `measureBase()` 读当前字幕实际字号；
- 测不到时 `fallbackBase()` = `max(14, 播放器高度 × 0.048)`；
- 最终 `calc(base × scale)`，scale 来自系统 `fontScale`。

限制：

- `Default Subtitles` 只对 system 模式生效；native 模式必须手动开 CC（这是产品决定，README 已注明）。
- YouTube 会随时改 DOM/class，`enableCaptions()` 的多级选择器是最容易失效的地方。

---

## 8. 更新器

页面侧（`script.js`）：

1. `parseVer()`：去掉 `v` 前缀，取数字段；`verGt(a,b)`：逐段比较。
2. `fetchLatestRelease(ok,err)`：
   - `GET https://api.github.com/repos/danielmzy/YouTube-Lite/releases/latest`
   - `Accept: application/vnd.github+json`、`cache: "no-store"`
   - 404 → `ok(null)`（没有 release）；其他非 2xx → `err`。
3. `checkUpdates()`：
   - Toast `Checking for updates…`；
   - 远端版本 > 当前 `YTProVer` → `showUpdateDialog(rel)`；
   - 相等 → `Your app is up to date (v…)`；
   - 无 release → `No releases published yet`；失败 → `Update check failed: …`。
4. `showUpdateDialog(rel)`：
   - 标题 `Update Available`，副标题 `v1.3 → v1.4 · 日期`；
   - 正文 `rel.body` 用 `textContent` 注入，避免 HTML 注入；
   - 按钮：Later / Release page / Download APK。
5. `startApkUpdate(rel, tag, apk, root)`：
   - `Android.apkDownload(url, name)` 返回 DownloadManager id；
   - 每 600ms 轮询 `Android.apkProgress(id)`，显示 `pct% · done MB / total MB · speed MB/s`；
   - `status===8`（成功）→ `installApk(id)`；失败重试 4 次、间隔 900ms；仍失败则按钮变 `Install`；
   - `status===16`（失败）→ 显示失败原因；
   - 监听 `visibilitychange`：从“安装未知应用”设置页返回后自动重试。
6. 启动检查：`runAutoUpdateCheck()` 仅首页执行，`localStorage.ytlUpdChecked` 6 小时节流，只有新版才弹窗。

Java 侧：

- `apkDownload()`：下载到 `Download/Youtube Lite/`，MIME `application/vnd.android.package-archive`；
- `apkProgress()`：返回 `{status, done, total, reason}`；
- `installApk()`：Android 8+ 无“安装未知应用”权限时跳设置页；有权限时 `DownloadManager.getUriForDownloadedFile()` + `ACTION_VIEW`。

<details>
<summary>为什么第一次 installApk 可能返回 false？</summary>

刚变成 SUCCESSFUL 时 `getUriForDownloadedFile()` 偶尔为 null；所以 JS 侧做了 4 次重试 + 回到前台重试。

</details>

---

## 9. 播放器、手势、后台播放

### 9.1 全屏与手势

- `script.js` 的 `#brtS` / `#volS` 是左右两条手势带：竖滑调亮度/音量。
- 为避免挡住 YouTube 的“进入全屏”按钮，两条带子只在 `document.fullscreenElement` 非空时启用；`fullscreenchange` 后 400ms 再同步。
- 全屏推荐流拦截：`window.__ytlFsRecBlock`（阈值 8px，pointer + touch）。

### 9.2 PiP

- `MainActivity.onUserLeaveHint()`：如果正在播放且页面是 watch/shorts，构造 PiP 参数并 `enterPictureInPictureMode()`。
- WebView 需要一次用户手势才能进入全屏，这里用 `MotionEvent` 在顶部模拟一次点击（`showCurtain()/hideCurtain()` 包住）。
- `onPictureInPictureModeChanged()` 调 `PIPlayer()` / `removePIP()`。
- `Android.pipvid(mode)` 也提供 JS 主动进入 PiP 的入口。

### 9.3 后台播放

- `Android.setBgPlay(bool)`：写 `SharedPreferences("YTPRO").bgplay`。
- `bgStart(icon,title,subtitle,duration)`：记录元数据，`startForegroundService()`。
- `ForegroundService`：
  - `MediaSession` + `setCallback()` 处理 play/pause/next/prev/seek；
  - 通知渠道 `MediaPlayback`、`IMPORTANCE_LOW`；
  - `NotificationActionReceiver` 处理按钮点击；
  - `onDestroy()` release MediaSession。
- 页面侧 `bgplay.js` 监听播放器状态并调用 `bgUpdate/bgPause/bgPlay/bgBuffer`。
- `YTProWebViewClient.onPageFinished()` 在离开 watch/shorts 时停止服务。

---

## 10. Gemini

1. 点击 Gemini 按钮 → `geminiInfo()`。
2. 页面先用 `Android.getAllCookies("https://m.youtube.com")` 拿 Cookie。
3. `Android.getSNlM0e(cookies)`：
   - 后台线程 `GeminiWrapper.getSNlM0e()` GET `https://gemini.google.com/app`，正则取 `SNlM0e`；
   - 结果用 `JSONObject.quote()` 包成 `callbackSNlM0e.resolve("...")`。
4. 页面构造 `batchexecute` 请求，交给 `Android.GeminiClient(url, headers, body)`：
   - `GeminiWrapper.getStream()` 发 POST，返回 `{stream, ...}`；
   - 页面 `callbackGeminiClient.resolve(...)` 解析流式响应。
5. `handleGeminiResponse()`：
   - 空流/无 stream → 显示错误；
   - 有内容 → 用 showdown 渲染 Markdown，插入 `#GeminiResponse`；
   - 顶部 sticky 栏含 `Copy` 按钮；
   - token 为空或 `"error"` 时 1.2 秒后重取一次；空响应清 `geminiChatInfo` 重发一次。
6. 面板独立滚动：`touchmove` 里手动 `scrollTop` + `preventDefault/stopPropagation`，不影响页面。

> Gemini 的 token 抓取和 `batchexecute` 协议都是非公开接口，Google 一改就会坏；先查 `SNlM0e` 是否为空，再看流是否为空。

---

## 11. RYD、广告、Shorts 与界面清理

- **RYD**：`fDislikes()` 调 `returnyoutubedislikeapi.com`，`renderRydPill()` 画 👍/👎 与比例条，隐藏原生 like/dislike 行。
- **广告**：
  - 播放器响应里删除 `adSlots`、`playerAds`、`adPlacements`、`adBreakHeartbeatParams`（含 `data[0].playerResponse` 新路径）；
  - `adsBlock()` 移除 `ad-slot-renderer`、`ytm-promoted-sparkles-web-renderer`、`ytm-companion-ad-renderer`；
  - 残留可跳过广告：`ad-interrupting` 视频 `currentTime = duration`，并点 `.ytp-ad-skip-button-modern`。
- **Shorts**：`shorts` 设置同时隐藏 `pivot-shorts` 与 Shorts 卡片；`applyShortsTab()` 每 400ms 同步。
- **Google Account**：`hideGoogleAccount()` 每 1000ms 找 `yt-flexible-actions-view-model a[href^="https://myaccount.google.com"]`，隐藏最近的动作行。
- **其他**：`pkc()` 清理顶部/推荐区域的多余元素；`hideTopbarDots()` 等。

> 这些清理函数大量依赖 YouTube 的 class 名和结构，改版后通常表现为“某个按钮又出现了”，优先检查对应选择器。

---

## 12. 安全模型

| 面 | 措施 |
|---|---|
| 桥暴露 | `trusted()` 限制 YouTube host；非信任页调用直接返回 |
| Cookie | `getAllCookies()` 仅信任页 + 目标必须含 `youtube.com` |
| 注入 | `getSNlM0e` 结果用 `JSONObject.quote()`，不裸拼 |
| 外链 | 非 YouTube 一律 `ACTION_VIEW` 交给系统浏览器 |
| 备份 | `android:allowBackup="false"` |
| 代码混淆 | `proguard-rules.pro` keep `@JavascriptInterface` 与 `WebAppInterface` |
| 组件导出 | `ForegroundService`、`NotificationActionReceiver` `exported=false`；`TRACKS_TRACKS` 仅进程内注册 |

仍存在的限制（见第 16 章）：`usesCleartextTraffic="true"`、`largeHeap="true"`、`DownloadFromIntentFilter` 导出。

---

## 13. 生命周期与清理

- 启动页：`splash` 可见，页面 `Android.splashReady()` 或 8 秒超时后淡出。
- `onPause()`：`CookieManager.flush()`。
- `onDestroy()`：
  - 停 `ForegroundService`；
  - 注销 `MediaCommandReceiver` 与 Android 13 的返回回调；
  - `streamManager.cleanup()` 关闭残留文件流；
  - `removeJavascriptInterface("Android")` → `stopLoading()` → `about:blank` → `clearHistory()` → `destroy()`；
  - `CaptioningController.destroy()` 移除字幕监听。
- `CaptioningController` 的所有 `evaluateJavascript` 都切主线程并检查 `destroyed`，避免 WebView 销毁后回调崩溃。

---

## 14. 构建、CI 与调试

### 14.1 构建

```powershell
# debug
.\gradlew.bat assembleDebug

# release（需要签名）
.\gradlew.bat assembleRelease
java -jar signer\apksigner.jar sign --key signer\apkeasytool.pk8 `
  --cert signer\apkeasytool.pem --v4-signing-enabled false `
  --out app\build\outputs\apk\release\YouTubeLite-signed.apk `
  app\build\outputs\apk\release\app-release-unsigned.apk
```

- `syncInjectedScripts` 会在 `preBuild` 把 `scripts/*.js` 复制到 `assets/`，不要只改一边。
- 版本号在 `app/build.gradle`（`versionCode`/`versionName`）；About 页读 `Android.getInfo()`。

### 14.2 CI

`.github/workflows/gradle.yml`：

- JDK 17、`setup-android` 安装 `platforms;android-36`、`build-tools;36.0.0`；
- Gradle 缓存（`gradle/actions/setup-gradle@v4`）；
- `assembleRelease`，用 `signer/ApkSigner.jar` 签名；
- 上传 artifact `YouTubeLite-signed.apk`。

### 14.3 真机调试（debug 构建）

debug 构建会 `WebView.setWebContentsDebuggingEnabled(true)`：

```powershell
adb shell pidof com.matr1x.youtubelite
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
# 浏览器打开 http://localhost:9222/json 拿 webSocketDebuggerUrl
```

常用检查：

```js
Android.getInfo()                    // 版本
YTPRO_CAPTIONS.mode()                // 'system' | 'native'
localStorage.subsSys                 // 模式持久化
YTPRO_QUALITY.getState()             // 画质锁状态
document.getElementById('ytProDownloaderDiv')  // 下载面板
```

logcat 关键 tag：`YTPRO_WVC`（拦截/注入）、`YTPRO_STREAM`（落盘）、`YTPRO_CAPTIONS`（字幕）、`YTLGemini`（Gemini）。

---

## 15. 常见修改指南

### 加一个设置开关

1. `script.js` 设置页模板加 `<div>... <span data-action="sttCnf" data-value="key" ...></span></div>`；
2. `actionsList.sttCnf` 已经通用，key 会自动写入 localStorage；
3. 需要跨文件读取时，在 `constants.js` 的 `YTL.KEY` 加 key；
4. 如果是新面板/按钮，记得在 `assets` 与 `scripts` 两份 `script.js` 同步（构建会复制，但提交前保持两边一致更直观）。

### 加一个桥方法

1. `WebAppInterface` 里加 `@JavascriptInterface` 方法；
2. 涉及敏感能力先 `if (!trusted()) return;`；
3. UI 操作切主线程；网络/IO 另起线程；
4. 回调 JS 用 `JSONObject.quote()`；
5. `proguard-rules.pro` 已按注解 keep，无需逐个加规则。

### 加一个注入脚本

1. 文件放 `assets/`，若也要从 `scripts/` 同步，放 `scripts/`；
2. 在 `YTProWebViewClient.onPageFinished()` 或 `CaptioningController.injectRuntime()` 里注入；
3. 若是 `<script src>` 形式，在 `shouldInterceptRequest()` 的 `ytpro_cdn` 映射里加分支，否则会走 CDN。

### 排查“功能突然失效”

按顺序查：

1. 页面是否在 YouTube host（`trusted()`）；
2. 注入是否执行（logcat/DevTools console）；
3. 选择器是否失效（YouTube 改版）；
4. 桥方法是否被信任门拦住；
5. 网络/接口是否变了（InnerTube、RYD、Gemini）。

---

## 16. 已知限制与易碎点

1. **依赖 YouTube 私有实现**：DOM、播放器对象、InnerTube 响应、SABR 协议都可能随时变化。
2. **字幕选择器脆弱**：`enableCaptions()` 依赖 CC 按钮/菜单结构，YouTube 改版会失效。
3. **SABR 临时文件同名冲突**：端口按文件名区分，并发同名下载会互相覆盖。
4. **MediaStore 同名歧义**：`DISPLAY_NAME + RELATIVE_PATH LIKE 'Download/Youtube Lite%'` 在跨子目录同名时可能命中错文件。
5. **Android 9 及以下**：打开/分享/删除下载文件依赖 MediaStore（API 29+），低版本会返回 false。
6. **`installApk` 时序**：刚下载完成时 `getUriForDownloadedFile()` 可能为 null，靠 JS 重试兜底。
7. **Manifest 仍较宽松**：`usesCleartextTraffic="true"`、`largeHeap="true"`、`DownloadFromIntentFilter` 对外导出；收紧前要确认播放/下载不受影响。
8. **无自动化测试**：所有验证依赖真机 + CDP 脚本；改动后至少回归首页、watch、下载、字幕、更新检查、外链。

---

## 附：关键时序图

### 冷启动

```
onCreate
  ├─ setWebContentsDebuggingEnabled (debug)
  ├─ setContentView + splash
  ├─ POST_NOTIFICATIONS (33+)
  └─ load()
       ├─ new CaptioningController
       ├─ WebSettings / CookieManager
       ├─ addJavascriptInterface("Android")
       ├─ setWebChromeClient / setWebViewClient
       ├─ loadUrl(intent URL 或 https://m.youtube.com/)
       ├─ setupReceiver / setupBackNavigation
       └─ new BinaryStreamManager
```

### 一次 SABR 下载

```
JS: ytproSabrDownload
  → yt.getBasicInfo
  → SabrStream.start
  → pipeToDisk(video) ── requestBinaryPort ──► Java: 创建 cache 文件 + WebMessage 端口
  → pipeToDisk(audio) ── 同上
  → Android.muxVideoAudio(video, audio, out, folder)
       → MediaMuxerUtils 合流
       → ytdlOnMuxDone
  → 页面刷新历史 / 卡片
```

### 字幕启用（system 模式）

```
onPageFinished
  → CaptioningController.injectRuntime (captions.js)
  → pushConfig(cfg)
  → captions.js apply(cfg)
       → wantCaptions() ? enableCaptions() : skip
  → tick() 轮询 CC 按钮，最多 10 次
  → ensureStyle() 写入 CSS
```

---

维护建议：改任何与 YouTube DOM 相关的代码前，先用 DevTools 确认当前选择器；改完在真机上把“首页 → watch → 下载 → 字幕 → 更新”跑一遍，再提交。
