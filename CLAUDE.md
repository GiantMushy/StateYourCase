# CLAUDE.md

**State Your Case** is a pass-the-phone party debate game. This is a React + TypeScript
(Vite) port of the original Unity project (`../Partyament`, Unity 6). The port is meant to look and feel
*identical* to the Unity build, so most visual values are copied verbatim from the Unity scene.

## Commands

```bash
npm run dev        # Vite dev server
npx tsc -b         # typecheck (run before finishing any change)
npm test           # vitest unit tests (game rules)
npm run build      # production build
```

Dev deep links (see `src/dev/fixtures.ts`): `/?screen=DMDisplay`, `/?screen=Voting&groups=4`,
`/?screen=Scoreboard&round=2`, `/?screen=PlayerMutex&mutex=Anna`, `&lang=is`. They seed the same
players/groups/corruptions as the Unity reference captures.

## Architecture

| Path | Role |
|---|---|
| `src/game/model.ts` | Pure game rules (players, groups, scoring, corruptions, accusations, voting). Functions mutate a `GameData` draft; names mirror the Unity managers. Unit-tested. |
| `src/game/store.ts` | Zustand + immer store — the Unity `GameManager`. Owns `screen`, the mutex hand-off, corruption/voting sequences, rounds, transitions. |
| `src/game/config.ts` | Tunables taken from the Unity Inspector (not the C# defaults). |
| `src/game/database.ts` | Loads `src/data/Topics.csv` and `Corruptions.csv` (same files as Unity). |
| `src/screens/*.tsx` | One component per Unity `GameState` panel. |
| `src/shell/` | Always-on chrome: rotating `Background`, slide-out `Menu`, `Transition` overlay. |
| `src/ui/` | Unity-UI primitives (below). |
| `src/i18n/` | `gametext.json` = exported Unity string table; `CODE_STRINGS` = strings built in C#. |
| `reference/unity/` | Ground truth from the Unity build: UI dumps, screenshots, l10n export. |

**Screen lifecycle:** only the active screen is mounted; every `setScreen` remounts it
(`screenVisit` key). So *mount = Unity `OnEnable`* — put per-visit initialisation in
`useState` initialisers / `useEffect(() => …, [])`. State that must survive leaving and returning
(Unity controller fields) lives in the store (e.g. `groupsLayout`, `topicChoice`).

Screens never set `screen` arbitrarily — they call semantic store actions
(`startCorruptionSequence`, `submitGroupBallot`, …), as Unity controllers did with GameManager.

## UI primitives (Unity → React)

The stage emulates Unity's CanvasScaler (1080×1920, match 0.5) with CSS `zoom`, so **every px value
in the code is a Unity canvas unit**. Copy Inspector numbers directly.

- `Rect` — RectTransform. `a=[minX,minY,maxX,maxY]` anchors, `pivot`, `pos` (anchoredPosition),
  `size` (sizeDelta), `scale`, `rot`. Unity y is *up*; `Rect` converts. `STRETCH = [0,0,1,1]`.
  `flow` = child of a layout group (relative, sized by `size`, positioned by parent flexbox).
- `Img` — Image. `sprite` (Unity sprite name, see `src/assets/spriteManifest.json`), `color`
  (`#RRGGBBAA`, multiplied like Unity), `sliced` + `ppu` (pixelsPerUnitMultiplier) + `spritePpu`
  (the sprite's PixelsPerUnit when the dump shows e.g. `ppu1.2/140` → `ppu={1.2} spritePpu={140}`),
  `preserve`. Without rect props it fills its parent (an Image on the same GameObject).
- `Text` — TextMeshPro. `fontSize`, `auto=[min,max]`, `color`, `align` (TMP names: `Center`,
  `Left`, `TopLeft`, `MidlineLeft`…), `margin=[l,t,r,b]`, `cs` (characterSpacing), `ls`, `smallCaps`.
- `Button3D` — the chunky "Button Default" animator button (press-down, disabled tint, hover 1.05).
- `TintButton` — Unity ColorTint button (brightness 0.96 hover / 0.78 pressed, 0.1s fade).
- `useButton` — Unity Selectable pointer semantics (click on release inside; leaving cancels).
- `useDragGesture` / `dropTargetAt` / `DragGhost` — card drag & drop with Unity thresholds.
- `anim.ts` — `useFrame`, `lerpStep` (Unity `Lerp(a,b,dt*speed)`), easing, `tween`.
- `BackButton`, `Screen`.

Images are drawn as leaf layers *behind* their GameObject's children, matching Unity draw order.
Later siblings draw on top.

## Reading the Unity reference

```bash
node reference/unity/tools/tree.cjs reference/unity/dumps/06_topic.json            # whole screen
node reference/unity/tools/tree.cjs reference/unity/dumps/06_topic.json "Topic Description/Header"
```

Each line: `name rect(x,y,w,h on a 979×2118 canvas) a[anchorMin]-[anchorMax] pv[pivot] pos[…] sz[…]`,
then components: `Img(sprite color type b<border L/B/R/T> ppu<mult>/<spritePPU>)`,
`TMP("text" font size auto[min,max] color align style m<margins>)`, layout groups, buttons
(`onClick` targets), animators (controller name), and custom scripts with their Inspector fields.
Dumps were taken in Play mode, so some values reflect the live animator state (e.g. a disabled
button's face shows `#42424278`); `full.json` is the edit-mode scene with defaults.
Screenshots (`reference/unity/screenshots/NN_*.png`, 540×1169 = iPhone aspect) show each state.
Original C# lives in `../Partyament/Assets/Scripts`.

## Rendering notes

- **Linear colour space:** the Unity project blends in linear space, so translucent overlays look
  lighter than browser (sRGB) blending. `Img` and `Text` convert alpha via `ui/linearBlend.ts`
  (calibrated over the teal background). Use their `color`/`opacity` props rather than raw CSS
  opacity for translucent UI.
- **9-slice:** sliced `Img`s render through `SlicedCanvas` — a canvas drawn at device resolution
  with slice boundaries snapped to whole pixels (CSS border-image cracks under scaling/motion).
  It redraws on layout resize; transforms just scale the bitmap.
- **Wide windows (iPad, landscape):** `Stage` caps the canvas aspect at 9:16 (≤1080 units wide) and
  centres it; the `backdrop` (Background) spans the whole window and window-wide fills portal into
  `useStageOverlay()` (e.g. the Transition's side bands). The `Menu` is the Stage `overlay`, anchored
  to the window's top-right, and never opens further in than on the 390×844 phone (979 units).
  Windows narrower than 9:16 (phones) are unaffected.
- **Line height:** `Text` uses TMP's faceInfo line heights (Iceland 0.97em, Liberation 1.15em).

## Tests

`npm test` covers the rules in `model.ts` and the voting ballot logic. `npm run test:e2e` plays three
full rounds through the real UI in Chrome (the dev server exposes the store as `window.__game`).

## Fidelity notes / intentional deviations

- Unity "Selected" (sticky pressed look after tapping a normal button) is not reproduced; ToggleButton
  latches (tabs, timer buttons) are, via `selected`.
- New Game also resets accusation flags (Unity forgot to).
- Pressed buttons keep an opaque face (Unity's clip faded it to 58%).
- The selected Versus/Scenario tab is locked down: no hover/press effect.
- AssignPositions swap buttons press down like the shuffle button (Unity had no transition).
- DM voting metric labels keep their native aspect (Unity stretched them into fixed boxes).
- Scroll views use native scrolling (iOS bounce), not Unity's ScrollRect elasticity/inertia.
- The back arrow is pinned 159 units from the top (Unity: 900 above centre, which drifts with the
  canvas height) and scrolls with the content on StartLocalGame/AssignGroups/AssignPositions
  (Unity kept it fixed over the scroll view). StartLocalGame adds top padding when the name list
  would put its instructions under the arrow (Unity overlapped them).
- Online screens are visual only — networking was never implemented in Unity either.
