// TMP_InputField look-alike used by the online screens: sliced background + pressed border,
// an inset "Text Area" holding an italic placeholder (shown while empty) and the text.
import { useState } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'

export function TmpInput({ pos, placeholder, borderColor = '#424242FF' }: { pos: V2; placeholder: string; borderColor?: string }) {
  const [value, setValue] = useState('')
  return (
    <Rect pos={pos} size={[750, 120]}>
      <Img a={STRETCH} size={[-10, -10]} sprite="Button Background Square" color="#F2F2F2FF" sliced spritePpu={180} />
      <Img sprite="Button Border Pressed Square" color={borderColor} sliced spritePpu={180} />
      <Rect a={STRETCH} pos={[0, -0.5]} size={[-80, -13]} style={{ overflow: 'hidden' }}>
        {!value && (
          <Text fontSize={72} color="#32323280" align="Left" italic nowrap>
            {placeholder}
          </Text>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'Iceland, sans-serif',
            fontSize: 72,
            color: '#323232',
            caretColor: '#323232',
          }}
        />
      </Rect>
    </Rect>
  )
}
