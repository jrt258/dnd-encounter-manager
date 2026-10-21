import { useState } from 'react'
import AbilityScores from './AbilityScores'
import AttackEditor from './AttackEditor'
import MonsterSpellEditor from './MonsterSpellEditor'
import MonsterDefensesEditor from './MonsterDefensesEditor'
import NumberInput from './NumberInput'
import SavingThrows from './SavingThrows'
import OtherSpeedsEditor from './OtherSpeedsEditor'
import { MONSTER_SIZES, MONSTER_TYPES, EMPTY_MONSTER, normalizeMonster } from '../utils/helpers'

const TABS = ['Stats', 'Skills & Defenses', 'Attacks', 'Spells', 'Notes']

export default function MonsterForm({ initial, onSave, onClose }) {
  const [data, setData] = useState(() => normalizeMonster({
    ...EMPTY_MONSTER,
    spells: [],
    attacks: [],
    skills: [],
    saves: {},
    speeds: {},
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
    ...(initial ?? {}),
    // New monsters start as Medium; an existing monster with no size stays unset
    // instead of silently becoming Medium when it's edited.
    size: initial ? (initial.size ?? '') : EMPTY_MONSTER.size,
  }))
  const [tab, setTab] = useState('Stats')

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))
  const merge = changes => setData(d => ({ ...d, ...changes }))

  const defenseCount =
    (data.skills?.length ?? 0) +
    (data.resistances?.length ?? 0) +
    (data.immunities?.length ?? 0) +
    (data.vulnerabilities?.length ?? 0) +
    (data.conditionImmunities?.length ?? 0)

  function handleSave() {
    if (!data.name.trim()) { alert('Monster needs a name!'); return }
    // Monsters don't use spell slots; drop the Spellcasting entry if no spells remain.
    const { spellSlots, ...rest } = data
    const spellcasting = (rest.spells?.length ?? 0) > 0 ? rest.spellcasting : null
    onSave({ ...rest, spellcasting, maxHp: data.hp })
  }

  const badge = n => (
    <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--surface2)', color: 'var(--text3)', padding: '1px 5px', borderRadius: 99 }}>
      {n}
    </span>
  )

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: 18,
        overflowX: 'auto',
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
              whiteSpace: 'nowrap',
            }}
          >
            {t}
            {t === 'Skills & Defenses' && defenseCount > 0 && badge(defenseCount)}
            {t === 'Attacks' && data.attacks?.length > 0 && badge(data.attacks.length)}
            {t === 'Spells' && data.spells?.length > 0 && badge(data.spells.length)}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {tab === 'Stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name + Size + Type + CR */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 3 }}>
              <div className="field-label">Monster Name *</div>
              <input
                type="text"
                value={data.name}
                placeholder="e.g. Goblin Shaman"
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div style={{ flex: 1.5 }}>
              <div className="field-label">Size</div>
              <select value={data.size ?? ''} onChange={e => set('size', e.target.value)}>
                {!data.size && <option value="">— Select —</option>}
                {MONSTER_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
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
                type="text"
                value={data.cr}
                placeholder="1/4"
                onChange={e => set('cr', e.target.value)}
              />
            </div>
          </div>

          {/* Ally toggle */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
            padding: '9px 12px', borderRadius: 'var(--radius-sm)',
            border: `1px solid ${data.isAlly ? 'var(--green)' : 'var(--border)'}`,
            background: data.isAlly ? 'var(--green-bg)' : 'var(--surface2)',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={!!data.isAlly}
              onChange={e => set('isAlly', e.target.checked)}
              style={{ width: 'auto', marginTop: 2, accentColor: 'var(--green)' }}
            />
            <span>
              <span style={{ fontSize: 13, fontWeight: 600, color: data.isAlly ? 'var(--green-text)' : 'var(--text)' }}>
                Ally
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                Fights alongside the players. In combat it is grouped with allies and can roll initiative as a group.
              </span>
            </span>
          </label>

          {/* HP + AC + Speed + Initiative */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Max HP</div>
              <NumberInput
                min={1}
                value={data.hp}
                onChange={val => set('hp', val)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Armor Class</div>
              <NumberInput
                min={1}
                value={data.ac}
                onChange={val => set('ac', val)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Speed (ft)</div>
              <NumberInput
                min={0}
                step={5}
                value={data.speed ?? 30}
                onChange={val => set('speed', val)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Initiative Mod</div>
              <NumberInput
                value={data.initiativeMod ?? 0}
                onChange={val => set('initiativeMod', val)}
              />
            </div>
          </div>

          {/* Fly / Swim / Climb / Burrow — hidden until added */}
          <OtherSpeedsEditor
            speeds={data.speeds}
            onChange={val => set('speeds', val)}
          />

          {/* Ability scores */}
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Ability Scores</div>
            <AbilityScores
              abilities={data.abilities}
              onChange={val => set('abilities', val)}
            />
          </div>

          {/* Saving throws — default to the ability modifier, can be overridden */}
          <div>
            <div className="field-label" style={{ marginBottom: 2 }}>Saving Throws</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              Defaults to the ability modifier. Type a different bonus for proficient saves.
            </div>
            <SavingThrows
              abilities={data.abilities}
              saves={data.saves}
              onChange={val => set('saves', val)}
            />
          </div>
        </div>
      )}

      {/* Skills & Defenses tab */}
      {tab === 'Skills & Defenses' && (
        <MonsterDefensesEditor data={data} onChange={merge} />
      )}

      {/* Attacks tab */}
      {tab === 'Attacks' && (
        <AttackEditor
          attacks={data.attacks ?? []}
          onChange={val => set('attacks', val)}
          multiattack={data.multiattack ?? null}
          onChangeMultiattack={val => set('multiattack', val)}
          ownerName={data.name}
          spells={data.spells ?? []}
        />
      )}

      {/* Spells tab */}
      {tab === 'Spells' && (
        <MonsterSpellEditor
          spellcasting={data.spellcasting}
          spells={data.spells ?? []}
          onChangeSpellcasting={val => set('spellcasting', val)}
          onChangeSpells={val => set('spells', val)}
          multiattack={data.multiattack ?? null}
          onChangeMultiattack={val => set('multiattack', val)}
        />
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
