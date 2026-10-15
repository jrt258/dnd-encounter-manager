import { useState } from 'react'
import {
  uid, EMPTY_ATTACK, EMPTY_DAMAGE_PART, EMPTY_MULTIATTACK, MAX_EXTRA_DAMAGE, DAMAGE_TYPES,
  normalizeAttack, diceAverage, attackDamageText, attackKindLabel, attackReachText,
  multiattackText, modStr,
} from '../utils/helpers'

// Attack editor shared by monsters and players.
// Multiattack controls only appear when `onChangeMultiattack` is passed (monsters).
// Colour key: orange = usable as part of Multiattack, blue = attack type.

const MULTI_COLOR = { border: 'var(--orange)', bg: 'var(--orange-bg)', text: 'var(--orange-text)' }
const KIND_COLOR  = { border: 'var(--blue)',   bg: 'var(--blue-bg)',   text: 'var(--blue-text)' }

function PillToggle({ active, onChange, label, color = KIND_COLOR, title }) {
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
      <span style={{ fontSize: 11, width: 10, display: 'inline-block', textAlign: 'center' }}>{active ? '✓' : ''}</span>
      {label}
    </button>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  )
}

function IconButton({ onClick, title, children }) {
  return (
    <button
      type="button"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 'var(--radius-xs)', transition: 'color 0.1s' }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      title={title}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children, color = 'var(--text3)' }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, marginBottom: 5 }}>
      {children}
    </div>
  )
}

function TypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {DAMAGE_TYPES.map(t => (
        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
      ))}
    </select>
  )
}

// One damage line: Dice | Average | Type [| remove]
function DamageRow({ label, dice, average, type, onChange, onRemove }) {
  const auto = diceAverage(dice)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ flex: 3 }}>
        {label && <div className="field-label">{label}</div>}
        <input
          type="text"
          value={dice}
          placeholder="e.g. 2d6+3"
          onChange={e => onChange({ dice: e.target.value })}
        />
      </div>
      <div style={{ flex: 2 }}>
        {label && <div className="field-label">Average</div>}
        <input
          type="number"
          min={0}
          value={average ?? ''}
          placeholder={auto !== null ? `${auto} (auto)` : '—'}
          title="Leave blank to use the dice average"
          onChange={e => onChange({ average: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0) })}
        />
      </div>
      <div style={{ flex: 3 }}>
        {label && <div className="field-label">Damage Type</div>}
        <TypeSelect value={type} onChange={val => onChange({ type: val })} />
      </div>
      {onRemove ? (
        <div style={{ paddingBottom: 6 }}>
          <IconButton onClick={onRemove} title="Remove damage">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </div>
      ) : (
        <div style={{ width: 21 }} />
      )}
    </div>
  )
}

// ─── Multiattack card ─────────────────────────────────────────────────────────

