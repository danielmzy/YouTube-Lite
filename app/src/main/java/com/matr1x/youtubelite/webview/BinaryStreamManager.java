package com.matr1x.youtubelite.webview;

import android.content.Context;
import android.net.Uri;
import android.util.Log;

import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebMessagePortCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.matr1x.youtubelite.utils.DownloadPaths;


/** Writes SABR binary chunks into temporary per-track files. */
public class BinaryStreamManager {

    private final YTProWebView webView;
    private final Context context;

    // Open temporary track streams (cache/ytpro_dl)
    private final ConcurrentHashMap<String, OutputStream> fileStreams = new ConcurrentHashMap<>();

    // One serial writer per file: chunks can never be written out of order,
    // and two downloads of the same name cannot interleave into one stream.
    private final ConcurrentHashMap<String, ExecutorService> writers = new ConcurrentHashMap<>();

    public BinaryStreamManager(YTProWebView webView, Context context) {
        this.webView = webView;
        this.context = context;
    }

    public void openStreamForFile(String rawFileName) {
        final String fileName = new File(rawFileName).getName();
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_ARRAY_BUFFER)) {
            Log.e("YTPRO_STREAM", "ArrayBuffer not supported on this device.");
            return;
        }

        // Temporary tracks are written to the app cache. Writing them into the
        // public Download folder and deleting them after muxing made Huawei's
        // gallery turn those deletions into hidden ".hwbk" recycle files, which
        // left the per-video folder non-empty and impossible to delete.
        try {
            File dir = new File(context.getCacheDir(), "ytpro_dl");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, fileName);
            fileStreams.put(fileName, new FileOutputStream(file));
        } catch (Exception e) {
            Log.e("YTPRO_STREAM", "Failed to open stream: " + e.getMessage());
            return;
        }

        final ExecutorService writer = Executors.newSingleThreadExecutor();
        writers.put(fileName, writer);

        // Safety net: if JS never sends END (page reload/crash), close the stream
        // after 90s so the writer thread and cache file do not leak.
        Thread idle = new Thread(() -> {
            try { Thread.sleep(90000); } catch (InterruptedException e) { return; }
            OutputStream stale = fileStreams.remove(fileName);
            if (stale != null) {
                try { stale.close(); } catch (Exception ignored) {}
                Log.w("YTPRO_STREAM", "Stream idle timeout: " + fileName);
            }
            ExecutorService w = writers.remove(fileName);
            if (w != null) w.shutdown();
        });
        idle.setDaemon(true);
        idle.start();

        WebMessagePortCompat[] channel = WebViewCompat.createWebMessageChannel(webView);
        WebMessagePortCompat localPort = channel[0];
        WebMessagePortCompat jsPort = channel[1];

        localPort.setWebMessageCallback(new WebMessagePortCompat.WebMessageCallbackCompat() {
            @Override
            public void onMessage(WebMessagePortCompat port, WebMessageCompat message) {
                try {
                    writer.execute(() -> handleMessage(port, message, fileName));
                } catch (Exception ignored) {
                    // Writer was already shut down (END received or cleanup ran).
                }
            }
        });

        WebViewCompat.postWebMessage(
                webView,
                new WebMessageCompat("PORT_FOR:" + fileName, new WebMessagePortCompat[]{jsPort}),
                Uri.EMPTY
        );
    }

    private void handleMessage(WebMessagePortCompat port, WebMessageCompat message, String fileName) {
        try {
            if (message.getType() == WebMessageCompat.TYPE_ARRAY_BUFFER) {
                byte[] chunk = message.getArrayBuffer();
                if (chunk == null) return;
                OutputStream os = fileStreams.get(fileName);
                if (os != null) os.write(chunk);
            } else if (message.getType() == WebMessageCompat.TYPE_STRING
                    && "END".equals(message.getData())) {
                OutputStream os = fileStreams.remove(fileName);
                if (os != null) {
                    os.flush();
                    os.close();
                }
                port.close();
                ExecutorService w = writers.remove(fileName);
                if (w != null) w.shutdown();
                Log.d("YTPRO_STREAM", "Stream finished for: " + fileName);
            }
        } catch (Exception e) {
            Log.e("YTPRO_STREAM", "Write/close failed: " + e.getMessage());
        }
    }

    public void cleanup() {
        for (OutputStream os : fileStreams.values()) {
            try { os.flush(); os.close(); } catch (Exception ignored) {}
        }
        fileStreams.clear();
        for (ExecutorService w : writers.values()) {
            try { w.shutdown(); } catch (Exception ignored) {}
        }
        writers.clear();
    }
}
