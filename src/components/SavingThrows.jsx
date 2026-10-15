import NumberInput from './NumberInput'
import { ABILITY_KEYS, ABILITY_LABELS, abilityMod, modStr } from '../utils/helpers'

// Editable Save bonus for each ability, shown under the ability scores.
// Each box starts at the ability modifier. Typing a different number stores an
// override in `saves`; typing the modifier again (or pressing ↺) removes it, so
// an untouched save keeps following its ability score.

export default function SavingThrows({ abilities, saves, onChange }) {
  const current = saves ?? {}

  function setSave(key, val) {
    const mod = abilityMod(abilities?.[key] ?? 10)
    const next = { ...current }
    if (val === null || val === mod) delete next[key]
    else next[key] = val
    onChange(next)
  }

  return (
    <div className="ability-grid">
      {ABILITY_KEYS.map(key => {
        const mod      = abilityMod(abilities?.[key] ?? 10)
        const override = Number.isFinite(current[key])
        const value    = override ? current[key] : mod
        return (
          <div
            className="ability-cell"
            key={key}
            style={override ? { borderColor: 'var(--green)', background: 'var(--green-bg)' } : undefined}
          >
            <span className="ability-name">{ABILITY_LABELS[key]}</span>
            <NumberInput
              value={value}
              onChange={val => setSave(key, val)}
              title={override ? 'Custom save bonus' : 'Uses the ability modifier — type to override'}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                textAlign: 'center',
                fontFamily: 'DM Mono, monospace',
                fontSize: 16,
                fontWeight: 500,
                color: override ? 'var(--green-text)' : 'var(--text)',
                outline: 'none',
                padding: 0,
              }}
            />
            {override ? (
              <button
                type="button"
                onClick={() => setSave(key, null)}
                title={`Reset to the ability modifier (${modStr(mod)})`}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--green-text)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                ↺ {modStr(mod)}
              </button>
            ) : (
              <span className="ability-mod" style={{ color: 'var(--text3)' }}>mod</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
