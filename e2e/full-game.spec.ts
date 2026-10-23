// Plays a complete 3-round local game through the real UI (taps, holds, buttons) and checks
// the flow end to end. Run with `npm run test:e2e`.
import { expect, test, type Page } from '@playwright/test'

interface StoreState {
  screen: string
  game: { currentRound: number; players: Record<number, { oldScore: number }> }
}
const state = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __game: { getState: () => StoreState } }).__game.getState()
    return { screen: s.screen, round: s.game.currentRound }
  })
const screen = async (page: Page) => (await state(page)).screen
const waitScreen = (page: Page, name: string) => expect.poll(() => screen(page), { timeout: 15_000 }).toBe(name)

/** Text has pointer-events: none (like TMP), so tap the centre of its box — the button underneath gets it. */
async function tap(page: Page, text: string | RegExp, which: 'first' | 'last' = 'last') {
  const matches = page.getByText(text, { exact: typeof text === 'string' })
  const el = which === 'first' ? matches.first() : matches.last()
  await expect(el).toBeVisible()
  const box = (await el.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  // 3D buttons click once their push-down has played (ui/slab.ts PRESS), not on release.
  await page.waitForTimeout(150)
}

async function playRound(page: Page) {
  if ((await screen(page)) === 'PlayerMutex') await tap(page, /^I am /) // DM hand-off (round 1)
  await waitScreen(page, 'TopicSelection')
  await tap(page, 'Select')
  await waitScreen(page, 'MetricSelection')
  await tap(page, 'Comedy')
  await tap(page, 'Factual')
  await tap(page, 'Next')
  await waitScreen(page, 'AssignPositions')
  await tap(page, 'Next')

  // Each non-DM player privately reveals their corruption (press and hold the card).
  for (;;) {
    await waitScreen(page, 'PlayerMutex')
    await tap(page, /^I am /)
    if ((await screen(page)) !== 'CorruptionDisplay') break
    const box = (await page.getByText(/Hold or tap/).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(400)
    await expect(page.getByText(/Points|Debate honestly/).first()).toBeVisible()
    await page.mouse.up()
    await tap(page, "I'm done!")
  }

  // DM screen: each of the two groups presents, then Next.
  await waitScreen(page, 'DMDisplay')
  for (let g = 0; g < 2; g++) {
    await page.getByTestId('timer-play').click()
    await page.waitForTimeout(400)
    await page.getByTestId('timer-stop').click()
    await page.waitForTimeout(1200) // tape swap
  }
  await tap(page, 'Next')

  // Two groups → straight to the DM's metric vote.
  await waitScreen(page, 'PlayerMutex')
  await tap(page, /^I am /)
  await waitScreen(page, 'Voting')
  await tap(page, 'Group 1')
  await tap(page, 'Group 2')
  await tap(page, 'Next')
  await waitScreen(page, 'Scoreboard')
  await page.waitForTimeout(6000) // scoreboard animation
}

test('three full rounds of a local game', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())))

  await page.goto('/')
  await tap(page, 'Local')
  await waitScreen(page, 'PackSelection')
  await tap(page, 'Classic')
  await waitScreen(page, 'StartLocalGame')

  const input = page.locator('input').first()
  for (const name of ['Anna', 'Bjarki', 'Thor', 'Gunna', 'Siggi']) {
    await input.fill(name)
    await input.press('Enter')
  }
  await tap(page, 'Next')
  await waitScreen(page, 'AssignGroups')
  await tap(page, 'Start')

  for (let round = 1; round <= 3; round++) {
    expect((await state(page)).round).toBe(round)
    await playRound(page)
    await page.screenshot({ path: `test-results/scoreboard-round-${round}.png` })
    // Reaching 500 points ends the game early.
    if (await page.getByText(/Wins!$/).isVisible()) break
    if (round < 3) {
      await tap(page, 'Next Round')
      await expect.poll(async () => (await state(page)).round, { timeout: 5000 }).toBe(round + 1)
      await page.waitForTimeout(1200) // transition overlay blocks input until it has faded out
    }
  }

  await expect(page.getByText(/Wins!$/)).toBeVisible()
  await tap(page, 'New Game', 'first') // (the side menu also has a "New Game" row)
  await waitScreen(page, 'PackSelection')
  expect(errors).toEqual([])
})
