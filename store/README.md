# Store assets

`play/` is the Google Play listing kit. `play/listing.md` lists what goes where in Play Console:
descriptions (English and Icelandic), store settings and the App content answers.
`play/privacy-policy.md` is a policy that matches what the app does, ready to host.

| File | Play Console field |
|---|---|
| `play/icon-512.png` | App icon (512×512) — `App Icon Square_0.png` with its dark corner pixels cropped off |
| `play/feature-graphic.jpg` | Feature graphic (1024×500) — rendered from `feature-graphic.html` |
| `play/screenshots/*.jpg` | Phone screenshots (1080×2160), in file order |
| `play/text/*.txt` | Short and full descriptions per language, ready to paste |

The screenshots and feature graphic are rendered from the dev build with the dev fixtures, so they
can be regenerated after UI changes:

```bash
npm run dev              # in another terminal
node store/capture.mjs   # rewrites play/screenshots/ and play/feature-graphic.jpg
```

`node store/capture.mjs --all <dir>` captures every screen into `<dir>` to choose from; the chosen
ones are `PICKED` in `capture.mjs`.
