---
description: Build Android APK from source for F-Droid compliance
---

// turbo-all

1. Ensure the environment has Node.js (v18+) and OpenJDK installed.

2. Install project dependencies:
```bash
npm install
```

3. Build the static web assets from source:
```bash
npm run build
```

4. Sync the web assets to the Capacitor Android project:
```bash
npx cap sync android
```

5. Compile the Android application using Gradle:
```bash
cd android && ./gradlew assembleDebug
```

6. Locate the generated APK for distribution:
The APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`

---
**Note for F-Droid Maintainers:**
This workflow ensures a clean build from source. No pre-built binaries are used in the process. The `dist` directory is ignored by Git and is generated entirely during the build step.
