# JLPT Study Lab Mobile

This folder contains thin native wrappers around https://jlpt-study-lab.vercel.app.

## Android
- APK is built as a debug-signed package and can be sideloaded on Android 7.0+.
- App package: `tw.ozisun.jlptstudylab`.

## iOS
- GitHub Actions builds an unsigned device IPA (`JLPT-Study-Lab-iOS-unsigned.ipa`).
- The IPA must be re-signed with an Apple ID / Apple Developer certificate before device installation (for example with AltStore or Sideloadly).
- `JLPT-Study-Lab-iOS-WebClip.mobileconfig` is an alternative Home Screen installation profile that does not require compiling or code signing.

## Ads
The native wrappers open the site with an `app=` query parameter. The website suppresses web AdSense placements in app mode. If advertising is later needed inside the native apps, use AdMob rather than web AdSense.
