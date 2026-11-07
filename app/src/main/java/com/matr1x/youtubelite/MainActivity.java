package com.matr1x.youtubelite;

import android.Manifest;
import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Rational;
import android.view.View;
import android.view.WindowManager;
import android.content.pm.ApplicationInfo;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

// Import the separated components
import com.matr1x.youtubelite.webview.YTProWebView;
import com.matr1x.youtubelite.webview.YTProWebViewClient;
import com.matr1x.youtubelite.webview.YTProWebChromeClient;
import com.matr1x.youtubelite.webview.WebAppInterface;
import com.matr1x.youtubelite.webview.BinaryStreamManager;
import android.view.MotionEvent;
import android.os.SystemClock;

import com.matr1x.youtubelite.receivers.MediaCommandReceiver;
import com.matr1x.youtubelite.captions.CaptioningController;

/**
 * Single-activity WebView host for YouTube Lite.
 *
 * <p>Creates the WebView and the JavaScript bridge, resolves YouTube
 * links from VIEW/SEND intents (browser and share-sheet handoff), and
 * loads the mobile YouTube site. Feature behaviour lives in the
 * injected scripts under assets/.</p>
 */
public class MainActivity extends Activity {

	public volatile String currentUrl = "";

    public boolean portrait = false;
    public boolean isPlaying = false;
    public boolean mediaSession = false;
    public boolean isPip = false;

    private YTProWebView web;
    private YTProWebChromeClient chromeClient;
    private MediaCommandReceiver broadcastReceiver;
    private OnBackInvokedCallback backCallback;
    public BinaryStreamManager streamManager;
    private CaptioningController captioningController;
    private View splash;
    
    

