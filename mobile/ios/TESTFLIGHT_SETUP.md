# TOEFL Study Lab — signed iOS IPA / TestFlight setup

This project now includes `.github/workflows/build-ios-testflight.yml` for a real Apple Distribution signed IPA and optional TestFlight upload.

## One-time Apple requirements

1. Enroll the Apple account in the paid Apple Developer Program.
2. Register the explicit iOS App ID / Bundle ID `tw.leon.toeflstudy` in Certificates, Identifiers & Profiles.
3. Create an App Store Connect app record for that Bundle ID before the first upload. Suggested values:
   - Platform: iOS
   - Name: TOEFL Study Lab
   - Bundle ID: `tw.leon.toeflstudy`
   - SKU: `TOEFL-STUDY-LAB-2026`
   - Primary language: Traditional Chinese
4. Make sure the Account Holder has enabled App Store Connect API access.
5. Generate a **Team API Key** in App Store Connect > Users and Access > Integrations > App Store Connect API. Use an Admin team key for this CI workflow so Xcode can use provisioning endpoints. Download the `.p8` file once and keep it private.
6. Create or use a valid **Apple Distribution** certificate for the same Apple Developer team, and export the certificate plus its private key as a password-protected `.p12` file.

Do not commit `.p8`, `.p12`, passwords, provisioning profiles, or private keys to this repository.

## GitHub Actions secrets

Open the repository in GitHub, then go to Settings > Secrets and variables > Actions > New repository secret. Add exactly these six secrets:

| Secret | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `APPLE_DISTRIBUTION_CERT_P12_BASE64` | Base64 of the Apple Distribution `.p12` file |
| `APPLE_DISTRIBUTION_CERT_PASSWORD` | Password used when exporting the `.p12` |
| `ASC_KEY_ID` | App Store Connect Team API Key ID |
| `ASC_ISSUER_ID` | App Store Connect API Issuer ID |
| `ASC_KEY_P8_BASE64` | Base64 of `AuthKey_<KEY_ID>.p8` |

### Base64 on Windows PowerShell

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AppleDistribution.p12")) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_ABC1234567.p8")) | Set-Clipboard
```

### Base64 on macOS

```bash
base64 -i AppleDistribution.p12 | pbcopy
base64 -i AuthKey_ABC1234567.p8 | pbcopy
```

## Build and upload

In GitHub, open Actions > Build signed iOS IPA and upload to TestFlight > Run workflow.

Inputs:
- `marketing_version`: defaults to `1.0.57`.
- `upload_to_testflight`: `true` creates the signed IPA, validates it with App Store Connect, and uploads it for TestFlight processing. `false` creates and validates the signed IPA without uploading.

The CI build number is generated from UTC date/time (`YYYYMMDDHHMM`) so every TestFlight upload has a unique build number.

The workflow:
- creates a temporary macOS keychain;
- imports the Apple Distribution certificate only for the job;
- writes the App Store Connect `.p8` key only to the temporary runner;
- uses Xcode automatic signing plus App Store Connect API authentication to manage the App Store Connect provisioning profile;
- archives the real Release app for a generic iOS device;
- verifies the archive with `codesign`;
- exports an App Store Connect signed `.ipa`;
- validates the IPA with `altool`;
- optionally uploads it to App Store Connect / TestFlight;
- deletes the temporary signing keychain and API key;
- exposes the signed IPA as a GitHub Actions artifact for 30 days.

After Apple accepts the upload, the build must finish App Store Connect processing before it appears under TestFlight. Internal testers can then be assigned to the processed build. External testing can require Beta App Review.
