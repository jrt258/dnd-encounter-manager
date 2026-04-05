import React, { useState, useCallback } from 'react'
import { ChevronRight, RotateCcw, Plus, Minus, Dices, X, Shield, Heart, Zap, AlertTriangle } from 'lucide-react'
import { rollD20, uid, modStr, hpColor, CONDITIONS } from '../utils/helpers'

// ── helpers ──────────────────────────────────────────────────────────────────

function buildCombatants(encounter, monsters, players) {
  const combatants = []

  // Players
  ;(encounter.playerIds || []).forEach(pid => {
    const p = players.find(x => x.id === pid)
    if (!p) return
    combatants.push({
      cid: uid(),
      kind: 'player',
      sourceId: p.id,
      name: p.name,
      maxHp: p.maxHp || p.hp,
      currentHp: p.maxHp || p.hp,
      ac: p.ac,
      initiativeMod: p.initiativeMod || 0,
      initiative: null,
      conditions: [],
      spellSlots: { ...(p.spellSlots || {}) },
      maxSpellSlots: { ...(p.spellSlots || {}) },
      attacks: [],
      notes: p.notes || '',
      class: p.class,
      level: p.level,
    })
  })

  // Monsters — expand slots into individual instances
  ;(encounter.monsterSlots || []).forEach(slot => {
    const m = monsters.find(x => x.id === slot.monsterId)
    if (!m) return
    for (let i = 0; i < (slot.count || 1); i++) {
      combatants.push({
        cid: uid(),
        kind: 'monster',
        sourceId: m.id,
        name: slot.count > 1 ? `${m.name} ${i + 1}` : m.name,
        maxHp: m.maxHp || m.hp,
        currentHp: m.maxHp || m.hp,
        ac: m.ac,
        initiativeMod: m.initiativeMod || 0,
        initiative: null,
        conditions: [],
        spellSlots: { ...(m.spellSlots || {}) },
        maxSpellSlots: { ...(m.spellSlots || {}) },
        attacks: m.attacks || [],
        notes: m.notes || '',
        type: m.type,
        cr: m.cr,
        groupKey: slot.id, // used for group initiative rolling
      })
    }
  })

  return combatants
}

// ── Initiative Setup ──────────────────────────────────────────────────────────

function InitiativeSetup({ combatants, onSetInitiative, onRollGroup, onRollIndividual, onRollAll, onStart }) {
  const allSet = combatants.every(c => c.initiative !== null)
  const monsters = combatants.filter(c => c.kind === 'monster')

  // Get unique monster groups
  const groups = {}
  monsters.forEach(m => {
    if (!groups[m.groupKey]) groups[m.groupKey] = { name: m.name.replace(/ \d+$/, ''), members: [] }
    groups[m.groupKey].members.push(m.cid)
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Roll Initiative</h1>
        <p className="page-subtitle">Set initiative for all combatants before starting combat.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={onRollAll}>
          <Dices size={15} /> Roll All (auto)
        </button>
        {Object.values(groups).length > 0 && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text3)', padding: '0 4px' }}>Monsters:</span>
            <button className="btn btn-secondary" onClick={() => onRollGroup('individual')}>
              <Dices size={15} /> Roll Each Monster
            </button>
            {Object.values(groups).length > 1 || Object.values(groups)[0]?.members.length > 1 ? (
              Object.entries(groups).map(([key, grp]) => (
                <button key={key} className="btn btn-secondary" onClick={() => onRollGroup(key)}>
                  <Dices size={15} /> Roll {grp.name}s as Group
                </button>
              ))
            ) : null}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
        {combatants.map(c => (
          <div key={c.cid} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: c.kind === 'player' ? 'var(--blue)' : 'var(--accent)',
            }} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{c.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              mod {modStr(c.initiativeMod)}
            </span>
            <input
              type="number"
              placeholder="—"
              value={c.initiative ?? ''}
              onChange={e => onSetInitiative(c.cid, parseInt(e.target.value))}
              style={{
                width: 56, padding: '5px 8px', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)',
                fontSize: 16, textAlign: 'center', background: 'var(--surface)',
                color: c.initiative !== null ? 'var(--text)' : 'var(--text3)',
                outline: 'none',
              }}
            />
            <button className="btn btn-ghost btn-icon btn-sm"
              onClick={() => onSetInitiative(c.cid, rollD20() + c.initiativeMod)}
              title="Roll for this combatant">
              <Dices size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary" disabled={!allSet} onClick={onStart}
          style={{ opacity: allSet ? 1 : 0.5 }}>
          Start Combat <ChevronRight size={15} />
        </button>
        {!allSet && (
          <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 12 }}>
            Set all initiatives to begin.
          </span>
        )}
      </div>
    </div>
  )
}

