// RFC 4180 CSV parser matching the Unity loaders: handles "" escapes, \" escapes and
// multiline quoted cells. Returns raw (untrimmed) fields per row.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let fields: string[] = []
  let cur = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if ((c === '\\' || c === '"') && text[i + 1] === '"') {
        cur += '"'
        i += 2
        continue
      }
      if (c === '"') {
        inQuotes = false
        i++
        continue
      }
      cur += c
      i++
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        fields.push(cur)
        cur = ''
      } else if (c === '\n') {
        fields.push(cur)
        cur = ''
        rows.push(fields)
        fields = []
      } else if (c !== '\r') cur += c
      i++
    }
  }
  if (cur.length > 0 || fields.length > 0) {
    fields.push(cur)
    rows.push(fields)
  }
  return rows
}

export const field = (fields: string[], index: number) => (index < fields.length ? fields[index].trim() : '')
