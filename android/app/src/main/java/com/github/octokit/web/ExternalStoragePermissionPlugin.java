package com.github.octokit.web;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExternalStoragePermission")
public class ExternalStoragePermissionPlugin extends Plugin {
    private static final String TAG = "ExtStoragePlugin";

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

    @PluginMethod
    public void resolveUriToPath(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null) {
            call.reject("URI is required");
            return;
        }

        Log.d(TAG, "Resolving URI: " + uriString);

        try {
            Uri uri = Uri.parse(uriString);
            String path = null;

            // Handle Tree URI (Often returned by Directory Pickers)
            if (DocumentsContract.isTreeUri(uri)) {
                String treeId = DocumentsContract.getTreeDocumentId(uri);
                if (treeId != null) {
                    String[] split = treeId.split(":");
                    if (split.length >= 2 && "primary".equalsIgnoreCase(split[0])) {
                        path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/" + split[1];
                    }
                }
            } 
            // Handle Document URI
            else if (DocumentsContract.isDocumentUri(getContext(), uri)) {
                if ("com.android.externalstorage.documents".equals(uri.getAuthority())) {
                    final String docId = DocumentsContract.getDocumentId(uri);
                    final String[] split = docId.split(":");
                    final String type = split[0];

                    if ("primary".equalsIgnoreCase(type)) {
                        path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/" + (split.length > 1 ? split[1] : "");
                    }
                }
            }

            if (path == null && uriString.contains("primary%3A")) {
                // Fallback for primary storage URIs that are hard to parse
                String subPath = uriString.split("primary%3A")[1].replace("%2F", "/").replace("%2A", "*").split("&")[0];
                path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/" + subPath;
            }

            Log.d(TAG, "Resolved Path: " + path);

            JSObject ret = new JSObject();
            ret.put("path", path != null ? path : uriString);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Resolution failed", e);
            call.reject("Failed to resolve URI: " + e.getMessage());
        }
    }
}