    /** Builds the WebView, installs the JS bridge and loads the first page. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        setContentView(R.layout.main);
        splash = findViewById(R.id.splash);
        new Handler(Looper.getMainLooper()).postDelayed(this::hideSplash, 8000);
        
        SharedPreferences prefs = getSharedPreferences("YTPRO", MODE_PRIVATE);
        if (!prefs.contains("bgplay")) {
            prefs.edit().putBoolean("bgplay", true).apply();
        }

        // The media notification is the only playback control once the app is in the
        // background, so ask for the permission up front on Android 13+.
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 102);
        }

        load();
    }

    public void hideSplash() {
        if (splash == null || splash.getVisibility() != View.VISIBLE) {
            return;
        }
        splash.animate().alpha(0f).setDuration(260).withEndAction(() -> {
            if (splash != null) {
                splash.setVisibility(View.GONE);
            }
        }).start();
    }

    /** Loads the URL carried by the current intent, or the mobile home page. */
    public void load() {
              
        
        // Idempotent: initialising twice would leave CaptioningController, the receiver,
        // the back callback and BinaryStreamManager bound to a stale WebView.
        if (web != null) {
            return;
        }

        web = findViewById(R.id.web);
        if (captioningController == null) {
            captioningController = new CaptioningController(this, web);
        }

        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setSupportZoom(true);
        web.getSettings().setBuiltInZoomControls(true);
        web.getSettings().setDisplayZoomControls(false);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setDatabaseEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false); 
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(web, true);
        }

        String url = urlFromIntent(getIntent());
        if (url == null) {
            url = "https://m.youtube.com/";
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }


        web.addJavascriptInterface(new WebAppInterface(this, web), "Android");
        chromeClient = new YTProWebChromeClient(this, web);
        web.setWebChromeClient(chromeClient);
        web.setWebViewClient(new YTProWebViewClient(this, web));
        
        web.loadUrl(url);

        setupReceiver();
        setupBackNavigation();
        streamManager = new BinaryStreamManager(web,this);
        
        
    }
         

   

    /** Reuses this singleTask activity when another YouTube link arrives. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String url = urlFromIntent(intent);
        if (url != null && web != null) {
            web.loadUrl(url);
        }
    }

    private static final String[] YT_HOSTS = {
            "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
            "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"
    };

    /** Picks a YouTube URL out of VIEW data or shared text; null when unrelated. */
    private static String urlFromIntent(Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data == null) return null;
            String scheme = data.getScheme() == null ? "" : data.getScheme().toLowerCase();
            if (scheme.equals("vnd.youtube") || scheme.equals("youtube")) {
                String raw = data.getSchemeSpecificPart();
                if (raw == null) raw = data.getHost();
                String id = findVideoId(raw);
                return id == null ? null : "https://m.youtube.com/watch?v=" + id;
            }
            if (!scheme.equals("http") && !scheme.equals("https")) return null;
            String host = data.getHost() == null ? "" : data.getHost().toLowerCase();
            for (String h : YT_HOSTS) {
                if (host.equals(h)) return data.toString();
            }
            return null;
        }
        if (Intent.ACTION_SEND.equals(action)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text == null) return null;
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("https?://[^\\s]+").matcher(text);
            while (m.find()) {
                String candidate = m.group();
                try {
                    String host = Uri.parse(candidate).getHost();
                    if (host == null) continue;
                    host = host.toLowerCase();
                    for (String h : YT_HOSTS) {
                        if (host.equals(h)) return candidate;
                    }
                } catch (Exception ignored) {
                }
            }
        }
        return null;
    }

    private static String findVideoId(String raw) {
        if (raw == null) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("[A-Za-z0-9_-]{11}").matcher(raw);
        while (m.find()) {
            String id = m.group();
            if (!id.equals("watch") && !id.equals("https")) return id;
        }
        return null;
    }

    private void setupReceiver() {
        broadcastReceiver = new MediaCommandReceiver(web);
        // TRACKS_TRACKS is only ever sent inside this process (ForegroundService's media
        // session callbacks and NotificationActionReceiver), so keep it non-exported.
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(broadcastReceiver, new IntentFilter("TRACKS_TRACKS"), RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(broadcastReceiver, new IntentFilter("TRACKS_TRACKS"));
        }
    }

    private void setupBackNavigation() {
        if (Build.VERSION.SDK_INT >= 33) {
            OnBackInvokedDispatcher dispatcher = getOnBackInvokedDispatcher();
            backCallback = new OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() {
                    handleBackPress();
                }
            };
            dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    private void handleBackPress() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        handleBackPress();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 101) {
            if (chromeClient != null) {
                chromeClient.grantPendingPermission();
            }
            if (grantResults.length == 0 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(getApplicationContext(), getString(R.string.grant_mic), Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == 1) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_DENIED) {
                Toast.makeText(getApplicationContext(), getString(R.string.grant_storage), Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        isPip = isInPictureInPictureMode;
        web.evaluateJavascript(isInPictureInPictureMode ? "PIPlayer();" : "removePIP();", null);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= 26 && web.getUrl() != null && (web.getUrl().contains("watch") || web.getUrl().contains("shorts"))) {
            if (isPlaying) {
                try {

         /**Webview requires gesture for FullScreenView which is used for PiP mode , this does that ig.*/
         web.loadUrl("javascript:showCurtain();");
         long downTime = SystemClock.uptimeMillis();
         long eventTime = downTime;

         float x = web.getWidth() / 2f;
         float y = 10f; 
         MotionEvent down = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_DOWN, x, y, 0);
         web.dispatchTouchEvent(down);

         eventTime += 15; 
         MotionEvent up = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_UP, x, y, 0);
         web.dispatchTouchEvent(up);
         down.recycle();
         up.recycle();
         web.loadUrl( "javascript:hideCurtain();");
                 
                    PictureInPictureParams params = new PictureInPictureParams.Builder()
                            .setAspectRatio(new Rational(portrait ? 9 : 16, portrait ? 16 : 9))
                            .build();
                    enterPictureInPictureMode(params);
                } catch (IllegalStateException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    public CaptioningController getCaptioningController() {
        return captioningController;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopService(new Intent(getApplicationContext(), ForegroundService.class));
        if (broadcastReceiver != null) unregisterReceiver(broadcastReceiver);
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (streamManager != null) {
            streamManager.cleanup();
        }
        if (web != null) {
            try { web.removeJavascriptInterface("Android"); } catch (Exception ignored) {}
            try { web.stopLoading(); } catch (Exception ignored) {}
            try {
                web.loadUrl("about:blank");
                web.clearHistory();
                web.destroy();
            } catch (Exception ignored) {}
            web = null;
        }
        if (captioningController != null) {
            captioningController.destroy();
            captioningController = null;
        }
    }
}
