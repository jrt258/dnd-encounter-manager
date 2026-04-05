import React from 'react'
import { ABILITY_KEYS, abilityMod, modStr } from '../utils/helpers'

export default function AbilityScores({ abilities, onChange, readOnly }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {ABILITY_KEYS.map(key => (
        <div key={key} className="stat-chip" style={{ minWidth: 0 }}>
          <span className="stat-chip-label">{key}</span>
          {readOnly ? (
            <span className="stat-chip-value">{abilities[key] ?? 10}</span>
          ) : (
            <input
              type="number"
              className="stat-chip-value"
              style={{
                width: '100%', border: 'none', background: 'transparent',
                textAlign: 'center', fontFamily: 'var(--font-mono)',
                fontSize: 15, color: 'var(--text)', outline: 'none', padding: 0,
              }}
              value={abilities[key] ?? 10}
              min={1} max={30}
              onChange={e => onChange({ ...abilities, [key]: parseInt(e.target.value) || 10 })}
            />
          )}
          <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
            {modStr(abilityMod(abilities[key] ?? 10))}
          </span>
        </div>
      ))}
    </div>
  )
}
