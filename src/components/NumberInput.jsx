import { useState, useEffect } from 'react'

// A controlled number box that can be cleared while typing.
//
// A plain <input type="number" onChange={e => set(parseInt(e.target.value) || 10)} />
// writes the fallback back the instant the box is emptied, so a value can never be
// deleted and retyped. This component keeps the typed text as a local draft, only
// reports real numbers to onChange, and settles the value when the box loses focus:
//   - blank box  -> null if allowEmpty, otherwise the last saved value is restored
//   - out of range -> clamped to min / max

function parse(str) {
  if (str === '' || str === '-') return null
  const n = parseInt(str, 10)
  return Number.isNaN(n) ? null : n
}

function toStr(v) {
  return v === null || v === undefined || Number.isNaN(v) ? '' : String(v)
}

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  allowEmpty = false,
  onBlur,
  ...rest
}) {
  const [draft, setDraft] = useState(() => toStr(value))

  // Pick up changes made from outside this box (reset, auto-fill, another control),
  // but leave the draft alone when it already represents the same number.
  useEffect(() => {
    setDraft(d => (parse(d) === (value ?? null) ? d : toStr(value)))
  }, [value])

  const clamp = n => {
    let out = n
    if (min !== undefined && out < min) out = min
    if (max !== undefined && out > max) out = max
    return out
  }

  function handleChange(e) {
    const str = e.target.value
    setDraft(str)
    const n = parse(str)
    if (n !== null) onChange(n)
    else if (allowEmpty && str === '') onChange(null)
  }

  function handleBlur(e) {
    const n = parse(draft)
    let next
    if (n === null) next = allowEmpty ? null : clamp(value ?? min ?? 0)
    else next = clamp(n)
    setDraft(toStr(next))
    if (next !== (value ?? null)) onChange(next)
    if (onBlur) onBlur(e)
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      {...rest}
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
