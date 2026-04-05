import { useState } from 'react'
import { uid, EMPTY_ATTACK, DAMAGE_TYPES } from '../utils/helpers'

export default function AttackEditor({ attacks = [], onChange }) {
  const [expandedId, setExpandedId] = useState(null)

  function add() {
    const a = { ...EMPTY_ATTACK, id: uid() }
    onChange([...attacks, a])
    setExpandedId(a.id)
  }

  function update(id, field, val) {
    onChange(attacks.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  function remove(id) {
    onChange(attacks.filter(a => a.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div>
      {attacks.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No attacks added yet.</p>
      )}

      {attacks.map(a => (
        <div
          key={a.id}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 6,
            overflow: 'hidden',
            background: 'var(--surface)',
          }}
        >
          {/* Collapsed header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', cursor: 'pointer',
              background: expandedId === a.id ? 'var(--surface2)' : 'var(--surface)',
              borderBottom: expandedId === a.id ? '1px solid var(--border)' : 'none',
            }}
            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {a.name || 'Unnamed Attack'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                {a.hitBonus >= 0 ? '+' : ''}{a.hitBonus} to hit · {a.damage} {a.damageType}
              </div>
            </div>

            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 'var(--radius-xs)', transition: 'color 0.1s' }}
              onClick={e => { e.stopPropagation(); remove(a.id) }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              title="Remove attack"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>

            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--text3)', flexShrink: 0, transform: expandedId === a.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Expanded fields */}
          {expandedId === a.id && (
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Row 1: Name + Hit Bonus */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 2 }}>
                  <div className="field-label">Attack Name</div>
                  <input
                    value={a.name}
                    placeholder="e.g. Shortsword"
                    onChange={e => update(a.id, 'name', e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Hit Bonus</div>
                  <input
                    type="number"
                    value={a.hitBonus}
                    onChange={e => update(a.id, 'hitBonus', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Row 2: Damage Dice + Damage Type */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Damage Dice</div>
                  <input
                    value={a.damage}
                    placeholder="e.g. 2d6+3"
                    onChange={e => update(a.id, 'damage', e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Damage Type</div>
                  <select
                    value={a.damageType}
                    onChange={e => update(a.id, 'damageType', e.target.value)}
                  >
                    {DAMAGE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Notes */}
              <div>
                <div className="field-label">Notes</div>
                <input
                  value={a.notes}
                  placeholder="Optional — reach, range, special effects..."
                  onChange={e => update(a.id, 'notes', e.target.value)}
                />
              </div>

            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={add}
        style={{ marginTop: 4 }}
      >
        + Add Attack
      </button>
    </div>
  )
}
