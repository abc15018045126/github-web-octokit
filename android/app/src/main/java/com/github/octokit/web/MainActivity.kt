package com.github.octokit.web

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // 在 super 之前注册插件，确保初始化时已被 Bridge 识别
        android.util.Log.e("CapacitorApp", "!!! Registering OpenFolderPlugin !!!")
        registerPlugin(OpenFolderPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
