package com.matr1x.youtubelite.webview;

import android.app.DownloadManager;
import android.app.PictureInPictureParams;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.Uri;
import android.provider.Settings;
import android.provider.MediaStore;
import android.database.Cursor;
import android.content.ContentUris;
import android.util.Rational;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.File;
import android.Manifest;

import android.os.Build;
import android.os.Environment;
import androidx.webkit.WebViewFeature;

import com.matr1x.youtubelite.ForegroundService;
import com.matr1x.youtubelite.GeminiWrapper;
import com.matr1x.youtubelite.MainActivity;
import com.matr1x.youtubelite.R;
import com.matr1x.youtubelite.utils.DownloadUtils;
import com.matr1x.youtubelite.utils.DownloadPaths;
import com.matr1x.youtubelite.utils.MediaMuxerUtils;

import org.json.JSONObject;

public class WebAppInterface {
	private final MainActivity activity;
	private final YTProWebView web;
	private final AudioManager audioManager;
	
	private String icon = "";
	private String title = "";
	private String subtitle = "";
	private long duration;
	
	public WebAppInterface(MainActivity activity, YTProWebView web) {
		this.activity = activity;
		this.web = web;
		this.audioManager = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
	}
	
	@JavascriptInterface
	public void splashReady() {
		activity.runOnUiThread(activity::hideSplash);
	}

	@JavascriptInterface
	public void showToast(String txt) {
		activity.runOnUiThread(() -> Toast.makeText(activity.getApplicationContext(), txt, Toast.LENGTH_SHORT).show());
	}
	
	@JavascriptInterface
	public void gohome(String x) {
		Intent startMain = new Intent(Intent.ACTION_MAIN);
		startMain.addCategory(Intent.CATEGORY_HOME);
		startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
		activity.startActivity(startMain);
	}
	
	@JavascriptInterface
	public void downvid(String name, String url, String m) {
		String saved = DownloadUtils.downloadFile(activity, name, url, m);
		if (saved == null) return;
		try {
			final String js = "window.ytdlAddHistory&&ytdlAddHistory(" + JSONObject.quote(saved) + "," + JSONObject.quote(name == null ? saved : name) + ",\"\")";
			activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
		} catch (Exception ignored) {
		}
	}
	
