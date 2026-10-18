// Native app shell (Capacitor): wraps the Vite build (`dist`) in the Android (`android/`) and iOS (`ios/`) projects.
// After changing web code: `npm run build && npx cap sync` (android and ios).
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Same identifier as the Unity build (Player Settings), so the store listing carries over.
  appId: 'com.angrypuffingames.stateyourcase',
  appName: 'State Your Case',
  webDir: 'dist',
  // Shown before the page paints: the default teal background.
  backgroundColor: '#48CFCB',
  ios: {
    // iPad web views default to desktop-class browsing, whose text autosizing inflates the small
    // captions (e.g. "Only 1 phone"). Phones and the web build are unaffected.
    preferredContentMode: 'mobile',
  },
  plugins: {
    SystemBars: {
      // Edge to edge: the page draws behind the system bars and reads the insets from
      // --safe-area-inset-* (see Stage). index.html sets viewport-fit=cover.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // Dark status bar icons on the light teal; native.ts switches them per background colour.
      style: 'LIGHT',
    },
  },
}

export default config
