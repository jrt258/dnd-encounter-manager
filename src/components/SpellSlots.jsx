import { SPELL_SLOT_LEVELS } from '../utils/helpers'

export default function SpellSlots({ slots, onChange, readOnly }) {
  function handleChange(level, val) {
    const n = parseInt(val) || 0
    const next = { ...slots }
    if (n <= 0) delete next[level]
    else next[level] = n
    onChange(next)
  }

  if (readOnly) {
    const entries = SPELL_SLOT_LEVELS.filter(l => slots[l] > 0)
    if (entries.length === 0) {
      return <span style={{ fontSize: 13, color: 'var(--text3)' }}>None</span>
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entries.map(l => (
          <span key={l} className="tag tag-purple">Lvl {l}: {slots[l]}</span>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 8 }}>
      {SPELL_SLOT_LEVELS.map(level => (
        <div key={level}>
          <div className="field-label" style={{ textAlign: 'center', marginBottom: 4 }}>
            Lvl {level}
          </div>
          <input
            type="number"
            min={0}
            max={9}
            placeholder="0"
            value={slots[level] || ''}
            onChange={e => handleChange(level, e.target.value)}
            style={{ textAlign: 'center' }}
          />
        </div>
      ))}
    </div>
  )
}
