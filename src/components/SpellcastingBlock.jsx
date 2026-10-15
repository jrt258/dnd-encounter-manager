import { useState } from 'react'
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

function SpellLine({ spell, spellcasting, used, onSetUses, showFrequency, isLast }) {
  const [open, setOpen] = useState(false)
  const limited = isLimitedSpell(spell)
  const remaining = limited ? Math.max(0, spell.usesPerDay - used) : null
  const exhausted = limited && remaining === 0
  const defense = spellDefenseLine(spell, spellcasting)
  const details = [spell.range, spell.duration].filter(Boolean).join(' · ')
  const hasMore = !!(spell.description?.trim() || details)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div
        onClick={() => hasMore && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          cursor: hasMore ? 'pointer' : 'default', opacity: exhausted ? 0.55 : 1,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: exhausted ? 'line-through' : 'none' }}>
              {spell.name || 'Unnamed Spell'}
            </span>
            {showFrequency && <span className="tag tag-purple" style={{ fontSize: 9 }}>{spellFrequencyLabel(spell)}</span>}
            {spell.castLevel ? <span className="tag tag-gray" style={{ fontSize: 9 }}>Lvl {spell.castLevel}</span> : null}
            {spell.concentration && <span className="tag tag-amber" style={{ fontSize: 9 }}>⟳ Conc.</span>}
          </div>
          {(defense || spell.effect) && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', display: 'flex', flexWrap: 'wrap', gap: '0 10px', marginTop: 1 }}>
              {spell.effect && <span>{spell.effect}</span>}
              {defense && <span style={{ color: 'var(--accent-text)' }}>{defense}</span>}
            </div>
          )}
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
        {hasMore && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--text3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {open && hasMore && (
        <div style={{ padding: '6px 12px 8px', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          {details && <div style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: spell.description ? 4 : 0 }}>{details}</div>}
          {spell.description}
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

export default function SpellcastingBlock({ spellcasting, spells = [], usedSpells, onSetUses }) {
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
              <SpellLine key={sp.id ?? i} spell={sp} spellcasting={spellcasting}
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
