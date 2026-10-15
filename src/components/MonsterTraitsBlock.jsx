import {
  sortedSkills, skillDef, modStr, damageTypeLabel, conditionLabel, hasDefenses,
} from '../utils/helpers'

// Read-only Skills / Resistances / Immunities lines, laid out like a stat block:
//   Skills       Arcana +6, History +6, Perception +4
//   Resistances  Poison
//   Immunities   Poison, Psychic; Charmed, Deafened, …
// Renders nothing when the monster has none of them.

function Line({ label, children }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{label} </span>
      {children}
    </div>
  )
}

function Word({ children, color }) {
  return <span style={{ color, fontWeight: 600 }}>{children}</span>
}

function joinWords(items, color) {
  return items.map((item, i) => (
    <span key={item}>
      {i > 0 && ', '}
      <Word color={color}>{item}</Word>
    </span>
  ))
}

export default function MonsterTraitsBlock({ monster }) {
  if (!hasDefenses(monster)) return null
  const skills = sortedSkills(monster.skills ?? [])
  const resistances = (monster.resistances ?? []).map(damageTypeLabel)
  const immunities = (monster.immunities ?? []).map(damageTypeLabel)
  const conditions = (monster.conditionImmunities ?? []).map(conditionLabel)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {skills.length > 0 && (
        <Line label="Skills">
          {skills.map((s, i) => (
            <span key={s.skill}>
              {i > 0 && ', '}
              <Word color="var(--green-text)">{skillDef(s.skill)?.label ?? s.skill}</Word>{' '}
              <span style={{ fontFamily: 'DM Mono, monospace' }}>{modStr(Number(s.bonus) || 0)}</span>
            </span>
          ))}
        </Line>
      )}
      {resistances.length > 0 && (
        <Line label="Resistances">{joinWords(resistances, 'var(--amber-text)')}</Line>
      )}
      {(immunities.length > 0 || conditions.length > 0) && (
        <Line label="Immunities">
          {joinWords(immunities, 'var(--green-text)')}
          {immunities.length > 0 && conditions.length > 0 && '; '}
          {joinWords(conditions, 'var(--green-text)')}
        </Line>
      )}
    </div>
  )
}
