# Building YouTube Lite

YouTube Lite is a lightweight Android client that wraps the YouTube mobile web app in a hardened `WebView` and injects scripts from `app/src/main/assets/`. This document covers everything needed to build, install and modify it.

| Item | Value |
|---|---|
| Package / applicationId | `com.matr1x.youtubelite` |
| Version name / code | `1.0` / `1` |
| compileSdk / targetSdk | 36 / 36 |
| minSdk | 21 (Android 5.0) |
| Android Gradle Plugin | 8.13.0 |
| Gradle | 8.13 (wrapper included) |
| JDK | 17 or newer |

## Requirements

* **JDK 17+** — AGP 8.13 requires JDK 17; 21 also works.
* **Android SDK** — Platform 36, Build-Tools 36.0.0, Platform-Tools (`adb`).
* **Gradle 8.13** — use the bundled wrapper (`gradlew`), no separate install needed.
* **Network access on the first build** — AGP and `androidx.webkit:webkit:1.12.0` are fetched from `google()` and `mavenCentral()`.

## 1. Configure the Android SDK

Create `local.properties` in the repository root (it is git-ignored, never commit it):

```properties
sdk.dir=C:/Android/Sdk
```

Windows notes:

* Forward slashes are fine: `C:/Android/Sdk`.
* A backslash path must be escaped: `C\:\\Android\\Sdk`.

> **Keep the project path ASCII-only.** AGP aborts with
> `StopExecutionException: Your project path contains non-ASCII characters`
> when the checkout path contains Chinese or other non-ASCII characters. Clone to something like `C:\dev\YouTube-Lite` or `/home/user/YouTube-Lite`.

## 2. Build

### Windows (PowerShell)

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
.\gradlew.bat assembleDebug
```

### Windows (cmd)

```bat
set JAVA_HOME=C:\Program Files\Java\jdk-17
gradlew.bat assembleDebug
```

### macOS / Linux

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # macOS
./gradlew assembleDebug
```

The APK is written to:

```
app/build/outputs/apk/debug/app-debug.apk
```

If the Gradle distribution download is slow, you can install Gradle 8.13 locally and run `gradle assembleDebug`. Using the wrapper is still recommended because it pins the version.

## 3. Install and run

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.matr1x.youtubelite/.MainActivity
```

Debug builds enable WebView remote debugging. Open `chrome://inspect` in Chrome/Edge on the connected computer to inspect the page and its console.

## 4. Project layout

| Path | Purpose |
|---|---|
| `app/src/main/java/com/matr1x/youtubelite/MainActivity.java` | Hosts the `WebView`, loads `m.youtube.com`, handles permissions and the splash hand-off |
| `app/src/main/java/com/matr1x/youtubelite/webview/YTProWebViewClient.java` | Main-frame refetch, asset interception for `youtube.com/ytpro_cdn/...`, API hooks |
| `app/src/main/java/com/matr1x/youtubelite/webview/WebAppInterface.java` | JavaScript bridge: downloads, in-app update download/install, muxer, file open, download folder, splash ready |
| `app/src/main/java/com/matr1x/youtubelite/webview/BinaryStreamManager.java` | Writes SABR video/audio stream chunks to temporary tracks |
| `app/src/main/java/com/matr1x/youtubelite/utils/` | `DownloadPaths`, `DownloadUtils`, `MediaMuxerUtils` |
| `app/src/main/java/com/matr1x/youtubelite/captions/CaptioningController.java` | Reads Android caption settings and injects `captions.js` / `player-fixes.js` / `quality.js` |
| `app/src/main/java/com/matr1x/youtubelite/ForegroundService.java` | Media playback foreground service and notification |
| `app/src/main/assets/` | JavaScript injected at runtime — `script.js`, `innertube.js`, `bgplay.js`, `captions.js`, `player-fixes.js`, `quality.js` |
| `scripts/` | Readable source copies of `script.js` and `innertube.js` |
| `app/src/main/res/layout/main.xml` | `FrameLayout` with the `WebView` and the splash overlay |
| `app/build.gradle` | Namespace, SDK versions, dependency list |

