import React, { useState } from 'react'
import AbilityScores from './AbilityScores'
import SpellSlots from './SpellSlots'
import { EMPTY_PLAYER } from '../utils/helpers'

const CLASSES = ['Artificer','Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard']
const RACES = ['Dragonborn','Dwarf','Elf','Gnome','Half-Elf','Half-Orc',
  'Halfling','Human','Tiefling','Aasimar','Genasi','Tabaxi','Other']

const TABS = ['Stats', 'Spells', 'Notes']

export default function PlayerForm({ initial, onSave }) {
  const [data, setData] = useState({ ...EMPTY_PLAYER, ...initial })
  const [tab, setTab] = useState('Stats')

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const handleSave = () => {
    if (!data.name.trim()) { alert('Character needs a name!'); return }
    onSave({ ...data, maxHp: data.hp })
  }

  return (
    <div>
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
              <label className="form-label">Character Name *</label>
              <input className="form-input" value={data.name}
                placeholder="e.g. Thalindra Moonshadow"
                onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input className="form-input" value={data.playerName}
                placeholder="Optional"
                onChange={e => set('playerName', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Race</label>
              <select className="form-select" value={data.race} onChange={e => set('race', e.target.value)}>
                <option value="">— Select —</option>
                {RACES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-select" value={data.class} onChange={e => set('class', e.target.value)}>
                <option value="">— Select —</option>
                {CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <input className="form-input" type="number" min={1} max={20} value={data.level}
                onChange={e => set('level', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Max HP</label>
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

      {tab === 'Spells' && (
        <div className="form-grid">
          <div className="section-label">Spell Slots per Level</div>
          <SpellSlots slots={data.spellSlots} onChange={val => set('spellSlots', val)} />
        </div>
      )}

      {tab === 'Notes' && (
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={8} value={data.notes}
            placeholder="Background, personality, features, equipment..."
            onChange={e => set('notes', e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save Character</button>
      </div>
    </div>
  )
}
