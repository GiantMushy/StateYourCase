# iOS builds without a Mac (GitHub Actions)

Xcode and the iOS Simulator only run on macOS, so the iOS smoke test and TestFlight uploads run on
GitHub's hosted macOS runners (`macos-26`, free for this public repo). Both workflows are manual
only and are started from any machine with the GitHub CLI (`gh`), e.g. Windows.

| Workflow | What it does | Needs secrets |
|---|---|---|
| `.github/workflows/ios-smoke.yml` | Builds the screen-tour app and runs `scripts/ios-smoke.sh` on iPhone 17, iPhone 16, iPhone 13 and iPad Pro 13-inch (M4) simulators (missing ones are created on the newest iOS runtime). Uploads the screenshots and per-device `sheet.png` as the `ios-smoke` artifact. Fails if a device times out or doesn't run. | No |
| `.github/workflows/ios-testflight.yml` | Runs the unit tests, builds the web app, `cap sync ios`, archives a Release build with build number `100 + run number` (or the one you give), signs it for the App Store and uploads it to App Store Connect / TestFlight. | Yes |

## One-time setup

### 1. App Store Connect API key

App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → **+**.
Give it the **Admin** role (Xcode needs it to create provisioning profiles and certificates and
to use the cloud-managed distribution certificate). Download the `AuthKey_XXXXXXXXXX.p8` (Apple
only lets you download it once) and note the **Key ID** and the **Issuer ID** shown above the list.

### 2. GitHub secrets

Repository → Settings → Secrets and variables → Actions → New repository secret, or from a
terminal in the repo:

```powershell
gh secret set ASC_KEY_ID --body "XXXXXXXXXX"          # Key ID
gh secret set ASC_ISSUER_ID --body "xxxxxxxx-xxxx-..."  # Issuer ID
# The .p8 file, base64-encoded:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\AuthKey_XXXXXXXXXX.p8")) | gh secret set ASC_KEY_P8
```

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | The API key's Key ID |
| `ASC_ISSUER_ID` | The Issuer ID |
| `ASC_KEY_P8` | The `.p8` file, base64 |
| `IOS_DEV_CERT_P12` *(optional)* | An Apple Development certificate + private key exported as `.p12`, base64 |
| `IOS_DEV_CERT_PASSWORD` *(optional)* | The password of that `.p12` |

The team (`JCYVP356GX`) and bundle id come from the Xcode project; nothing else is needed.

**Why the optional certificate:** archiving with automatic signing needs an *Apple Development*
certificate. A fresh runner has none, so Xcode creates a new one through the API key on every run,
and Apple caps how many a team may have (old ones can be revoked under Certificates in the
developer portal). To avoid that, export your existing development certificate once (Keychain
Access on the Mac → My Certificates → "Apple Development: …" → Export → `.p12` with a password)
and store it as `IOS_DEV_CERT_P12` (base64, as above) and `IOS_DEV_CERT_PASSWORD`. The App Store
signature itself uses Apple's cloud-managed distribution certificate, so no distribution `.p12` is
needed.

## Running the workflows (from Windows)

The workflow files must be pushed to GitHub (on `main`) before they can be run.

```powershell
# Smoke test (≈15–30 min): default devices, or pick your own
gh workflow run ios-smoke.yml
gh workflow run ios-smoke.yml -f devices="iPhone 13, iPad Air 13-inch (M3)"

gh run watch                                   # follow the latest run (pick it from the list)
gh run download --name ios-smoke --dir test-results/ios-smoke-ci   # screenshots + sheet.png per device

# TestFlight (after reviewing the sheets)
gh workflow run ios-testflight.yml
gh workflow run ios-testflight.yml -f build_number=7 -f marketing_version=2.1
gh run watch
```

`gh run list --workflow ios-smoke.yml` lists past runs; `gh run view <id> --log-failed` shows why
one failed. Both workflows also take `-f xcode=26.1` to pick a specific installed Xcode.

Build numbers must keep increasing for a given version: the default (`100 + run number`) stays
above the hand-made builds (2 so far). The project's `CURRENT_PROJECT_VERSION` is not changed in
git; the number is passed to `xcodebuild` for that build only. After the upload Apple processes the
build for a few minutes before it appears in TestFlight (and emails you).

## Still up to you

- Create the API key and secrets above, push the workflows, run the smoke test once and check that
  every model is in the artifact. (Model names follow Xcode's list; if the runner's Xcode lacks one,
  the run log says "No simulator, device type or runtime for …".)
- The first TestFlight run is the real test of signing. If archiving fails with "no devices" for
  the development profile, register any iPhone under Devices in the developer portal; if it fails
  on certificates, check the API key has the Admin role (or add the optional `.p12` above).
- Still play a round by hand: the smoke test only checks that every screen renders.
- Local Macs can keep using `npm run ios:smoke` (all installed models) or pass model names / UDIDs.
