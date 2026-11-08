# YouTube Lite Engineering Handbook

This handbook explains how YouTube Lite is built, file by file and function by
function. It is written for developers who need to change behaviour, debug a
regression, or decide where a new feature belongs.

- Baseline: `main` at version `1.3` (`versionCode 4`)
- Upstream: [prateek-chaubey/YTPro](https://github.com/prateek-chaubey/YTPro); see
  [FORK-DIFFERENCES.md](FORK-DIFFERENCES.md) for the code-level delta
- Line references use `path:line` and point at the **assets** copies under
  `app/src/main/assets/`. The same files under `scripts/` are synced by Gradle
  before every build and may differ by a few header-comment lines.

Reading order: chapters 1–4 build the mental model; chapters 5–11 cover each
subsystem; chapters 12–16 cover security, lifecycle, build/debug and limits.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Runtime model](#2-runtime-model)
3. [Startup and navigation](#3-startup-and-navigation)
4. [Script injection and request interception](#4-script-injection-and-request-interception)
5. [JavaScript bridge](#5-javascript-bridge)
6. [Download subsystem](#6-download-subsystem)
7. [Caption system](#7-caption-system)
8. [Updater](#8-updater)
9. [Player, gestures, PiP and background playback](#9-player-gestures-pip-and-background-playback)
10. [Gemini](#10-gemini)
11. [RYD, ads, Shorts and UI cleanup](#11-ryd-ads-shorts-and-ui-cleanup)
12. [Security model](#12-security-model)
13. [Lifecycle and cleanup](#13-lifecycle-and-cleanup)
14. [Build, CI and debugging](#14-build-ci-and-debugging)
15. [Extension recipes](#15-extension-recipes)
16. [Known limitations](#16-known-limitations)

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────┐
│ MainActivity (singleTask)                                    │
│  ├─ YTProWebView          loads https://m.youtube.com/        │
│  ├─ YTProWebViewClient    intercepts assets, routes links,    │
│  │                        injects scripts                     │
│  ├─ YTProWebChromeClient  fullscreen, media permission        │
│  ├─ WebAppInterface       JS → Java bridge ("Android")        │
│  ├─ CaptioningController  Android caption settings → JS       │
│  ├─ BinaryStreamManager   WebMessagePort → cache files        │
│  └─ ForegroundService     media session + notification        │
└──────────────────────────────────────────────────────────────┘
             │ injects
             ▼
┌──────────────────────────────────────────────────────────────┐
│ YouTube mobile web page (private DOM + player)                │
│  constants.js → script.js → bgplay.js → innertube.js          │
│  → player-fixes.js → captions.js → quality.js                 │
│  calls window.Android.* for native capabilities               │
└──────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **One Activity, one WebView.** There is no native player; YouTube's page owns
  playback. Native code only provides capabilities and lifecycle glue.
- **Native capabilities, web UI.** Downloads, APK install, notifications,
  brightness/volume and PiP are Java; panels, history lists and settings are
  injected JavaScript.
- **Layered scripts.** `script.js` holds the product UI, `innertube.js` the
  InnerTube/SABR downloader, `captions.js` the caption runtime, `quality.js` the
  quality lock, `player-fixes.js` layout patches. They communicate through
  `window` globals.
- **Local assets first.** Requests for the injected scripts are served from
  `assets/`; the network is only a fallback.

### File map

| Path | Role |
|---|---|
| `MainActivity.java` | WebView creation, intent parsing, lifecycle, PiP |
| `webview/YTProWebViewClient.java` | main-frame rewrite, asset interception, link routing, injection |
| `webview/WebAppInterface.java` | every `window.Android` method |
| `webview/YTProWebChromeClient.java` | fullscreen view, media permissions |
| `webview/BinaryStreamManager.java` | WebMessagePort → cache file writer |
| `captions/CaptioningController.java` | reads system caption settings, pushes JS config |
| `utils/DownloadUtils.java` | DownloadManager enqueue/status, file names |
| `utils/DownloadPaths.java` | download directory resolution |
| `utils/MediaMuxerUtils.java` | video + audio merge |
| `ForegroundService.java` | media session and playback notification |
| `assets/script.js` | settings, Gemini, RYD, gestures, updater, ad cleanup |
| `assets/innertube.js` | InnerTube formats, SABR download, download-manager UI |
| `assets/captions.js` | caption runtime (Android and YouTube modes) |
| `assets/quality.js` | quality lock |
| `assets/player-fixes.js` | small player CSS fix |
| `assets/constants.js` | `YTL.KEY`, `YTL.URL`, `YTL.MS` |
| `assets/bgplay.js` | background playback helpers |

---

## 2. Runtime model

### Threads

| Context | Runs on | Rule |
|---|---|---|
| `@JavascriptInterface` methods | WebView JavaBridge thread | never touch UI directly; `activity.runOnUiThread(...)` |
| Download completion poll | worker thread (`downvid`) | only re-enter JS via `runOnUiThread` |
| Gemini calls | worker thread | same |
| `CaptioningController.evaluate()` | main thread | checks `destroyed` |
| `BinaryStreamManager` writes | single-thread executor | one writer per process |

Common crash source: calling `Toast`, `startActivity` or `requestPermissions`
from a bridge method without switching threads.

### Shared state

`MainActivity`:

| Field | Meaning |
|---|---|
| `currentUrl` | last `onPageStarted` URL; used by `trusted()` |
| `portrait` | last fullscreen orientation hint |
| `isPlaying` | playback active (notification/PiP decisions) |
| `mediaSession` | media session active |
| `isPip` | PiP state |
| `streamManager` | `BinaryStreamManager` instance |

Page-side:

| Storage | Keys |
|---|---|
| `localStorage` | `subsSys`, `defSubs`, `shorts`, `bgplay`, `prompt`, `ytlUpdChecked`, `ytdlHist`, `geminiModel`, `saveCInfo` |
| `window` | `YTL`, `YTPRO_CAPTIONS`, `YTPRO_QUALITY`, `ytdlAddHistory`, `ytdlOnMuxDone`, `__ytdlCtx`, `__ytdlNeedNewCard`, `__ytlFsRecBlock` |

> When adding state, prefer `localStorage` for user settings and `window` for
> same-document communication. Native state belongs on `MainActivity` only if the
> Java side needs it.

---

## 3. Startup and navigation

### 3.1 `MainActivity` functions

| Line | Function | Responsibility |
|---|---|---|
| 69 | `onCreate` | enable WebView debugging on debuggable builds; inflate `R.layout.main`; splash timeout (8 s); default `bgplay` pref; Android 13 notification permission; `load()` |
| 94 | `hideSplash` | fade out splash (idempotent) |
| 106 | `load` | idempotent WebView setup: settings, cookies, `Android` bridge, clients, `BinaryStreamManager`, receiver, back callback |
| 164 | `onNewIntent` | `setIntent()` + `urlFromIntent()` + `web.loadUrl()` for `singleTask` reuse |
| 179 | `urlFromIntent` | parse `VIEW` data / `SEND` text into a YouTube URL |
| 220 | `findVideoId` | extract an 11-char ID from `vnd.youtube:` / `youtube:` URIs |
| 231 | `setupReceiver` | register `TRACKS_TRACKS` receiver (not exported on 33+) |
| 242 | `setupBackNavigation` | Android 13+ `OnBackInvokedCallback` |
| 255 | `handleBackPress` | `web.canGoBack()` → `goBack()`, else `finish()` |
| 264 | `onBackPressed` | legacy back path |
| 269 | `onRequestPermissionsResult` | grant pending WebRTC permission, show permission toasts |
| 286 | `onPictureInPictureModeChanged` | `PIPlayer()` / `removePIP()` |
| 292 | `onUserLeaveHint` | synthesise a touch gesture, enter PiP when playing/watch page |
| 327 | `onPause` | `CookieManager.flush()` |
| 332 | `getCaptioningController` | accessor used by the WebView client |
| 337 | `onDestroy` | stop service, unregister receivers, cleanup streams, detach/destroy WebView, destroy caption controller |

`load()` calls `new CaptioningController(this, web)` once and `new
BinaryStreamManager(web, this)` once; re-entering `load()` with a non-null `web`
returns immediately to avoid binding those objects to a stale WebView.

### 3.2 Intent filters

`AndroidManifest.xml`:

| Activity | Filters |
|---|---|
| `MainActivity` | `MAIN/LAUNCHER`; `VIEW` + `BROWSABLE` for `http(s)` on `youtube.com`, `*.youtube.com`, `youtu.be`; `SEND` `text/plain` |
| `DownloadFromIntentFilter` | same filters, separate share-sheet entry; extends `MainActivity` and deliberately overrides nothing |

`launchMode="singleTask"` means an already-running app receives `onNewIntent()`
instead of a new Activity instance.

### 3.3 URL resolution rules

`urlFromIntent()` (MainActivity.java:179):

| Input | Result |
|---|---|
| `VIEW` `http(s)` with a YouTube host | loaded as-is |
| `VIEW` `vnd.youtube:` / `youtube:` | ID found by `findVideoId()`, rebuilt as `https://m.youtube.com/watch?v=ID` |
| `SEND` text | first `https?://...` whose host is a YouTube host |
| anything else | `null` → home page |

`findVideoId()` scans for `[A-Za-z0-9_-]{11}` and skips the literals `watch` and
`https`.

### 3.4 Leaving the WebView

`YTProWebViewClient.handleUrl()` (YTProWebViewClient.java:264):

- `m.youtube.com`, `www.youtube.com`, `youtube.com`, `*.youtube.com`, `youtu.be`,
  `youtube-nocookie.com`, `accounts.google.com`, `myaccount.google.com`,
  `consent.youtube.com` → return `false` (stay inside).
- `google.com/*`: if `q`, `url` or `u` contains a YouTube URL → `view.loadUrl()`
  and return `true`.
- everything else → `Intent.ACTION_VIEW` with `FLAG_ACTIVITY_NEW_TASK`, return
  `true`.

---

## 4. Script injection and request interception

### 4.1 Injection order

`YTProWebViewClient.onPageFinished()` (line 318), only for YouTube hosts:

1. Install a Trusted Types `default` policy (YouTube may enable Trusted Types,
   which would otherwise block the injected inline script creation).
2. `evaluateJavascript(constants.js)` — runs first so `YTL.*` exists.
3. Append `<script src="https://youtube.com/ytpro_cdn/npm/ytpro@latest?v=...">`
   for `script.js`, `bgplay.js`, and a `type="module"` tag for `innertube.js`.
4. Call `CaptioningController.onPageFinished()`, which injects
   `player-fixes.js`, `captions.js`, `quality.js` via `evaluateJavascript`, then
   pushes the caption config and re-applies the quality lock.

Resulting execution order:

```
constants.js
script.js
bgplay.js
innertube.js
player-fixes.js
captions.js
quality.js
__YTPRO_CAPTION_CFG__ + YTPRO_CAPTIONS.apply(cfg)
YTPRO_QUALITY.apply()
```

### 4.2 `YTProWebViewClient` functions

| Line | Function | Responsibility |
|---|---|---|
| 42 | constructor | store activity/web |
| 48 | `onPageStarted` | update `currentUrl`, notify `CaptioningController.onPageStarted()` |
| 57 | `doUpdateVisitedHistory` | SPA navigation → `CaptioningController.onHistoryChanged()` |
| 66 | `shouldInterceptRequest` | login passthrough, main-frame rewrite, Google JS proxy, assets, CDN rewrite |
| 241 | `isYouTubeHost` | host allowlist for main-frame handling |
| 254 | `shouldOverrideUrlLoading(WebResourceRequest)` | delegate to `handleUrl` |
| 259 | `shouldOverrideUrlLoading(String)` | legacy delegate |
| 264 | `handleUrl` | keep YouTube/Google login in-app, external links to browser |
| 292 | `isYouTubeUrl` | host check for redirect targets |
| 304 | `readAsset` | read an asset file to a string |
| 318 | `onPageFinished` | Trusted Types policy, constants, script tags, caption config |

### 4.3 Asset interception

Inside `shouldInterceptRequest` (line 66):

| URL pattern | Action |
|---|---|
| `accounts.google.com`, `myaccount.google.com`, `google.com/signin`, `SetSID`, … | untouched (`super`) |
| main frame + YouTube host | re-fetch HTML, strip CSP headers/meta, drop `content-length`/`content-encoding`/`transfer-encoding`, 15 s timeouts |
| `www.google.com/js/*`, `recaptcha/*` | proxy with `Referer: https://www.youtube.com/` + CORS |
| `youtube.com/ytpro_cdn/npm/ytpro...` | map to assets: `bgplay.js`, `innertube.js`, `constants.js`, else `script.js`; `Cache-Control: no-store` |
| other `youtube.com/ytpro_cdn/...` | rewrite `npm` → `cdn.jsdelivr.net`, `esm` → `esm.sh`, add CORS |
| everything else | `super` |

The injection URL carries `?v=Date.now()` and the resource response carries
`no-store`, so a rebuilt APK never runs a cached old script.

### 4.4 Why the main frame is re-fetched

YouTube sends a Content-Security-Policy that blocks inline script creation. The
client re-requests the same HTML with the app's cookies, removes the CSP header
and any CSP `<meta>` tags, and returns the modified body. Any failure falls back
to the original response.

### 4.5 SPA navigation

`doUpdateVisitedHistory()` fires when YouTube changes URL without a document
load. It re-injects the caption/quality runtime and re-pushes config because
YouTube may have rebuilt the player DOM and reset caption state.

---

## 5. JavaScript bridge

The bridge object is named `Android`:

```java
web.addJavascriptInterface(new WebAppInterface(this, web), "Android");
```

### 5.1 Trust model

`WebAppInterface.trusted()` (line 64):

```java
String u = activity.currentUrl;
if (u == null || u.isEmpty()) u = web.getUrl();
host in { m.youtube.com, www.youtube.com, youtube.com, *.youtube.com, youtu.be }
```

`currentUrl` is updated in `onPageStarted`. Every method that touches files,
downloads, intents, cookies or Gemini requires `trusted()`.

### 5.2 Bridge methods

| Line | Method | Notes |
|---|---|---|
| 80 | `splashReady()` | UI thread → `hideSplash()` |
| 85 | `showToast(txt)` | UI thread |
| 90 | `gohome(x)` | launch home intent |
| 99 | `downvid(name,url,mime)` | `DownloadUtils.enqueue`, worker polls until SUCCESSFUL/FAILED, then `ytdlAddHistory` or `ytdlDownloadFailed` |
| 129 | `apkDownload(url,name)` | DownloadManager enqueue, returns id string |
| 155 | `apkProgress(id)` | JSON `{status,done,total,reason}` |
| 176 | `installApk(id)` | unknown-sources settings on Android 8+, then `getUriForDownloadedFile` + `ACTION_VIEW` |
| 206 | `fullScreen(value)` | record orientation |
| 211 | `oplink(url)` | `ACTION_VIEW` |
| 219 | `getInfo()` | `versionName` |
| 228 | `isWebViewSupported()` | `WEB_MESSAGE_ARRAY_BUFFER` check |
| 233 | `hasStoragePermission()` | API 23–28 requests storage; 29+ returns true |
| 252 | `setDownloadFolder(title)` | `DownloadPaths.setFolder` |
| 258 | `requestBinaryPort(fileName)` | UI thread → `streamManager.openStreamForFile` |
| 268 | `muxVideoAudio(a,b,c)` | 3-arg overload → folder `null` |
| 274 | `muxVideoAudio(a,b,c,folder)` | merge cache tracks into `dirFor(folder)`, callback `ytdlOnMuxDone` |
| 307 | `openDownloadedFile(name)` | MediaStore (API 29+) → `ACTION_VIEW` |
| 337 | `shareDownloadedFile(name)` | `ACTION_SEND` chooser |
| 356 | `deleteDownloadedFile(name)` | MediaStore delete, returns deleted>0 |
| 373 | `findDownloadedFile(name)` | private helper, `_ID` lookup |
| 394 | `setBgPlay(bool)` | write `YTPRO` prefs |
| 400 | `bgStart(...)` | record metadata, start foreground service |
| 417 | `bgUpdate(...)` | update metadata + broadcast |
| 424 | `bgStop()` | stop service |
| 430 | `bgPause(ct)` | broadcast pause |
| 436 | `bgPlay(ct)` | broadcast play |
| 442 | `bgBuffer(ct)` | broadcast buffering |
| 447 | `sendUpdateBroadcast(...)` | internal `UPDATE_NOTIFICATION` broadcast |
| 456 | `getSNlM0e(cookies)` | worker thread, `JSONObject.quote` result |
| 465 | `GeminiClient(url,headers,body)` | worker thread, returns JSON |
| 474 | `getAllCookies(url)` | only trusted pages, only youtube.com target |
| 481 | `getVolume()` | music stream ratio, guards `max==0` |
| 489 | `setVolume(v)` | music stream |
| 495 | `getBrightness()` | 0–100 |
| 504 | `setBrightness(v)` | window attribute on UI thread |
| 514 | `pipvid(mode)` | API 26+ PiP |

### 5.3 Callback conventions

Java → JS calls always use a guard:

```js
window.ytdlAddHistory && ytdlAddHistory(name, title, "")
window.ytdlDownloadFailed && ytdlDownloadFailed(name, reason)
window.ytdlOnMuxDone && ytdlOnMuxDone(name, err)
callbackSNlM0e.resolve("...")
callbackGeminiClient.resolve({...})
```

String arguments are quoted with `JSONObject.quote()`; never interpolate raw
strings into `evaluateJavascript`.

---

## 6. Download subsystem

### 6.1 End-to-end flow

```
user taps a format
  → innertube.js: ytproSabrDownload()
      → yt.getBasicInfo(videoId, {client:'WEB'})
      → pick video/audio itag (fallback: lowest bitrate)
      → downloadSABRStream(videoItag, audioItag, isWebm, langId, enabledTrack)
          → SabrStream.start()
          → pipeToDisk(videoStream, "name_VIDEO.mp4")
          → pipeToDisk(audioStream, "name_AUDIO.mp4")
          → Android.muxVideoAudio(video, audio, out, folder)
              → MediaMuxerUtils.muxVideoAudio(...)
              → ytdlOnMuxDone(name, "")
          → history update / card refresh
```

### 6.2 `innertube.js` entry points

| Line | Function | Responsibility |
|---|---|---|
| 18 | `ytproSabrDownload` | main entry: player info, format lists, panel, format selection |
| 57 | `fetchFunction` | fetch wrapper used by the InnerTube player |
| 130 | `generateFullPoToken` | BotGuard/poToken minting for protected streams |
| 423 | `updateMuxFormats` | build muxed (video+audio) format rows |
| 458 | `updateAudioOnlyFormats` | audio-only rows |
| 516 | `updateVideoOnlyFormats` | video-only rows |
| 568 | `updateThumbnails` | thumbnail download rows |
| 594 | `updateCaptions` | caption-track download rows (VTT/SRT) |
| 680 | `extractSabrConfig` | `server_abr_streaming_url` + ustreamer config |
| 704 | `downloadSABRStream` | start SabrStream and pipe both tracks |

### 6.3 SABR details (`downloadSABRStream`, line 704)

- Requires `Android.isWebViewSupported()` and `Android.hasStoragePermission()`.
- `containerExt` is `webm` when `isWebm == "true"`, else `mp4`.
- Fallbacks: the lowest-bitrate video and audio formats are used when the
  requested itag is missing.
- `SabrStream` options: `videoId`, `cpn`, `serverAbrStreamingUrl`,
  `videoPlaybackUstreamerConfig`, formats, `poToken`, WEB client info
  (`clientName: 1`), duration, and a CORS `fetch`.
- `reloadPlayerResponse`: re-fetch `getBasicInfo` and update URL/config.
- `streamProtectionStatusUpdate` (status 2/3): install `fullTokenPromise` into
  `sabrStream.poToken`.
- `sabrStream.start({ preferMp4, preferH264, videoFormat, audioFormat,
  enabledTrackTypes })` returns `videoStream` and `audioStream`.

### 6.4 Binary port write path

| Line | Function | Responsibility |
|---|---|---|
| 1206 | `createDedicatedPipe` | store resolver in `pendingStreams`, call `Android.requestBinaryPort(fileName)` |
| 1214 | `pipeToDisk` | read stream, split into 512 KB chunks, post ArrayBuffers via port, update UI, send `"END"` in `finally` |
| 1286 | `createDownloaderStatus` | create `#ytProDownloaderDiv` panel |

Java side (`BinaryStreamManager.java`):

| Line | Function | Responsibility |
|---|---|---|
| 42 | `openStreamForFile` | check feature support, create `cacheDir/ytpro_dl/<name>`, 90 s idle guard, create WebMessageChannel, post port as `PORT_FOR:<name>` |
| 87 | `onMessage` (callback) | dispatch to writer executor |
| 103 | `handleMessage` | `TYPE_ARRAY_BUFFER` → write bytes; `"END"` → close stream, release port |
| 127 | `cleanup` | close all streams on destroy |

The JavaScript side listens for the `message` event, takes `event.ports[0]`, and
resolves the pending promise.

### 6.5 Merging

`MediaMuxerUtils.muxVideoAudio()` (MediaMuxerUtils.java:35) accepts context,
video file, audio file, output file and `MuxCallback` (line 30).

- Inputs are looked up by absolute path first; if missing, MediaStore is queried
  with `setIncludePending(true)` (see `inputAvailable`, line 299).
- On success the temporary inputs are deleted (`deleteFile`, line 308).
- Codec support is checked with `isCodecSupported` (line 345).
- `WebAppInterface.muxVideoAudio(..., folder)` (line 274) resolves the target
  directory with `DownloadPaths.dirFor(folder)` and posts `ytdlOnMuxDone`.

### 6.6 DownloadManager path

`DownloadUtils.java`:

| Line | Function | Responsibility |
|---|---|---|
| 24 | `enqueue` | create `DownloadManager.Request`, sanitize/unique name, destination `relativeDir()/name`, return id; `nameOut[0]` is the final name |
| 72 | `downloadFile` | compatibility wrapper around `enqueue` |
| 79 | `statusOf` | read `COLUMN_STATUS` for one id |
| 91 | `sanitizeFileName` | strip unsafe chars, keep extension, max 120 |
| 105 | `uniqueFileName` | synchronized ` (n)` suffix |
| 119 | `toast` | UI-thread toast helper |

`WebAppInterface.downvid` (line 99) calls `enqueue`, then polls `statusOf` every
1.5 s for up to 1200 iterations and reports the final state to JS.

### 6.7 Directories and names

`DownloadPaths.java`:

| Line | Function | Responsibility |
|---|---|---|
| 25 | `setFolder` | store sanitized current folder |
| 32 | `folder` | current folder |
| 37 | `relativeDir` | `Download/Youtube Lite` |
| 43 | `mediaDir` | MediaStore `RELATIVE_PATH` variant |
| 48 | `dir` | absolute `File` for the current folder |
| 54 | `sanitizeFolder` | replace `\/:*?"<>|` and control chars, max 80 |
| 62 | `relativeDirFor` | relative path for an explicit folder |
| 67 | `mediaDirFor` | MediaStore path for an explicit folder |
| 72 | `dirFor` | absolute `File` for an explicit folder |

Suffixes produced by the downloader:

| Content | Suffix |
|---|---|
| merged video+audio | `_FULL.mp4` |
| video-only | `_VIDEO.mp4` |
| audio-only | `_AUDIO.mp4` |

### 6.8 History and download-manager UI

`innertube.js`:

| Line | Function | Responsibility |
|---|---|---|
| 806 | `ytdlThumbSrc` | thumbnail URL for the current video |
| 813 | `ytdlEnsureDetail` | ensure the detail container exists |
| 840 | `ytdlOpenDetail` | open per-video detail |
| 869 | `ytdlCloseDetail` | close detail |
| 886 | `ytdlNewCard` | create a card for the current video |
| 929 | `markCardDone` | mark card done / error |
| 958 | `ytdlOnMuxDone` | merge callback handler |
| 966 | `createProgreses` | build progress rows and start pipes |
| 1084 | `getDownloadElement` | find the download panel |
| 1379 | `ytdlDownloadFailed` | toast + remove history entry |
| 1389 | `ytdlAddHistory` | append `{n,t,th,v}` and refresh live card |
| 1415 | `ytdlPageTitle` | title fallback chain |
| 1428 | `ytdlCurVid` | current video id from URL |
| 1434 | `ytdlHist` / 1437 `ytdlSaveHist` | read/write `ytdlHist` (cap 300) |
| 1445 | `ytdlFileRow` | one file row |
| 1463 | `ytdlDeleteFile` | delete via bridge + history cleanup |
| 1482 | `ytdlShowFileMenu` | long-press menu (Open/Share/Delete) |
| 1505 | `ytdlBindRowMenu` | 550 ms long-press binding |
| 1582 | `ytdlRenderHistory` | rebuild the list from storage |
| 1641 | `ytdlShowPanel` | show panel and refresh |

History entry shape: `{ n: fileName, t: title, th: thumbnail, v: videoId }`.

### 6.9 Failure paths

- `DownloadManager` failure → `ytdlDownloadFailed` (no history entry).
- Merge failure → `ytdlOnMuxDone(name, message)`; UI shows the error toast.
- Port never receives `END` → 90 s idle guard closes the file.
- Missing SABR config / unsupported WebView / no storage permission → early
  return with a toast.

---

## 7. Caption system

### 7.1 Modes

`localStorage.subsSys`:

| Value | Runtime |
|---|---|
| unset or `system` | Android caption bridge (`CaptioningController` config + `captions.js` CSS) |
| `native` | YouTube native CC; only CSS overrides (yellow text, soft shadow, transparent background) |

`Default Subtitles` (`defSubs`) only forces captions in `system` mode.

### 7.2 Config pushed from Java

`CaptioningController.buildConfig()` (line 152) produces:

```json
{
  "enabled": true, "autoEnable": true, "fontScale": 1.2,
  "locale": "en-US",
  "foreground": "rgba(...)", "background": "rgba(...)", "window": "rgba(...)",
  "edgeType": 1, "edgeColor": "rgba(...)",
  "hasForeground": true, "hasBackground": false, "hasWindow": false, "hasEdge": true
}
```

`pushConfig()` (line 143) assigns `window.__YTPRO_CAPTION_CFG__` and calls
`YTPRO_CAPTIONS.apply(cfg)`.

### 7.3 `CaptioningController` functions

| Line | Function | Responsibility |
|---|---|---|
| 50–65 | listener callbacks | enabled/style/fontScale/locale changes → `pushConfig` |
| 76 | constructor | register `CaptioningManager.CaptioningChangeListener` |
| 90 | `onPageStarted` | mark page not ready |
| 94 | `onPageFinished` | inject runtime, push config, nudge quality |
| 105 | `onHistoryChanged` | same for SPA navigation |
| 112 | `destroy` | remove listener, mark destroyed |
| 123 | `onCaptionSettingsChanged` | re-push when page ready |
| 128 | `injectRuntime` | `player-fixes.js` → `captions.js` → `quality.js` |
| 138 | `nudgeQuality` | `YTPRO_QUALITY.apply()` |
| 143 | `pushConfig` | JSON → JS |
| 152 | `buildConfig` | read system settings, clamp fontScale 0.5–3 |
| 215 | `loadAsset` | asset loader with per-asset cache |
| 248 | `evaluate` | main-thread `evaluateJavascript` with `destroyed` guard |

### 7.4 `captions.js` functions

| Line | Function | Responsibility |
|---|---|---|
| 45 | `systemMode` | `subsSys !== 'native'` |
| 49 | `removeStyle` | remove injected style |
| 59 | `forcedByApp` | `defSubs === 'true'` |
| 63 | `wantCaptions` | `cfg.enabled || defSubs` |
| 149 | `ensureStyle` | inject/update stylesheet |
| 178 | `shadowFor` | build shadow for Android edge types |
| 195 | `buildCss` | system-mode CSS (font size = base × scale) |
| 221 | `buildNativeCss` | native-mode CSS (`#FFD400`, transparent, `0 2px 6px rgba(0,0,0,.85)`) |
| 253 | `enforceNativeStyle` | inline `!important` overrides against YouTube styles |
| 282 | `measureBase` | read the current caption font size |
| 295 | `fallbackBase` | `max(14, playerHeight × 0.048)` |
| 303 | `updateBase` | recompute base and set CSS variables |
| 348 | `allTracks` | enumerate caption tracks |
| 366 | `currentTrack` | current track |
| 372 | `captionsOn` | detect CC state |
| 381 | `pickTrack` | score tracks against system locale |
| 404 | `selectTrack` | enable a specific track |
| 419 | `captionButton` | find the CC button |
| 437 | `selectCaptionFromMenu` | pick a track from the menu |
| 478 | `clickCaptionButton` | click CC button |
| 501 | `menuPass` | recursive menu search |
| 515 | `enableCaptions` | attempt to turn captions on |
| 565 | `disableCaptions` | turn captions off |
| 582 | `tick` | retry loop (1200 ms, max 10) + native style enforcement |
| 608 | `startTimer` / 613 `stopTimer` | timer control |
| 622 | `apply` | store config, apply mode, enable/disable |
| 668 | `setMode` | switch system/native |

### 7.5 Enabling captions

`enableCaptions()` tries in order:

1. The current track is already on.
2. Click the CC button.
3. Open the caption menu and pick the best track (`selectCaptionFromMenu`).
4. Retry up to `MAX_ATTEMPTS` (10) via `tick()`.

Track selection prefers the system locale, then English, then any track
(`pickTrack`).

### 7.6 Styling

- System mode: font size `calc(var(--ytpro-caption-base) * var(--ytpro-caption-scale))`,
  colors from the config, background/window per system style.
- Native mode: `#FFD400` text, transparent background, soft shadow; a ticker
  re-applies inline styles because YouTube's renderer overwrites CSS.

---

## 8. Updater

### 8.1 Page side (`script.js`)

| Line | Function | Responsibility |
|---|---|---|
| 1070 | `parseVer` | strip `v`, keep numeric segments |
| 1071 | `verGt` | segment-wise comparison |
| 1072 | `fetchLatestRelease` | GET GitHub `releases/latest`, 404 → no release |
| 1073 | `checkUpdates` | toast, compare, show dialog or “up to date” |
| 1085 | `showUpdateDialog` | notes, version subtitle, Later / Release page / Download APK |
| 1121 | `startApkUpdate` | enqueue APK, poll progress, install with retries |
| 2979 | `runAutoUpdateCheck` | home page only, 6 h throttle via `ytlUpdChecked` |

Progress format: `pct% · done MB / total MB · speed MB/s`.

Install flow:

```
startApkUpdate
  → Android.apkDownload(url, name) → id
  → every 600 ms: Android.apkProgress(id)
      status 8  → installApk(id), retry up to 4× at 900 ms
      status 16 → show failure reason
      else      → update bar/text
  → visibilitychange (returning from settings) → retry install
```

### 8.2 Java side

- `apkDownload` (WebAppInterface.java:129): MIME
  `application/vnd.android.package-archive`, destination
  `DownloadPaths.relativeDir()`.
- `apkProgress` (line 155): status/done/total/reason.
- `installApk` (line 176): Android 8+ check `canRequestPackageInstalls()`, open
  `ACTION_MANAGE_UNKNOWN_APP_SOURCES` if needed; otherwise
  `getUriForDownloadedFile()` + `ACTION_VIEW`.

### 8.3 Version rules

A release is offered only when its tag (e.g. `V1.4`) is greater than
`Android.getInfo()`. Release assets must contain an `*.apk`; otherwise the
Download button opens the release page.

---

## 9. Player, gestures, PiP and background playback

### 9.1 Gestures and fullscreen (`script.js`)

| Line | Function | Responsibility |
|---|---|---|
| 2138 | `_ytlFsFit` | size the player in fullscreen |
| 2174 | `__ytlFsRecBlock` | block recommended videos in fullscreen |
| 2176 | `_fsActive` | fullscreen detection |
| 2179 | `_fstrip` | locate `#brtS` / `#volS` |
| 2189 | `_fstart` / 2196 `_fmove` / 2206 `_fend` | gesture strip handlers |
| 1332 | `checkDirection` / 1342 `getDistance` | swipe direction and distance |
| 2488 | `navigateInternalYtMweb` | internal navigation |
| 2500 | `removePIP` | undo PiP layout |
| 2517 | `PIPlayer` | PiP layout |
| 3024 | `showCurtain` / 3038 `hideCurtain` | temporary fullscreen curtain used for PiP gesture |
| 2846 | `addMaxButton` | quality shortcut |
| 2877 | `extraSpeed` | playback-speed UI |

Volume/brightness strips are only interactive in real fullscreen; outside
fullscreen they are `pointer-events: none` so they cannot cover YouTube's
“Enter full screen” button.

### 9.2 PiP (`MainActivity`)

| Line | Function | Responsibility |
|---|---|---|
| 286 | `onPictureInPictureModeChanged` | `PIPlayer()` / `removePIP()` |
| 292 | `onUserLeaveHint` | if playing on watch/shorts, synthesise a tap gesture, then `enterPictureInPictureMode()` with 9:16/16:9 aspect |

The synthetic touch is required because WebView only grants fullscreen after a
user gesture.

### 9.3 Background playback

`ForegroundService.java`:

| Line | Function | Responsibility |
|---|---|---|
| 36 | `onCreate` | init media session and notification channel |
| 44 | `initMediaSession` | `MediaSession`, callbacks |
| 50–85 | callbacks | play/pause/next/prev/seek |
| 101 | `createNotificationChannel` | `MediaPlayback`, `IMPORTANCE_LOW` |
| 119 | `decodeIcon` | base64 icon → bitmap |
| 131 | `updateNotification` | rebuild notification |
| 201 | `registerUpdateReceiver` | listen for `UPDATE_NOTIFICATION` |
| 231 | `onStartCommand` | handle start/update intents |
| 239 | `setupNotification` | initial notification and `startForeground` |
| 311 | `updateMediaSessionMetadata` | title/artist/art/duration |
| 329 | `updatePlaybackState` | position/state |
| 346 | `onDestroy` | release session |

`WebAppInterface.bgStart/bgUpdate/bgStop/bgPause/bgPlay/bgBuffer` (lines
400–442) translate player events into service intents/broadcasts.

`YTProWebViewClient.onPageFinished` stops the service when leaving watch/shorts
if playback is no longer active.

### 9.4 Fullscreen chrome client

`YTProWebChromeClient.java`:

| Line | Function | Responsibility |
|---|---|---|
| 43 | `onShowCustomView` | attach the fullscreen view |
| 78 | `onHideCustomView` | restore the WebView |
| 103 | `onPermissionRequest` | request `RECORD_AUDIO` and grant pending WebRTC permission |
| 136 | `grantPendingPermission` | grant after the Android permission result |

---

## 10. Gemini

Flow:

1. `geminiInfo()` (script.js:1748) builds the panel.
2. Cookies: `Android.getAllCookies("https://m.youtube.com")`.
3. Token: `Android.getSNlM0e(cookies)` → `GeminiWrapper.getSNlM0e()`
   (GeminiWrapper.java:113) GETs `gemini.google.com/app` and extracts `SNlM0e`.
4. Request: `Android.GeminiClient(url, headers, body)` →
   `GeminiWrapper.getStream()` (line 28) POSTs `batchexecute`, returns JSON.
5. `handleGeminiResponse()` (script.js:1572) parses the stream; empty stream or
   missing `stream` shows the error message.
6. Markdown rendering via showdown; sticky header with `Copy` button.
7. Retry: empty/`"error"` token → retry after 1.2 s; empty response → clear
   `geminiChatInfo` and retry once.

Relevant functions:

| Line | Function |
|---|---|
| 1553 | `callbackSNlM0e` |
| 1560 | `callbackGeminiClient` |
| 1572 | `handleGeminiResponse` |
| 1723 | `ytlVideoTitle` |
| 1735 | `ytlGeminiPrompt` |
| 1748 | `geminiInfo` |

The panel scrolls independently: `touchmove` adjusts `scrollTop` and calls
`preventDefault`/`stopPropagation`.

---

## 11. RYD, ads, Shorts and UI cleanup

| Line | Function | Responsibility |
|---|---|---|
| 371 | `fDislikes` | call returnyoutubedislikeapi.com |
| 1894 | `rydEnsureStyle` | pill CSS |
| 1926 | `renderRydPill` | 👍/👎 counts + ratio bar |
| 1989 | `hideTopbarDots` | remove overflow dots |
| 2002 | `applyShortsTab` | hide/show Shorts tab entry |
| 2013 | `pkc` | periodic page cleanup (top bar, chips, promoted blocks) |
| 2762 | `adsBlock` | remove ad renderers; skip ad-interrupting video |
| 2846 | `addMaxButton` | quality shortcut |
| 3047 | `hideGoogleAccount` | hide the Google Account button on the You tab |

Ad blocking also happens earlier in `script.js` by deleting `adSlots`,
`playerAds`, `adPlacements`, `adBreakHeartbeatParams` from the player response
(including the `data[0].playerResponse` shape).

---

## 12. Security model

| Surface | Mitigation |
|---|---|
| JS bridge | `trusted()` host allowlist on every privileged method |
| Cookies | `getAllCookies` requires a trusted page and a `youtube.com` target |
| Token injection | `getSNlM0e` embeds the result with `JSONObject.quote()` |
| Navigation | non-YouTube URLs leave the WebView via `ACTION_VIEW` |
| Backup | `android:allowBackup="false"` |
| Obfuscation | ProGuard keeps `@JavascriptInterface` and `WebAppInterface` |
| Exported components | service and receivers `exported=false`; `TRACKS_TRACKS` registered in-process only |

Still loose (see chapter 16): `usesCleartextTraffic="true"`, `largeHeap="true"`,
and `DownloadFromIntentFilter` is exported with YouTube VIEW filters.

---

## 13. Lifecycle and cleanup

- Splash: visible until `Android.splashReady()` or 8 s timeout.
- `onPause()`: flush cookies.
- `onDestroy()`:
  - stop `ForegroundService`;
  - unregister `MediaCommandReceiver` and the back callback;
  - `streamManager.cleanup()`;
  - `removeJavascriptInterface("Android")`, `stopLoading()`, `about:blank`,
    `clearHistory()`, `destroy()`;
  - `CaptioningController.destroy()`.

`CaptioningController.evaluate()` always checks `destroyed` and posts to the main
thread, so a late caption callback cannot touch a dead WebView.

---

## 14. Build, CI and debugging

### Build

```powershell
.\gradlew.bat assembleDebug
.\gradlew.bat assembleRelease
java -jar signer\apksigner.jar sign --key signer\apkeasytool.pk8 `
  --cert signer\apkeasytool.pem --v4-signing-enabled false `
  --out app\build\outputs\apk\release\YouTubeLite-signed.apk `
  app\build\outputs\apk\release\app-release-unsigned.apk
```

`syncInjectedScripts` copies `scripts/*.js` into `assets/` during `preBuild`.
Version numbers live in `app/build.gradle`; About reads `Android.getInfo()`.

### CI

`.github/workflows/gradle.yml`: JDK 17, SDK 36 + build-tools 36.0.0, Gradle
cache, `assembleRelease`, signing with `signer/ApkSigner.jar`, artifact
`YouTubeLite-signed.apk`.

### Debugging

Debug builds enable WebView debugging:

```powershell
adb shell pidof com.matr1x.youtubelite
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
```

Useful expressions:

```js
Android.getInfo()
YTPRO_CAPTIONS.mode()
localStorage.subsSys
YTPRO_QUALITY.getState()
document.getElementById('ytProDownloaderDiv')
```

Log tags: `YTPRO_WVC` (interception/injection), `YTPRO_STREAM` (file writes),
`YTPRO_CAPTIONS` (caption runtime), `YTLGemini` (Gemini).

---

## 15. Extension recipes

### Add a settings toggle

1. Add a row in `script.js` `ytproSettings()` (line 609) with
   `data-action="sttCnf"` and a new `data-value`.
2. `actionsList.sttCnf` (line 929) already writes any key to `localStorage`.
3. Add the key to `YTL.KEY` in `constants.js` if other files read it.
4. Keep `scripts/script.js` and `assets/script.js` in sync (the build copies, but
   commit both).

### Add a bridge method

1. Add `@JavascriptInterface` in `WebAppInterface`.
2. Call `trusted()` for anything privileged.
3. Switch to the UI thread for UI work; use a worker for IO/network.
4. Quote JS string arguments with `JSONObject.quote()`.
5. ProGuard already keeps annotated methods.

### Add an injected script

1. Put the file in `assets/` (and `scripts/` if it should be synced).
2. Inject it from `onPageFinished()` or `CaptioningController.injectRuntime()`.
3. If injected via `<script src>` under `ytpro_cdn`, add a mapping in
   `shouldInterceptRequest()`; otherwise the request goes to the CDN.

### Debug a broken feature

1. Is the page a YouTube host (`trusted()`)?
2. Did the injection run? Check DevTools console/logcat.
3. Did a selector change? Re-inspect the current DOM.
4. Is the bridge blocked by `trusted()`?
5. Did the remote API change (InnerTube, RYD, Gemini)?

---

## 16. Known limitations

1. **Private YouTube APIs.** DOM, player objects, InnerTube responses and SABR
   can change without notice.
2. **Caption selectors are fragile.** `enableCaptions()` depends on the CC
   button/menu structure.
3. **SABR temp files are keyed by name.** Two concurrent downloads with the same
   name can collide.
4. **MediaStore lookups are name-based.** Same display name in different
   subfolders can resolve to the wrong file.
5. **API < 29** cannot open/share/delete downloads (MediaStore path is 29+).
6. **`installApk` timing.** `getUriForDownloadedFile()` may be null right after
   completion; JS retries.
7. **Manifest is still permissive.** `usesCleartextTraffic`, `largeHeap`, exported
   `DownloadFromIntentFilter`.
8. **No automated tests.** Verification is device + CDP based; regression list:
   home, watch, download, captions, update check, external links.

---

## Appendix A: key line references

| Reference | Location |
|---|---|
| `trusted()` | WebAppInterface.java:64 |
| `downvid()` | WebAppInterface.java:99 |
| `apkDownload()` | WebAppInterface.java:129 |
| `installApk()` | WebAppInterface.java:176 |
| `muxVideoAudio(...,folder)` | WebAppInterface.java:274 |
| `getSNlM0e()` | WebAppInterface.java:456 |
| `shouldInterceptRequest()` | YTProWebViewClient.java:66 |
| `handleUrl()` | YTProWebViewClient.java:264 |
| `onPageFinished()` | YTProWebViewClient.java:318 |
| `openStreamForFile()` | BinaryStreamManager.java:42 |
| `pushConfig()` | CaptioningController.java:143 |
| `buildConfig()` | CaptioningController.java:152 |
| `apply()` | captions.js:622 |
| `setMode()` | captions.js:668 |
| `downloadSABRStream()` | innertube.js:704 |
| `pipeToDisk()` | innertube.js:1214 |
| `ytdlAddHistory` | innertube.js:1389 |
| `checkUpdates()` | script.js:1073 |
| `startApkUpdate()` | script.js:1121 |
| `geminiInfo()` | script.js:1748 |

Line numbers refer to the `assets` copies at the `1.3` baseline. After editing,
re-run the extraction or use your editor's symbol search; the function names are
stable.
