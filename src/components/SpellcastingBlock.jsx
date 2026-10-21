import {
  groupSpellsByFrequency, isLimitedSpell, spellFrequencyLabel,
  spellDefenseLine, spellcastingSummary,
} from '../utils/helpers'

// Read-only (library / encounter preview) or interactive (combat) view of a
// monster's Spellcasting entry. Pass `usedSpells` and `onSetUses` to make the
// X/Day pips clickable: clicking an empty pip fills one, clicking a filled pip
// empties one.

function UsePips({ total, used, onSet }) {
  const interactive = !!onSet
  return (
    <div className="slot-pips" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < used
        return (
          <div
            key={i}
            className={`slot-pip${filled ? ' used' : ''}`}
            style={interactive ? undefined : { cursor: 'default' }}
            title={interactive ? (filled ? 'Used — click to restore a use' : 'Available — click to mark a use') : undefined}
            onClick={interactive ? () => onSet(filled ? used - 1 : used + 1) : undefined}
          />
        )
      })}
    </div>
  )
}

// One spell, laid out top to bottom:
//   Name + tags                                   [uses]
//   DEX save DC 15 · half damage on save          ← save DC / to-hit first
//   Description text…                             ← always shown
//   Effect: 8d6 fire damage…                      ← full sentence, wraps
//   120 ft · Instantaneous
function SpellLine({ spell, spellcasting, used, onSetUses, showFrequency, showMultiattack, isLast }) {
  const limited = isLimitedSpell(spell)
  const remaining = limited ? Math.max(0, spell.usesPerDay - used) : null
  const exhausted = limited && remaining === 0
  const defense = spellDefenseLine(spell, spellcasting)
  const description = spell.description?.trim()
  const effect = spell.effect?.trim()
  const details = [spell.range, spell.duration].filter(Boolean).join(' · ')
  const multi = showMultiattack && spell.multiattack && (spell.actionType ?? 'action') === 'action'

  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      borderLeft: multi ? '3px solid var(--orange)' : '3px solid transparent',
      padding: '7px 12px', opacity: exhausted ? 0.55 : 1,
    }}>
      {/* Name, tags and uses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: exhausted ? 'line-through' : 'none' }}>
            {spell.name || 'Unnamed Spell'}
          </span>
          {showFrequency && <span className="tag tag-purple" style={{ fontSize: 9 }}>{spellFrequencyLabel(spell)}</span>}
          {spell.castLevel ? <span className="tag tag-gray" style={{ fontSize: 9 }}>Lvl {spell.castLevel}</span> : null}
          {spell.concentration && <span className="tag tag-amber" style={{ fontSize: 9 }}>⟳ Conc.</span>}
          {multi && <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>}
        </div>
        {limited && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {onSetUses && (
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                {remaining}/{spell.usesPerDay}
              </span>
            )}
            <UsePips
              total={spell.usesPerDay}
              used={used}
              onSet={onSetUses ? n => onSetUses(spell.id, Math.max(0, Math.min(spell.usesPerDay, n))) : null}
            />
          </div>
        )}
      </div>

      {/* Save DC / spell attack */}
      {defense && (
        <div style={{ fontSize: 11, color: 'var(--accent-text)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
          {defense}
        </div>
      )}

      {/* Description */}
      {description && (
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
          {description}
        </div>
      )}

      {/* Damage / effect */}
      {effect && (
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
          <span style={{ fontStyle: 'italic', color: 'var(--text)' }}>Effect: </span>{effect}
        </div>
      )}

      {/* Range · duration */}
      {details && (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
          {details}
        </div>
      )}
    </div>
  )
}

function SubHeading({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
      color: 'var(--purple-text)', background: 'var(--purple-bg)', padding: '4px 12px',
    }}>
      {children}
    </div>
  )
}

export default function SpellcastingBlock({ spellcasting, spells = [], usedSpells, onSetUses, multiattack = null }) {
  const showMultiattack = !!multiattack
  if (!spells.length) return null

  const actionSpells   = spells.filter(s => (s.actionType ?? 'action') === 'action')
  const bonusSpells    = spells.filter(s => s.actionType === 'bonus')
  const reactionSpells = spells.filter(s => s.actionType === 'reaction')
  const usedOf = sp => usedSpells?.[sp.id] ?? 0

  const sortByName = list => [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <div>
      {spellcasting && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, lineHeight: 1.5 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>{spellcastingSummary(spellcasting)}</span>
          {spellcasting.note && <span style={{ fontStyle: 'italic', color: 'var(--text3)' }}> — {spellcasting.note}</span>}
        </div>
      )}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {groupSpellsByFrequency(actionSpells).map(group => (
          <div key={`a-${group.key}`}>
            <SubHeading>{group.label}</SubHeading>
            {group.spells.map((sp, i) => (
              <SpellLine key={sp.id ?? i} spell={sp} spellcasting={spellcasting} showMultiattack={showMultiattack}
                used={usedOf(sp)} onSetUses={onSetUses} isLast={i === group.spells.length - 1} />
            ))}
          </div>
        ))}
        {[['Bonus Actions', bonusSpells], ['Reactions', reactionSpells]].map(([label, list]) =>
          list.length > 0 && (
            <div key={label}>
              <SubHeading>{label}</SubHeading>
              {sortByName(list).map((sp, i) => (
                <SpellLine key={sp.id ?? i} spell={sp} spellcasting={spellcasting} showFrequency
                  used={usedOf(sp)} onSetUses={onSetUses} isLast={i === list.length - 1} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
