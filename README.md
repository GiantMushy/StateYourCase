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
