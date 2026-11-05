package com.matr1x.youtubelite.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.matr1x.youtubelite.webview.YTProWebView;

public class MediaCommandReceiver extends BroadcastReceiver {
    private final YTProWebView web;

    public MediaCommandReceiver(YTProWebView web) {
        this.web = web;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getExtras() == null) return;

        String action = intent.getExtras().getString("actionname");
        if (action == null) return;
        Log.d("YTPRO_MEDIA", "action=" + action);

        switch (action) {
            case "PLAY_ACTION":
                web.evaluateJavascript("playVideo();", null);
                break;
            case "PAUSE_ACTION":
                web.evaluateJavascript("pauseVideo();", null);
                break;
            case "NEXT_ACTION":
                web.evaluateJavascript("playNext();", null);
                break;
            case "PREV_ACTION":
                web.evaluateJavascript("playPrev();", null);
                break;
            case "SEEKTO":
                String pos = intent.getExtras().getString("pos");
                if (pos == null) break;
                long ms;
                try {
                    ms = Long.parseLong(pos.trim());
                } catch (NumberFormatException e) {
                    break;
                }
                web.evaluateJavascript("seekTo('" + ms + "');", null);
                break;
        }
    }
}
