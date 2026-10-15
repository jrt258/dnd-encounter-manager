import {
  SKILLS, ABILITY_LABELS, DAMAGE_TYPES, CONDITIONS,
  skillDef, defaultSkillBonus, proficiencyBonusForCR, abilityMod, modStr, sortedSkills,
} from '../utils/helpers'

// Skills, damage resistances, damage immunities and condition immunities for a
// monster. Every section is optional — most stat blocks only use a few.
// Colour key: amber = resistance, green = immunity.

const RESIST = { border: 'var(--amber)', bg: 'var(--amber-bg)', text: 'var(--amber-text)' }
const IMMUNE = { border: 'var(--green)', bg: 'var(--green-bg)', text: 'var(--green-text)' }

function Chip({ label, active, color, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '4px 10px', borderRadius: 99,
        border: `1.5px solid ${active ? color.border : 'var(--border-strong)'}`,
        background: active ? color.bg : 'var(--surface)',
        color: active ? color.text : 'var(--text2)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s', userSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

function Section({ title, hint, children }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <div className="field-label" style={{ marginBottom: hint ? 2 : 8 }}>{title}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  )
}

function toggle(list = [], value) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export default function MonsterDefensesEditor({ data, onChange }) {
  const skills = data.skills ?? []
  const resistances = data.resistances ?? []
  const immunities = data.immunities ?? []
  const conditionImmunities = data.conditionImmunities ?? []
  const pb = proficiencyBonusForCR(data.cr)

  // ── Skills ──
  function addSkill() {
    const used = new Set(skills.map(s => s.skill))
    const next = SKILLS.find(s => !used.has(s.id))
    if (!next) return
    onChange({ skills: [...skills, { skill: next.id, bonus: defaultSkillBonus(next.id, data.abilities, data.cr) }] })
  }

  function updateSkill(index, changes) {
    onChange({ skills: skills.map((s, i) => i === index ? { ...s, ...changes } : s) })
  }

  function changeSkillName(index, skillId) {
    // Picking a different skill re-suggests the standard bonus for it.
    updateSkill(index, { skill: skillId, bonus: defaultSkillBonus(skillId, data.abilities, data.cr) })
  }

  function removeSkill(index) {
    onChange({ skills: skills.filter((_, i) => i !== index) })
  }

  // ── Damage defenses (a type is either resisted or immune, never both) ──
  function toggleResistance(type) {
    onChange({
      resistances: toggle(resistances, type),
      immunities: immunities.filter(t => t !== type),
    })
  }

  function toggleImmunity(type) {
    onChange({
      immunities: toggle(immunities, type),
      resistances: resistances.filter(t => t !== type),
    })
  }

  const preview = sortedSkills(skills)
    .map(s => `${skillDef(s.skill)?.label ?? s.skill} ${modStr(Number(s.bonus) || 0)}`)
    .join(', ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Skills */}
      <div>
        <div className="field-label" style={{ marginBottom: 2 }}>Skills</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
          Bonus is filled in as ability modifier + proficiency bonus (PB {modStr(pb)} at CR {data.cr || '—'}). Edit it for expertise or other changes.
        </div>

        {skills.map((s, i) => {
          const def = skillDef(s.skill)
          const mod = def ? abilityMod(data.abilities?.[def.ability] ?? 10) : 0
          const taken = new Set(skills.filter((_, j) => j !== i).map(x => x.skill))
          return (
            <div key={`${s.skill}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ flex: 3 }}>
                <select value={s.skill} onChange={e => changeSkillName(i, e.target.value)}>
                  {SKILLS.filter(sk => sk.id === s.skill || !taken.has(sk.id)).map(sk => (
                    <option key={sk.id} value={sk.id}>{sk.label} ({ABILITY_LABELS[sk.ability]})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={s.bonus}
                  onChange={e => updateSkill(i, { bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={{ flex: 2, fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                {def ? `${ABILITY_LABELS[def.ability]} ${modStr(mod)} + PB ${modStr(pb)}` : ''}
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex' }}
                onClick={() => removeSkill(i)}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                title="Remove skill"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addSkill} disabled={skills.length >= SKILLS.length}>
            + Add Skill
          </button>
          {preview && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{preview}</span>}
        </div>
      </div>

      {/* Resistances */}
      <Section title="Damage Resistances" hint="Takes half damage of these types.">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {DAMAGE_TYPES.map(t => (
            <Chip key={t} label={cap(t)} color={RESIST} active={resistances.includes(t)} onClick={() => toggleResistance(t)}
              title={immunities.includes(t) ? 'Currently immune — selecting this switches it to a resistance' : undefined} />
          ))}
        </div>
      </Section>

      {/* Damage immunities */}
      <Section title="Damage Immunities" hint="Takes no damage of these types.">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {DAMAGE_TYPES.map(t => (
            <Chip key={t} label={cap(t)} color={IMMUNE} active={immunities.includes(t)} onClick={() => toggleImmunity(t)}
              title={resistances.includes(t) ? 'Currently resistant — selecting this switches it to an immunity' : undefined} />
          ))}
        </div>
      </Section>

      {/* Condition immunities */}
      <Section title="Condition Immunities" hint="Can't be given these conditions.">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CONDITIONS.map(c => {
            const id = c.toLowerCase()
            return (
              <Chip key={id} label={c} color={IMMUNE} active={conditionImmunities.includes(id)}
                onClick={() => onChange({ conditionImmunities: toggle(conditionImmunities, id) })} />
            )
          })}
        </div>
      </Section>
    </div>
  )
}
