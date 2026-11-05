package com.matr1x.youtubelite.receivers;


import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class NotificationActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        context.sendBroadcast(new Intent("TRACKS_TRACKS")
                .setPackage(context.getPackageName())
                .putExtra("actionname", intent.getAction()));
    }
}