function MultiattackCard({ multiattack, attacks, ownerName, onChange }) {
  const enabled = !!multiattack
  const ma = multiattack ?? EMPTY_MULTIATTACK
  const set = (field, val) => onChange({ ...ma, [field]: val })
  const options = attacks.filter(a => a.multiattack)
  const autoText = multiattackText({ ...ma, description: '' }, attacks, ownerName)

  return (
    <div style={{
      border: `1px solid ${enabled ? MULTI_COLOR.border : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14,
      background: enabled ? MULTI_COLOR.bg : 'var(--surface2)',
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked ? { ...EMPTY_MULTIATTACK } : null)}
          style={{ width: 'auto', marginTop: 2, accentColor: 'var(--orange)' }}
        />
        <span>
          <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? MULTI_COLOR.text : 'var(--text)' }}>Multiattack</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            Makes several attacks with one action. Mark which attacks can be used with the orange Multiattack toggle.
          </span>
        </span>
      </label>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Attacks per Multiattack</div>
              <input
                type="number" min={2} max={10}
                value={ma.count}
                onChange={e => set('count', Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
              />
            </div>
            <div style={{ flex: 3 }}>
              <div className="field-label">Description (optional)</div>
              <input
                type="text"
                value={ma.description ?? ''}
                placeholder="Leave blank to generate it from the options below"
                onChange={e => set('description', e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, fontStyle: 'italic', color: MULTI_COLOR.text }}>Multiattack. </span>
            {ma.description?.trim() ? ma.description.trim() : autoText}
          </div>
          {options.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--orange-text)' }}>
              No attacks are marked as Multiattack options yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── One attack ───────────────────────────────────────────────────────────────

function AttackRow({ attack: a, expanded, onToggle, onUpdate, onRemove, showMultiattack }) {
  const update = changes => onUpdate(a.id, changes)
  const extras = a.extraDamage ?? []
  const damageText = attackDamageText(a)
  const reach = attackReachText(a)

  function setKind(field, val) {
    // Keep at least one of Melee / Ranged on.
    const next = { melee: a.melee, ranged: a.ranged, [field]: val }
    if (!next.melee && !next.ranged) return
    update(next)
  }

  function addExtra() {
    if (extras.length >= MAX_EXTRA_DAMAGE) return
    update({ extraDamage: [...extras, { ...EMPTY_DAMAGE_PART, id: uid() }] })
  }

  function updateExtra(id, changes) {
    update({ extraDamage: extras.map(p => p.id === id ? { ...p, ...changes } : p) })
  }

  function removeExtra(id) {
    update({ extraDamage: extras.filter(p => p.id !== id) })
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6, overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Collapsed header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer',
          background: expanded ? 'var(--surface2)' : 'var(--surface)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          borderLeft: showMultiattack && a.multiattack ? '3px solid var(--orange)' : '3px solid transparent',
        }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {a.name || 'Unnamed Attack'}
            <span className="tag tag-blue" style={{ fontSize: 9 }}>{attackKindLabel(a)}</span>
            {showMultiattack && a.multiattack && <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>}
            {extras.length > 0 && <span className="tag tag-gray" style={{ fontSize: 9 }}>{extras.length + 1} damage rolls</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
            {[`${modStr(a.hitBonus ?? 0)} to hit`, reach, damageText].filter(Boolean).join(' · ')}
          </div>
        </div>

        <IconButton onClick={e => { e.stopPropagation(); onRemove(a.id) }} title="Remove attack">
          <TrashIcon />
        </IconButton>

        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--text3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name + Hit Bonus */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div className="field-label">Attack Name</div>
              <input
                type="text"
                value={a.name}
                placeholder="e.g. Shortsword"
                onChange={e => update({ name: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Hit Bonus</div>
              <input
                type="number"
                value={a.hitBonus}
                onChange={e => update({ hitBonus: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Attack type toggles */}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Attack Roll</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <PillToggle active={a.melee} onChange={val => setKind('melee', val)} label="Melee"
                title={a.melee && !a.ranged ? 'At least one of Melee or Ranged must be on' : undefined} />
              <PillToggle active={a.ranged} onChange={val => setKind('ranged', val)} label="Ranged"
                title={a.ranged && !a.melee ? 'At least one of Melee or Ranged must be on' : undefined} />
              {showMultiattack && (
                <PillToggle
                  active={a.multiattack}
                  onChange={val => update({ multiattack: val })}
                  label="Multiattack"
                  color={MULTI_COLOR}
                  title="Can be used as one of the attacks in Multiattack"
                />
              )}
            </div>
          </div>

          {/* Reach / Range */}
          <div style={{ display: 'flex', gap: 8 }}>
            {a.melee && (
              <div style={{ flex: 1 }}>
                <div className="field-label">Reach (ft)</div>
                <input
                  type="number" min={0} step={5}
                  value={a.reach ?? 5}
                  onChange={e => update({ reach: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
            )}
            {a.ranged && (
              <div style={{ flex: 1 }}>
                <div className="field-label">Range (ft)</div>
                <input
                  type="text"
                  value={a.range ?? ''}
                  placeholder="e.g. 120 or 80/320"
                  onChange={e => update({ range: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Damage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DamageRow
              label="Damage Dice"
              dice={a.damage}
              average={a.damageAverage}
              type={a.damageType}
              onChange={changes => update({
                ...(changes.dice !== undefined ? { damage: changes.dice } : {}),
                ...(changes.average !== undefined ? { damageAverage: changes.average } : {}),
                ...(changes.type !== undefined ? { damageType: changes.type } : {}),
              })}
            />
            {extras.map(p => (
              <div key={p.id}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 3 }}>plus</div>
                <DamageRow
                  dice={p.dice}
                  average={p.average}
                  type={p.type}
                  onChange={changes => updateExtra(p.id, changes)}
                  onRemove={() => removeExtra(p.id)}
                />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addExtra}
                disabled={extras.length >= MAX_EXTRA_DAMAGE}
                style={{ alignSelf: 'flex-start' }}
              >
                + Damage Die
              </button>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {extras.length >= MAX_EXTRA_DAMAGE
                  ? `Maximum of ${MAX_EXTRA_DAMAGE} extra damage types`
                  : `${MAX_EXTRA_DAMAGE - extras.length} more damage type${MAX_EXTRA_DAMAGE - extras.length === 1 ? '' : 's'} available`}
              </span>
            </div>
            {damageText && (
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                <span style={{ fontStyle: 'italic' }}>Hit: </span>{damageText} damage
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="field-label">Notes</div>
            <input
              type="text"
              value={a.notes}
              placeholder="Optional — e.g. target has the Poisoned condition until the start of its next turn"
              onChange={e => update({ notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export default function AttackEditor({ attacks = [], onChange, multiattack = null, onChangeMultiattack, ownerName = '' }) {
  const [expandedId, setExpandedId] = useState(null)
  const showMultiattack = !!onChangeMultiattack
  const list = attacks.map(normalizeAttack)

  function add() {
    const a = { ...EMPTY_ATTACK, id: uid(), extraDamage: [], multiattack: showMultiattack && !!multiattack }
    onChange([...list, a])
    setExpandedId(a.id)
  }

  function update(id, changes) {
    // Marking an attack as a Multiattack option turns Multiattack on.
    if (changes.multiattack && !multiattack && onChangeMultiattack) {
      onChangeMultiattack({ ...EMPTY_MULTIATTACK })
    }
    onChange(list.map(a => a.id === id ? { ...a, ...changes } : a))
  }

  function remove(id) {
    onChange(list.filter(a => a.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const sections = showMultiattack && multiattack
    ? [
        { key: 'multi', label: 'Multiattack Options', color: 'var(--orange-text)', items: list.filter(a => a.multiattack) },
        { key: 'other', label: 'Other Attacks',       color: 'var(--text3)',       items: list.filter(a => !a.multiattack) },
      ].filter(s => s.items.length > 0)
    : [{ key: 'all', label: null, items: list }]

  return (
    <div>
      {showMultiattack && (
        <MultiattackCard
          multiattack={multiattack}
          attacks={list}
          ownerName={ownerName}
          onChange={onChangeMultiattack}
        />
      )}

      {list.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No attacks added yet.</p>
      )}

      {sections.map(sec => (
        <div key={sec.key} style={{ marginBottom: sec.label ? 8 : 0 }}>
          {sec.label && <SectionLabel color={sec.color}>{sec.label}</SectionLabel>}
          {sec.items.map(a => (
            <AttackRow
              key={a.id}
              attack={a}
              expanded={expandedId === a.id}
              onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onUpdate={update}
              onRemove={remove}
              showMultiattack={showMultiattack}
            />
          ))}
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
