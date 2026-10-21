import { useState } from 'react'
import {
  normalizeAttack, attackDamageParts, formatDamagePart, attackKindLabel, attackReachText,
  multiattackText, multiattackSpellOptions, spellDefenseLine, spellFrequencyLabel, modStr,
} from '../utils/helpers'

// Read-only list of attacks for the library, encounter preview and combat panel.
// Multiattack options are grouped under an orange Multiattack heading (same idea
// as the purple At Will / X/Day spell groups); other attacks follow. Spells
// marked for Multiattack are listed in the Multiattack group too; their full
// details stay in the Spellcasting block.

function SubHeading({ children, tone = 'multi' }) {
  const multi = tone === 'multi'
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
      color: multi ? 'var(--orange-text)' : 'var(--text2)',
      background: multi ? 'var(--orange-bg)' : 'var(--surface2)',
      padding: '4px 12px',
    }}>
      {children}
    </div>
  )
}

function AttackLine({ atk, isLast, multi }) {
  const [open, setOpen] = useState(false)
  const a = normalizeAttack(atk)
  const parts = attackDamageParts(a)
  const reach = attackReachText(a)
  const hasNotes = !!a.notes?.trim()

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', borderLeft: multi ? '3px solid var(--orange)' : '3px solid transparent' }}>
      <div
        onClick={() => hasNotes && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 12px', cursor: hasNotes ? 'pointer' : 'default' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name || 'Unnamed Attack'}</span>
            <span className="tag tag-blue" style={{ fontSize: 9 }}>{attackKindLabel(a)}</span>
            {multi && <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
            {[`${modStr(a.hitBonus ?? 0)} to hit`, reach].filter(Boolean).join(' · ')}
          </div>
          {parts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {parts.map((p, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: 'DM Mono, monospace',
                  color: 'var(--accent-text)', background: 'var(--accent-bg)',
                  padding: '1px 7px', borderRadius: 99,
                }}>
                  {i > 0 ? '+ ' : ''}{formatDamagePart(p)}
                </span>
              ))}
            </div>
          )}
        </div>
        {hasNotes && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {open && hasNotes && (
        <div style={{ padding: '6px 12px 8px', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          {a.notes}
        </div>
      )}
    </div>
  )
}

// A spell that can be cast as one of the Multiattack attacks.
function SpellOptionLine({ spell, spellcasting, isLast }) {
  const defense = spellDefenseLine(spell, spellcasting)
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', borderLeft: '3px solid var(--orange)', padding: '7px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{spell.name || 'Unnamed Spell'}</span>
        <span className="tag tag-purple" style={{ fontSize: 9 }}>Spell · {spellFrequencyLabel(spell)}</span>
        <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>
      </div>
      {defense && (
        <div style={{ fontSize: 11, color: 'var(--accent-text)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
          {defense}
        </div>
      )}
    </div>
  )
}

export default function AttacksBlock({ attacks = [], multiattack = null, ownerName = '', spells = [], spellcasting = null }) {
  if (!attacks.length && !multiattack) return null
  const list = attacks.map(normalizeAttack)
  const multiOn = !!multiattack
  const options = multiOn ? list.filter(a => a.multiattack) : []
  const spellOptions = multiOn ? multiattackSpellOptions(spells) : []
  const others  = multiOn ? list.filter(a => !a.multiattack) : list
  const hasMultiGroup = options.length > 0 || spellOptions.length > 0

  return (
    <div>
      {multiOn && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, fontStyle: 'italic', color: 'var(--orange-text)' }}>Multiattack. </span>
          {multiattackText(multiattack, list, ownerName, spells)}
        </div>
      )}
      {(hasMultiGroup || others.length > 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {hasMultiGroup && (
            <div>
              <SubHeading>Multiattack · {multiattack.count ?? 2} attacks</SubHeading>
              {options.map((a, i) => (
                <AttackLine key={a.id || i} atk={a} multi
                  isLast={i === options.length - 1 && spellOptions.length === 0 && others.length === 0} />
              ))}
              {spellOptions.map((sp, i) => (
                <SpellOptionLine key={sp.id || i} spell={sp} spellcasting={spellcasting}
                  isLast={i === spellOptions.length - 1 && others.length === 0} />
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              {multiOn && <SubHeading tone="other">Other Attacks</SubHeading>}
              {others.map((a, i) => (
                <AttackLine key={a.id || i} atk={a} isLast={i === others.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
