package com.matr1x.youtubelite.utils;

import android.os.Environment;

import java.io.File;

/**
 * Central place for the downloads root and the per-video sub folder.
 *
 * Every download of one video (video track, audio track, captions, thumbnail)
 * is stored in Download/Youtube Lite/&lt;video title&gt;/ so that all assets of the
 * same video live together. The active folder is set from JS right before a
 * download starts.
 *
 * <p>See ENGINEERING.md section 6.5 for the full flow.</p>
 */
public final class DownloadPaths {

    public static final String ROOT = "Youtube Lite";

    private static volatile String folder = "";

    private DownloadPaths() {}

    public static void setFolder(String title) {
        String s = title == null ? "" : title.trim();
        s = s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (s.length() > 80) s = s.substring(0, 80).trim();
        folder = s;
    }

    public static String folder() {
        return folder;
    }

    /** "Youtube Lite" or "Youtube Lite/&lt;folder&gt;". */
    public static String relativeDir() {
        String f = folder;
        return f.isEmpty() ? ROOT : ROOT + "/" + f;
    }

    /** "Download/Youtube Lite/&lt;folder&gt;" — value used by MediaStore.RELATIVE_PATH. */
    public static String mediaDir() {
        return "Download/" + relativeDir();
    }

    /** Absolute directory under the public Downloads folder. */
    public static File dir() {
        return new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                relativeDir());
    }

    private static String sanitizeFolder(String title) {
        String s = title == null ? "" : title.trim();
        s = s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (s.length() > 80) s = s.substring(0, 80).trim();
        return s;
    }

    /** "Youtube Lite" or "Youtube Lite/&lt;title&gt;" without touching the active folder. */
    public static String relativeDirFor(String title) {
        String f = sanitizeFolder(title);
        return f.isEmpty() ? ROOT : ROOT + "/" + f;
    }

    public static String mediaDirFor(String title) {
        return "Download/" + relativeDirFor(title);
    }

    /** Absolute directory for a specific video title. */
    public static File dirFor(String title) {
        return new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                relativeDirFor(title));
    }
}
