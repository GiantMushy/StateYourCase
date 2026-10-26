#!/bin/bash
# iOS simulator smoke test — run before every TestFlight build.
#
# Builds the screen-tour app (VITE_TOUR=1, see src/dev/tour.ts), runs it on every installed
# iPhone/iPad model (newest runtime of each) plus any "iPhone 13" simulator, and saves a
# screenshot of every screen and of a held 3D button to test-results/ios-smoke/<device>/, with a
# contact sheet per device (sheet.png). Look through the sheets before archiving.
#
#   npm run ios:smoke                 all models (two simulators at a time)
#   npm run ios:smoke -- <udid> ...   just these simulators
#   npm run ios:smoke -- "iPhone 13" "iPad Air 13-inch (M3)"   these models (created if missing)
#
# CI runs it on a GitHub macOS runner: .github/workflows/ios-smoke.yml (see docs/ios-cloud.md).
#
# It ends by putting the normal web build back into ios/, so a tour build can't be archived.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
OUT=$ROOT/test-results/ios-smoke
APP=$OUT/DerivedData/Build/Products/Debug-iphonesimulator/App.app
BUNDLE=com.angrypuffingames.stateyourcase
mkdir -p "$OUT"

restore() {
  echo "Restoring the normal web build in ios/ ..."
  npm run build >/dev/null && npx cap copy ios >/dev/null
}
trap restore EXIT

echo "Building the tour app ..."
VITE_TOUR=1 npm run build >/dev/null
npx cap copy ios >/dev/null
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$OUT/DerivedData" build >"$OUT/build.log" 2>&1 ||
  { echo "Simulator build failed, see $OUT/build.log"; exit 1; }
swiftc -O -o "$OUT/sheet" scripts/contact-sheet.swift 2>/dev/null

if [ $# -gt 0 ]; then
  # Each argument is a simulator UDID or a model name ("iPhone 13"): a name picks that model on
  # the newest runtime that has it, creating it on the newest iOS runtime if there is none.
  DEVICES=$(xcrun simctl list -j | python3 -c '
import json, re, subprocess, sys
data = json.load(sys.stdin)
ver = lambda rt: tuple(int(n) for n in re.findall(r"\d+", rt.split(".")[-1]))
label = lambda name, rt: re.sub(r"\W+", "-", name).strip("-") + "_" + rt.split(".")[-1]
devs = sorted(((rt, d) for rt, ds in data["devices"].items() if "iOS" in rt
               for d in ds if d.get("isAvailable", True)), key=lambda x: ver(x[0]))
for arg in sys.argv[1:]:
    match = [(rt, d) for rt, d in devs if arg in (d["udid"], d["name"])]
    if match:
        rt, d = match[-1]
        print(d["udid"], label(d["name"], rt) if d["name"] == arg else arg)
        continue
    types = [t for t in data["devicetypes"] if t["name"] == arg]
    runtimes = sorted((r for r in data["runtimes"] if r["isAvailable"] and r["platform"] == "iOS"
                       and any(t["identifier"] in [s["identifier"] for s in r.get("supportedDeviceTypes", [])] for t in types)),
                      key=lambda r: ver(r["identifier"]))
    if not runtimes:
        print(f"No simulator, device type or runtime for {arg!r}; skipping", file=sys.stderr)
        continue
    rt = runtimes[-1]["identifier"]
    print(f"Creating {arg} on {rt} ...", file=sys.stderr)
    udid = subprocess.check_output(["xcrun", "simctl", "create", arg, types[0]["identifier"], rt], text=True).strip()
    print(udid, label(arg, rt))
' "$@")
else
  # "<udid> <name>" for the newest runtime of each iPhone/iPad model, plus every iPhone 13.
  DEVICES=$(xcrun simctl list devices available -j | python3 -c '
import json, re, sys
devs = json.load(sys.stdin)["devices"]
ver = lambda rt: tuple(int(n) for n in re.findall(r"\d+", rt.split(".")[-1]))
best = {}
for rt, ds in sorted(devs.items(), key=lambda kv: ver(kv[0])):
    if "iOS" not in rt: continue
    for d in ds:
        if not re.match(r"iP(hone|ad)", d["name"]): continue
        key = d["name"] if "iPhone 13" not in d["name"] else d["udid"]
        best[key] = (d["udid"], re.sub(r"\W+", "-", d["name"]).strip("-") + "_" + rt.split(".")[-1])
for udid, name in best.values(): print(udid, name)
')
fi

run_one() {
  local U=$1 NAME=$2 DIR=$OUT/$2 WAS
  WAS=$(xcrun simctl list devices | grep "$U" | grep -c Booted || true)
  rm -rf "$DIR"; mkdir -p "$DIR"
  xcrun simctl boot "$U" 2>/dev/null || true
  xcrun simctl bootstatus "$U" -b >/dev/null 2>&1 || true
  # A first boot keeps migrating data after bootstatus returns; retry the install meanwhile.
  local ok=
  for _ in $(seq 1 15); do xcrun simctl install "$U" "$APP" 2>/dev/null && ok=1 && break; sleep 8; done
  [ -n "$ok" ] || { echo "$NAME: install failed"; return; }
  local LOG=$DIR/console.log
  : >"$LOG"
  xcrun simctl launch --console-pty --terminate-running-process "$U" "$BUNDLE" >"$LOG" 2>&1 &
  local LPID=$!
  local start=$SECONDS seen=0 done=
  while [ -z "$done" ] && [ $((SECONDS - start)) -lt 240 ]; do
    local lines
    lines=$(wc -l <"$LOG")
    if [ "$lines" -gt "$seen" ]; then
      while IFS= read -r line; do
        case "$line" in
          *"[tour] done"*) done=1 ;;
          *"[tour] "*" shown"* | *"[tour] "*" pressed"*)
            local tag
            tag=$(echo "$line" | sed -E 's/.*\[tour\] ([0-9]+) ([a-z-]+) (shown|pressed).*/\1-\2-\3/')
            xcrun simctl io "$U" screenshot "$DIR/$tag.png" >/dev/null 2>&1 ;;
        esac
      done < <(sed -n "$((seen + 1)),${lines}p" "$LOG")
      seen=$lines
    fi
    sleep 0.2
  done
  kill $LPID 2>/dev/null || true
  xcrun simctl terminate "$U" "$BUNDLE" 2>/dev/null || true
  [ "$WAS" = 1 ] || xcrun simctl shutdown "$U" 2>/dev/null || true
  local shots
  shots=$(ls "$DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
  (cd "$DIR" && ls *-shown.png 2>/dev/null | sort -n | xargs "$OUT/sheet" sheet.png 300 8) 2>/dev/null || true
  echo "$NAME: $shots screenshots$([ -n "$done" ] || echo ', TIMED OUT')"
}
export -f run_one
export OUT APP BUNDLE

echo "$DEVICES" | xargs -P 2 -L 1 bash -c 'run_one "$0" "$1"' | tee "$OUT/summary.txt"
echo "Contact sheets: $OUT/<device>/sheet.png"
