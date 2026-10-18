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

Open `android/` in Android Studio to run it on a phone or to build a signed release bundle. The
upload keystore never goes in git (see `.gitignore`).
