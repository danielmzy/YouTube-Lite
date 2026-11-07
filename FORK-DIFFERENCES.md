# YouTube Lite vs upstream YTPro

This document describes the code-level differences between **YouTube Lite** and
[prateek-chaubey/YTPro](https://github.com/prateek-chaubey/YTPro).

- Upstream reference: `main` at commit [`816b6fd`](https://github.com/prateek-chaubey/YTPro/commit/816b6fddd99a7347ba4ad3addcea2fa820c76089) (2026-10-17)
- This repository: `main` at version `1.3` (`versionCode 4`)
- Numbers below are line-level `git diff --numstat` results between the two trees. They include whitespace/formatting changes, so use them as a size indicator rather than an exact effort metric.

This fork is **not a clean-room rewrite**. The WebView injection model, the
InnerTube format resolution, the player hooks and a large part of the upstream UI
are carried over. Most changes are rewrites of specific subsystems plus new
native code around them.

## At a glance

| | Upstream YTPro | YouTube Lite |
|---|---|---|
| Application ID | `com.google.android.youtube.pro` | `com.matr1x.youtubelite` |
| App label | YT Pro | YouTube Lite |
| Version | `4.0` (`versionCode 1`) | `1.3` (`versionCode 4`) |
| Injected JavaScript | fetched at runtime (CDN rewrite) | bundled in `assets/`, served locally with CDN fallback |
| JS assets in APK | none | 7 files (`script.js`, `innertube.js`, `bgplay.js`, `captions.js`, `quality.js`, `player-fixes.js`, `constants.js`) |
| On-screen caption runtime | not present (caption **download** only) | `captions.js` (Android and YouTube modes) |
| Update check | hardcoded compare + `nightly.link` ZIP | GitHub Releases API + in-app APK download/install |
| Install next to upstream | — | yes (different application ID and label) |
| `android:allowBackup` | `true` | `false` |
| Gradle / CI | `assembleRelease`, no SDK setup | JDK 17, SDK 36 setup, Gradle cache, signed release artifact |

## Diff size

| Area | Upstream | YouTube Lite | Diff |
|---|---|---|---|
| `scripts/script.js` | 2,787 lines | 3,049 lines | `+627 / −365` |
| `scripts/innertube.js` | 1,193 lines | 1,699 lines | `+630 / −124` |
| `scripts/bgplay.js` | 249 lines | 249 lines | `+4 / −4` |
| Java (all classes) | 1,639 lines | 2,573 lines | `+972 / −305` on shared files, plus 2 new classes |
| New JS assets | — | `captions.js` 697 L, `quality.js` 403 L, `player-fixes.js` 29 L, `constants.js` 28 L | new |

## Java layer

| File | Upstream | YouTube Lite | What changed |
|---|---:|---:|---|
| `MainActivity.java` | 201 | 311 | `singleTask` launch mode; `onNewIntent()`; `urlFromIntent()` for `VIEW` (http/https, `youtu.be`, `vnd.youtube:`), `SEND` text; starts a shared URL from other apps; WebView teardown in `onDestroy()` |
| `webview/WebAppInterface.java` | 251 | 494 | host-gated JS bridge (`trusted()`); download completion callbacks; `muxVideoAudio(..., folder)`; APK update download/progress/install; MediaStore share/delete; quoted `getSNlM0e` callback; cookie access restricted to YouTube pages |
| `webview/YTProWebViewClient.java` | 195 | 313 | local asset interception (with CDN fallback and `?v=` cache bust); `shouldOverrideUrlLoading` allowlist; external links leave the WebView; YouTube links redirect back into the app |
| `webview/YTProWebChromeClient.java` | 92 | 128 | permission request handling and fullscreen/media plumbing updates |
| `webview/BinaryStreamManager.java` | 158 | 115 | removed unused legacy helpers (~45 lines); 90 s idle timeout for unfinished streams |
| `utils/DownloadUtils.java` | 45 | 103 | `enqueue()` returns a DownloadManager id; `statusOf()`; filename sanitizing that keeps the extension; synchronized unique names |
| `utils/DownloadPaths.java` | — | 60 | new: folder sanitizing and per-folder directory resolution without mutating global state |
| `utils/MediaMuxerUtils.java` | 245 | 318 | pending MediaStore rows, explicit input/output paths, cleanup |
| `ForegroundService.java` | 262 | 284 | lifecycle/notification cleanup |
| `captions/CaptioningController.java` | — | 245 | new: injects `captions.js`, pushes caption config, follows Android `CaptioningManager` |
| `GeminiWrapper.java` | 97 | 95 | logging and error handling |
| `DownloadFromIntentFilter.java` | 10 | 17 | validation |
| `receivers/*` | 48 | 56 | small fixes |

Package name change: every Java file moved from `com.google.android.youtube.pro`
to `com.matr1x.youtubelite`.

## Injected JavaScript

### `script.js`

Kept from upstream: settings overlay, Gemini panel, ad blocking, RYD, Shorts
hiding, gesture controls, quality and codec options.

Changed in this fork:

- **Settings rows** — adds a Downloads entry, `Default Subtitles`, and `Subtitle system` (Android / YouTube); removes the upstream "Liked Videos" / hearts entry; About page shows the live version.
- **Updater rewritten** — the upstream hardcoded version compare and `nightly.link` ZIP download are replaced by `https://api.github.com/repos/danielmzy/YouTube-Lite/releases/latest`, release notes display, in-app APK download with progress/size/speed, automatic installer launch, and a 6-hour launch throttle.
- **RYD pill** — recolored pill + ratio bar, native like/dislike row hidden.
- **Gesture strips** — volume/brightness strips are only interactive in fullscreen and no longer cover the fullscreen button.
- **You tab** — Google Account button hidden; Shorts tab entry follows the Hide Shorts toggle.
- **Branding and links** — title, About, Report Bugs, update links and source link point to this repository.
- **Splash screen** — branded launch overlay driven by `Android.splashReady()` (not in upstream).
- **Constants** — localStorage keys, URLs and timer values moved to `constants.js` (`YTL.*`).

### `innertube.js`

Changed in this fork:

- **Download manager UI rewritten** — per-video cards, grouped history (`ytdlHist`), detail view, live `Video/Audio Stream: x / y MB · z MB/s` progress, `_FULL` / `_VIDEO` / `_AUDIO` suffixes.
- **File actions** — long-press a downloaded file for Open / Share / Delete (MediaStore), deleting also removes the history entry.
- **Mux context** — `muxVideoAudio` receives the target folder so concurrent downloads cannot merge into the wrong directory.
- **Failure handling** — `ytdlDownloadFailed()` removes the entry instead of writing history when the download fails.
- **Thumbnail/caption context** — `__ytdlCtx` captures title/video before downloads.

### New bundled assets

| File | Purpose |
|---|---|
| `captions.js` | caption runtime: Android `CaptioningManager` mode and YouTube native mode; yellow text, soft shadow, transparent background in native mode |
| `constants.js` | `YTL.KEY` / `YTL.URL` / `YTL.MS` shared constants, injected before other scripts |
| `quality.js` | quality picker helper |
| `player-fixes.js` | player layout fixes |

`bgplay.js` is effectively unchanged.

## Feature-level summary

**New in this fork**

- Two selectable subtitle runtimes, with native captions restyled.
- Rewritten download manager with grouped history, per-video folders, live speed and a file actions menu.
- Real in-app updater (GitHub Releases + APK install).
- YouTube link handling from browsers/other apps (`VIEW`, `SEND`, `vnd.youtube:`).
- Splash screen, About page, rebranded UI.
- Side-by-side installation with upstream YTPro.

**Inherited and modified, not invented here**

- Ad blocking (in-stream ad removal and feed ad cleanup already existed upstream; this fork keeps and extends the selectors).
- Return YouTube Dislike (upstream already had an RYD integration; the pill layout/colors were changed here).
- Shorts hiding, Gemini panel, gesture controls, InnerTube quality selection.
- Downloading via InnerTube formats (upstream already had a downloader; the UI and storage layer were rewritten).

**Removed**

- "Liked Videos" / hearts screen.
- Upstream updater (`nightly.link` ZIP) and upstream branding/links.

## Security and lifecycle fixes

- JS bridge methods that touch files, downloads, intents or tokens require a YouTube host (`trusted()`); cookies are returned only for YouTube pages.
- `getSNlM0e` result is JSON-quoted before being embedded into JavaScript.
- Non-YouTube links open in the system browser instead of the WebView.
- `android:allowBackup="false"`; ProGuard keeps `@JavascriptInterface` methods.
- WebView is detached and destroyed on `onDestroy()`.
- Download history is written only after `DownloadManager` reports success.
- Dead code removed from `BinaryStreamManager`, with a 90 s idle guard.

## Build, release and documentation

- `app/build.gradle` gained `syncInjectedScripts`, which copies `scripts/*.js` to `assets/` on every build; the two copies no longer drift.
- CI workflow rewritten: JDK 17, Android SDK 36 installation, Gradle cache, signed release APK artifact.
- Releases V1.0 → V1.3 are published with an APK asset and release notes.
- `README.md` and `BUILDING.md` rewritten for this repository; screenshots are from this build.

## What did not change

- Still a WebView wrapper around `m.youtube.com` with injected scripts.
- Still relies on YouTube's private DOM, player objects and InnerTube responses; upstream and this fork break in the same places when YouTube changes.
- Player, quality, ad-blocking and RYD internals are derived from upstream code (MIT licensed).
- No new native player, no DRM bypass, no official API.

## Reproducing the comparison

```bash
git clone https://github.com/prateek-chaubey/YTPro /tmp/ytpro
git -C /tmp/ytpro checkout 816b6fd
git clone https://github.com/danielmzy/YouTube-Lite /tmp/ytl
git diff --no-index --numstat /tmp/ytpro/scripts/script.js     /tmp/ytl/scripts/script.js
git diff --no-index --numstat /tmp/ytpro/scripts/innertube.js  /tmp/ytl/scripts/innertube.js
```

This repository's history was squashed into a single initial commit, so compare
trees rather than commit history.

## License

Upstream YTPro is MIT licensed (Copyright © 2022 Prateek Chaubey). This fork keeps
the same license; see [LICENSE](LICENSE).
