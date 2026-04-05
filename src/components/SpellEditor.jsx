import { useState } from 'react'
import { uid, EMPTY_SPELL, SPELL_SCHOOLS, CASTING_TIMES, ABILITY_KEYS, ABILITY_LABELS } from '../utils/helpers'

const LEVELS = [
  { value: 0, label: 'Cantrip' },
  ...Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` })),
]

function spellSummary(spell) {
  const lvl = spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`
  let defense = ''
  if (spell.defenseType === 'save') {
    defense = ` · ${ABILITY_LABELS[spell.saveAbility] ?? spell.saveAbility} Save DC ${spell.saveDC}`
  } else if (spell.defenseType === 'attack') {
    defense = ` · ${spell.attackBonus >= 0 ? '+' : ''}${spell.attackBonus} Attack`
  }
  const tags = []
  if (spell.concentration) tags.push('⟳')
  if (spell.ritual)        tags.push('ℛ')
  return `${lvl} · ${spell.school}${defense}${tags.length ? '  ' + tags.join(' ') : ''}`
}

function DefenseToggle({ value, onChange }) {
  const options = [
    { id: 'none',   label: 'None' },
    { id: 'save',   label: 'Save' },
    { id: 'attack', label: 'Attack Roll' },
  ]
  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          style={{
            flex: 1,
            padding: '7px 10px',
            border: 'none',
            borderRight: opt.id !== 'attack' ? '1px solid var(--border-strong)' : 'none',
            background: value === opt.id ? 'var(--accent)' : 'var(--surface2)',
            color: value === opt.id ? '#fff' : 'var(--text2)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PillToggle({ active, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 99,
        border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border-strong)'}`,
        background: active ? 'var(--purple-bg)' : 'var(--surface2)',
        color: active ? 'var(--purple-text)' : 'var(--text2)',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

function SpellRow({ spell, expanded, onToggle, onUpdate, onRemove }) {
  const update = (field, val) => onUpdate(spell.id, field, val)
  const updateNested = (parent, field, val) => onUpdate(spell.id, parent, { ...spell[parent], [field]: val })

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: 6,
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Collapsed header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', cursor: 'pointer',
          background: expanded ? 'var(--surface2)' : 'var(--surface)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {spell.name || 'Unnamed Spell'}
            {spell.concentration && (
              <span title="Concentration" style={{ fontSize: 11, color: 'var(--purple-text)', background: 'var(--purple-bg)', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>⟳ Conc.</span>
            )}
            {spell.ritual && (
              <span title="Ritual" style={{ fontSize: 11, color: 'var(--blue-text)', background: 'var(--blue-bg)', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>ℛ Ritual</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontFamily: 'DM Mono, monospace' }}>
            {spellSummary(spell)}
          </div>
        </div>

        <button
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 'var(--radius-xs)', transition: 'color 0.1s' }}
          onClick={e => { e.stopPropagation(); onRemove(spell.id) }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          title="Remove spell"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>

        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--text3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1: Name + Level + School */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div className="field-label">Spell Name</div>
              <input
                value={spell.name}
                placeholder="e.g. Fireball"
                onChange={e => update('name', e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Level</div>
              <select value={spell.level} onChange={e => update('level', parseInt(e.target.value))}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">School</div>
              <select value={spell.school} onChange={e => update('school', e.target.value)}>
                {SPELL_SCHOOLS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Casting Time + Range + Duration */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Casting Time</div>
              <select value={spell.castingTime} onChange={e => update('castingTime', e.target.value)}>
                {CASTING_TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Range</div>
              <input
                value={spell.range}
                placeholder="e.g. 60 ft"
                onChange={e => update('range', e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Duration</div>
              <input
                value={spell.duration}
                placeholder="e.g. Instantaneous"
                onChange={e => update('duration', e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Components */}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Components</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {[['v', 'V — Verbal'], ['s', 'S — Somatic'], ['m', 'M — Material']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={spell.components[key] ?? false}
                    onChange={e => updateNested('components', key, e.target.checked)}
                    style={{ width: 'auto', accentColor: 'var(--accent)' }}
                  />
                  {label}
                </label>
              ))}
              {spell.components.m && (
                <input
                  style={{ flex: 1, minWidth: 140 }}
                  value={spell.material}
                  placeholder="Material component..."
                  onChange={e => update('material', e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Row 4: Defense type toggle */}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Defense / Save</div>
            <DefenseToggle value={spell.defenseType} onChange={val => update('defenseType', val)} />
          </div>

          {/* Conditional save fields */}
          {spell.defenseType === 'save' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="field-label">Ability</div>
                <select value={spell.saveAbility} onChange={e => update('saveAbility', e.target.value)}>
                  {ABILITY_KEYS.map(ab => (
                    <option key={ab} value={ab}>{ABILITY_LABELS[ab]}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-label">Save DC</div>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={spell.saveDC}
                  onChange={e => update('saveDC', parseInt(e.target.value) || 10)}
                />
              </div>
              <div style={{ flex: 2 }}>
                <div className="field-label">On Successful Save</div>
                <input
                  value={spell.onSave}
                  placeholder="e.g. half damage, no effect"
                  onChange={e => update('onSave', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Conditional attack roll field */}
          {spell.defenseType === 'attack' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, maxWidth: 140 }}>
                <div className="field-label">Spell Attack Bonus</div>
                <input
                  type="number"
                  value={spell.attackBonus}
                  onChange={e => update('attackBonus', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          {/* Row 5: Effect / Damage */}
          <div>
            <div className="field-label">Damage / Effect</div>
            <input
              value={spell.effect}
              placeholder="e.g. 8d6 fire damage"
              onChange={e => update('effect', e.target.value)}
            />
          </div>

          {/* Row 6: Concentration + Ritual toggles */}
          <div style={{ display: 'flex', gap: 8 }}>
            <PillToggle
              active={spell.concentration}
              onChange={val => update('concentration', val)}
              label="⟳ Concentration"
            />
            <PillToggle
              active={spell.ritual}
              onChange={val => update('ritual', val)}
              label="ℛ Ritual"
            />
          </div>

          {/* Row 7: Description */}
          <div>
            <div className="field-label">Description</div>
            <textarea
              rows={3}
              value={spell.description}
              placeholder="Full spell description, special rules..."
              onChange={e => update('description', e.target.value)}
            />
          </div>

        </div>
      )}
    </div>
  )
}

export default function SpellEditor({ spells = [], onChange }) {
  const [expandedId, setExpandedId] = useState(null)

  function add() {
    const s = { ...EMPTY_SPELL, id: uid() }
    onChange([...spells, s])
    setExpandedId(s.id)
  }

  function update(id, field, val) {
    onChange(spells.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  function remove(id) {
    onChange(spells.filter(s => s.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // Group by level for display
  const sorted = [...spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

  return (
    <div>
      {spells.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No spells added yet.</p>
      )}

      {sorted.map(s => (
        <SpellRow
          key={s.id}
          spell={s}
          expanded={expandedId === s.id}
          onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
          onUpdate={update}
          onRemove={remove}
        />
      ))}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={add}
        style={{ marginTop: 4 }}
      >
        + Add Spell
      </button>
    </div>
  )
}
