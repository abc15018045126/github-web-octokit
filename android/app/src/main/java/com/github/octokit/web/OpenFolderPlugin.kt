package com.github.octokit.web

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "OpenFolder")
class OpenFolderPlugin : Plugin() {

    @PluginMethod
    fun open(call: PluginCall) {
        try {
            val context = context
            
            // 获取公共的 Documents 目录，这样卸载软件后数据依然存在
            val docFolder = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            val quickNotesFolder = File(docFolder, "Notes")
            
            if (!quickNotesFolder.exists()) {
                quickNotesFolder.mkdirs()
            }

            // 获取 FileProvider URI
            val contentUri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", quickNotesFolder)
            
            // 尝试多种 Intent 协议以适配不同的文件管理器
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "vnd.android.document/directory")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            try {
                context.startActivity(intent)
                call.resolve()
            } catch (e1: Exception) {
                // 备用方案 1
                try {
                    val intent2 = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(contentUri, "resource/folder")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent2)
                    call.resolve()
                } catch (e2: Exception) {
                    // 备用方案 2：直接弹出通用内容分发
                    val intent3 = Intent(Intent.ACTION_GET_CONTENT).apply {
                        setDataAndType(contentUri, "*/*")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent3)
                    call.resolve()
                }
            }
        } catch (e: Exception) {
            call.reject("无法打开管理器: ${e.message}")
        }
    }

    @PluginMethod
    fun requestAllFilesAccess(call: PluginCall) {
        android.util.Log.e("CapacitorApp", "!!! requestAllFilesAccess called !!! SDK: ${Build.VERSION.SDK_INT}")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                call.resolve()
            } else {
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }

    @PluginMethod
    fun resolveUriToPath(call: PluginCall) {
        val uriString = call.getString("uri")
        if (uriString == null) {
            call.reject("URI is required")
            return
        }

        try {
            val uri = Uri.parse(uriString)
            var path: String? = null
            
            // 简单的处理逻辑，针对最常见的情况
            if (android.provider.DocumentsContract.isTreeUri(uri)) {
                val docId = android.provider.DocumentsContract.getTreeDocumentId(uri)
                val split = docId.split(":")
                if (split.size >= 2 && "primary".equals(split[0], ignoreCase = true)) {
                    path = Environment.getExternalStorageDirectory().toString() + "/" + split[1]
                }
            }
            
            // 回退逻辑 1: 处理 encoded primary
            if (path == null && uriString.contains("primary%3A")) {
                val subParts = uriString.split("primary%3A")
                if (subParts.size > 1) {
                    val subPath = subParts[1].replace("%2F", "/").split("&")[0] // 去掉可能的 query params
                    path = Environment.getExternalStorageDirectory().toString() + "/" + java.net.URLDecoder.decode(subPath, "UTF-8")
                }
            }
             // 回退逻辑 2: 处理 encoded Documents
            if (path == null && uriString.contains("Documents%2F")) {
                 val subPath = uriString.substring(uriString.indexOf("Documents%2F"))
                    .replace("%2F", "/")
                 path = Environment.getExternalStorageDirectory().absolutePath + "/" + java.net.URLDecoder.decode(subPath, "UTF-8")
            }

            val ret = com.getcapacitor.JSObject()
            ret.put("path", path ?: uriString)
            call.resolve(ret)
            
        } catch (e: Exception) {
            call.reject("Error resolving path: ${e.message}")
        }
    }

    @PluginMethod
    fun listFiles(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("Path is required")
            return
        }

        try {
            val directory = File(path)
            if (!directory.exists()) {
                call.reject("Directory does not exist: $path")
                return
            }
            if (!directory.isDirectory) {
                call.reject("Not a directory: $path")
                return
            }

            val files = directory.listFiles()
            val result = com.getcapacitor.JSObject()
            val filesArray = com.getcapacitor.JSArray()

            if (files != null) {
                for (file in files) {
                    val fileObj = com.getcapacitor.JSObject()
                    fileObj.put("name", file.name)
                    fileObj.put("path", file.absolutePath)
                    fileObj.put("type", if (file.isDirectory) "directory" else "file")
                    fileObj.put("size", file.length())
                    fileObj.put("mtime", file.lastModified())
                    fileObj.put("uri", Uri.fromFile(file).toString())
                    filesArray.put(fileObj)
                }
            }
            
            result.put("files", filesArray)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to list files: ${e.message}", e)
        }
    }
}
