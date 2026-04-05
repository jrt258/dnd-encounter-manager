import React, { useState } from 'react'
import AbilityScores from './AbilityScores'
import AttackEditor from './AttackEditor'
import SpellSlots from './SpellSlots'
import { MONSTER_TYPES, EMPTY_MONSTER } from '../utils/helpers'

const TABS = ['Stats', 'Attacks', 'Spells', 'Notes']

export default function MonsterForm({ initial, onSave }) {
  const [data, setData] = useState({ ...EMPTY_MONSTER, ...initial })
  const [tab, setTab] = useState('Stats')

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const handleSave = () => {
    if (!data.name.trim()) { alert('Monster needs a name!'); return }
    onSave({ ...data, maxHp: data.hp })
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--accent)' : 'var(--text2)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {tab === 'Stats' && (
        <div className="form-grid">
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Monster Name *</label>
              <input className="form-input" value={data.name}
                placeholder="e.g. Goblin Shaman"
                onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={data.type} onChange={e => set('type', e.target.value)}>
                {MONSTER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CR</label>
              <input className="form-input" value={data.cr}
                placeholder="1/4"
                onChange={e => set('cr', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hit Points</label>
              <input className="form-input" type="number" min={1} value={data.hp}
                onChange={e => set('hp', parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Armor Class</label>
              <input className="form-input" type="number" min={1} value={data.ac}
                onChange={e => set('ac', parseInt(e.target.value) || 10)} />
            </div>
            <div className="form-group">
              <label className="form-label">Initiative Mod</label>
              <input className="form-input" type="number" value={data.initiativeMod}
                onChange={e => set('initiativeMod', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <div className="section-label">Ability Scores</div>
            <AbilityScores abilities={data.abilities}
              onChange={val => set('abilities', val)} />
          </div>
        </div>
      )}

      {tab === 'Attacks' && (
        <AttackEditor attacks={data.attacks}
          onChange={val => set('attacks', val)} />
      )}

      {tab === 'Spells' && (
        <div className="form-grid">
          <div className="section-label">Spell Slots per Level</div>
          <SpellSlots slots={data.spellSlots}
            onChange={val => set('spellSlots', val)} />
        </div>
      )}

      {tab === 'Notes' && (
        <div className="form-group">
          <label className="form-label">Notes / Traits / Special Abilities</label>
          <textarea className="form-textarea" rows={8} value={data.notes}
            placeholder="Describe special traits, legendary actions, lair actions..."
            onChange={e => set('notes', e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save Monster</button>
      </div>
    </div>
  )
}
