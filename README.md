<p align="center">
  <img src='app/src/main/res/mipmap-xxxhdpi/app_icon.png' height=120  >
</p>
<h1 align=center>YouTube Lite</h1>

<div align="center">

![License](https://img.shields.io/github/license/danielmzy/YouTube-Lite)
![Last commit](https://img.shields.io/github/last-commit/danielmzy/YouTube-Lite)
![Platform](https://img.shields.io/badge/platform-Android%205.0%2B-3ddc84)
![Min SDK](https://img.shields.io/badge/minSdk-21-blue)

</div>

A clean, lightweight YouTube client for Android. YouTube Lite wraps the YouTube mobile web app in a hardened WebView and adds the features power users actually miss — ad blocking, background audio, gestures, a full download manager, Gemini summaries, system-caption integration and a distraction-free UI. No root, no Xposed, no system modifications, no GMS service require.

## Download YouTube Lite

No prebuilt APK is published yet — build it in a minute:

```bash
git clone https://github.com/danielmzy/YouTube-Lite.git
cd YouTube-Lite
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

Requirements: JDK 17, Android SDK 36 (compileSdk 36, minSdk 21). See [BUILDING.md](BUILDING.md) for Android Studio steps.

#### Screenshots

| Home | Watch page | Downloads |
|:--:|:--:|:--:|
|<img src='images/home.jpg'>|<img src='images/watch.jpg'>|<img src='images/downloads.jpg'>|
| **Gemini summary** | **Settings** | **Startup** |
|<img src='images/gemini.jpg'>|<img src='images/settings.jpg'>|<img src='images/splash.jpg'>|

## Features

* **Google Gemini**
  * Summarise the current video
  * Customisable prompts and models
  * Copy the answer with one tap, independent scrolling panel
* **Downloader**
  * Video (up to 4K), audio-only, thumbnails and captions
  * In-built video + audio muxer (MP4, on-device)
  * Download manager with history, per-video grouping and live speed
  * Files saved to `Download/Youtube Lite/<video title>/`
* **Desktop-grade streams**
  * Formats resolved through YouTube's desktop WEB InnerTube API
  * Up to 4K with AV1 / VP9 / AVC variants, not the mobile-web subset
* **Subtitles**
  * Follows Android's accessibility caption settings — on/off, font scale, colors, background
  * Restyled live inside the player
  * "Default Subtitles" switch can force captions on for every video
* **Ad blocking**
  * In-stream video ads stripped from player responses before playback (mobile and desktop API paths)
  * Promoted / sponsored feed cards and companion banners removed
  * Any skippable ad that still slips through is skipped automatically
* **Distraction-free UI**
  * Hide Shorts (including the bottom-tab entry)
  * Hide community posts
  * Hide the top-bar overflow menu
  * Hide native like/dislike counts
  * Return YouTube Dislike pill with ratio bar
* **Gesture controls**
  * Brightness (left edge) and volume (right edge) swipes with indicators
  * Miniplayer gesture
  * Fullscreen swipe-up recommendations blocked
  * Gesture strips only active in fullscreen, so they never steal the fullscreen button
* **Playback**
  * Background audio playback
  * Picture-in-picture shortcut
  * Autoskip sponsors
  * Default max quality
  * Enable / disable media codecs
  * Force zoom
* **Polish**
  * Branded splash screen with progress bar
  * Adaptive launcher icon
  * Injected UI bundled in `assets/`, works offline

## What's changed in this fork

Compared with [YTPro](https://github.com/prateek-chaubey/YTPro), this build is rebranded and extended:

* **New download manager** — grouped history, per-video folders, live speed, full/audio/video suffixes, thumbnails and captions included, one-tap open with the system player
* **New RYD pill** — replaces the native like/dislike row, shows 👍/👎 and a ratio bar
* **System captions bridge** — reads Android's accessibility caption settings and applies them to the player; adds a "Default Subtitles" toggle
* **Desktop WEB API streaming** — 1440p/2160p and AV1/VP9 tracks are available from the downloader and quality picker
* **Fullscreen fixes** — swipe-up recommendations blocked; brightness/volume strips don't block the fullscreen button
* **UI cleanup** — Shorts bottom tab, community posts and top-bar menu can be hidden
* **Gemini improvements** — robust title/prompt fallback, automatic retry, 200 px panel with its own scrollbar, Copy button, no "Go to the chat" link
* **Startup screen** — branded splash with logo, wordmark and progress bar
* **Removed** — custom "hearts" / Liked Videos system and the related settings rows
* **Security & stability** — foreground service and receivers no longer exported; main-frame refetch hardened; MediaStore/MediaMuxer fixes

## Gemini Prompt

Available variables for the Gemini prompt:

* `{url}` — the URL of the video
* `{title}` — the title of the video
* `{videoId}` — the video ID

## ToDo

* Continue working on Download manager

### Credits

* [YTPro](https://github.com/prateek-chaubey/YTPro) by Prateek Chaubey — the original project this build is based on
* [return-youtube-dislike](https://github.com/Anarios/return-youtube-dislike) — dislike data
* [SponsorBlock](https://github.com/ajayyy/SponsorBlock)
* [YouTube.js](https://github.com/LuanRT/YouTube.js/)

## Disclaimer

This is an unofficial, educational project. It is not affiliated with, endorsed by, or sponsored by YouTube or Google. "YouTube", "Gemini" and related marks are trademarks of Google LLC. Use at your own risk and respect YouTube's Terms of Service.

---

## 中文简介

**YouTube Lite** 是一个轻量、干净的第三方 YouTube 安卓客户端：用加固的 WebView 承载 YouTube 移动网页，再通过注入脚本补上实用功能，无需 root、不修改系统。

**主要功能**

- **去广告**：移除信息流推广卡片；从播放器响应中剔除视频广告；播放器里残留的可跳过广告自动跳过
- **清爽界面**：隐藏 Shorts（含底栏入口）、社区帖子、顶栏三点菜单、原生点赞/点踩数字
- **点踩显示**：RYD 胶囊显示 👍/👎 与比例条
- **手势控制**：左侧上下滑调亮度、右侧调音量，带实时指示条；全屏上划推荐已拦截
- **桌面级画质**：走 YouTube 桌面 WEB 接口取流，最高 **4K**，含 **AV1 / VP9 / AVC** 多种编码
- **字幕直连系统**：读取 Android「设置 → 无障碍 → 字幕」的开关、字号、颜色与背景并实时应用；「默认字幕」开关可为所有视频强制开启
- **下载管理器**：视频/纯音频/封面/字幕，本地合流 MP4；按视频分组、历史记录、实时速度、一键用系统播放器打开
- **Gemini 总结**：可选模型、可改提示词、一键复制，面板独立滚动
- **后台播放 / 画中画 / 启动页**

**构建**：JDK 17 + Android SDK 36，执行 `./gradlew assembleDebug`，产物在 `app/build/outputs/apk/debug/app-debug.apk`。

**声明**：非官方项目，与 YouTube/Google 无关，仅供学习交流。

**致谢**：基于 [YTPro](https://github.com/prateek-chaubey/YTPro)（MIT），点踩数据来自 [return-youtube-dislike](https://github.com/Anarios/return-youtube-dislike)。
