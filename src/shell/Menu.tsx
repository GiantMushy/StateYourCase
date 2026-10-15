// Slide-out side menu (Unity MenuController): tab button in the top-right corner, four
// accordion dropdowns (New Game confirm, Language, Settings, Rulebook) and two external links.
// Settings is not in Unity: a list of game-rule toggles, locked while a game is running.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useGame, type SettingKey } from '../game/store'
import { useT, type StringKey } from '../i18n'
import { lerpStep, tween, easeInCubic, easeOutCubic, useFrame } from '../ui/anim'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { PHONE_CANVAS, useStage } from '../ui/Stage'
import { Text } from '../ui/Text'
import { TintButton } from '../ui/TintButton'

const MENU_WIDTH = 717.07
const SLIDE_SPEED = 5
const BUTTON_SLIDE = 30
const OPEN_DURATION = 0.5
const CLOSE_DURATION = 0.3
const SELECTOR_SPEED = 5

const FEEDBACK_URL = 'https://giantmushy.github.io/AngryPuffinGamesSite/'
const PRIVACY_URL =
  'https://doc-hosting.flycricket.io/state-your-case-privacy-policy/32dfcf16-2c06-4560-8818-8cb83c3af5cc/privacy'

type DropdownId = 'newGame' | 'language' | 'settings' | 'rulebook'
const HEIGHTS: Record<DropdownId, number> = { newGame: 292.75, language: 371.8, settings: 640, rulebook: 750 }

const SETTINGS: { key: SettingKey; label: StringKey }[] = [
  { key: 'metrics', label: 'Setting_metrics' },
  { key: 'secretObjectives', label: 'Setting_secret_obj' },
  { key: 'dmShuffle', label: 'Setting_dm_shuffle' },
]
/** Thumb flip: hop, spin half a turn (always clockwise) and land with a little overshoot. */
const THUMB_FLIP_MS = 550
/** Fraction of the flip at which the thumb lands; the row backdrop changes on landing. */
const THUMB_LAND = 0.8
/** How long a refused DM Shuffle toggle shows its reason. */
const SETTING_ERROR_SECONDS = 3

/** Animated accordion body: grows open with ease-out, closes with ease-in while scrolling its content up. */
function useDropdown(open: boolean, fullHeight: number) {
  const [state, setState] = useState({ h: 0, innerY: 0, visible: false })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (open) {
      setState({ h: 0, innerY: 0, visible: true })
      return tween(OPEN_DURATION, (t) => setState({ h: fullHeight * easeOutCubic(t), innerY: 0, visible: true }))
    }
    const from = fullHeight
    return tween(
      CLOSE_DURATION,
      (t) => {
        const e = easeInCubic(t)
        setState({ h: from * (1 - e), innerY: from * e, visible: true })
      },
      () => setState({ h: 0, innerY: 0, visible: false }),
    )
  }, [open, fullHeight])
  return state
}

/** Row header: text + underline + icon, the whole row is a transparent ColorTint button. */
function MenuRow({ label, icon, iconSize = 75, onClick, auto = [85, 110] as const, margin = [180, 0, 21.598, 0] as const }: {
  label: string
  icon: string
  iconSize?: number
  onClick: () => void
  auto?: readonly [number, number]
  margin?: readonly [number, number, number, number]
}) {
  return (
    <TintButton flow size={[717.08, 175]} onClick={onClick}>
      <Text a={[0, 0, 1, 0]} pos={[0, 50]} size={[0, 100]} fontSize={103.05} auto={auto} color="#F2F2F2FF" align="Left" margin={margin}>
        {label}
      </Text>
      <Img a={[0, 0, 1, 0]} pos={[0, 1]} size={[-100, 3]} color="#FFFFFFFF" />
      <Img pos={[-250, -45]} size={[iconSize, iconSize]} sprite={icon} />
    </TintButton>
  )
}

/** "Raise Dropdown Prefab": underline with a chevron tab that closes the dropdown. */
function RaiseTab({ height, onClick }: { height: number; onClick: () => void }) {
  return (
    <Rect a={[0, 0, 1, 0]} pos={[0, height / 2]} size={[0, height]}>
      <Img a={[0, 0.5, 1, 0.5]} size={[0, 3]} color="#FFFFFFFF" />
      <TintButton size={[100, 50]} image={{ color: '#424242FF' }} onClick={onClick}>
        <Img size={[65, 65]} sprite="Chevron down" />
      </TintButton>
    </Rect>
  )
}

