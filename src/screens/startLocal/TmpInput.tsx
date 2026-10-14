// A real <input> styled like a Unity TMP_InputField's text area (Iceland font, italic
// placeholder, #323232 caret, TMP selection colour). Place it inside the "Text Area" rect.
// `onEndEdit` mirrors TMP's onEndEdit: it fires on Enter and on blur (deselect).
import { useRef, type CSSProperties, type Ref } from 'react'
import './tmpInput.css'

export interface TmpInputProps {
  value: string
  onChange: (value: string) => void
  /**
   * Called on Enter (`submitted`) and on blur. Returning true after a submit keeps the field
   * focused (Unity's ActivateInputField right after onEndEdit); otherwise Enter deselects it.
   */
  onEndEdit: (value: string, submitted: boolean) => boolean | void
  placeholder: string
  fontSize: number
  /** '#RRGGBB[AA]' */
  color?: string
  placeholderColor: string
  /** TMP_InputField.characterLimit */
  maxLength?: number
  inputRef?: Ref<HTMLInputElement>
  style?: CSSProperties
}

const cssColor = (hex: string) => {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${h.length >= 8 ? n(6) / 255 : 1})`
}

export function TmpInput({ value, onChange, onEndEdit, placeholder, fontSize, color = '#323232FF', placeholderColor, maxLength, inputRef, style }: TmpInputProps) {
  // Enter already fired onEndEdit; skip the blur that follows it.
  const skipBlur = useRef(false)
  return (
    <input
      ref={inputRef}
      className="tmp-input"
      type="text"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (!onEndEdit(e.currentTarget.value, true)) {
          skipBlur.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        if (skipBlur.current) skipBlur.current = false
        else onEndEdit(e.currentTarget.value, false)
      }}
      style={{ fontSize, color: cssColor(color), ['--tmp-ph' as string]: cssColor(placeholderColor), ...style }}
    />
  )
}
