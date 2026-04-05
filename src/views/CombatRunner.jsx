import { useState, useCallback } from 'react';

const CONDITIONS = [
  'Blinded','Charmed','Deafened','Exhaustion','Frightened',
  'Grappled','Incapacitated','Invisible','Paralyzed','Petrified',
  'Poisoned','Prone','Restrained','Stunned','Unconscious',
];

function rollD20() { return Math.floor(Math.random() * 20) + 1; }
function rollDice(expr) {
  const m = expr.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!m) return parseInt(expr) || 0;
  let total = 0;
  for (let i = 0; i < parseInt(m[1]); i++)
    total += Math.floor(Math.random() * parseInt(m[2])) + 1;
  if (m[3]) total += parseInt(m[3]);
  return Math.max(0, total);
}

function hpColor(pct) {
  if (pct > 0.6) return 'var(--green)';
  if (pct > 0.3) return 'var(--amber)';
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
        currentHp: p.hp ?? 10,
        ac: p.ac ?? 10,
        initiative: null,
        dexMod: p.abilities ? Math.floor((p.abilities.dex - 10) / 2) : 0,
        conditions: [],
        spellSlots: p.spellSlots ? JSON.parse(JSON.stringify(p.spellSlots)) : null,
        usedSlots: {},
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
          currentHp: maxHp,
          ac: m.ac ?? 10,
          initiative: null,
          dexMod: m.abilities ? Math.floor((m.abilities.dex - 10) / 2) : 0,
          conditions: [],
          spellSlots: m.spellSlots ? JSON.parse(JSON.stringify(m.spellSlots)) : null,
          usedSlots: {},
          attacks: m.attacks ?? [],
          expanded: false,
        });
      }
    }
  }
  return result;
}