function DropdownBody({ id, open, children, innerInset = 50, anchorTop }: {
  id: DropdownId
  open: boolean
  children: ReactNode
  innerInset?: number
  anchorTop?: boolean
}) {
  const full = HEIGHTS[id]
  const { h, innerY, visible } = useDropdown(open, full)
  if (!visible) return null
  return (
    <div style={{ position: 'relative', width: 717.08, height: h, overflow: 'hidden', flex: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: innerInset,
          right: innerInset,
          height: full,
          ...(anchorTop ? { top: -innerY } : { bottom: innerY }),
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function Menu() {
  const t = useT()
  // The menu lives in the window-wide overlay layer: on a pillarboxed canvas (iPad) it is
  // anchored to the window's right edge, not the canvas's.
  const { viewWidth } = useStage()
  const isOpen = useGame((s) => s.menuOpen)
  const setMenuOpen = useGame((s) => s.setMenuOpen)
  const language = useGame((s) => s.language)
  const setLanguage = useGame((s) => s.setLanguage)
  const playTransition = useGame((s) => s.playTransition)
  const newGame = useGame((s) => s.newGame)

  const [dropdown, setDropdown] = useState<DropdownId | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const anim = useRef({ x: MENU_WIDTH, tabY: 0, selectorY: 0, written: '' })

  // Closed: anchoredPosition.x = width (off-screen right). Open: localPosition.x = 500, but never
  // further in than on the phone, so wider windows (iPad) don't reveal the panel's right edge.
  const targetX = isOpen ? Math.max(500 - viewWidth / 2, 500 - PHONE_CANVAS.width / 2) : MENU_WIDTH
  const dismissWidth = Math.max(1500, viewWidth * 2)
  const selectorTarget = language === 'is' ? -61.61 : 81

  useFrame((dt) => {
    const a = anim.current
    a.x = Math.abs(a.x - targetX) < 0.01 ? targetX : lerpStep(a.x, targetX, SLIDE_SPEED, dt)
    const tabTarget = isOpen ? BUTTON_SLIDE : 0
    a.tabY = Math.abs(a.tabY - tabTarget) < 0.01 ? tabTarget : lerpStep(a.tabY, tabTarget, SLIDE_SPEED, dt)
    a.selectorY = Math.abs(a.selectorY - selectorTarget) < 0.5 ? selectorTarget : lerpStep(a.selectorY, selectorTarget, SELECTOR_SPEED, dt)
    // Only touch the DOM while something is still moving.
    const key = `${a.x}|${a.tabY}|${a.selectorY}|${selectorRef.current ? 1 : 0}`
    if (key === a.written) return
    a.written = key
    if (menuRef.current) menuRef.current.style.transform = `translateX(${a.x}px)`
    // Fully closed the panel sits just past the canvas edge; with a pillarboxed canvas, zoom
    // rounding can leave a sub-pixel sliver of it visible, so hide it (the tab stays).
    if (panelRef.current) panelRef.current.style.visibility = a.x === MENU_WIDTH ? 'hidden' : ''
    if (tabRef.current) tabRef.current.style.translate = `0 ${a.tabY}px`
    if (selectorRef.current) selectorRef.current.style.translate = `0 ${-a.selectorY}px`
  })

  useLayoutEffect(() => {
    if (menuRef.current) menuRef.current.style.transform = `translateX(${anim.current.x}px)`
    if (panelRef.current) panelRef.current.style.visibility = 'hidden'
  }, [])

  // Slide finished closing (lerp settles after ~2.1s) → collapse every dropdown (CloseAllInstant).
  useEffect(() => {
    if (isOpen) return
    const id = setTimeout(() => setDropdown(null), 2100)
    return () => clearTimeout(id)
  }, [isOpen])

  const toggle = (id: DropdownId) => {
    if (id === 'language' && dropdown !== 'language') anim.current.selectorY = selectorTarget
    setDropdown((d) => (d === id ? null : id))
  }

  const confirmNewGame = () => {
    setDropdown(null)
    setMenuOpen(false)
    playTransition('Lets try this again...', newGame)
  }

  const openUrl = (url: string) => {
    setMenuOpen(false)
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Rect a={[1, 0, 1, 1]} pivot={[1, 0.5]} pos={[0, 0]} size={[MENU_WIDTH, 0]} ref={menuRef} style={{ pointerEvents: 'auto' }}>
      {/* Tap-outside closer; widened so it also covers the side bands of a wide window. */}
      {isOpen && (
        <TintButton a={[0, 0, 0, 1]} pos={[-dismissWidth / 2, 0]} size={[dismissWidth, 0]} onClick={() => setMenuOpen(false)} />
      )}

      {/* Unity: size 3096x1392 at scale 0.3, ppu 0.3 — baked into final sizes to avoid scaled 9-slice seams. */}
      <Rect a={[0, 1, 0, 1]} pivot={[1, 1]} pos={[775.34, 222]} size={[928.93, 417.53]} ref={tabRef}>
        <TintButton
          a={STRETCH}
          image={{ sprite: 'Button Background Default', color: '#424242FF', sliced: true, ppu: 1, spritePpu: 180 }}
          onClick={() => setMenuOpen(!isOpen)}
        >
          <Img pos={[-383.4, -129.3]} size={[99.9, 99.9]} sprite="menu_icon_0" />
          <Img a={STRETCH} sprite="Button Border Pressed Default" color="#282828FF" sliced ppu={1} spritePpu={180} />
        </TintButton>
      </Rect>

      <Rect a={STRETCH} ref={panelRef}>
        <Img color="#424242FF" />
        <Img a={STRETCH} pos={[30.29, 0]} size={[60.57, 0]} sprite="Rectangle 110" color="#282828FF" sliced ppu={0.6} spritePpu={180} />

        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Text flow size={[711.98, 262.48]} fontSize={200} color="#F2F2F2FF" margin={[0, 97.755, 0, 15.196]}>
            {t('Menu_play')}
          </Text>

          <MenuRow label={t('New_game')} icon="restart_icon" onClick={() => toggle('newGame')} auto={[80, 110]} />
          <DropdownBody id="newGame" open={dropdown === 'newGame'}>
            <Text a={STRETCH} pos={[0, 79.69]} size={[-100, -159.38]} fontSize={75} auto={[50, 75]} color="#FFFFFFFF">
              {t('New_game_confirmation_message')}
            </Text>
            <TintButton pos={[0, -28]} size={[350, 100]} image={{ sprite: 'Button Background Sharp', color: '#FFFFFF0A', sliced: true, ppu: 0.8, spritePpu: 180 }} onClick={confirmNewGame}>
              <Text fontSize={75} auto={[50, 75]} color="#FFFFFFFF">
                {t('New_game_confirmation_answer')}
              </Text>
            </TintButton>
            <RaiseTab height={40} onClick={() => toggle('newGame')} />
          </DropdownBody>

          <MenuRow label={t('Menu_Languages')} icon="book_icon" onClick={() => toggle('language')} margin={[180, 0, 19.198, 0]} />
          <DropdownBody id="language" open={dropdown === 'language'}>
            <Rect pos={[0, 0]} size={[589.55, 116.81]} ref={selectorRef}>
              <Img sprite="Button Background Sharp" color="#FFFFFF0A" sliced ppu={1} spritePpu={180} />
              <Img pos={[-209.6, -6.3]} size={[105.28, 95.79]} sprite="point 1_0" preserve />
            </Rect>
            <Rect a={STRETCH} pos={[0, 25]} size={[0, -50]}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 50, gap: 30 }}>
                {(['en', 'is'] as const).map((code) => (
                  <TintButton key={code} flow size={[583.53, 112.62]} onClick={() => setLanguage(code)} tints={{ highlighted: 1, pressed: 1, disabled: 1, disabledAlpha: 1 }}>
                    <Text fontSize={100} auto={[50, 100]} color="#F5F5F5FF" align="Left" margin={[149.176, 0, 0, 12.607]}>
                      {t(code === 'en' ? 'Language_EN' : 'Language_IS')}
                    </Text>
                  </TintButton>
                ))}
              </div>
            </Rect>
            <RaiseTab height={50} onClick={() => toggle('language')} />
          </DropdownBody>

          <MenuRow label={t('Menu_settings')} icon="settings_icon" iconSize={80} onClick={() => toggle('settings')} />
          <DropdownBody id="settings" open={dropdown === 'settings'}>
            <SettingsList />
            <RaiseTab height={50} onClick={() => toggle('settings')} />
          </DropdownBody>

          <MenuRow label={t('Menu_rulebook')} icon="gavel_icon" iconSize={90} onClick={() => toggle('rulebook')} />
          <DropdownBody id="rulebook" open={dropdown === 'rulebook'} innerInset={0} anchorTop>
            <div className="scroll-y" style={{ position: 'absolute', inset: 0 }}>
              <div style={{ position: 'relative', height: 3052.8 }}>
                <Img a={[0, 0, 0, 0]} pos={[358.54, 1544.7]} size={[717.08, 2989.3]} sprite="Frame 8" preserve />
                <RaiseTab height={50} onClick={() => toggle('rulebook')} />
              </div>
            </div>
          </DropdownBody>

          <div style={{ position: 'relative', width: 723.89, flex: 'none', height: 1102.14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 40 }}>
            <LinkRow label={t('Menu_feedback')} icon="theater_icon" height={187.67} textHeight={152.58} textPos={-1.29} iconPos={[-91, -32.58]} margin={[327.458, 0, 60, 0]} onClick={() => openUrl(FEEDBACK_URL)} />
            <LinkRow label={t('Menu_data_privacy_page')} height={180.84} textHeight={150} textPos={0} margin={[200, 0, 60, 0]} onClick={() => openUrl(PRIVACY_URL)} />
          </div>
        </div>
      </Rect>
    </Rect>
  )
}

function LinkRow({ label, icon, height, textHeight, textPos, iconPos, margin, onClick }: {
  label: string
  icon?: string
  height: number
  textHeight: number
  textPos: number
  iconPos?: readonly [number, number]
  margin: readonly [number, number, number, number]
  onClick: () => void
}) {
  return (
    <TintButton flow size={[717.08, height]} onClick={onClick}>
      <Text a={[0, 0.5, 1, 0.5]} pos={[0, textPos]} size={[0, textHeight]} fontSize={87.65} auto={[50, 90]} color="#F2F2F2FF" align="Right" smallCaps ls={-20} margin={margin}>
        {label}
      </Text>
      <Img a={[0, 0, 1, 0]} pos={[75, 1]} size={[-250, 2]} color="#FFFFFFFF" />
      {icon && iconPos && <Img pos={iconPos} size={[90, 90]} sprite={icon} />}
    </TintButton>
  )
}

/** Settings dropdown: one row per toggle (thumb up/down, label) and a status line below. */
function SettingsList() {
  const t = useT()
  const settings = useGame((s) => s.settings)
  const locked = useGame((s) => s.settingsLocked)
  const setSetting = useGame((s) => s.setSetting)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(false), SETTING_ERROR_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [error])

  const flip = (key: SettingKey) => {
    const ok = setSetting(key, !settings[key])
    if (!ok && key === 'dmShuffle') setError(true)
  }

  const note = locked ? t('Settings_locked') : error ? t('Settings_dm_shuffle_teams') : ''
  return (
    <Rect a={STRETCH} pos={[0, 25]} size={[0, -50]}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 24 }}>
        {SETTINGS.map(({ key, label }) => (
          <TintButton
            key={key}
            flow
            size={[583.53, 112.62]}
            disabled={locked}
            onClick={() => flip(key)}
            style={{ opacity: locked ? 0.45 : 1, transition: 'opacity 0.15s linear' }}
          >
            <RowBackdrop on={settings[key]} />
            <ThumbToggle on={settings[key]} />
            <Text fontSize={85} auto={[50, 85]} color="#F5F5F5FF" align="Left" margin={[110, 0, 30, 6]}>
              {t(label)}
            </Text>
          </TintButton>
        ))}
        <Text flow size={[583.53, 110]} fontSize={48} auto={[30, 48]} color={locked ? '#BDBDBDFF' : '#FF8A8AFF'}>
          {note}
        </Text>
      </div>
    </Rect>
  )
}

