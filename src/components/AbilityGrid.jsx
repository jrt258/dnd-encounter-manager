import { ABILITY_KEYS, ABILITY_LABELS, abilityMod, modStr } from '../utils/helpers'

// Read-only ability score grid for stat blocks. With showSaves, each cell also
// lists the Save bonus (2024 style); saves that differ from the modifier are
// highlighted.

export default function AbilityGrid({ abilities, saves, showSaves = false }) {
  return (
    <div className="ability-grid">
      {ABILITY_KEYS.map(key => {
        const score    = abilities?.[key] ?? 10
        const mod      = abilityMod(score)
        const override = Number.isFinite(saves?.[key])
        const save     = override ? saves[key] : mod
        return (
          <div className="ability-cell" key={key}>
            <span className="ability-name">{ABILITY_LABELS[key]}</span>
            <span className="ability-score">{score}</span>
            <span className="ability-mod">{modStr(mod)}</span>
            {showSaves && (
              <span
                className={`ability-save${override ? ' is-custom' : ''}`}
                title={override ? 'Saving throw differs from the modifier' : 'Saving throw'}
              >
                Save {modStr(save)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
