import { useState } from 'react'
import NumberInput from './NumberInput'
import { SPEED_TYPES } from '../utils/helpers'

// Fly / Swim / Climb / Burrow speeds, hidden behind an "Add other speeds" button
// until the monster has one. Blank boxes mean the monster lacks that movement mode.

export default function OtherSpeedsEditor({ speeds, onChange }) {
  const current = speeds ?? {}
  const hasAny = SPEED_TYPES.some(t => Number.isFinite(current[t.id]) && current[t.id] > 0)
  const [open, setOpen] = useState(hasAny)

  function setSpeed(id, val) {
    const next = { ...current }
    if (val === null) delete next[id]
    else next[id] = val
    onChange(next)
  }

  function removeAll() {
    onChange({})
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'flex-start' }}
      >
        + Add other speeds (fly, swim, climb, burrow)
      </button>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: 12,
      background: 'var(--surface2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="field-label" style={{ margin: 0 }}>Other Speeds</div>
        <button
          type="button"
          onClick={removeAll}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text3)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Remove
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {SPEED_TYPES.map(t => (
          <div key={t.id} style={{ flex: 1 }}>
            <div className="field-label">{t.label} (ft)</div>
            <NumberInput
              min={0}
              step={5}
              allowEmpty
              placeholder="—"
              value={Number.isFinite(current[t.id]) ? current[t.id] : null}
              onChange={val => setSpeed(t.id, val)}
            />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        Leave a box blank if the monster doesn't have that speed.
      </div>
    </div>
  )
}
