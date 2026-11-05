package com.matr1x.youtubelite.webview;

import android.Manifest;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;

// Import the main files from the parent package
import com.matr1x.youtubelite.MainActivity;

public class YTProWebChromeClient extends WebChromeClient {
    private final MainActivity activity;
    private final YTProWebView web;
    private PermissionRequest pendingPermissionRequest;
    
    private View mCustomView;
    private WebChromeClient.CustomViewCallback mCustomViewCallback;
    private int mOriginalOrientation;
    private int mOriginalSystemUiVisibility;

    public YTProWebChromeClient(MainActivity activity, YTProWebView web) {
        this.activity = activity;
        this.web = web;
    }

    @Override
    public Bitmap getDefaultVideoPoster() {
        // Placeholder drawn before the first frame is decoded. Null makes the WebView
        // fall back to its built-in transparent poster. The hardcoded id 2130837573
        // no longer exists in this project's resource table, so decoding it throws
        // Resources.NotFoundException on the UI thread.
        return null;
    }

    @Override
    public void onShowCustomView(View paramView, WebChromeClient.CustomViewCallback viewCallback) {
        // 1. Determine orientation for FULL SCREEN
        mOriginalOrientation = activity.portrait ?
                android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT :
                android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE;

        if (activity.isPip) mOriginalOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            activity.getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
            WindowManager.LayoutParams params = activity.getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            activity.getWindow().setAttributes(params);
        }

        if (mCustomView != null) {
            onHideCustomView();
            return;
        }

        mCustomView = paramView;
        mOriginalSystemUiVisibility = activity.getWindow().getDecorView().getSystemUiVisibility();
        
        // 2. Set the activity to full screen orientation (Landscape usually)
        activity.setRequestedOrientation(mOriginalOrientation);
        
        // Store portrait so onHideCustomView knows what to go back to
        mOriginalOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;

        mCustomViewCallback = viewCallback;
        ((FrameLayout) activity.getWindow().getDecorView()).addView(mCustomView, new FrameLayout.LayoutParams(-1, -1));
        activity.getWindow().getDecorView().setSystemUiVisibility(3846);
    }

    @Override
    public void onHideCustomView() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
            WindowManager.LayoutParams params = activity.getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
            activity.getWindow().setAttributes(params);
        }

        ((FrameLayout) activity.getWindow().getDecorView()).removeView(mCustomView);
        mCustomView = null;
        activity.getWindow().getDecorView().setSystemUiVisibility(mOriginalSystemUiVisibility);
        
        // 3. Set the activity BACK to the orientation saved right after going full screen (Portrait)
        activity.setRequestedOrientation(mOriginalOrientation);
        
        // Reset state for the next time we enter full screen
        mOriginalOrientation = activity.portrait ?
                android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT :
                android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE;

        mCustomViewCallback = null;
        web.clearFocus();
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        boolean fromYouTube = false;
        try {
            String host = request.getOrigin() == null ? null : Uri.parse(request.getOrigin().toString()).getHost();
            fromYouTube = host != null && (host.equals("youtube.com") || host.endsWith(".youtube.com"));
        } catch (Exception ignored) {}
        if (!fromYouTube) {
            request.deny();
            return;
        }

        boolean wantsAudio = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                wantsAudio = true;
                break;
            }
        }
        if (!wantsAudio) {
            request.deny();
            return;
        }

        if (Build.VERSION.SDK_INT > 22
                && activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingPermissionRequest = request;
            activity.runOnUiThread(() -> activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 101));
            return;
        }
        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
    }

    /** Called by the activity once the RECORD_AUDIO permission dialog has been answered. */
    public void grantPendingPermission() {
        PermissionRequest request = pendingPermissionRequest;
        pendingPermissionRequest = null;
        if (request == null) return;
        if (Build.VERSION.SDK_INT <= 22
                || activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            request.deny();
        }
    }
}