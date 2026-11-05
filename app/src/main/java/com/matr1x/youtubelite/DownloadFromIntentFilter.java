package com.matr1x.youtubelite;

/**
 * Second launcher entry for the system share sheet ("Download", label = @string/dl
 * in AndroidManifest.xml). The UI is deliberately identical to {@link MainActivity}:
 * the shared link / ACTION_SEND text is already resolved by
 * {@code MainActivity.load()} from {@code getIntent()}, so nothing has to be
 * overridden here.
 *
 * <p>Do not override {@code onCreate()} in this class. A previous version called
 * {@code setContentView()} + {@code load(true)} on top of the ones MainActivity had
 * already run, which created a second WebView while CaptioningController, the
 * broadcast receiver, the back-navigation callback and BinaryStreamManager kept
 * pointing at the first one (so caption/quality injection silently targeted a
 * detached WebView) and leaked the superseded instances.</p>
 */
public class DownloadFromIntentFilter extends MainActivity {
}
