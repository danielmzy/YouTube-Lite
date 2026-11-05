package com.matr1x.youtubelite.webview;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
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


public class BinaryStreamManager {

    private final YTProWebView webView;
    private final Context context;
    private final ExecutorService ioExecutor = Executors.newFixedThreadPool(2);

    // API 29+ path: store OutputStreams and their URIs
    private final ConcurrentHashMap<String, OutputStream> fileStreams = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Uri> fileUris = new ConcurrentHashMap<>();

    // API 21-28 path: keep FileOutputStream separately
    private final ConcurrentHashMap<String, FileOutputStream> legacyStreams = new ConcurrentHashMap<>();

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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    OutputStream os = fileStreams.remove(fileName);
                    if (os != null) {
                        os.flush();
                        os.close();
                    }
                    fileUris.remove(fileName);
                } else {
                    FileOutputStream fos = legacyStreams.remove(fileName);
                    if (fos != null) {
                        fos.flush();
                        fos.close();
                    }
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

    // Returns the Uri for a file already written by this app (for muxer input)
    public Uri getUriForFile(String fileName) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return fileUris.get(fileName);
        }
        return null;
    }

    private String getMimeType(String fileName) {
        if (fileName.endsWith(".webm")) return "video/webm";
        if (fileName.endsWith(".mp4"))  return "video/mp4";
        if (fileName.endsWith(".m4a"))  return "audio/mp4";
        if (fileName.endsWith(".opus")) return "audio/ogg";
        return "application/octet-stream";
    }

    public void cleanup() {
        for (OutputStream os : fileStreams.values()) {
            try { os.flush(); os.close(); } catch (Exception ignored) {}
        }
        for (FileOutputStream fos : legacyStreams.values()) {
            try { fos.flush(); fos.close(); } catch (Exception ignored) {}
        }
        // Streams still registered here never received an END: delete the
        // partially written entries instead of leaving broken visible files.
        for (Uri uri : fileUris.values()) {
            try { context.getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
        }
        fileStreams.clear();
        legacyStreams.clear();
        fileUris.clear();
        for (ExecutorService w : writers.values()) {
            try { w.shutdown(); } catch (Exception ignored) {}
        }
        writers.clear();
        ioExecutor.shutdown();
    }
}
