import { useState } from 'react'
import NumberInput from './NumberInput'
import {
  uid, EMPTY_MONSTER_SPELL, EMPTY_SPELLCASTING, EMPTY_MULTIATTACK, SPELLCASTING_ABILITIES, SPELL_ACTION_TYPES,
  ABILITY_KEYS, ABILITY_LABELS, ABILITY_NAMES, modStr, spellAttackBonus,
  spellFrequencyLabel, spellDefenseLine, groupSpellsByFrequency,
} from '../utils/helpers'

// Monster spellcasting editor. Monsters use one Spellcasting entry (ability,
// save DC, attack bonus) and spells that are At Will or N/Day, cast as an
// action, bonus action or reaction. Players keep the slot-based SpellEditor.
// Action spells can be marked (orange) as usable in place of a Multiattack attack.

const PURPLE_COLOR = { border: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)' }
const MULTI_COLOR  = { border: 'var(--orange)', bg: 'var(--orange-bg)', text: 'var(--orange-text)' }

function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      {options.map((opt, i) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          style={{
            flex: 1,
            padding: '7px 10px',
            border: 'none',
            borderRight: i < options.length - 1 ? '1px solid var(--border-strong)' : 'none',
            background: value === opt.id ? 'var(--accent)' : 'var(--surface2)',
            color: value === opt.id ? '#fff' : 'var(--text2)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PillToggle({ active, onChange, label, color = PURPLE_COLOR, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={() => onChange(!active)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 99,
        border: `1.5px solid ${active ? color.border : 'var(--border-strong)'}`,
        background: active ? color.bg : 'var(--surface2)',
        color: active ? color.text : 'var(--text2)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.12s', userSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

// ─── Spellcasting header card ─────────────────────────────────────────────────

function SpellcastingCard({ spellcasting, onChange }) {
  const sc = spellcasting ?? EMPTY_SPELLCASTING
  const set = (field, val) => onChange({ ...sc, [field]: val })
  const autoBonus = (Number(sc.saveDC) || 0) - 8

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, background: 'var(--surface2)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <div className="field-label">Spellcasting Ability</div>
          <select value={sc.ability} onChange={e => set('ability', e.target.value)}>
            {SPELLCASTING_ABILITIES.map(ab => <option key={ab} value={ab}>{ABILITY_NAMES[ab]}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Spell Save DC</div>
          <NumberInput
            min={1} max={30}
            value={sc.saveDC}
            onChange={val => set('saveDC', val)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Spell Attack</div>
          <NumberInput
            allowEmpty
            value={sc.attackBonus ?? null}
            placeholder={modStr(autoBonus)}
            title="Leave blank to use save DC − 8"
            onChange={val => set('attackBonus', val)}
          />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div className="field-label">Spellcasting Note</div>
        <input
          type="text"
          value={sc.note ?? ''}
          placeholder="e.g. requires no Material components"
          onChange={e => set('note', e.target.value)}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
        Applies to every spell below. Spell attack defaults to save DC − 8 ({modStr(autoBonus)}) when left blank.
      </div>
    </div>
  )
}

// ─── One spell ────────────────────────────────────────────────────────────────

function SpellRow({ spell, spellcasting, expanded, onToggle, onUpdate, onRemove, showMultiattack }) {
  const update = (field, val) => onUpdate(spell.id, { [field]: val })
  const defense = spellDefenseLine(spell, spellcasting)
  const actionType = SPELL_ACTION_TYPES.find(t => t.id === spell.actionType)
  const isAction = (spell.actionType ?? 'action') === 'action'
  const multi = showMultiattack && isAction && !!spell.multiattack

  function setActionType(val) {
    // Only action spells can be part of Multiattack.
    onUpdate(spell.id, val === 'action' ? { actionType: val } : { actionType: val, multiattack: false })
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6, overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Collapsed header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer',
          background: expanded ? 'var(--surface2)' : 'var(--surface)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          borderLeft: multi ? '3px solid var(--orange)' : '3px solid transparent',
        }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {spell.name || 'Unnamed Spell'}
            <span className="tag tag-purple" style={{ fontSize: 9 }}>{spellFrequencyLabel(spell)}</span>
            {spell.actionType !== 'action' && (
              <span className="tag tag-blue" style={{ fontSize: 9 }}>{actionType?.label}</span>
            )}
            {spell.castLevel ? <span className="tag tag-gray" style={{ fontSize: 9 }}>Lvl {spell.castLevel}</span> : null}
            {spell.concentration && <span className="tag tag-amber" style={{ fontSize: 9 }}>⟳ Conc.</span>}
            {multi && <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>}
          </div>
          {(defense || spell.effect) && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[defense, spell.effect].filter(Boolean).join(' · ')}
            </div>
          )}
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
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name + Frequency + Uses */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div className="field-label">Spell Name</div>
              <input type="text" value={spell.name} placeholder="e.g. Fireball" onChange={e => update('name', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Frequency</div>
              <select
                value={spell.frequency}
                onChange={e => onUpdate(spell.id, {
                  frequency: e.target.value,
                  usesPerDay: e.target.value === 'perDay' ? (spell.usesPerDay || 1) : spell.usesPerDay,
                })}
              >
                <option value="atWill">At Will</option>
                <option value="perDay">Per Day</option>
              </select>
            </div>
            {spell.frequency === 'perDay' && (
              <div style={{ flex: 1 }}>
                <div className="field-label">Uses / Day</div>
                <NumberInput
                  min={1} max={9}
                  value={spell.usesPerDay}
                  onChange={val => update('usesPerDay', val)}
                />
              </div>
            )}
          </div>

          {/* Action type */}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Cast As</div>
            <Segmented
              value={spell.actionType}
              options={SPELL_ACTION_TYPES.map(t => ({ id: t.id, label: t.label }))}
              onChange={setActionType}
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <PillToggle active={spell.concentration} onChange={val => update('concentration', val)} label="⟳ Concentration" />
            {showMultiattack && isAction && (
              <PillToggle
                active={!!spell.multiattack}
                onChange={val => update('multiattack', val)}
                label="Multiattack"
                color={MULTI_COLOR}
                title="Can be cast in place of one of the attacks in Multiattack"
              />
            )}
          </div>

          {/* Cast level + Range + Duration */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Cast Level</div>
              <select
                value={spell.castLevel ?? ''}
                onChange={e => update('castLevel', e.target.value === '' ? null : parseInt(e.target.value))}
                title="Only if the stat block names a level, e.g. a level 4 version of Fireball"
              >
                <option value="">Default</option>
                {Array.from({ length: 9 }, (_, i) => i + 1).map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Range</div>
              <input type="text" value={spell.range} placeholder="e.g. 120 ft" onChange={e => update('range', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Duration</div>
              <input type="text" value={spell.duration} placeholder="e.g. Instantaneous" onChange={e => update('duration', e.target.value)} />
            </div>
          </div>

          {/* Defense */}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Defense / Save</div>
            <Segmented
              value={spell.defenseType}
              options={[{ id: 'none', label: 'None' }, { id: 'save', label: 'Save' }, { id: 'attack', label: 'Attack Roll' }]}
              onChange={val => update('defenseType', val)}
            />
          </div>

          {spell.defenseType === 'save' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div className="field-label">Save Ability</div>
                <select value={spell.saveAbility} onChange={e => update('saveAbility', e.target.value)}>
                  {ABILITY_KEYS.map(ab => <option key={ab} value={ab}>{ABILITY_LABELS[ab]}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <div className="field-label">On Successful Save</div>
                <input type="text" value={spell.onSave} placeholder="e.g. half damage" onChange={e => update('onSave', e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingBottom: 9, whiteSpace: 'nowrap' }}>
                DC {spellcasting?.saveDC ?? '—'}
              </div>
            </div>
          )}

          {spell.defenseType === 'attack' && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Uses the spell attack bonus from Spellcasting ({modStr(spellAttackBonus(spellcasting))}).
            </div>
          )}

          {/* Description — shown right after the save DC in the stat block */}
          <div>
            <div className="field-label">Description</div>
            <textarea
              rows={3}
              value={spell.description}
              placeholder="Spell text or special rules…"
              onChange={e => update('description', e.target.value)}
            />
          </div>

          {/* Damage / Effect */}
          <div>
            <div className="field-label">Damage / Effect</div>
            <textarea
              rows={3}
              value={spell.effect}
              placeholder="e.g. 8d6 fire damage, or half as much on a successful save. The first dice and damage type are used when rolling in combat."
              onChange={e => update('effect', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export default function MonsterSpellEditor({
  spellcasting, spells = [], onChangeSpellcasting, onChangeSpells,
  multiattack = null, onChangeMultiattack,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const sc = spellcasting ?? EMPTY_SPELLCASTING
  const showMultiattack = !!onChangeMultiattack

  function add() {
    const s = { ...EMPTY_MONSTER_SPELL, id: uid() }
    if (!spellcasting) onChangeSpellcasting({ ...EMPTY_SPELLCASTING })
    onChangeSpells([...spells, s])
    setExpandedId(s.id)
  }

  function update(id, changes) {
    // Marking a spell as a Multiattack option turns Multiattack on, same as attacks.
    if (changes.multiattack && !multiattack && onChangeMultiattack) {
      onChangeMultiattack({ ...EMPTY_MULTIATTACK })
    }
    onChangeSpells(spells.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function remove(id) {
    onChangeSpells(spells.filter(s => s.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // Same order as the stat block: action spells by frequency, then bonus actions, then reactions.
  const sections = [
    ...groupSpellsByFrequency(spells.filter(s => s.actionType === 'action')).map(g => ({ key: `a-${g.key}`, label: g.label, list: g.spells })),
    { key: 'bonus',    label: 'Bonus Actions', list: spells.filter(s => s.actionType === 'bonus') },
    { key: 'reaction', label: 'Reactions',     list: spells.filter(s => s.actionType === 'reaction') },
  ].filter(sec => sec.list.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Spellcasting</div>
        <SpellcastingCard spellcasting={sc} onChange={onChangeSpellcasting} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>Spells</div>
        {spells.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No spells added yet.</p>
        )}

        {sections.map(sec => (
          <div key={sec.key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--purple-text)', marginBottom: 5 }}>
              {sec.label}
            </div>
            {sec.list.map(s => (
              <SpellRow
                key={s.id}
                spell={s}
                spellcasting={sc}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onUpdate={update}
                onRemove={remove}
                showMultiattack={showMultiattack}
              />
            ))}
          </div>
        ))}

        <button type="button" className="btn btn-ghost btn-sm" onClick={add} style={{ marginTop: 4 }}>
          + Add Spell
        </button>
      </div>
    </div>
  )
}
