package com.matr1x.youtubelite.captions;

import android.content.Context;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.CaptioningManager;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.util.Locale;

/**
 * Bridges Android's system caption preferences (Settings > Accessibility > Captions)
 * into the YouTube web player that runs inside the app's WebView.
 *
 * <p>The controller listens for live {@link CaptioningManager} changes, serialises the
 * current settings to JSON and pushes them into the page, where
 * {@code assets/captions.js} applies them to the player's caption DOM and turns
 * captions on / selects the matching language track.</p>
 *
 * <p>See ENGINEERING.md section 7 for the full flow.</p>
 */
public final class CaptioningController {

    private static final String TAG = "YTPRO_CAPTIONS";
    private static final String RUNTIME_ASSET = "captions.js";
    private static final String QUALITY_ASSET = "quality.js";
    private static final String PLAYER_FIXES_ASSET = "player-fixes.js";

    /** Matches CaptionStyle.NO_OVERRIDE semantics: use YouTube's own default. */
    private static final int DEFAULT_FOREGROUND = 0xFFFFFFFF;
    private static final int DEFAULT_BACKGROUND = 0x80000000;
    private static final int DEFAULT_WINDOW = 0x00000000;
    private static final int DEFAULT_EDGE_COLOR = 0xFF000000;

    private final Context appContext;
    private final WebView webView;
    private final CaptioningManager captioningManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final CaptioningManager.CaptioningChangeListener changeListener =
            new CaptioningManager.CaptioningChangeListener() {
                @Override
                public void onEnabledChanged(boolean enabled) {
                    onCaptionSettingsChanged();
                }

                @Override
                public void onUserStyleChanged(CaptioningManager.CaptionStyle userStyle) {
                    onCaptionSettingsChanged();
                }

                @Override
                public void onFontScaleChanged(float fontScale) {
                    onCaptionSettingsChanged();
                }

                @Override
                public void onLocaleChanged(Locale locale) {
                    onCaptionSettingsChanged();
                }
            };

    private String runtimeScript;
    private String qualityScript;
    private String playerFixesScript;
    private boolean pageReady;
    private boolean destroyed;

    public CaptioningController(Context context, WebView webView) {
        this.appContext = context.getApplicationContext();
        this.webView = webView;
        this.captioningManager =
                (CaptioningManager) appContext.getSystemService(Context.CAPTIONING_SERVICE);
        if (captioningManager != null) {
            try {
                captioningManager.addCaptioningChangeListener(changeListener);
            } catch (Throwable t) {
                Log.w(TAG, "Unable to observe caption settings", t);
            }
        }
    }

    public void onPageStarted() {
        pageReady = false;
    }

    public void onPageFinished() {
        pageReady = true;
        injectRuntime();
        pushConfig();
        nudgeQuality();
    }

    /**
     * Called for in-page (SPA) navigation: the document is the same, but YouTube may
     * have swapped the player and reset its caption state.
     */
    public void onHistoryChanged() {
        if (!pageReady) return;
        injectRuntime();
        pushConfig();
        nudgeQuality();
    }

    public void destroy() {
        destroyed = true;
        if (captioningManager != null) {
            try {
                captioningManager.removeCaptioningChangeListener(changeListener);
            } catch (Throwable ignored) {
                // The captioning service may already be gone while the process shuts down.
            }
        }
    }

    private void onCaptionSettingsChanged() {
        if (!pageReady || destroyed) return;
        pushConfig();
    }

    private void injectRuntime() {
        String fixes = loadAsset(PLAYER_FIXES_ASSET);
        if (!fixes.isEmpty()) evaluate(fixes);
        String captions = loadAsset(RUNTIME_ASSET);
        if (!captions.isEmpty()) evaluate(captions);
        String quality = loadAsset(QUALITY_ASSET);
        if (!quality.isEmpty()) evaluate(quality);
    }

    /** Re-runs the quality lock after in-page navigation (the player may have been recreated). */
    private void nudgeQuality() {
        if (!pageReady || destroyed) return;
        evaluate("(function(){try{var q=window.YTPRO_QUALITY;if(q&&q.apply){q.apply();}}catch(e){}})();");
    }

    private void pushConfig() {
        if (!pageReady || destroyed) return;
        JSONObject config = buildConfig();
        if (config == null) return;
        String json = config.toString();
        evaluate("(function(){var c=" + json + ";window.__YTPRO_CAPTION_CFG__=c;"
                + "var api=window.YTPRO_CAPTIONS;if(api&&api.apply){try{api.apply(c);}catch(e){}}})();");
    }

