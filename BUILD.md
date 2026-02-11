# Reproducible Build Instructions

This document provides step-by-step instructions on how to build the GitHub Web Octokit APK from source. This process ensures that the resulting binary matches the source code provided in this repository.

## Prerequisites

To build this project, you need the following tools installed:

- **Node.js** (v18 or newer)
- **npm** (v9 or newer)
- **Java Development Kit (JDK)** (version 17 or 21)
- **Android SDK** (with Build Tools and Platform Tools)
- **Git**

## Build Procedure

### 1. Clone the Repository
```bash
git clone https://github.com/abc15018045126/github-web-octokit.git
cd github-web-octokit
# Checkout to a specific tag if needed
git checkout 0.0.7
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Web Assets
This command transpiles the TypeScript/React code into optimized static web assets.
```bash
npm run build
```

### 4. Sync with Capacitor
This command copies the built web assets into the Android native project and updates the native plugins.
```bash
npx cap sync android
```

### 5. Compile the Android App
Navigate to the `android` directory and use the Gradle wrapper to build the APK.

**On Linux/macOS:**
```bash
cd android
./gradlew assembleDebug
```

**On Windows:**
```bash
cd android
.\gradlew.bat assembleDebug
```

## Output Locations

After a successful build, the APK can be found at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Verification for F-Droid

This project follows the F-Droid inclusion policy:
- **No Proprietary Blobs**: All dependencies are open-source.
- **No Tracking/Ads**: No telemetry, analytics, or advertising SDKs are included.
- **Source Truth**: The `dist` directory is not checked into Git; it is generated purely from the `src` folder during the build process.

## Environment Variables
If your environment requires specific paths for Android SDK or Java, you can set them before building:
- `ANDROID_HOME`: Path to your Android SDK.
- `JAVA_HOME`: Path to your JDK.