// ── HP Delta Modal ────────────────────────────────────────────────────────────

function HpModal({ combatant, onApply, onClose }) {
  const [amount, setAmount] = useState('')
  const apply = (type) => {
    const n = parseInt(amount)
    if (!n || n < 0) return
    onApply(combatant.cid, type === 'damage' ? -n : n)
    onClose()
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 340 }}>
        <div className="modal-header">
          <span className="modal-title">{combatant.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: hpColor(combatant.currentHp, combatant.maxHp) }}>
              {combatant.currentHp}
            </span>
            <span style={{ fontSize: 16, color: 'var(--text3)' }}> / {combatant.maxHp} HP</span>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Amount</label>
            <input className="form-input" type="number" min={0} value={amount} autoFocus
              placeholder="e.g. 8"
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') apply('damage') }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => apply('damage')}
              style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <Minus size={14} /> Damage
            </button>
            <button className="btn btn-primary" onClick={() => apply('heal')}
              style={{ background: 'var(--green)', borderColor: 'var(--green)' }}>
              <Plus size={14} /> Heal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Condition Picker ──────────────────────────────────────────────────────────

function ConditionPicker({ combatant, onToggle, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Conditions — {combatant.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CONDITIONS.map(cond => {
              const active = combatant.conditions.includes(cond)
              return (
                <button key={cond} onClick={() => onToggle(combatant.cid, cond)} style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: '1px solid',
                  fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                  background: active ? 'var(--gold-bg)' : 'var(--surface)',
                  color: active ? 'var(--gold)' : 'var(--text2)',
                  borderColor: active ? 'rgba(181,134,28,0.4)' : 'var(--border2)',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.1s',
                }}>{cond}</button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Spell Slot Tracker ────────────────────────────────────────────────────────

function SpellSlotTracker({ combatant, onChange, onClose }) {
  const slots = combatant.spellSlots || {}
  const maxSlots = combatant.maxSpellSlots || {}
  const levels = Object.keys(maxSlots).filter(l => maxSlots[l] > 0).map(Number).sort()

  if (levels.length === 0) return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 340 }}>
        <div className="modal-header">
          <span className="modal-title">Spell Slots — {combatant.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>No spell slots configured for this combatant.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Spell Slots — {combatant.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {levels.map(l => {
            const current = slots[l] ?? maxSlots[l]
            const max = maxSlots[l]
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ width: 56, fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Level {l}</span>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  {Array.from({ length: max }).map((_, i) => (
                    <button key={i} onClick={() => {
                      const next = { ...slots }
                      // toggle: if slot i is "used" (i >= current), restore; else use
                      next[l] = i < current ? i : i + 1
                      onChange(combatant.cid, next)
                    }} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '2px solid var(--purple)',
                      background: i < current ? 'var(--purple)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                  {current}/{max}
                </span>
              </div>
            )
          })}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
            onClick={() => onChange(combatant.cid, { ...combatant.maxSpellSlots })}>
            Restore All
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Combatant Row ─────────────────────────────────────────────────────────────

function CombatantRow({ c, isActive, onHpClick, onConditionClick, onSpellClick, onToggleCondition }) {
  const pct = c.maxHp > 0 ? Math.max(0, c.currentHp / c.maxHp) : 0
  const defeated = c.currentHp <= 0

  return (
    <div className={`combatant-row ${isActive ? 'active-turn' : ''} ${defeated ? 'defeated' : ''}`}>
      {isActive ? <div className="turn-indicator" /> : <div style={{ width: 8, flexShrink: 0 }} />}

      <div className="init-badge">{c.initiative}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
            color: isActive ? 'var(--accent)' : 'var(--text)',
          }}>{c.name}</span>
          {c.kind === 'monster' && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              CR {c.cr} · AC {c.ac}
            </span>
          )}
          {c.kind === 'player' && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {c.class} {c.level} · AC {c.ac}
            </span>
          )}
        </div>

        {/* HP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div className="hp-bar-track" style={{ flex: 1, maxWidth: 160 }}>
            <div className="hp-bar-fill" style={{
              width: `${pct * 100}%`,
              background: hpColor(c.currentHp, c.maxHp),
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: hpColor(c.currentHp, c.maxHp), fontWeight: 600 }}>
            {defeated ? 'DOWN' : `${c.currentHp}/${c.maxHp}`}
          </span>
        </div>

        {/* Conditions */}
        {c.conditions.length > 0 && (
          <div className="condition-list">
            {c.conditions.map(cond => (
              <span key={cond} className="condition-tag">
                {cond}
                <button onClick={() => onToggleCondition(c.cid, cond)}><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-icon btn-sm" title="HP" onClick={() => onHpClick(c)}>
          <Heart size={14} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" title="Conditions" onClick={() => onConditionClick(c)}>
          <AlertTriangle size={14} />
        </button>
        {Object.keys(c.maxSpellSlots || {}).length > 0 && (
          <button className="btn btn-ghost btn-icon btn-sm" title="Spell Slots" onClick={() => onSpellClick(c)}>
            <Zap size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Combat Runner ────────────────────────────────────────────────────────

export default function CombatRunner({ encounter, monsters, players, onExit }) {
  const [phase, setPhase] = useState('initiative') // 'initiative' | 'combat'
  const [combatants, setCombatants] = useState(() => buildCombatants(encounter, monsters, players))
  const [turnIndex, setTurnIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [hpModal, setHpModal] = useState(null)
  const [condModal, setCondModal] = useState(null)
  const [spellModal, setSpellModal] = useState(null)
  const [log, setLog] = useState([])

  const addLog = (msg) => setLog(l => [`Round ${round}: ${msg}`, ...l].slice(0, 60))

  // Sort by initiative desc for combat
  const sorted = [...combatants].sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))

  // ── Initiative handlers ───────────────────────────────────────────────────

  const setInitiative = (cid, val) => {
    setCombatants(cs => cs.map(c => c.cid === cid ? { ...c, initiative: val } : c))
  }

  const rollAll = () => {
    setCombatants(cs => cs.map(c => ({ ...c, initiative: rollD20() + c.initiativeMod })))
  }

  const rollGroup = (key) => {
    if (key === 'individual') {
      setCombatants(cs => cs.map(c =>
        c.kind === 'monster' ? { ...c, initiative: rollD20() + c.initiativeMod } : c
      ))
    } else {
      // roll once, apply to whole group
      const roll = rollD20()
      const initiativeMod = combatants.find(c => c.groupKey === key)?.initiativeMod ?? 0
      const total = roll + initiativeMod
      setCombatants(cs => cs.map(c =>
        c.groupKey === key ? { ...c, initiative: total } : c
      ))
    }
    // also roll players while we're at it — keep their existing if already set
    setCombatants(cs => cs.map(c =>
      c.kind === 'player' && c.initiative === null
        ? { ...c, initiative: rollD20() + c.initiativeMod }
        : c
    ))
  }

  const startCombat = () => {
    setPhase('combat')
    setTurnIndex(0)
    setRound(1)
    addLog('Combat started!')
  }

  // ── Combat handlers ───────────────────────────────────────────────────────

  const nextTurn = () => {
    const alive = sorted.filter(c => c.currentHp > 0)
    if (alive.length === 0) return
    let next = turnIndex + 1
    if (next >= sorted.length) { next = 0; setRound(r => r + 1) }
    // skip defeated
    while (sorted[next]?.currentHp <= 0 && next < sorted.length) next++
    if (next >= sorted.length) { next = 0; setRound(r => r + 1) }
    setTurnIndex(next)
    addLog(`${sorted[next]?.name}'s turn`)
  }

  const applyHp = (cid, delta) => {
    setCombatants(cs => cs.map(c => {
      if (c.cid !== cid) return c
      const newHp = Math.max(0, Math.min(c.maxHp, c.currentHp + delta))
      addLog(`${c.name}: ${delta > 0 ? '+' : ''}${delta} HP → ${newHp}/${c.maxHp}`)
      return { ...c, currentHp: newHp }
    }))
  }

  const toggleCondition = (cid, cond) => {
    setCombatants(cs => cs.map(c => {
      if (c.cid !== cid) return c
      const has = c.conditions.includes(cond)
      addLog(`${c.name}: ${has ? 'removed' : 'gained'} ${cond}`)
      return { ...c, conditions: has ? c.conditions.filter(x => x !== cond) : [...c.conditions, cond] }
    }))
  }

  const updateSpellSlots = (cid, newSlots) => {
    setCombatants(cs => cs.map(c => c.cid === cid ? { ...c, spellSlots: newSlots } : c))
  }

  const resetCombat = () => {
    if (!confirm('Reset combat? All HP and conditions will be restored.')) return
    setCombatants(buildCombatants(encounter, monsters, players))
    setPhase('initiative')
    setTurnIndex(0)
    setRound(1)
    setLog([])
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'initiative') {
    return (
      <div className="view">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-secondary btn-sm" onClick={onExit}>← Back</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)', letterSpacing: '0.04em' }}>
            {encounter.name}
          </span>
        </div>
        <InitiativeSetup
          combatants={combatants}
          onSetInitiative={setInitiative}
          onRollGroup={rollGroup}
          onRollIndividual={() => rollGroup('individual')}
          onRollAll={rollAll}
          onStart={startCombat}
        />
      </div>
    )
  }

  const currentCombatant = sorted[turnIndex]
  const aliveCount = sorted.filter(c => c.currentHp > 0).length
  const monstersAlive = sorted.filter(c => c.kind === 'monster' && c.currentHp > 0).length
  const playersAlive = sorted.filter(c => c.kind === 'player' && c.currentHp > 0).length

  return (
    <div className="view" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={onExit}>← Exit</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{encounter.name}</span>
        <div className="round-counter">Round {round}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={resetCombat}>
            <RotateCcw size={13} /> Reset
          </button>
          <button className="btn btn-primary" onClick={nextTurn}>
            Next Turn <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span className="badge badge-blue"><Users size={10} /> {playersAlive} players up</span>
        <span className="badge badge-red"><Skull size={10} /> {monstersAlive} monsters up</span>
        {currentCombatant && (
          <span className="badge badge-gold">⚔️ {currentCombatant.name}'s turn</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Initiative order */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Initiative Order</div>
          {sorted.map((c, i) => (
            <CombatantRow
              key={c.cid}
              c={c}
              isActive={i === turnIndex}
              onHpClick={setHpModal}
              onConditionClick={setCondModal}
              onSpellClick={setSpellModal}
              onToggleCondition={toggleCondition}
            />
          ))}
        </div>

        {/* Combat log */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Combat Log</div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '10px 12px',
            maxHeight: 400, overflowY: 'auto',
          }}>
            {log.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>No events yet.</p>
            )}
            {log.map((entry, i) => (
              <div key={i} style={{
                fontSize: 12, color: i === 0 ? 'var(--text)' : 'var(--text3)',
                padding: '3px 0', borderBottom: '1px solid var(--border)',
                fontFamily: i === 0 ? 'var(--font-body)' : undefined,
              }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {hpModal && (
        <HpModal
          combatant={hpModal}
          onApply={applyHp}
          onClose={() => setHpModal(null)}
        />
      )}
      {condModal && (
        <ConditionPicker
          combatant={condModal}
          onToggle={toggleCondition}
          onClose={() => setCondModal(null)}
        />
      )}
      {spellModal && (
        <SpellSlotTracker
          combatant={spellModal}
          onChange={updateSpellSlots}
          onClose={() => setSpellModal(null)}
        />
      )}
    </div>
  )
}