/**
 * Lighter row background, shown only while the setting is on. It switches as the flipping thumb
 * lands: turning on, it appears with a brief flash; turning off, it fades away.
 */
function RowBackdrop({ on }: { on: boolean }) {
  const prev = useRef(on)
  const baseRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prev.current === on) return
    prev.current = on
    const land = THUMB_LAND
    if (on) {
      baseRef.current?.animate([{ opacity: 0 }, { opacity: 0, offset: land }, { opacity: 1, offset: land + 0.05 }, { opacity: 1 }], THUMB_FLIP_MS)
      // The flash outlasts the flip a little so it can fade out softly.
      const total = THUMB_FLIP_MS * 1.6
      const at = (THUMB_FLIP_MS * land) / total
      flashRef.current?.animate([{ opacity: 0 }, { opacity: 0, offset: at }, { opacity: 1, offset: at + 0.04, easing: 'ease-out' }, { opacity: 0 }], total)
    } else {
      baseRef.current?.animate([{ opacity: 1 }, { opacity: 1, offset: land }, { opacity: 0 }], THUMB_FLIP_MS)
    }
  }, [on])

  const sprite = { sprite: 'Button Background Sharp', sliced: true, ppu: 1, spritePpu: 180 } as const
  return (
    <>
      <div ref={baseRef} style={{ position: 'absolute', inset: 0, opacity: on ? 1 : 0 }}>
        <Img {...sprite} color="#FFFFFF0A" />
      </div>
      <div ref={flashRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
        <Img {...sprite} color="#FFFFFF28" />
      </div>
    </>
  )
}

