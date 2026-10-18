// Where the game runs: the web build, or the native app shell (Capacitor, see native.ts).
import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const isIOS = Capacitor.getPlatform() === 'ios'

/**
 * Lay the stage out inside the system bars and keep it still under the soft keyboard (see
 * Stage). `?native=1` tries it in a dev browser, with insets faked via `--safe-area-inset-*`.
 */
export const nativeLayout = isNative || (import.meta.env.DEV && new URLSearchParams(location.search).get('native') === '1')
