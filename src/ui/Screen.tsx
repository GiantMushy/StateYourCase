import type { ReactNode } from 'react'
import { Rect, STRETCH } from './Rect'

/** A full-canvas screen panel (children of Unity "ScreenStates"). */
export function Screen({ children }: { children: ReactNode }) {
  return <Rect a={STRETCH}>{children}</Rect>
}