    private JSONObject buildConfig() {
        boolean enabled = false;
        float fontScale = 1f;
        String localeTag = "";
        int foreground = DEFAULT_FOREGROUND;
        int background = DEFAULT_BACKGROUND;
        int window = DEFAULT_WINDOW;
        int edgeType = -1;
        int edgeColor = DEFAULT_EDGE_COLOR;
        boolean hasForeground = false;
        boolean hasBackground = false;
        boolean hasWindow = false;
        boolean hasEdge = false;

        if (captioningManager != null) {
            try {
                enabled = captioningManager.isEnabled();
                fontScale = clamp(captioningManager.getFontScale(), 0.5f, 3.0f);
                Locale locale = captioningManager.getLocale();
                if (locale != null) localeTag = locale.toLanguageTag();

                CaptioningManager.CaptionStyle style = captioningManager.getUserStyle();
                if (style != null) {
                    hasForeground = style.hasForegroundColor();
                    if (hasForeground) foreground = style.foregroundColor;
                    hasBackground = style.hasBackgroundColor();
                    if (hasBackground) background = style.backgroundColor;
                    hasWindow = style.hasWindowColor();
                    if (hasWindow) window = style.windowColor;
                    if (style.edgeType >= 0 && style.edgeType <= 4) {
                        edgeType = style.edgeType;
                        hasEdge = true;
                    }
                    if (style.hasEdgeColor()) edgeColor = style.edgeColor;
                    if (Color.alpha(edgeColor) == 0) edgeColor = DEFAULT_EDGE_COLOR;
                }
            } catch (Throwable t) {
                Log.w(TAG, "Unable to read caption settings", t);
            }
        }

        JSONObject config = new JSONObject();
        try {
            config.put("enabled", enabled);
            config.put("autoEnable", true);
            config.put("fontScale", (double) fontScale);
            config.put("locale", localeTag);
            config.put("foreground", cssColor(foreground));
            config.put("background", cssColor(background));
            config.put("window", cssColor(window));
            config.put("edgeType", edgeType);
            config.put("edgeColor", cssColor(edgeColor));
            config.put("hasForeground", hasForeground);
            config.put("hasBackground", hasBackground);
            config.put("hasWindow", hasWindow);
            config.put("hasEdge", hasEdge);
        } catch (Throwable t) {
            Log.w(TAG, "Unable to build caption config", t);
            return null;
        }
        return config;
    }

    private String loadAsset(String assetName) {
        if (RUNTIME_ASSET.equals(assetName) && runtimeScript != null) return runtimeScript;
        if (QUALITY_ASSET.equals(assetName) && qualityScript != null) return qualityScript;
        if (PLAYER_FIXES_ASSET.equals(assetName) && playerFixesScript != null) return playerFixesScript;

        String content = "";
        InputStream in = null;
        try {
            in = appContext.getAssets().open(assetName);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            content = new String(out.toByteArray(), Charset.forName("UTF-8"));
        } catch (Throwable t) {
            Log.e(TAG, "Unable to load " + assetName, t);
        } finally {
            if (in != null) {
                try {
                    in.close();
                } catch (Exception ignored) {
                }
            }
        }

        if (RUNTIME_ASSET.equals(assetName)) runtimeScript = content;
        else if (QUALITY_ASSET.equals(assetName)) qualityScript = content;
        else if (PLAYER_FIXES_ASSET.equals(assetName)) playerFixesScript = content;
        return content;
    }

    private void evaluate(final String js) {
        if (destroyed) return;
        Runnable task = new Runnable() {
            @Override
            public void run() {
                if (destroyed) return;
                try {
                    webView.evaluateJavascript(js, null);
                } catch (Throwable t) {
                    Log.w(TAG, "evaluateJavascript failed", t);
                }
            }
        };
        if (Looper.myLooper() == Looper.getMainLooper()) {
            task.run();
        } else {
            mainHandler.post(task);
        }
    }

    private static String cssColor(int color) {
        float alpha = Color.alpha(color) / 255f;
        return String.format(Locale.US, "rgba(%d, %d, %d, %.3f)",
                Color.red(color), Color.green(color), Color.blue(color), alpha);
    }

    private static float clamp(float value, float min, float max) {
        if (!(value > 0f)) return 1f;
        return value < min ? min : (value > max ? max : value);
    }
}
