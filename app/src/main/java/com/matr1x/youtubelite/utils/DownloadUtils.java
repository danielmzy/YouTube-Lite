package com.matr1x.youtubelite.utils;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.widget.Toast;

import com.matr1x.youtubelite.R;

import java.io.File;

/** DownloadManager helpers: queue, progress, filename sanitizing, uniqueness. *
 * <p>See ENGINEERING.md section 6.4 for the full flow.</p>
 */
public class DownloadUtils {

    /** Enqueue a download and return its DownloadManager id (-1 on failure). */
    public static long enqueue(Activity activity, String filename, String url, String mtype, String[] nameOut) {
        if (url == null || (!url.startsWith("http://") && !url.startsWith("https://"))) {
            toast(activity, "Invalid download URL");
            return -1;
        }

        if (Build.VERSION.SDK_INT > 22 && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                && activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_DENIED) {
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, R.string.grant_storage, Toast.LENGTH_SHORT).show();
                activity.requestPermissions(new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE}, 1);
            });
            return -1;
        }

        try {
            DownloadManager downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                toast(activity, "Download manager unavailable");
                return -1;
            }

            String safeName = sanitizeFileName(filename);
            String uniqueName = uniqueFileName(safeName);
            if (nameOut != null && nameOut.length > 0) nameOut[0] = uniqueName;
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

            long id = downloadManager.enqueue(request);
            toast(activity, activity.getString(R.string.dl_started));
            return id;
        } catch (Exception e) {
            toast(activity, "Download failed: " + e.getMessage());
            return -1;
        }
    }

    public static String downloadFile(Activity activity, String filename, String url, String mtype) {
        String[] out = new String[1];
        long id = enqueue(activity, filename, url, mtype, out);
        return id < 0 ? null : out[0];
    }

    /** STATUS_* of a DownloadManager item, or -1 when unknown. */
    public static int statusOf(long id, DownloadManager dm) {
        if (dm == null) return -1;
        try (Cursor c = dm.query(new DownloadManager.Query().setFilterById(id))) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
                return idx >= 0 ? c.getInt(idx) : -1;
            }
        } catch (Exception ignored) {
        }
        return -1;
    }

    public static String sanitizeFileName(String filename) {
        String name = filename == null ? "" : filename;
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (name.isEmpty()) name = "video";
        int dot = name.lastIndexOf('.');
        String ext = (dot > 0 && name.length() - dot <= 8) ? name.substring(dot) : "";
        String base = ext.isEmpty() ? name : name.substring(0, dot);
        if (base.length() + ext.length() > 120) {
            int keep = Math.max(1, 120 - ext.length());
            base = base.substring(0, keep);
        }
        return base.trim() + ext;
    }

    public static synchronized String uniqueFileName(String name) {
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
