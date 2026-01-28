package com.github.octokit.web;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExternalStoragePermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
