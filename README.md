# State Your Case

A pass-the-phone party debate game: players split into groups, debate topics picked by the
Discussion Moderator, secretly complete "corruptions" for bonus points, accuse each other, and
vote. This is the web (React + TypeScript) version of the original Unity build.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # game-rule unit tests
npm run test:e2e # full-round browser test (uses installed Chrome)
```

See [CLAUDE.md](CLAUDE.md) for architecture, the Unity→React UI primitives, and how to use the
Unity reference material in `reference/unity/`.

## Android app

The game ships to Android as a [Capacitor](https://capacitorjs.com) app in `android/`. After
changing web code, copy the build into it:

```bash
npm run build && npx cap sync android
```

Open `android/` in Android Studio to run it on a phone. For a Play release, copy
`android/keystore.properties.example` to `android/keystore.properties` (git-ignored), fill in the
upload key, raise `versionCode` in `android/app/build.gradle`, and run:

```bash
npm run android:release   # → android/app/build/outputs/bundle/release/app-release.aab
```

The upload keystore and its passwords never go in git; keep them in a password manager.

## iOS app

The same Capacitor app, as an Xcode project in `ios/` (Swift Package Manager, no CocoaPods). It
uses the Unity build's bundle id, so its builds go to the existing App Store Connect app and
replace the Unity build for TestFlight testers. After changing web code, copy the build into it:

```bash
npm run build && npx cap sync ios
```

Then `npx cap open ios` opens it in Xcode; pick a simulator or a connected iPhone and press Run.

### Uploading to TestFlight

1. `npm run build && npx cap sync ios`, then `npx cap open ios`.
2. Signing is automatic with team `JCYVP356GX` (set in the project). Xcode → Settings → Accounts
   must have an Apple ID on that team. If an upload fails with "You do not have required
   contracts", the account holder has to accept the latest agreement in App Store Connect
   (Business, or the banner on the home page) first.
3. Set the build number: **App** target → **General** → **Identity** → **Build**
   (`CURRENT_PROJECT_VERSION`). The first upload of 2.0 can stay at 1; each later upload needs a
   higher number. **Version** (`MARKETING_VERSION`) is 2.0, above the Unity build's 1.60; raise
   it only for a new release (then the build number can start again at 1).
4. Set the run destination to **Any iOS Device (arm64)** and choose **Product → Archive**.
5. When the Organizer opens, select the archive → **Distribute App** → **App Store Connect** →
   **Distribute** (Xcode signs and uploads it).
6. After App Store Connect finishes processing (usually 5–30 minutes; you get an email), the
   build shows under **TestFlight**. Internal groups with automatic distribution get it straight
   away, and the Unity build's testers update to it in the TestFlight app. For an external group,
   add the build to the group (the first build of a new version goes through a short beta review).

`Info.plist` declares no non-exempt encryption, so App Store Connect doesn't ask about export
compliance for each build.
