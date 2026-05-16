# Android APK Build Guide

This project is a PWA. The best Android APK/AAB approach is to wrap the live website as a Trusted Web Activity.

Production website:

```text
https://tapas-grocery.vercel.app/
```

Manifest URL:

```text
https://tapas-grocery.vercel.app/manifest.webmanifest
```

Recommended Android package name:

```text
com.tapasgrocery.store
```

App name:

```text
Tapas Grocery Store
```

## Easiest Method: PWABuilder

Use this if you want the APK without setting up Android Studio locally.

1. Deploy the latest website to Vercel.
2. Open:

```text
https://www.pwabuilder.com/
```

3. Enter:

```text
https://tapas-grocery.vercel.app/
```

4. Click **Start**.
5. Fix any PWA warnings if shown.
6. Go to **Package for stores**.
7. Choose **Android**.
8. Use package name:

```text
com.tapasgrocery.store
```

9. Download the generated Android package.
10. If you get an APK file, rename it to:

```text
tapas-grocery.apk
```

11. Put it here:

```text
public/downloads/tapas-grocery.apk
```

12. Commit and deploy again.

After that, the `/more` page APK download button will automatically become active.

## Advanced Method: Bubblewrap CLI

Use this if you want full control and Play Store-ready builds.

### Requirements

Install:

- Node.js
- JDK 17
- Android Studio
- Android SDK
- Android SDK Build Tools
- Android Platform Tools

Your current machine has Java 8, but Bubblewrap generally expects a modern Android toolchain. Install JDK 17 before using this method.

### Commands

Install Bubblewrap:

```bash
npm install -g @bubblewrap/cli
```

Create a separate Android wrapper folder outside the Next.js source:

```bash
mkdir android-twa
cd android-twa
```

Initialize the Trusted Web Activity:

```bash
bubblewrap init --manifest="https://tapas-grocery.vercel.app/manifest.webmanifest"
```

Recommended answers:

```text
Application ID: com.tapasgrocery.store
App name: Tapas Grocery Store
Launcher name: Tapas Store
Start URL: /
Display mode: standalone
Orientation: portrait
Theme color: #2f9e44
Background color: #f8faf7
```

Build the APK/AAB:

```bash
bubblewrap build
```

The generated files are usually inside the Android wrapper output folder. Copy the APK to this project:

```text
public/downloads/tapas-grocery.apk
```

## Digital Asset Links

For a proper Trusted Web Activity, Android must verify that your APK belongs to your website.

After you generate/sign the Android app, get the SHA-256 fingerprint from Bubblewrap or your signing key. Then create:

```text
public/.well-known/assetlinks.json
```

Example shape:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tapasgrocery.store",
      "sha256_cert_fingerprints": [
        "PASTE_YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Deploy the file and verify it opens at:

```text
https://tapas-grocery.vercel.app/.well-known/assetlinks.json
```

## APK vs Play Store

For customer trust, Google Play Store is better than direct APK download.

Use:

- APK for private testing
- AAB for Google Play Store upload

## After Creating The APK

1. Add APK:

```text
public/downloads/tapas-grocery.apk
```

2. Commit:

```bash
git add public/downloads/tapas-grocery.apk public/.well-known/assetlinks.json
git commit -m "Add Android APK and asset links"
git push origin main
```

3. Deploy to Vercel.
4. Open:

```text
https://tapas-grocery.vercel.app/more
```

5. The Download APK button should become active.