export default function CombatRunner({ encounter, setEncounter, players }) {
  const [combatants, setCombatants] = useState([]);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(1);
  const [turnIdx, setTurnIdx] = useState(0);
  const [log, setLog] = useState([]);
  const [hpInput, setHpInput] = useState({});

  const addLog = useCallback((msg, roundNum) => {
    setLog(prev => [{ msg, round: roundNum, id: Date.now() + Math.random() }, ...prev].slice(0, 60));
  }, []);

  function startCombat() {
    if (encounter.length === 0) return;
    const c = buildCombatants(encounter);
    // Roll initiative for everyone
    const withInit = c.map(cb => ({
      ...cb,
      initiative: rollD20() + cb.dexMod,
    })).sort((a, b) => b.initiative - a.initiative || b.dexMod - a.dexMod);
    setCombatants(withInit);
    setStarted(true);
    setRound(1);
    setTurnIdx(0);
    setLog([]);
    addLog('⚔️ Combat started!', 1);
  }

  function endCombat() {
    if (!confirm('End combat and reset?')) return;
    setStarted(false);
    setCombatants([]);
    setRound(1);
    setTurnIdx(0);
    setLog([]);
  }

  function nextTurn() {
    const alive = combatants.filter(c => c.currentHp > 0);
    if (alive.length === 0) return;
    let next = turnIdx + 1;
    let newRound = round;
    if (next >= combatants.length) {
      next = 0;
      newRound = round + 1;
      addLog(`── Round ${newRound} ──`, newRound);
    }
    // Skip dead
    let safety = 0;
    while (combatants[next]?.currentHp <= 0 && safety < combatants.length) {
      next = (next + 1) % combatants.length;
      if (next === 0) newRound++;
      safety++;
    }
    setTurnIdx(next);
    setRound(newRound);
    const cur = combatants[next];
    if (cur) addLog(`${cur.name}'s turn`, newRound);
  }

  function rollInitiative(id) {
    setCombatants(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, initiative: rollD20() + c.dexMod } : c
      ).sort((a, b) => b.initiative - a.initiative);
      return updated;
    });
  }

  function applyHp(id, delta) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newHp = Math.min(c.maxHp, Math.max(0, c.currentHp + delta));
      if (delta < 0) addLog(`${c.name} takes ${-delta} damage (${newHp}/${c.maxHp} HP)`, round);
      else addLog(`${c.name} heals ${delta} HP (${newHp}/${c.maxHp} HP)`, round);
      return { ...c, currentHp: newHp };
    }));
  }

  function toggleCondition(id, cond) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const has = c.conditions.includes(cond);
      const conditions = has ? c.conditions.filter(x => x !== cond) : [...c.conditions, cond];
      if (!has) addLog(`${c.name} is now ${cond}`, round);
      return { ...c, conditions };
    }));
  }

  function toggleSlot(id, level) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id || !c.spellSlots) return c;
      const used = c.usedSlots[level] || 0;
      const total = c.spellSlots[level] || 0;
      const newUsed = used < total ? used + 1 : 0;
      addLog(`${c.name} ${newUsed > used ? 'expended' : 'recovered'} a level ${level} slot`, round);
      return { ...c, usedSlots: { ...c.usedSlots, [level]: newUsed } };
    }));
  }

  function toggleExpanded(id) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  // ── Not started ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <>
        <div className="section-heading" style={{ marginTop: 0 }}>Ready to Fight</div>
        {encounter.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">⚔️</div>
              Build an encounter first in the Encounter tab.
            </div>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              {encounter.map(e => (
                <div className="list-row" key={e.id}>
                  <div className={`combatant-type-dot ${e.type === 'player' ? 'dot-player' : 'dot-monster'}`} style={{ flexShrink: 0 }} />
                  <div className="list-row-main">
                    <div className="list-row-title">{e.name}</div>
                    <div className="list-row-sub">
                      {e.type === 'player' ? 'Player' : `Monster × ${e.count || 1}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-accent btn-full" onClick={startCombat}>
              ⚔️ Start Combat
            </button>
          </>
        )}
      </>
    );
  }

  // ── Combat running ───────────────────────────────────────────────────────
  const activeName = combatants[turnIdx]?.name;

  return (
    <>
      {/* Round banner */}
      <div className="round-banner">
        <div>
          <div className="round-label">Round</div>
          <div className="round-number">{round}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="round-label">Active</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeName}
          </div>
        </div>
        <div className="gap-row">
          <button className="btn btn-accent" onClick={nextTurn}>Next →</button>
          <button className="btn btn-ghost" style={{ color: 'var(--accent)' }} onClick={endCombat}>End</button>
        </div>
      </div>

      {/* Combatant list */}
      <div className="section-heading">Initiative Order</div>

      {combatants.map((c, idx) => {
        const hpPct = c.maxHp > 0 ? c.currentHp / c.maxHp : 0;
        const isActive = idx === turnIdx;
        const isDead = c.currentHp <= 0;
        const dmgVal = hpInput[c.id]?.dmg ?? '';
        const healVal = hpInput[c.id]?.heal ?? '';

        return (
          <div
            key={c.id}
            className={`combatant-card${isActive ? ' active-turn' : ''}${isDead ? ' dead' : ''}`}
          >
            {/* Header row */}
            <div className="combatant-header" onClick={() => toggleExpanded(c.id)}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--text3)', minWidth: 28 }}>
                {c.initiative ?? '—'}
              </span>
              <div className={`combatant-type-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`} />
              <span className="combatant-name">{c.name}</span>
              {c.conditions.length > 0 && (
                <span className="tag tag-amber">{c.conditions.length} cond.</span>
              )}
              <span className="combatant-hp">{c.currentHp}/{c.maxHp}</span>
              <svg style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0, transform: c.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* HP bar */}
            <div style={{ padding: '0 14px 10px' }}>
              <div className="hp-bar-track">
                <div className="hp-bar-fill"
                  style={{ width: `${hpPct * 100}%`, background: hpColor(hpPct) }} />
              </div>
            </div>

            {/* Expanded body */}
            {c.expanded && (
              <div className="combatant-body" style={{ paddingTop: 12 }}>
                {/* HP controls */}
                <div className="section-heading" style={{ marginTop: 0 }}>HP</div>
                <div className="form-row">
                  <div className="field">
                    <span className="field-label">Damage</span>
                    <div className="gap-row">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={dmgVal}
                        onChange={e => setHpInput(p => ({ ...p, [c.id]: { ...p[c.id], dmg: e.target.value } }))}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-ghost" style={{ color: 'var(--accent)' }}
                        onClick={() => { applyHp(c.id, -(parseInt(dmgVal)||0)); setHpInput(p => ({ ...p, [c.id]: { ...p[c.id], dmg: '' } })); }}>
                        Apply
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <span className="field-label">Heal</span>
                    <div className="gap-row">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={healVal}
                        onChange={e => setHpInput(p => ({ ...p, [c.id]: { ...p[c.id], heal: e.target.value } }))}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-ghost" style={{ color: 'var(--green)' }}
                        onClick={() => { applyHp(c.id, parseInt(healVal)||0); setHpInput(p => ({ ...p, [c.id]: { ...p[c.id], heal: '' } })); }}>
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Initiative reroll */}
                <div className="section-heading" style={{ marginTop: 12 }}>Initiative</div>
                <div className="gap-row">
                  <span className="mono" style={{ fontSize: 20, fontWeight: 500 }}>{c.initiative ?? '—'}</span>
                  <button className="btn btn-ghost" onClick={() => rollInitiative(c.id)}>Reroll</button>
                </div>

                {/* Conditions */}
                <div className="section-heading" style={{ marginTop: 12 }}>Conditions</div>
                <div className="conditions-wrap" style={{ padding: '0 0 4px' }}>
                  {CONDITIONS.map(cond => (
                    <button
                      key={cond}
                      className={`condition-chip${c.conditions.includes(cond) ? ' active' : ''}`}
                      onClick={() => toggleCondition(c.id, cond)}
                    >
                      {cond}
                    </button>
                  ))}
                </div>

                {/* Spell slots */}
                {c.spellSlots && Object.values(c.spellSlots).some(v => v > 0) && (
                  <>
                    <div className="section-heading" style={{ marginTop: 12 }}>Spell Slots</div>
                    <div className="spell-slots-grid" style={{ padding: '0 0 4px' }}>
                      {Object.entries(c.spellSlots).map(([lvl, total]) => {
                        if (!total) return null;
                        const used = c.usedSlots[lvl] || 0;
                        return (
                          <div className="slot-level" key={lvl}>
                            <span className="slot-level-label">Lvl {lvl}</span>
                            <div className="slot-pips">
                              {Array.from({ length: total }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`slot-pip${i < used ? ' used' : ''}`}
                                  onClick={() => toggleSlot(c.id, lvl)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Attacks */}
                {c.attacks?.length > 0 && (
                  <>
                    <div className="section-heading" style={{ marginTop: 12 }}>Attacks</div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      {c.attacks.map((atk, i) => (
                        <div className="attack-row" key={i}>
                          <span className="attack-name">{atk.name}</span>
                          {atk.toHit !== undefined && <span className="attack-stat">+{atk.toHit}</span>}
                          {atk.damage && <span className="attack-stat">{atk.damage}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Combat log */}
      {log.length > 0 && (
        <>
          <div className="section-heading" style={{ marginTop: 8 }}>Combat Log</div>
          <div className="card">
            <div className="combat-log">
              {log.map(entry => (
                <div className="log-entry" key={entry.id}>
                  <span className="log-entry-round">R{entry.round} </span>
                  {entry.msg}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