/**
 * Thumbs up (on) / thumbs down (off) with a soft drop shadow underneath, like the language
 * pointer. Toggling flips it half a turn while it hops; the shadow stays grounded and shrinks.
 */
function ThumbToggle({ on }: { on: boolean }) {
  // Accumulated angle so every flip spins the same way: 0 = up, 180 = down (mod 360).
  const angle = useRef(on ? 0 : 180)
  const prev = useRef(on)
  const iconRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prev.current === on) return
    prev.current = on
    const from = angle.current
    const to = (angle.current += 180)
    // This render still carried the old angle; settle both layers on the new one.
    for (const el of [iconRef.current, shadowRef.current]) if (el) el.style.transform = `rotate(${to}deg)`
    const opts: KeyframeAnimationOptions = { duration: THUMB_FLIP_MS, easing: 'linear' }
    iconRef.current?.animate(
      [
        { transform: `translateY(0) rotate(${from}deg) scale(1)`, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
        { transform: `translateY(-38px) rotate(${from + 110}deg) scale(1.3)`, offset: 0.45, easing: 'cubic-bezier(0.6, 0, 0.8, 0.4)' },
        { transform: `translateY(0) rotate(${to + 14}deg) scale(0.92)`, offset: THUMB_LAND, easing: 'ease-out' },
        { transform: `translateY(0) rotate(${to}deg) scale(1)` },
      ],
      opts,
    )
    shadowRef.current?.animate(
      [
        { transform: `rotate(${from}deg) scale(1)`, opacity: 1 },
        { transform: `rotate(${from + 110}deg) scale(0.7)`, opacity: 0.35, offset: 0.45 },
        { transform: `rotate(${to + 14}deg) scale(1)`, opacity: 1, offset: THUMB_LAND },
        { transform: `rotate(${to}deg) scale(1)`, opacity: 1 },
      ],
      opts,
    )
  }, [on])

  const rest = { position: 'absolute', inset: 0, transform: `rotate(${angle.current}deg)` } as const
  return (
    <>
      <Rect a={[0, 0.5, 0, 0.5]} pos={[52, -7]} size={[84, 84]}>
        <div ref={shadowRef} style={rest}>
          <Img sprite="thumb_shadow" />
        </div>
      </Rect>
      <Rect a={[0, 0.5, 0, 0.5]} pos={[52, 0]} size={[84, 84]}>
        <div ref={iconRef} style={rest}>
          <Img sprite="thumb_icon" />
        </div>
      </Rect>
    </>
  )
}
