import { ABILITY_KEYS, ABILITY_LABELS, abilityMod, modStr } from '../utils/helpers'

export default function AbilityScores({ abilities, onChange, readOnly }) {
  return (
    <div className="ability-grid">
      {ABILITY_KEYS.map(key => {
        const score = abilities?.[key] ?? 10
        const mod   = abilityMod(score)
        return (
          <div className="ability-cell" key={key}>
            <span className="ability-name">{ABILITY_LABELS[key]}</span>
            {readOnly ? (
              <span className="ability-score">{score}</span>
            ) : (
              <input
                type="number"
                min={1}
                max={30}
                value={score}
                onChange={e => onChange({ ...abilities, [key]: parseInt(e.target.value) || 10 })}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--text)',
                  outline: 'none',
                  padding: 0,
                }}
              />
            )}
            <span className="ability-mod">{modStr(mod)}</span>
          </div>
        )
      })}
    </div>
  )
}