	@JavascriptInterface
	public String apkDownload(String url, String name) {
		if (url == null || (!url.startsWith("http://") && !url.startsWith("https://"))) return "";
		try {
			DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
			if (dm == null) return "";
			String safe = DownloadUtils.sanitizeFileName(name == null ? "YouTubeLite-update.apk" : name);
			if (!safe.toLowerCase().endsWith(".apk")) safe = safe + ".apk";
			String unique = DownloadUtils.uniqueFileName(safe);
			String dest = DownloadPaths.relativeDir() + "/" + unique;
			DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
			req.setTitle(unique).setDescription(unique)
				.setMimeType("application/vnd.android.package-archive")
				.setAllowedOverMetered(true).setAllowedOverRoaming(true)
				.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, dest)
				.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE
						| DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
			long id = dm.enqueue(req);
			return String.valueOf(id);
		} catch (Exception e) {
			return "";
		}
	}

	@JavascriptInterface
	public String apkProgress(String idStr) {
		try {
			long id = Long.parseLong(idStr);
			DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
			if (dm == null) return "{\"status\":-1}";
			DownloadManager.Query q = new DownloadManager.Query().setFilterById(id);
			try (Cursor c = dm.query(q)) {
				if (c == null || !c.moveToFirst()) return "{\"status\":-1}";
				int st = c.getInt(c.getColumnIndex(DownloadManager.COLUMN_STATUS));
				long done = c.getLong(c.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
				long total = c.getLong(c.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
				int reason = c.getInt(c.getColumnIndex(DownloadManager.COLUMN_REASON));
				return "{\"status\":" + st + ",\"done\":" + done + ",\"total\":" + total + ",\"reason\":" + reason + "}";
			}
		} catch (Exception e) {
			return "{\"status\":-1}";
		}
	}

	@JavascriptInterface
	public boolean installApk(String idStr) {
		try {
			final long id = Long.parseLong(idStr);
			if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
				activity.runOnUiThread(() -> {
					Toast.makeText(activity, "Allow installing unknown apps for YouTube Lite, then tap Install again", Toast.LENGTH_LONG).show();
					try {
						Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()));
						i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
						activity.startActivity(i);
					} catch (Exception ignored) {}
				});
				return false;
			}
			DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
			if (dm == null) return false;
			Uri uri = dm.getUriForDownloadedFile(id);
			if (uri == null) return false;
			Intent view = new Intent(Intent.ACTION_VIEW)
				.setDataAndType(uri, "application/vnd.android.package-archive")
				.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
			activity.startActivity(view);
			return true;
		} catch (Exception e) {
			return false;
		}
	}

	@JavascriptInterface
	public void fullScreen(boolean value) {
		activity.portrait = value;
	}
	
	@JavascriptInterface
	public void oplink(String url) {
		Intent i = new Intent(Intent.ACTION_VIEW);
		i.setData(Uri.parse(url));
		activity.startActivity(i);
	}
	
	@JavascriptInterface
	public String getInfo() {
		try {
			PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), PackageManager.GET_ACTIVITIES);
			return info.versionName;
		} catch (Exception e) {
			return "1.0";
		}
	}
	@JavascriptInterface
	public boolean isWebViewSupported() {
		return WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_ARRAY_BUFFER);
	}
	
	@JavascriptInterface
	public boolean hasStoragePermission() {
		if (Build.VERSION.SDK_INT > 22 && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
			boolean granted = activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
					&& activity.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
			if (!granted) {
				// Requesting permissions must happen on the UI thread (this runs on the JS bridge thread).
				activity.runOnUiThread(() -> {
					Toast.makeText(activity, R.string.grant_storage, Toast.LENGTH_SHORT).show();
					activity.requestPermissions(new String[]{
							Manifest.permission.WRITE_EXTERNAL_STORAGE,
							Manifest.permission.READ_EXTERNAL_STORAGE}, 1);
				});
			}
			return granted;
		}
		return true;
	}
	
	@JavascriptInterface
	public void setDownloadFolder(String title) {
		DownloadPaths.setFolder(title);
	}

	@JavascriptInterface
	public void requestBinaryPort(String fileName) {
		activity.runOnUiThread(() -> {
			if (activity.streamManager != null) {
				activity.streamManager.openStreamForFile(fileName);
			}
		});
	}
	
	@JavascriptInterface
	public void muxVideoAudio(String videoFileName,String audioFileName,String outputFileName) {
		java.io.File downloads = DownloadPaths.dir();
		java.io.File cache = new java.io.File(activity.getCacheDir(), "ytpro_dl");
		java.io.File video  = new java.io.File(cache, videoFileName);
		java.io.File audio  = new java.io.File(cache, audioFileName);
		
		java.io.File output = new java.io.File(downloads, outputFileName);
		
		MediaMuxerUtils.muxVideoAudio(activity.getApplicationContext(), video, audio, output, new MediaMuxerUtils.MuxCallback() {
			@Override
			public void onSuccess(File output) {
				String js = "window.ytdlOnMuxDone&&ytdlOnMuxDone(" + JSONObject.quote(output.getName()) + ", \"\")";
				activity.runOnUiThread(() -> {
					Toast.makeText(activity, "Done: " + output.getName(), Toast.LENGTH_SHORT).show();
					web.evaluateJavascript(js, null);
				});
			}
			
			@Override
			public void onFailure(Exception e) {
				String msg = e.getMessage() == null ? "mux failed" : e.getMessage();
				String js = "window.ytdlOnMuxDone&&ytdlOnMuxDone(" + JSONObject.quote(output.getName()) + ", " + JSONObject.quote(msg) + ")";
				activity.runOnUiThread(() -> {
					Toast.makeText(activity, "Failed: " + msg, Toast.LENGTH_SHORT).show();
					web.evaluateJavascript(js, null);
				});
			}
		});
	}
	
	@JavascriptInterface
	public boolean openDownloadedFile(String displayName) {
		try {
			if (displayName == null || displayName.isEmpty()) return false;
			if (Build.VERSION.SDK_INT >= 29) {
				Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL);
				String[] projection = { MediaStore.Downloads._ID, MediaStore.Downloads.MIME_TYPE };
				try (Cursor cursor = activity.getContentResolver().query(collection, projection,
						MediaStore.Downloads.DISPLAY_NAME + "=? AND "
								+ MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
						new String[]{ displayName, "Download/Youtube Lite%" }, null)) {
					if (cursor != null && cursor.moveToFirst()) {
						long id = cursor.getLong(0);
						String mime = cursor.isNull(1) ? null : cursor.getString(1);
						if (mime == null || mime.isEmpty()) mime = "*/*";
						Uri fileUri = ContentUris.withAppendedId(collection, id);
						Intent view = new Intent(Intent.ACTION_VIEW)
								.setDataAndType(fileUri, mime)
								.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
						activity.startActivity(view);
						return true;
					}
				}
			}
		} catch (Exception ignored) {
		}
		return false;
	}
	
	@JavascriptInterface
	public boolean shareDownloadedFile(String displayName) {
		try {
			Uri fileUri = findDownloadedFile(displayName);
			if (fileUri == null) return false;
			String mime = activity.getContentResolver().getType(fileUri);
			if (mime == null || mime.isEmpty()) mime = "*/*";
			Intent send = new Intent(Intent.ACTION_SEND)
					.setType(mime)
					.putExtra(Intent.EXTRA_STREAM, fileUri)
					.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
			activity.startActivity(Intent.createChooser(send, "Share file"));
			return true;
		} catch (Exception ignored) {
			return false;
		}
	}

	@JavascriptInterface
	public boolean deleteDownloadedFile(String displayName) {
		try {
			if (displayName == null || displayName.isEmpty()) return false;
			if (Build.VERSION.SDK_INT >= 29) {
				Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL);
				int deleted = activity.getContentResolver().delete(collection,
						MediaStore.Downloads.DISPLAY_NAME + "=? AND "
								+ MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
						new String[]{ displayName, "Download/Youtube Lite%" });
				return deleted > 0;
			}
		} catch (Exception ignored) {
		}
		return false;
	}

	private Uri findDownloadedFile(String displayName) {
		try {
			if (displayName == null || displayName.isEmpty()) return null;
			if (Build.VERSION.SDK_INT >= 29) {
				Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL);
				String[] projection = { MediaStore.Downloads._ID };
				try (Cursor cursor = activity.getContentResolver().query(collection, projection,
						MediaStore.Downloads.DISPLAY_NAME + "=? AND "
								+ MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
						new String[]{ displayName, "Download/Youtube Lite%" }, null)) {
					if (cursor != null && cursor.moveToFirst()) {
						return ContentUris.withAppendedId(collection, cursor.getLong(0));
					}
				}
			}
		} catch (Exception ignored) {
		}
		return null;
	}

	@JavascriptInterface
	public void setBgPlay(boolean bgplay) {
		activity.getSharedPreferences("YTPRO", Context.MODE_PRIVATE).edit().putBoolean("bgplay", bgplay).apply();
	}
	
	@JavascriptInterface
	public void bgStart(String iconn, String titlen, String subtitlen, long dura) {
		icon = iconn; title = titlen; subtitle = subtitlen; duration = dura;
		activity.isPlaying = true; activity.mediaSession = true;
		
		Intent intent = new Intent(activity.getApplicationContext(), ForegroundService.class);
		intent.putExtra("icon", icon); intent.putExtra("title", title);
		intent.putExtra("subtitle", subtitle); intent.putExtra("duration", duration);
		intent.putExtra("currentPosition", 0); intent.putExtra("action", "play");
		try {
			if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(intent);
			else activity.startService(intent);
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	@JavascriptInterface
	public void bgUpdate(String iconn, String titlen, String subtitlen, long dura) {
		icon = iconn; title = titlen; subtitle = subtitlen; duration = dura;
		activity.isPlaying = true;
		sendUpdateBroadcast(0, "play");
	}
	
	@JavascriptInterface
	public void bgStop() {
		activity.isPlaying = false; activity.mediaSession = false;
		activity.stopService(new Intent(activity.getApplicationContext(), ForegroundService.class));
	}
	
	@JavascriptInterface
	public void bgPause(long ct) {
		activity.isPlaying = false;
		sendUpdateBroadcast(ct, "pause");
	}
	
	@JavascriptInterface
	public void bgPlay(long ct) {
		activity.isPlaying = true;
		sendUpdateBroadcast(ct, "play");
	}
	
	@JavascriptInterface
	public void bgBuffer(long ct) {
		activity.isPlaying = true;
		sendUpdateBroadcast(ct, "buffer");
	}
	
	private void sendUpdateBroadcast(long ct, String action) {
		activity.sendBroadcast(new Intent("UPDATE_NOTIFICATION")
		.setPackage(activity.getPackageName())
		.putExtra("icon", icon).putExtra("title", title)
		.putExtra("subtitle", subtitle).putExtra("duration", duration)
		.putExtra("currentPosition", ct).putExtra("action", action));
	}
	
	@JavascriptInterface
	public void getSNlM0e(String cookies) {
		new Thread(() -> {
			String response = GeminiWrapper.getSNlM0e(cookies);
			activity.runOnUiThread(() -> web.evaluateJavascript("callbackSNlM0e.resolve(`" + response + "`)", null));
		}).start();
	}
	
	@JavascriptInterface
	public void GeminiClient(String url, String headers, String body) {
		new Thread(() -> {
			JSONObject response = GeminiWrapper.getStream(url, headers, body);
			activity.runOnUiThread(() -> web.evaluateJavascript("callbackGeminiClient.resolve(" + response + ")", null));
		}).start();
	}
	
	@JavascriptInterface
	public String getAllCookies(String url) {
		return CookieManager.getInstance().getCookie(url);
	}
	
	@JavascriptInterface
	public float getVolume() {
		int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
		int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
		return (float) currentVolume / maxVolume;
	}
	
	@JavascriptInterface
	public void setVolume(float volume) {
		int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
		audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (int) (max * volume), 0);
	}
	
	@JavascriptInterface
	public float getBrightness() {
		try {
			return (Settings.System.getInt(activity.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS) / 255f) * 100f;
		} catch (Settings.SettingNotFoundException e) {
			return 50f;
		}
	}
	
	@JavascriptInterface
	public void setBrightness(final float brightnessValue) {
		activity.runOnUiThread(() -> {
			float brightness = Math.max(0f, Math.min(brightnessValue, 1f));
			WindowManager.LayoutParams layout = activity.getWindow().getAttributes();
			layout.screenBrightness = brightness;
			activity.getWindow().setAttributes(layout);
		});
	}
	
	@JavascriptInterface
	public void pipvid(String mode) {
		if (android.os.Build.VERSION.SDK_INT >= 26) {
			try {
				PictureInPictureParams params = new PictureInPictureParams.Builder()
				.setAspectRatio(new Rational(mode.equals("portrait") ? 9 : 16, mode.equals("portrait") ? 16 : 9))
				.build();
				activity.enterPictureInPictureMode(params);
			} catch (Exception e) { e.printStackTrace(); }
		} else {
			activity.runOnUiThread(() -> Toast.makeText(activity, activity.getString(R.string.no_pip), Toast.LENGTH_SHORT).show());
		}
	}
}
