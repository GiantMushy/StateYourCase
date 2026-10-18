// Renders the Google Play screenshots and feature graphic from the running dev server, using the
// dev fixtures (src/dev/fixtures.ts) for a sample game.
//
//   npm run dev                       (in another terminal)
//   node store/capture.mjs            → store/play/screenshots/*.jpg, store/play/feature-graphic.jpg
//   node store/capture.mjs --all DIR  → every screen into DIR, to pick from
//
// Play wants phone screenshots no taller than 2:1 and JPEG/24-bit PNG (no alpha): 360×720 CSS px at
// 3× gives 1080×2160. The feature graphic is store/feature-graphic.html at 1024×500.
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const all = process.argv[2] === '--all'
const outDir = all ? process.argv[3] : 'store/play/screenshots'

/** Holds the pointer down on the corruption card, which shows its revealed face while pressed. */
const holdCard = async (page) => {
  const box = await page.getByText('Hold or tap to reveal your Corruption').boundingBox()
  // The text ignores pointer events (like TMP), so the card under it gets the press.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
}

const SHOTS = [
  ['debate', '/?screen=DMDisplay'],
  ['topic', '/?screen=TopicSelection'],
  ['pass-the-phone', '/?screen=PlayerMutex&mutex=Anna'],
  ['secret-objective', '/?screen=CorruptionDisplay', holdCard],
  ['teams', '/?screen=AssignGroups'],
  ['positions', '/?screen=AssignPositions'],
  ['judging', '/?screen=MetricSelection'],
  ['voting', '/?screen=Voting&groups=4'],
  ['scoreboard', '/?screen=Scoreboard&round=2'],
  ['names', '/?screen=StartLocalGame'],
  ['packs', '/?screen=PackSelection'],
  ['title', '/'],
]
/** The listing's order (Play shows the first few in search results). */
const PICKED = ['debate', 'secret-objective', 'pass-the-phone', 'topic', 'names', 'scoreboard']

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, hasTouch: true })
const shots = all ? SHOTS : PICKED.map((name) => SHOTS.find((s) => s[0] === name))
for (const [i, [name, path, prep]] of shots.entries()) {
  await page.goto(BASE + path)
  await page.waitForFunction(() => document.querySelector('.stage'))
  await page.waitForTimeout(1500) // entrance animations
  await prep?.(page)
  await page.waitForTimeout(800)
  const file = `${outDir}/${String(i + 1).padStart(2, '0')}-${name}.jpg`
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
  await page.mouse.up()
  console.log(file)
}

if (!all) {
  const fg = await browser.newPage({ viewport: { width: 1024, height: 500 } })
  await fg.goto(`${BASE}/store/feature-graphic.html`)
  await fg.waitForFunction(() => document.fonts.ready.then(() => [...document.images].every((img) => img.complete)))
  await fg.screenshot({ path: 'store/play/feature-graphic.jpg', type: 'jpeg', quality: 95 })
  console.log('store/play/feature-graphic.jpg')
}
await browser.close()
