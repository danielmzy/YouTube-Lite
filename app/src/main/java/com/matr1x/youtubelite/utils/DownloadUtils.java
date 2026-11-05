package com.matr1x.youtubelite.utils;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.widget.Toast;

import com.matr1x.youtubelite.R;

import java.io.File;

public class DownloadUtils {

    public static String downloadFile(Activity activity, String filename, String url, String mtype) {
        if (url == null || (!url.startsWith("http://") && !url.startsWith("https://"))) {
            toast(activity, "Invalid download URL");
            return null;
        }

        if (Build.VERSION.SDK_INT > 22 && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                && activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_DENIED) {
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, R.string.grant_storage, Toast.LENGTH_SHORT).show();
                activity.requestPermissions(new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE}, 1);
            });
            return null;
        }

        try {
            DownloadManager downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                toast(activity, "Download manager unavailable");
                return null;
            }

            String safeName = sanitizeFileName(filename);
            String uniqueName = uniqueFileName(safeName);
            String destination = DownloadPaths.relativeDir() + "/" + uniqueName;

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(safeName)
                   .setDescription(safeName)
                   .setMimeType(mtype)
                   .setAllowedOverMetered(true)
                   .setAllowedOverRoaming(true)
                   .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, destination)
                   .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE
                           | DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

            downloadManager.enqueue(request);
            toast(activity, activity.getString(R.string.dl_started));
            return uniqueName;
        } catch (Exception e) {
            toast(activity, "Download failed: " + e.getMessage());
            return null;
        }
    }

    private static String sanitizeFileName(String filename) {
        String name = filename == null ? "" : filename;
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (name.isEmpty()) name = "video";
        if (name.length() > 120) name = name.substring(0, 120);
        return name;
    }

    private static String uniqueFileName(String name) {
        File dir = DownloadPaths.dir();
        if (!new File(dir, name).exists()) return name;

        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int i = 1; i < 1000; i++) {
            String next = base + " (" + i + ")" + ext;
            if (!new File(dir, next).exists()) return next;
        }
        return name;
    }

    private static void toast(Activity activity, String msg) {
        activity.runOnUiThread(() -> Toast.makeText(activity, msg, Toast.LENGTH_SHORT).show());
    }
}
