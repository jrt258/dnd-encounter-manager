import { useState, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS = [
  { id: 'blinded',       label: 'Blinded',       color: '#6b7280', bg: '#f3f4f6' },
  { id: 'charmed',       label: 'Charmed',       color: '#db2777', bg: '#fce7f3' },
  { id: 'deafened',      label: 'Deafened',      color: '#7c3aed', bg: '#ede9fe' },
  { id: 'exhaustion',    label: 'Exhaustion',    color: '#ea580c', bg: '#ffedd5' },
  { id: 'frightened',    label: 'Frightened',    color: '#ca8a04', bg: '#fef9c3' },
  { id: 'grappled',      label: 'Grappled',      color: '#0d9488', bg: '#ccfbf1' },
  { id: 'incapacitated', label: 'Incapacitated', color: '#dc2626', bg: '#fee2e2' },
  { id: 'invisible',     label: 'Invisible',     color: '#4d7c0f', bg: '#ecfccb' },
  { id: 'paralyzed',     label: 'Paralyzed',     color: '#e11d48', bg: '#ffe4e6' },
  { id: 'petrified',     label: 'Petrified',     color: '#78716c', bg: '#f5f5f4' },
  { id: 'poisoned',      label: 'Poisoned',      color: '#65a30d', bg: '#ecfccb' },
  { id: 'prone',         label: 'Prone',         color: '#b45309', bg: '#fef3c7' },
  { id: 'restrained',    label: 'Restrained',    color: '#0369a1', bg: '#e0f2fe' },
  { id: 'stunned',       label: 'Stunned',       color: '#6d28d9', bg: '#ede9fe' },
  { id: 'unconscious',   label: 'Unconscious',   color: '#1e293b', bg: '#e2e8f0' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rollD20() { return Math.floor(Math.random() * 20) + 1; }

function rollDice(expr) {
  const m = expr?.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!m) return parseInt(expr) || 0;
  let total = 0;
  for (let i = 0; i < parseInt(m[1]); i++)
    total += Math.floor(Math.random() * parseInt(m[2])) + 1;
  if (m[3]) total += parseInt(m[3]);
  return Math.max(1, total);
}

function hpStatus(currentHp, maxHp) {
  const pct = maxHp > 0 ? currentHp / maxHp : 0;
  if (pct <= 0)    return 'dead';
  if (pct < 0.10)  return 'critical';
  if (pct < 0.50)  return 'bloody';
  return 'healthy';
}

function hpStatusClass(status) {
  if (status === 'healthy')  return 'hp-healthy';
  if (status === 'bloody')   return 'hp-bloody';
  if (status === 'critical') return 'hp-critical';
  return '';
}

function hpBarColor(status) {
  if (status === 'healthy')  return 'var(--green)';
  if (status === 'bloody')   return 'var(--orange)';
  return 'var(--accent)';
}

function buildCombatants(encounter) {
  const result = [];
  for (const entry of encounter) {
    if (entry.type === 'player') {
      const p = entry.player;
      result.push({
        id: `${entry.id}-0`,
        sourceId: entry.sourceId,
        type: 'player',
        name: p.name,
        maxHp: p.hp ?? 10,
        damage: 0,           // damage taken (currentHp = maxHp - damage)
        ac: p.ac ?? 10,
        speed: p.speed ?? 30,
        initiative: null,
        dexMod: p.abilities ? Math.floor((p.abilities.dex - 10) / 2) : 0,
        conditions: [],
        spellSlots: p.spellSlots ? JSON.parse(JSON.stringify(p.spellSlots)) : null,
        usedSlots: {},
        attacks: p.attacks ?? [],
        spells: p.spells ?? [],
        notes: p.notes ?? '',
        abilities: p.abilities ?? null,
        expanded: false,
      });
    } else if (entry.type === 'monster') {
      const m = entry.monster;
      const count = entry.count || 1;
      for (let i = 0; i < count; i++) {
        const maxHp = m.hpFormula ? rollDice(m.hpFormula) : (m.hp ?? 10);
        result.push({
          id: `${entry.id}-${i}`,
          sourceId: entry.sourceId,
          type: 'monster',
          name: count > 1 ? `${m.name} ${i + 1}` : m.name,
          maxHp,
          damage: 0,
          ac: m.ac ?? 10,
          speed: m.speed ?? 30,
          initiative: null,
          dexMod: m.abilities ? Math.floor((m.abilities.dex - 10) / 2) : 0,
          conditions: [],
          spellSlots: m.spellSlots ? JSON.parse(JSON.stringify(m.spellSlots)) : null,
          usedSlots: {},
          attacks: m.attacks ?? [],
          spells: m.spells ?? [],
          notes: m.notes ?? '',
          abilities: m.abilities ?? null,
          expanded: false,
          cr: m.cr,
        });
      }
    }
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConditionChip({ condition, onRemove }) {
  const def = CONDITIONS.find(c => c.id === condition) ?? { label: condition, color: '#666', bg: '#eee' };
  return (
    <span
      className="condition-chip"
      style={{ background: def.bg, color: def.color }}
      title={def.label}
    >
      {def.label}
      {onRemove && (
        <span
          style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, fontSize: 10 }}
          onClick={e => { e.stopPropagation(); onRemove(condition); }}
        >×</span>
      )}
    </span>
  );
}

function ConditionToggleGrid({ active, onToggle }) {
  return (
    <div className="condition-toggle-grid">
      {CONDITIONS.map(c => {
        const isActive = active.includes(c.id);
        return (
          <button
            key={c.id}
            className={`condition-toggle${isActive ? ' active' : ''}`}
            style={isActive ? { background: c.color, borderColor: c.color } : {}}
            onClick={() => onToggle(c.id)}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function SlotPips({ total, used, onToggle }) {
  return (
    <div className="slot-pips">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`slot-pip${i < used ? ' used' : ''}`}
          onClick={() => onToggle(i)}
          title={i < used ? 'Expended' : 'Available'}
        />
      ))}
    </div>
  );
}

// ─── Expanded detail panel ────────────────────────────────────────────────────

function CombatantExpand({ c, onUpdate, onToggleSlot, onToggleCondition }) {
  const currentHp = c.maxHp - c.damage;

  return (
    <div className="combatant-expand">
      <div className="expand-grid">

        {/* Left col: HP editing + initiative */}
        <div>
          <div className="expand-section">
            <div className="expand-section-title">Hit Points</div>
            <div className="hp-edit-row">
              <div className="hp-edit-field">
                <span className="hp-edit-label">Max HP</span>
                <input
                  type="number"
                  className="hp-edit-input"
                  min={1}
                  value={c.maxHp}
                  onChange={e => onUpdate(c.id, { maxHp: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="hp-edit-field">
                <span className="hp-edit-label">Damage Taken</span>
                <input
                  type="number"
                  className="hp-edit-input"
                  min={0}
                  max={c.maxHp}
                  value={c.damage}
                  onChange={e => onUpdate(c.id, { damage: Math.max(0, Math.min(c.maxHp, parseInt(e.target.value) || 0)) })}
                />
              </div>
              <div className="hp-edit-field">
                <span className="hp-edit-label">Current HP</span>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 15,
                  fontWeight: 500,
                  padding: '6px 8px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  color: hpBarColor(hpStatus(currentHp, c.maxHp)),
                }}>
                  {currentHp}
                </div>
              </div>
            </div>

            {/* Quick damage / heal */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <QuickHP label="Damage" color="var(--accent)" sign={-1} c={c} onUpdate={onUpdate} />
              <QuickHP label="Heal"   color="var(--green)"  sign={+1} c={c} onUpdate={onUpdate} />
            </div>
          </div>

          <div className="expand-section" style={{ marginTop: 14 }}>
            <div className="expand-section-title">Initiative</div>
            <div className="gap-row">
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500 }}>
                {c.initiative ?? '—'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() =>
                onUpdate(c.id, { initiative: rollD20() + c.dexMod })
              }>
                Reroll d20
              </button>
              <input
                type="number"
                style={{ width: 64, padding: '4px 8px', fontSize: 13 }}
                placeholder="Set"
                onBlur={e => { if (e.target.value !== '') onUpdate(c.id, { initiative: parseInt(e.target.value) }); e.target.value = ''; }}
              />
            </div>
          </div>

          {/* Ability scores */}
          {c.abilities && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Ability Scores</div>
              <div className="ability-grid">
                {['str','dex','con','int','wis','cha'].map(ab => {
                  const score = c.abilities?.[ab] ?? 10;
                  const mod = Math.floor((score - 10) / 2);
                  return (
                    <div className="ability-cell" key={ab}>
                      <span className="ability-name">{ab.toUpperCase()}</span>
                      <span className="ability-score">{score}</span>
                      <span className="ability-mod">{mod >= 0 ? `+${mod}` : mod}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right col: conditions, attacks, spells */}
        <div>
          <div className="expand-section">
            <div className="expand-section-title">Conditions</div>
            <ConditionToggleGrid active={c.conditions} onToggle={id => onToggleCondition(c.id, id)} />
          </div>

          {/* Attacks */}
          {c.attacks?.length > 0 && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Attacks</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {c.attacks.map((atk, i) => (
                  <div className="attack-row" key={i}>
                    <span className="attack-name">{atk.name}</span>
                    {atk.hitBonus !== undefined && (
                      <span className="attack-stat">{atk.hitBonus >= 0 ? '+' : ''}{atk.hitBonus} to hit</span>
                    )}
                    {atk.damage && (
                      <span className="attack-stat">{atk.damage} {atk.damageType ?? ''}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spell slots */}
          {c.spellSlots && Object.values(c.spellSlots).some(v => v > 0) && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Spell Slots</div>
              <div className="spell-slots-grid">
                {Object.entries(c.spellSlots).map(([lvl, total]) => {
                  if (!total) return null;
                  const used = c.usedSlots?.[lvl] || 0;
                  return (
                    <div className="slot-level" key={lvl}>
                      <span className="slot-level-label">Lvl {lvl}</span>
                      <SlotPips
                        total={total}
                        used={used}
                        onToggle={() => onToggleSlot(c.id, lvl)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Known spells */}
          {c.spells?.length > 0 && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Spells</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {[...c.spells]
                  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                  .map((sp, i) => {
                    const ABILITY_LABELS = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };
                    let defLine = '';
                    if (sp.defenseType === 'save') {
                      defLine = `${ABILITY_LABELS[sp.saveAbility] ?? sp.saveAbility} Save DC ${sp.saveDC}`;
                      if (sp.onSave) defLine += ` · ${sp.onSave} on save`;
                    } else if (sp.defenseType === 'attack') {
                      defLine = `${sp.attackBonus >= 0 ? '+' : ''}${sp.attackBonus} spell attack`;
                    }
                    return (
                      <div
                        key={sp.id ?? i}
                        style={{
                          padding: '8px 10px',
                          borderBottom: i < c.spells.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</span>
                          <span className="tag tag-purple" style={{ fontSize: 9 }}>
                            {sp.level === 0 ? 'Cantrip' : `Lvl ${sp.level}`}
                          </span>
                          {sp.concentration && (
                            <span className="tag tag-amber" style={{ fontSize: 9 }} title="Concentration">⟳ Conc.</span>
                          )}
                          {sp.ritual && (
                            <span className="tag tag-blue" style={{ fontSize: 9 }} title="Ritual">ℛ Ritual</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '0 10px' }}>
                          <span>{sp.castingTime}</span>
                          <span>{sp.range}</span>
                          {sp.effect && <span>{sp.effect}</span>}
                          {defLine && <span style={{ color: 'var(--accent-text)' }}>{defLine}</span>}
                        </div>
                        {sp.description && (
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
                            {sp.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Notes */}
          {c.notes && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Notes</div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{c.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickHP({ label, color, sign, c, onUpdate }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
      <input
        type="number"
        min={0}
        placeholder="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
      />
      <button
        className="btn btn-ghost btn-sm"
        style={{ color, flexShrink: 0 }}
        onClick={() => {
          const amt = parseInt(val) || 0;
          if (amt === 0) return;
          if (sign < 0) {
            // damage
            onUpdate(c.id, { damage: Math.min(c.maxHp, c.damage + amt) });
          } else {
            // heal
            onUpdate(c.id, { damage: Math.max(0, c.damage - amt) });
          }
          setVal('');
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ─── Main CombatRunner ────────────────────────────────────────────────────────

export default function CombatRunner({ encounter, setEncounter, players }) {
  const [combatants, setCombatants] = useState([]);
  const [started, setStarted]       = useState(false);
  const [round, setRound]           = useState(1);
  const [turnIdx, setTurnIdx]       = useState(0);
  const [log, setLog]               = useState([]);

  // Drag state
  const dragIdx   = useRef(null);
  const dragOverIdx = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  // ── Logging ──────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, r) => {
    setLog(prev => [{ msg, round: r, id: Date.now() + Math.random() }, ...prev].slice(0, 80));
  }, []);

  // ── Start / end ───────────────────────────────────────────────────────────
  function startCombat() {
    if (encounter.length === 0) return;
    const c = buildCombatants(encounter).map(cb => ({
      ...cb,
      initiative: rollD20() + cb.dexMod,
    })).sort((a, b) => b.initiative - a.initiative || b.dexMod - a.dexMod);
    setCombatants(c);
    setStarted(true);
    setRound(1);
    setTurnIdx(0);
    setLog([]);
    addLog('⚔️  Combat started!', 1);
    if (c[0]) addLog(`${c[0].name}'s turn`, 1);
  }

  function endCombat() {
    if (!confirm('End combat and reset?')) return;
    setStarted(false);
    setCombatants([]);
    setRound(1);
    setTurnIdx(0);
    setLog([]);
  }

  // ── Turn management ───────────────────────────────────────────────────────
  function nextTurn() {
    setCombatants(prev => {
      let next = turnIdx + 1;
      let newRound = round;

      if (next >= prev.length) {
        next = 0;
        newRound = round + 1;
        addLog(`── Round ${newRound} begins ──`, newRound);
      }

      // Skip dead
      let safety = 0;
      while (prev[next] && (prev[next].maxHp - prev[next].damage) <= 0 && safety < prev.length) {
        next = (next + 1) % prev.length;
        if (next === 0) newRound++;
        safety++;
      }

      setTurnIdx(next);
      setRound(newRound);
      if (prev[next]) addLog(`${prev[next].name}'s turn`, newRound);
      return prev;
    });
  }

  // ── Update combatant ──────────────────────────────────────────────────────
  function updateCombatant(id, changes) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function toggleCondition(id, condId) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const has = c.conditions.includes(condId);
      const conditions = has
        ? c.conditions.filter(x => x !== condId)
        : [...c.conditions, condId];
      addLog(`${c.name} ${has ? 'lost' : 'gained'} ${condId}`, round);
      return { ...c, conditions };
    }));
  }

  function toggleSlot(id, level) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const used  = c.usedSlots?.[level] || 0;
      const total = c.spellSlots?.[level] || 0;
      const newUsed = used < total ? used + 1 : 0;
      addLog(`${c.name} ${newUsed > used ? 'expended' : 'recovered'} a level ${level} slot`, round);
      return { ...c, usedSlots: { ...c.usedSlots, [level]: newUsed } };
    }));
  }

  function toggleExpanded(id) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  function onDragStart(e, idx) {
    dragIdx.current = idx;
    setDraggingId(combatants[idx].id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIdx.current = idx;
    setDragOverId(combatants[idx].id);
  }

  function onDragLeave() {
    setDragOverId(null);
  }

  function onDrop(e, idx) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) return;

    setCombatants(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);

      // Adjust turnIdx to keep the same combatant active
      if (turnIdx === from) setTurnIdx(idx);
      else if (from < turnIdx && idx >= turnIdx) setTurnIdx(t => t - 1);
      else if (from > turnIdx && idx <= turnIdx) setTurnIdx(t => t + 1);

      return next;
    });

    dragIdx.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  function onDragEnd() {
    dragIdx.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── Not started ───────────────────────────────────────────────────────────
  if (!started) {
    return (
      <>
        {encounter.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">⚔️</div>
              Build an encounter first in the Encounter Builder.
            </div>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              {encounter.map(e => (
                <div className="list-row" key={e.id}>
                  <div className={`combatant-dot ${e.type === 'player' ? 'dot-player' : 'dot-monster'}`} />
                  <div className="list-row-main">
                    <div className="list-row-title">{e.name}</div>
                    <div className="list-row-sub">
                      {e.type === 'player' ? 'Player' : `Monster × ${e.count || 1}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-accent" style={{ minWidth: 180 }} onClick={startCombat}>
              ⚔️  Start Combat
            </button>
          </>
        )}
      </>
    );
  }

  // ── Combat running ────────────────────────────────────────────────────────
  const activeCombatant = combatants[turnIdx];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* ── Left: Initiative order ─────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Combat header */}
        <div className="combat-header">
          <div className="combat-round">
            <span className="combat-round-label">Round</span>
            <span className="combat-round-num">{round}</span>
          </div>

          <div className="combat-active-label">
            <div className="combat-active-title">Active Turn</div>
            <div className="combat-active-name">{activeCombatant?.name ?? '—'}</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" onClick={nextTurn}>
              Next Turn →
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--accent)' }}
              onClick={endCombat}
            >
              End Combat
            </button>
          </div>
        </div>

        {/* Combatant rows */}
        <div>
          {combatants.map((c, idx) => {
            const currentHp = c.maxHp - c.damage;
            const status    = hpStatus(currentHp, c.maxHp);
            const hpPct     = c.maxHp > 0 ? currentHp / c.maxHp : 0;
            const isActive  = idx === turnIdx;
            const isDead    = currentHp <= 0;

            return (
              <div
                key={c.id}
                className={[
                  'combatant-row',
                  isActive   ? 'active-turn' : '',
                  isDead     ? 'dead'         : '',
                  draggingId === c.id ? 'dragging'  : '',
                  dragOverId === c.id && draggingId !== c.id ? 'drag-over' : '',
                ].filter(Boolean).join(' ')}
                draggable
                onDragStart={e => onDragStart(e, idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, idx)}
                onDragEnd={onDragEnd}
              >
                {/* ── Main row ────────────────────────────────────────────── */}
                <div className="combatant-row-main">

                  {/* Drag handle */}
                  <div className="drag-handle" title="Drag to reorder">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
                      <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                    </svg>
                  </div>

                  {/* Initiative */}
                  <div className="combatant-init" title="Initiative">
                    {c.initiative ?? '—'}
                  </div>

                  {/* Type dot */}
                  <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`} />

                  {/* Name + conditions */}
                  <div className="combatant-name-col">
                    <div className="combatant-name">{c.name}</div>
                    {c.conditions.length > 0 && (
                      <div className="combatant-conditions">
                        {c.conditions.map(cond => (
                          <ConditionChip key={cond} condition={cond} />
                        ))}
                      </div>
                    )}
                    {/* HP bar */}
                    <div className="hp-bar-track" style={{ marginTop: 4 }}>
                      <div
                        className="hp-bar-fill"
                        style={{ width: `${Math.max(0, hpPct) * 100}%`, background: hpBarColor(status) }}
                      />
                    </div>
                  </div>

                  {/* Stat columns */}
                  <div className="combatant-stats">

                    {/* HP */}
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">HP</span>
                      <span className={`combatant-stat-value ${hpStatusClass(status)}`}>
                        {currentHp}
                        {status === 'bloody'   && ' 🩸'}
                        {status === 'critical' && ' ☠'}
                      </span>
                      <span className="combatant-stat-sub">/ {c.maxHp}</span>
                    </div>

                    {/* AC */}
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">AC</span>
                      <span className="combatant-stat-value">{c.ac}</span>
                    </div>

                    {/* Speed */}
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">Speed</span>
                      <span className="combatant-stat-value">{c.speed}</span>
                      <span className="combatant-stat-sub">ft</span>
                    </div>

                  </div>

                  {/* Chevron toggle */}
                  <div
                    className="combatant-chevron"
                    onClick={() => toggleExpanded(c.id)}
                    title={c.expanded ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: c.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* ── Expanded panel ───────────────────────────────────────── */}
                {c.expanded && (
                  <CombatantExpand
                    c={c}
                    onUpdate={updateCombatant}
                    onToggleSlot={toggleSlot}
                    onToggleCondition={toggleCondition}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Combat log ─────────────────────────────────────────────── */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div className="combat-log">
          <div className="combat-log-header">Combat Log</div>
          <div className="combat-log-entries">
            {log.length === 0 && (
              <div style={{ padding: '12px', color: 'var(--text3)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                No events yet.
              </div>
            )}
            {log.map(entry => (
              <div className="log-entry" key={entry.id}>
                <span className="log-entry-round">R{entry.round} </span>
                {entry.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
