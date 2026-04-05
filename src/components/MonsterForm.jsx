import { useState } from 'react'
import AbilityScores from './AbilityScores'
import AttackEditor from './AttackEditor'
import SpellEditor from './SpellEditor'
import SpellSlots from './SpellSlots'
import { MONSTER_TYPES, EMPTY_MONSTER } from '../utils/helpers'

const TABS = ['Stats', 'Attacks', 'Spells', 'Notes']

export default function MonsterForm({ initial, onSave, onClose }) {
  const [data, setData] = useState(() => ({
    ...EMPTY_MONSTER,
    spells: [],
    attacks: [],
    ...(initial ?? {}),
  }))
  const [tab, setTab] = useState('Stats')

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  function handleSave() {
    if (!data.name.trim()) { alert('Monster needs a name!'); return }
    onSave({ ...data, maxHp: data.hp })
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: 18,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              fontFamily: 'DM Sans, sans-serif',
              color: tab === t ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.12s',
            }}
          >
            {t}
            {t === 'Attacks' && data.attacks?.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--surface2)', color: 'var(--text3)', padding: '1px 5px', borderRadius: 99 }}>
                {data.attacks.length}
              </span>
            )}
            {t === 'Spells' && data.spells?.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--surface2)', color: 'var(--text3)', padding: '1px 5px', borderRadius: 99 }}>
                {data.spells.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {tab === 'Stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name + Type + CR */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 3 }}>
              <div className="field-label">Monster Name *</div>
              <input
                value={data.name}
                placeholder="e.g. Goblin Shaman"
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div style={{ flex: 2 }}>
              <div className="field-label">Type</div>
              <select value={data.type} onChange={e => set('type', e.target.value)}>
                {MONSTER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">CR</div>
              <input
                value={data.cr}
                placeholder="1/4"
                onChange={e => set('cr', e.target.value)}
              />
            </div>
          </div>

          {/* HP + AC + Speed + Initiative */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Hit Points</div>
              <input
                type="number"
                min={1}
                value={data.hp}
                onChange={e => set('hp', parseInt(e.target.value) || 1)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Armor Class</div>
              <input
                type="number"
                min={1}
                value={data.ac}
                onChange={e => set('ac', parseInt(e.target.value) || 10)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Speed (ft)</div>
              <input
                type="number"
                min={0}
                step={5}
                value={data.speed ?? 30}
                onChange={e => set('speed', parseInt(e.target.value) || 30)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Initiative Mod</div>
              <input
                type="number"
                value={data.initiativeMod ?? 0}
                onChange={e => set('initiativeMod', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Ability scores */}
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Ability Scores</div>
            <AbilityScores
              abilities={data.abilities}
              onChange={val => set('abilities', val)}
            />
          </div>
        </div>
      )}

      {/* Attacks tab */}
      {tab === 'Attacks' && (
        <AttackEditor
          attacks={data.attacks ?? []}
          onChange={val => set('attacks', val)}
        />
      )}

      {/* Spells tab */}
      {tab === 'Spells' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Spell Slots per Level</div>
            <SpellSlots
              slots={data.spellSlots ?? {}}
              onChange={val => set('spellSlots', val)}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="field-label" style={{ marginBottom: 8 }}>Known Spells</div>
            <SpellEditor
              spells={data.spells ?? []}
              onChange={val => set('spells', val)}
            />
          </div>
        </div>
      )}

      {/* Notes tab */}
      {tab === 'Notes' && (
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Notes / Traits / Special Abilities</div>
          <textarea
            rows={8}
            value={data.notes}
            placeholder="Describe special traits, legendary actions, lair actions..."
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
      }}>
        {onClose && (
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        )}
        <button type="button" className="btn btn-accent" onClick={handleSave}>
          Save Monster
        </button>
      </div>
    </div>
  )
}
