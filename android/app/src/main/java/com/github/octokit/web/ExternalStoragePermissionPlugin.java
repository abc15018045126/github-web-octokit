package com.github.octokit.web;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExternalStoragePermission")
public class ExternalStoragePermissionPlugin extends Plugin {

    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } else {
                call.resolve();
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void checkAllFilesAccess(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ret.put("granted", Environment.isExternalStorageManager());
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }
}
