package com.matr1x.youtubelite.webview;

import android.content.Intent;
import android.net.Uri;

import android.content.Intent;
import android.graphics.Bitmap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.text.TextUtils;
import android.webkit.WebViewClient;

import com.matr1x.youtubelite.ForegroundService;
import com.matr1x.youtubelite.MainActivity;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import android.util.Log;

public class YTProWebViewClient extends WebViewClient {
	
	private final MainActivity activity;
	private final YTProWebView web;
	
	public YTProWebViewClient(MainActivity activity, YTProWebView web) {
		this.activity = activity;
		this.web = web;
	}
	
	@Override
	public void onPageStarted(WebView view, String url, Bitmap favicon) {
		if (activity != null && url != null) activity.currentUrl = url;
		if (activity != null && activity.cameraShim != null && !activity.cameraShimAtDocumentStart) {
			view.evaluateJavascript(activity.cameraShim, null);
		}
		if (activity.getCaptioningController() != null) {
			activity.getCaptioningController().onPageStarted();
		}
		super.onPageStarted(view, url, favicon);
	}
	
	@Override
	public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
		super.doUpdateVisitedHistory(view, url, isReload);
		if (activity.getCaptioningController() != null) {
			activity.getCaptioningController().onHistoryChanged();
		}
	}
	
	@Override
	public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
		String url = request.getUrl().toString();

		if (url.contains("accounts.google.com") ||
    url.contains("myaccount.google.com") ||
    url.contains("accounts.youtube.com") || 
    url.contains("google.com/signin") ||
    url.contains("google.com/oauth") ||
    url.contains("googleapis.com/oauth") ||
    url.contains("/signin") ||              
    url.contains("SetSID")) {             
        return super.shouldInterceptRequest(view, request);
}

		
		if (request.isForMainFrame() && isYouTubeHost(url)) {
			try {
				URL newUrl = new URL(url);
				HttpsURLConnection connection = (HttpsURLConnection) newUrl.openConnection();
				connection.setConnectTimeout(15000);
				connection.setReadTimeout(15000);
				connection.setRequestMethod(request.getMethod());
				
				for (Map.Entry<String, String> header : request.getRequestHeaders().entrySet()) {
					if (!header.getKey().equalsIgnoreCase("Accept-Encoding")) {
						connection.setRequestProperty(header.getKey(), header.getValue());
					}
				}
				
				String cookies = android.webkit.CookieManager.getInstance().getCookie(url);
				if (cookies != null) connection.setRequestProperty("Cookie", cookies);
				
				connection.connect();
				
				Map<String, String> safeHeaders = new HashMap<>();
				for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
					if (entry.getKey() != null) {
						String headerName = entry.getKey().toLowerCase();
						if (!headerName.equals("content-security-policy") && !headerName.equals("content-security-policy-report-only")
							&& !headerName.equals("content-length") && !headerName.equals("content-encoding")
							&& !headerName.equals("transfer-encoding")) {
							safeHeaders.put(entry.getKey(), TextUtils.join(", ", entry.getValue()));
						}
					}
				}
				
				StringBuilder html = new StringBuilder();
				try (InputStream is = connection.getInputStream();
					 BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
					String line;
					while ((line = reader.readLine()) != null) {
						if (line.toLowerCase().contains("content-security-policy")) {
							line = line.replaceAll("<meta.*?http-equiv=[\"']?Content-Security-Policy[\"']?.*?>", "");
						}
						html.append(line).append("\n");
					}
				}
				int status = connection.getResponseCode();
				connection.disconnect();
				InputStream modifiedHtmlStream = new ByteArrayInputStream(html.toString().getBytes("UTF-8"));
				return new WebResourceResponse("text/html", "utf-8", status, "OK", safeHeaders, modifiedHtmlStream);
				
			} catch (Exception e) {
				return super.shouldInterceptRequest(view, request);
			}
		}
		
		
		if (url.startsWith("https://www.google.com/js/") || 
		url.startsWith("https://www.google.com/recaptcha/") ||
		url.startsWith("https://www.google.com/js/th/")) {
			
			try {
				HttpsURLConnection conn = (HttpsURLConnection) new URL(url).openConnection();
				conn.setRequestProperty("User-Agent", request.getRequestHeaders().get("User-Agent"));
				conn.setRequestProperty("Referer", "https://www.youtube.com/");
				conn.setInstanceFollowRedirects(true);
				conn.setConnectTimeout(10000);
				conn.setReadTimeout(10000);
				conn.connect();
				
				String mimeType = conn.getContentType();
				String encoding = conn.getContentEncoding();
				if (encoding == null) encoding = "utf-8";
				if (mimeType == null) mimeType = "application/javascript";
				
				Map<String, String> headers = new HashMap<>();
				headers.put("Access-Control-Allow-Origin", "*");
				headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
				headers.put("Access-Control-Allow-Headers", "*");
				headers.put("Cross-Origin-Resource-Policy", "cross-origin");
				
				return new WebResourceResponse(
				mimeType, encoding,
				conn.getResponseCode(), "OK",
				headers, conn.getInputStream()
				);
				
			} catch (Exception e) {
				Log.e("YTPRO_WVC", "Google JS fetch failed: " + e.getMessage());
			}
		}
		
		
		if (url.contains("youtube.com/ytpro_cdn/npm/ytpro")) {
			try {
				String assetName = "script.js";
				if (url.contains("bgplay.js")) assetName = "bgplay.js";
				else if (url.contains("innertube.js")) assetName = "innertube.js";
				else if (url.contains("constants.js")) assetName = "constants.js";
				InputStream localStream = activity.getAssets().open(assetName);
				Map<String, String> localHeaders = new HashMap<>();
				localHeaders.put("Access-Control-Allow-Origin", "*");
				localHeaders.put("Content-Type", "application/javascript");
				localHeaders.put("Cache-Control", "no-store, no-cache, must-revalidate");
				localHeaders.put("Pragma", "no-cache");
				return new WebResourceResponse("application/javascript", "utf-8", 200, "OK", localHeaders, localStream);
			} catch (Exception e) {
				Log.e("YTPRO_WVC", "Local YTPRO script failed, falling back to CDN: " + e.getMessage());
			}
		}

		if (url.contains("youtube.com/ytpro_cdn/")) {
			String modifiedUrl = url;
			if (url.contains("youtube.com/ytpro_cdn/esm")) modifiedUrl = url.replace("youtube.com/ytpro_cdn/esm", "esm.sh");
			else if (url.contains("youtube.com/ytpro_cdn/npm")) modifiedUrl = url.replace("youtube.com/ytpro_cdn", "cdn.jsdelivr.net");
			
			try {
				URL newUrl = new URL(modifiedUrl);
				HttpsURLConnection connection = (HttpsURLConnection) newUrl.openConnection();
                
				connection.setUseCaches(false);
                connection.setDefaultUseCaches(false);
                connection.addRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
                connection.addRequestProperty("Pragma", "no-cache");
                connection.addRequestProperty("Expires", "0");
                connection.setRequestProperty("User-Agent", "YTPRO");
                connection.setRequestProperty("Accept", "**");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                
                connection.setRequestMethod("GET");
				connection.connect();
				
				String mimeType = connection.getContentType() != null ? connection.getContentType() : "application/javascript";
				String encoding = connection.getContentEncoding() != null ? connection.getContentEncoding() : "utf-8";
				
				if (encoding == null) encoding = "utf-8";
                String contentType = connection.getContentType();
                if (contentType == null) {
                    contentType = "application/javascript";
                }

                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                headers.put("Access-Control-Allow-Headers", "*");
                headers.put("Content-Type", contentType);
                headers.put("Access-Control-Allow-Credentials", "true");
                headers.put("Cross-Origin-Resource-Policy", "cross-origin");
                
                
				if (request.getMethod().equals("OPTIONS")) {
					return new WebResourceResponse("text/plain", "UTF-8", 204, "No Content", headers, null);
				}
				
				return new WebResourceResponse(mimeType, encoding, connection.getResponseCode(), "OK", headers, connection.getInputStream());
			} catch (Exception e) {
				return super.shouldInterceptRequest(view, request);
			}
		}
		
		return super.shouldInterceptRequest(view, request);
	}
	
	private static boolean isYouTubeHost(String url) {
		try {
			String h = Uri.parse(url).getHost();
			if (h == null) return false;
			h = h.toLowerCase();
			return h.equals("youtube.com") || h.endsWith(".youtube.com");
		} catch (Exception e) {
			return false;
		}
	}

	@Override
	public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
		return handleUrl(view, request.getUrl());
	}

	@Override
	public boolean shouldOverrideUrlLoading(WebView view, String url) {
		return handleUrl(view, Uri.parse(url));
	}

	private boolean handleUrl(WebView view, Uri uri) {
		try {
			String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
			if (host.equals("m.youtube.com") || host.equals("www.youtube.com") || host.equals("youtube.com")
					|| host.endsWith(".youtube.com") || host.equals("youtu.be")
					|| host.equals("youtube-nocookie.com") || host.endsWith(".youtube-nocookie.com")
					|| host.equals("accounts.google.com") || host.equals("myaccount.google.com")
					|| host.equals("consent.youtube.com")) {
				return false;
			}
			// A Google redirect that points at a YouTube video stays inside the app.
			if (host.equals("google.com") || host.endsWith(".google.com")) {
				for (String p : new String[]{"q", "url", "u"}) {
					String target = uri.getQueryParameter(p);
					if (target != null && isYouTubeUrl(target)) {
						view.loadUrl(target);
						return true;
					}
				}
			}
			Intent i = new Intent(Intent.ACTION_VIEW, uri);
			i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
			activity.startActivity(i);
		} catch (Exception ignored) {
		}
		return true;
	}

	private static boolean isYouTubeUrl(String url) {
		try {
			String h = Uri.parse(url).getHost();
			if (h == null) return false;
			h = h.toLowerCase();
			return h.equals("youtu.be") || h.equals("youtube.com") || h.endsWith(".youtube.com")
					|| h.equals("youtube-nocookie.com") || h.endsWith(".youtube-nocookie.com");
		} catch (Exception e) {
			return false;
		}
	}

	private String readAsset(String name) {
		try (java.io.InputStream in = activity.getAssets().open(name);
			 java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
			byte[] buf = new byte[4096];
			int n;
			while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
			return out.toString("UTF-8");
		} catch (Exception e) {
			return "";
		}
	}

	@Override
	public void onPageFinished(WebView view, String url) {
		if (isYouTubeHost(url)) {
			web.evaluateJavascript("if (window.trustedTypes && window.trustedTypes.createPolicy && !window.trustedTypes.defaultPolicy) {window.trustedTypes.createPolicy('default', {createHTML: (string) => string,createScriptURL: string => string, createScript: string => string, });}", null);
			String consts = readAsset("constants.js");
			if (!consts.isEmpty()) web.evaluateJavascript(consts, null);
			web.evaluateJavascript("(function () { var script = document.createElement('script'); script.src='https://youtube.com/ytpro_cdn/npm/ytpro@latest?v=' + Date.now(); document.body.appendChild(script);  })();", null);
			web.evaluateJavascript("(function () { var script = document.createElement('script'); script.src='https://youtube.com/ytpro_cdn/npm/ytpro@latest/bgplay.js?v=' + Date.now(); document.body.appendChild(script);  })();", null);
			web.evaluateJavascript("(function () { var script = document.createElement('script');script.type='module';script.src='https://youtube.com/ytpro_cdn/npm/ytpro@latest/innertube.js?v=' + Date.now(); document.body.appendChild(script);  })();", null);
		}
		
		
		
		
		if (!url.contains("youtube.com/watch") && !url.contains("youtube.com/shorts") && activity.isPlaying) {
			activity.isPlaying = false;
			activity.mediaSession = false;
			activity.stopService(new Intent(activity.getApplicationContext(), ForegroundService.class));
		}
		if (activity.getCaptioningController() != null) {
			activity.getCaptioningController().onPageFinished();
		}
		super.onPageFinished(view, url);
	}
}
