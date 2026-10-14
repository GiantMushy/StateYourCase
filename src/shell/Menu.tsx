// Slide-out side menu (Unity MenuController): tab button in the top-right corner, three
// accordion dropdowns (New Game confirm, Language, Rulebook) and two external links.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useGame } from '../game/store'
import { useT } from '../i18n'
import { lerpStep, tween, easeInCubic, easeOutCubic, useFrame } from '../ui/anim'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { useStage } from '../ui/Stage'
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

type DropdownId = 'newGame' | 'language' | 'rulebook'
const HEIGHTS: Record<DropdownId, number> = { newGame: 292.75, language: 371.8, rulebook: 750 }

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
  const { width } = useStage()
  const isOpen = useGame((s) => s.menuOpen)
  const setMenuOpen = useGame((s) => s.setMenuOpen)
  const language = useGame((s) => s.language)
  const setLanguage = useGame((s) => s.setLanguage)
  const playTransition = useGame((s) => s.playTransition)
  const newGame = useGame((s) => s.newGame)

  const [dropdown, setDropdown] = useState<DropdownId | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const anim = useRef({ x: MENU_WIDTH, tabY: 0, selectorY: 0, written: '' })

  // Closed: anchoredPosition.x = width (off-screen right). Open: localPosition.x = 500.
  const targetX = isOpen ? 500 - width / 2 : MENU_WIDTH
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
    if (tabRef.current) tabRef.current.style.translate = `0 ${a.tabY}px`
    if (selectorRef.current) selectorRef.current.style.translate = `0 ${-a.selectorY}px`
  })

  useLayoutEffect(() => {
    if (menuRef.current) menuRef.current.style.transform = `translateX(${anim.current.x}px)`
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
    <Rect a={[1, 0, 1, 1]} pivot={[1, 0.5]} pos={[0, 0]} size={[MENU_WIDTH, 0]} ref={menuRef}>
      {isOpen && (
        <TintButton a={[0, 0, 0, 1]} pos={[-750, 0]} size={[1500, 0]} onClick={() => setMenuOpen(false)} />
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

      <Rect a={STRETCH}>
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
