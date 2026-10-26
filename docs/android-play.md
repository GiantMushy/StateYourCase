# Android: emulator, builds and Google Play

The Android app is the Capacitor project in `android/` (app id `com.angrypuffingames.stateyourcase`,
the same id as the Unity build, so it updates the existing Play listing). `versionName` is `2.0`;
`versionCode`, `minSdk` 24, `compileSdk`/`targetSdk` 36 live in `android/app/build.gradle` and
`android/variables.gradle`.

## Toolchain on this Windows PC

| What | Where |
|---|---|
| JDK 21 (Microsoft OpenJDK, `winget install Microsoft.OpenJDK.21`) | `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot` (the installer sets `JAVA_HOME`) |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` (`android/local.properties` points Gradle at it; git-ignored) |
| SDK packages | `cmdline-tools;latest`, `platform-tools`, `emulator`, `platforms;android-36`, `build-tools;35.0.0` + `36.0.0`, `system-images;android-36;google_apis_playstore;x86_64` |
| Android Studio | `C:\Program Files\Android\Android Studio` (`winget install Google.AndroidStudio`) |
| AVDs | `Pixel_9_API_36` (Pixel 9, Play Store image), `Small_Phone_API_36` (small 720×1280 phone, for text fitting) |

New terminals pick up `JAVA_HOME` from the installer. For the SDK tools, either open a new terminal
after setting `ANDROID_HOME` once (System → Environment Variables, or in PowerShell
`[Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')`)
or use the full paths below. In PowerShell:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $sdk
$env:Path = "$sdk\platform-tools;$sdk\emulator;$sdk\cmdline-tools\latest\bin;$env:Path"
```

### One-time: emulator acceleration (needs admin + reboot)

The x86_64 emulator refuses to start without a hypervisor (`emulator -accel-check` currently
reports *Android Emulator hypervisor driver is not installed*). Pick one:

- **Windows Hypervisor Platform** (recommended; also what WSL2/Docker use): Start → "Turn Windows
  features on or off" → tick **Windows Hypervisor Platform** → OK → reboot. Or in an admin
  PowerShell: `Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform` and reboot.
- **Android Emulator hypervisor driver (AEHD)**: Android Studio → Settings → Languages & Frameworks →
  Android SDK → SDK Tools → *Android Emulator hypervisor driver* → Apply. (Not compatible with
  Hyper-V being on.)

Check with `emulator -accel-check` (should say WHPX or AEHD is usable).

## Emulator

```powershell
emulator -list-avds
# Start in its own window (keep that terminal open), or add -no-window for headless:
Start-Process emulator -ArgumentList '-avd','Pixel_9_API_36'
adb wait-for-device
adb shell getprop sys.boot_completed     # prints 1 when booted (can take a minute or two the first time)
```

The small phone: `-avd Small_Phone_API_36`. Create more with
`avdmanager create avd -n NAME -k "system-images;android-36;google_apis_playstore;x86_64" -d pixel_8`
(`avdmanager list device -c` lists profiles), or use Android Studio's Device Manager.

A real phone works too: enable Developer options → USB debugging, plug it in, accept the prompt,
`adb devices`.

## Build, install, run

```powershell
npm run android:debug            # web build + cap sync + gradle assembleDebug
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
adb shell monkey -p com.angrypuffingames.stateyourcase -c android.intent.category.LAUNCHER 1
```

Or in one step: `npx cap run android --target Pixel_9_API_36` (boots the AVD if needed). To work in
Android Studio: `npx cap open android`.

Useful checks:

```powershell
adb exec-out screencap -p > test-results\android\title.png   # in PowerShell 5.1 use cmd /c "adb exec-out screencap -p > file.png" (PS 5 mangles binary pipes)
adb logcat -c; adb logcat *:E Capacitor:V chromium:V          # crashes, JS errors, WebView console
adb shell input tap 540 1800                                   # tap (device pixels)
adb shell input keyevent KEYCODE_BACK                          # Android Back
```

Back should close the menu if it's open, otherwise press the screen's back arrow; mid-round
screens ignore it and the title screen leaves the app. The status bar stays visible, with dark
icons over the light backgrounds.

## Release bundle (.aab)

Play needs a signed Android App Bundle. Signing reads `android/keystore.properties` (git-ignored;
template: `android/keystore.properties.example`). Without it the release build stops with
*Missing android/keystore.properties*.

1. **Find out which key Play expects** (Play Console → the app → Test and release → App
   integrity → *App signing*):
   - *Releases signed by Google Play* (Play App Signing) — Google holds the app signing key and
     you sign uploads with an **upload key**. Its SHA-1 is shown there as *Upload key certificate*.
     If you still have that upload keystore (from the Unity project), use it. If it's lost, or if
     the listing has never had an upload, create a new one (below); a lost upload key can be
     replaced via *Request upload key reset* on that page.
   - *Not enabled / signed by you* (legacy) — every update **must** be signed with the original
     keystore used for the Unity app. Without it the listing can't be updated (you'd need a new
     app id). Note: the Unity project's settings show no custom keystore
     (`androidUseCustomKeystore: 0`), so check whether a release was ever uploaded and with what.
   - *No releases yet* — Play App Signing is enabled automatically on the first upload; any new
     upload key is fine.
2. **Create an upload key** (only if needed; store the file and passwords in a password manager —
   losing them means a key reset):

   ```powershell
   & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore "$HOME\Keys\state-your-case-upload.jks" `
     -alias upload -keyalg RSA -keysize 2048 -validity 10000 `
     -dname "CN=Angry Puffin Games"
   ```

   keytool prompts for the passwords. If Play asks for the upload certificate (key reset), export
   it with `keytool -export -rfc -keystore ...\state-your-case-upload.jks -alias upload -file upload_certificate.pem`.
3. Copy `android\keystore.properties.example` to `android\keystore.properties` and fill in
   `storeFile` (e.g. `C:/Users/Notandi/Keys/state-your-case-upload.jks` — forward slashes),
   the passwords and `keyAlias=upload`.
4. **Bump `versionCode`** in `android/app/build.gradle` above every version code ever uploaded to
   this listing (Play Console → App bundle explorer shows them; Unity's settings had code 1, but
   check). Each later upload needs a higher code again. `versionName` is just the label (2.0).
5. `npm run android:release` → `android\app\build\outputs\bundle\release\app-release.aab`.

Target API: Play requires `targetSdk` 36 for new apps and updates from 31 Aug 2026 (extension
possible to 1 Nov 2026); the app targets 36, so it's compliant.

## Play Console checklist (do these yourself)

1. **App signing** — check/settle the signing situation above before the first upload.
2. **Internal testing** — Test and release → Testing → Internal testing → Create new release →
   upload `app-release.aab`, add release notes → Save → Review → Start rollout. Add testers (a
   Google Group or email list) under *Testers* and open the opt-in link on a phone.
3. **Pre-launch report** — after the upload, Play runs the bundle on real devices; check
   Quality → Pre-launch report for crashes and screenshots.
4. **Store listing** (Grow users → Store presence → Main store listing) — name, short/full
   description, app icon 512×512, feature graphic 1024×500, at least 2 phone screenshots
   (and 7"/10" tablet screenshots if you want tablet visibility). Update the Unity-era text and
   screenshots for 2.0.
5. **App content** (Policy and programs → App content):
   - Privacy policy URL (required for most apps; host one even if no data is collected).
   - Data safety — the app collects/shares no user data (names typed in stay on the device; no
     analytics, ads or accounts), declare accordingly.
   - Content rating questionnaire (IARC) — party/debate game; answer about user-generated text
     (player names) and topics honestly.
   - Target audience and content — pick age groups (choosing under-13s pulls in Families policy
     requirements).
   - Ads: none. App access: no login needed. Government/financial/health declarations: not
     applicable.
6. **Countries/regions and pricing** — Test and release → Production → Countries/regions.
7. **Closed testing requirement** — personal developer accounts created after Nov 2023 must run a
   closed test with at least 12 testers for 14 days before applying for production access. An
   organisation account, or an app already in production, is exempt.
8. **Production** — promote the tested release (Test and release → Production → Create release
   → add from library), or use a staged rollout.
