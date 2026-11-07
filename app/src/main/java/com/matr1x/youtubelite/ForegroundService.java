package com.matr1x.youtubelite;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import com.matr1x.youtubelite.receivers.NotificationActionReceiver;

/** Keeps playback alive in the background with a media notification. */
public class ForegroundService extends Service {

    public static final String CHANNEL_ID = "MediaPlayback";
    public static final String ACTION_UPDATE_NOTIFICATION = "UPDATE_NOTIFICATION";
    private NotificationManager notificationManager;
    private BroadcastReceiver updateReceiver;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        initMediaSession();
        registerUpdateReceiver();
        createNotificationChannel();
    }


    private void initMediaSession() {
        mediaSession = new MediaSession(getApplicationContext(), "YTPROMediaSession");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);

        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                super.onPlay();
                getApplicationContext().sendBroadcast(new Intent("TRACKS_TRACKS").setPackage(getPackageName())
                        .putExtra("actionname", "PLAY_ACTION"));
                        Log.e("pause","play session called");

            }

            @Override
            public void onPause() {
                super.onPause();
                getApplicationContext().sendBroadcast(new Intent("TRACKS_TRACKS").setPackage(getPackageName())
                        .putExtra("actionname", "PAUSE_ACTION"));
                        
                        Log.e("pause","pause session called");
            }

            @Override
            public void onSkipToNext() {
                super.onSkipToNext();
// Handle skip to next
                getApplicationContext().sendBroadcast(new Intent("TRACKS_TRACKS").setPackage(getPackageName())
                        .putExtra("actionname", "NEXT_ACTION"));
            }

            @Override
            public void onSkipToPrevious() {
                super.onSkipToPrevious();
// Handle skip to previous

                getApplicationContext().sendBroadcast(new Intent("TRACKS_TRACKS").setPackage(getPackageName())
                        .putExtra("actionname", "PREV_ACTION"));

            }
            @Override
            public void onSeekTo(long pos) {
                super.onSeekTo(pos);
                getApplicationContext().sendBroadcast(new Intent("TRACKS_TRACKS").setPackage(getPackageName())
                        .putExtra("actionname", "SEEKTO").putExtra("pos", pos+""));


            }
        });

        mediaSession.setActive(true);
    }

    private static int pendingImmutable() {
        return Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Background Play",
                    NotificationManager.IMPORTANCE_LOW
            );
            notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                // The legacy channel was created with IMPORTANCE_MIN and its importance can no
                // longer be changed once it exists, so start from a fresh channel id.
                notificationManager.deleteNotificationChannel("Media");
                notificationManager.createNotificationChannel(channel);
            }
        }
    }


    private static Bitmap decodeIcon(String icon) {
        if (icon == null || icon.isEmpty()) return null;
        try {
            byte[] decodedBytes = Base64.decode(icon, Base64.DEFAULT);
            if (decodedBytes == null || decodedBytes.length == 0) return null;
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            Log.e("YTPRO_SERVICE", "Bad notification icon: " + e.getMessage());
            return null;
        }
    }

    public void updateNotification(String icon, String title, String subtitle, String action, long duration, long currentPosition) {

        Context cont=getApplicationContext();

        Bitmap largeIcon = decodeIcon(icon);


        int playbackState;
        if("pause".equals(action)){
            playbackState= PlaybackState.STATE_PAUSED;
        }
        else if("play".equals(action)){
            playbackState= PlaybackState.STATE_PLAYING;
        }else{
            playbackState= PlaybackState.STATE_BUFFERING;
        }

        updateMediaSessionMetadata(title, subtitle, largeIcon, duration); 
        updatePlaybackState(currentPosition, playbackState); 

        Intent openAppIntent = new Intent(cont, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(cont, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | pendingImmutable());

        Intent playIntent = new Intent(cont, NotificationActionReceiver.class);
        playIntent.setAction("PLAY_ACTION");
        PendingIntent playPendingIntent = PendingIntent.getBroadcast(cont, 0, playIntent, PendingIntent.FLAG_UPDATE_CURRENT | pendingImmutable());

        Intent pauseIntent = new Intent(cont, NotificationActionReceiver.class);
        pauseIntent.setAction("PAUSE_ACTION");
        PendingIntent pausePendingIntent = PendingIntent.getBroadcast(cont, 0, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | pendingImmutable());

        Intent nextIntent = new Intent(cont, NotificationActionReceiver.class);
        nextIntent.setAction("NEXT_ACTION");
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(cont, 0, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | pendingImmutable());

        Intent prevIntent = new Intent(cont, NotificationActionReceiver.class);
        prevIntent.setAction("PREV_ACTION");
        PendingIntent prevPendingIntent = PendingIntent.getBroadcast(cont, 0, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | pendingImmutable());

        Notification.Builder builder = (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);

        builder.setSmallIcon((Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ? R.drawable.notification : R.mipmap.app_icon)
                .setContentTitle(title)
                .setContentText(subtitle)
                .setLargeIcon(largeIcon)
                .setContentIntent(openAppPendingIntent)
                .setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()))
                .addAction(R.drawable.ic_skip_previous_white, "Previous", prevPendingIntent);

        if ("play".equals(action)) {
            builder.addAction(R.drawable.ic_pause_white, "Pause", pausePendingIntent)
                    .addAction(R.drawable.ic_skip_next_white, "Next", nextPendingIntent);
        } else if ("pause".equals(action))  {
            builder.addAction(R.drawable.ic_play_arrow_white, "Play", playPendingIntent)
                    .addAction(R.drawable.ic_skip_next_white, "Next", nextPendingIntent);
        }else{

            builder.addAction(R.drawable.ic_pause_white, "Pause", pausePendingIntent)
                    .addAction(R.drawable.ic_skip_next_white, "Next", nextPendingIntent);

        }



        notificationManager.notify(1, builder.build());
    }



    private void registerUpdateReceiver() {
        updateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ACTION_UPDATE_NOTIFICATION.equals(intent.getAction())) {
                    String icon = intent.getStringExtra("icon");
                    String title = intent.getStringExtra("title");
                    String subtitle = intent.getStringExtra("subtitle");
                    String action = intent.getStringExtra("action");
                    long duration = intent.getLongExtra("duration", 0);
                    long currentPosition = intent.getLongExtra("currentPosition", 0);

                    updateNotification(icon, title, subtitle, action, duration, currentPosition);
                }
            }
        };

        IntentFilter filter = new IntentFilter(ACTION_UPDATE_NOTIFICATION);

          // UPDATE_NOTIFICATION is produced by this app only (WebAppInterface ->
          // sendBroadcast), so the receiver must not be reachable from other apps.
          if (Build.VERSION.SDK_INT >= 33) {
           registerReceiver(updateReceiver, filter, RECEIVER_NOT_EXPORTED);
          }
          else{
           registerReceiver(updateReceiver, filter);
          }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            setupNotification(intent);
        }
        return START_NOT_STICKY;
    }

    private void setupNotification(Intent intent) {
        long duration = intent.getLongExtra("duration", 0);
        long currentPosition = intent.getLongExtra("currentPosition", 0);
        String action = intent.getStringExtra("action");
        
        int playbackState;
        if("pause".equals(action)){
            playbackState= PlaybackState.STATE_PAUSED;
        }
        else if("play".equals(action)){
            playbackState= PlaybackState.STATE_PLAYING;
        }else{
            playbackState= PlaybackState.STATE_BUFFERING;
        }
        
        
        String title = intent.getStringExtra("title");
        String subtitle = intent.getStringExtra("subtitle");
        String icon = intent.getStringExtra("icon");

        Bitmap largeIcon = decodeIcon(icon);

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, pendingImmutable() | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent playIntent = new Intent(this, NotificationActionReceiver.class);
        playIntent.setAction("PLAY_ACTION");
        PendingIntent playPendingIntent = PendingIntent.getBroadcast(this, 0, playIntent, pendingImmutable() | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent pauseIntent = new Intent(this, NotificationActionReceiver.class);
        pauseIntent.setAction("PAUSE_ACTION");
        PendingIntent pausePendingIntent = PendingIntent.getBroadcast(this, 0, pauseIntent, pendingImmutable() | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent nextIntent = new Intent(this, NotificationActionReceiver.class);
        nextIntent.setAction("NEXT_ACTION");
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(this, 0, nextIntent, pendingImmutable() | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent prevIntent = new Intent(this, NotificationActionReceiver.class);
        prevIntent.setAction("PREV_ACTION");
        PendingIntent prevPendingIntent = PendingIntent.getBroadcast(this, 0, prevIntent, pendingImmutable() | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder builder = (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);

                builder.setSmallIcon((Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ? R.drawable.notification : R.mipmap.app_icon)
                .setContentTitle(title)
                .setContentText(subtitle)
                .setLargeIcon(largeIcon)
                .setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()))
                .setContentIntent(openAppPendingIntent);


        builder.addAction(R.drawable.ic_skip_previous_white, "Previous", prevPendingIntent);
        
                    builder.addAction(R.drawable.ic_pause_white, "Pause", pausePendingIntent);
                    
                builder.addAction(R.drawable.ic_skip_next_white, "Next", nextPendingIntent);

        Notification notification = builder.build();

        // Update MediaSession metadata and playback state
        updateMediaSessionMetadata(title, subtitle, largeIcon, duration);
        updatePlaybackState(currentPosition, playbackState);

        startForeground(1, notification);
    }
    
    
    
    
    
    
    private void updateMediaSessionMetadata(String title, String artist, Bitmap albumArt, long duration) {
        MediaMetadata metadata = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, "Youtube Lite")
                .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, albumArt)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, duration)
                .build();

        mediaSession.setMetadata(metadata);
    }







    private void updatePlaybackState(long currentPosition, int state) {
        PlaybackState playbackState = new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY
                        | PlaybackState.ACTION_SKIP_TO_NEXT
                        | PlaybackState.ACTION_PAUSE
                        | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO)
                .setState(state, currentPosition, 1.0f) // 1.0f for playback speed
                .build();
                
                
                // rn it doesn't have a function to increase the playback speed if someone increases it from the youtube player , cuz people don't usually use that , and i am too lazy to implement it here

        mediaSession.setPlaybackState(playbackState);
    }


    @Override
    public void onDestroy() {
        super.onDestroy();
        unregisterReceiver(updateReceiver);
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