### Editing the injected JavaScript

The APK loads scripts from `app/src/main/assets/`. `scripts/script.js` and `scripts/innertube.js` are kept as readable working copies — **they must be copied into `assets/` before building**, otherwise your changes will not ship:

```powershell
Copy-Item scripts\script.js     app\src\main\assets\script.js
Copy-Item scripts\innertube.js  app\src\main\assets\innertube.js
```

`captions.js`, `player-fixes.js`, `quality.js` and `bgplay.js` exist only under `assets/`.

The asset handler injects them with a `?v=<timestamp>` query and `Cache-Control: no-store`, so a rebuild is enough to pick up changes — no app data reset needed.

## 5. In-app updates

The updater talks to `https://api.github.com/repos/danielmzy/YouTube-Lite/releases/latest`, compares that tag with the installed `versionName`, and downloads the first `*.apk` asset of the release through `DownloadManager` (`apkDownload` / `apkProgress` / `installApk`).

* The manifest declares `android.permission.REQUEST_INSTALL_PACKAGES`; without it the installer intent is rejected.
* On Android 8+ the first update prompts for **Install unknown apps → YouTube Lite**. The app opens that screen automatically and can retry the install.
* To make a release visible to the updater, tag it higher than the installed `versionName` and attach the signed APK as a release asset.

## 6. Build variants

* **debug** — no minification, WebView remote debugging enabled. This is the variant used for development and screenshots.
* **release** — `minifyEnabled true` with the default `proguard-android.txt` rules. Gradle outputs an unsigned APK (`app-release-unsigned.apk`); the GitHub Actions workflow signs it with the keys in `signer/` and uploads `YouTubeLite-signed.apk`. You can run the same `apksigner` command locally (see below).

If you add new bridge classes or methods that are reached via reflection, keep them from being renamed:

```proguard
-keepclassmembers class com.matr1x.youtubelite.webview.WebAppInterface {
    public *;
}
-keepattributes JavascriptInterface
```

```bash
./gradlew assembleRelease
```

GitHub Actions (`.github/workflows/gradle.yml`) builds and signs the release APK on every push to `main` using `signer/apksigner.jar` with `signer/apkeasytool.pk8` / `signer/apkeasytool.pem`, then uploads the `YouTubeLite-release` artifact (`YouTubeLite-signed.apk`). To sign locally:

```bash
java -jar signer/apksigner.jar sign --key signer/apkeasytool.pk8 --cert signer/apkeasytool.pem \
  --v4-signing-enabled false --out YouTubeLite-signed.apk \
  app/build/outputs/apk/release/app-release-unsigned.apk
```

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `Your project path contains non-ASCII characters` | Move the checkout to an ASCII-only path |
| `SDK location not found` | `local.properties` is missing or `sdk.dir` points to the wrong folder |
| First build takes several minutes | Gradle is downloading AGP/Gradle/AndroidX; later builds are incremental |
| Wrapper download is slow | Use a Gradle mirror, or a local Gradle 8.13 install |
| YouTube asks to sign in / shows a captcha | YouTube applies IP-based risk control on fresh sessions; sign in once. The project ships no accounts |
| Captions do not appear | Enable **Settings → Accessibility → Captions** on the device; the app follows that switch. The in-app **Default Subtitles** toggle forces captions on for every video |
| 4K option missing | The video may not offer 4K, or the device lacks the codec; YouTube falls back to a supported track |
| Release build loses the JS bridge | Add the ProGuard keep rules shown above |
| Update downloaded but no installer appears | Allow **Install unknown apps → YouTube Lite**; the app opens that settings screen and retries |
| Update check says "No releases published yet" | Publish a GitHub Release whose tag is higher than the installed `versionName` |
| `adb: no devices` | Enable USB debugging and authorize the computer |

## 8. License

MIT — see [LICENSE](LICENSE). This is an unofficial, educational project and is not affiliated with, endorsed by, or sponsored by YouTube or Google.
