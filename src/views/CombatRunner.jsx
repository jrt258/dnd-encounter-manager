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
  if (pct <= 0)   return 'dead';
  if (pct < 0.10) return 'critical';
  if (pct < 0.50) return 'bloody';
  return 'healthy';
}

function hpStatusClass(status) {
  if (status === 'healthy')  return 'hp-healthy';
  if (status === 'bloody')   return 'hp-bloody';
  if (status === 'critical') return 'hp-critical';
  return '';
}

function hpBarColor(status) {
  if (status === 'healthy') return 'var(--green)';
  if (status === 'bloody')  return 'var(--orange)';
  return 'var(--accent)';
}

function dexMod(abilities) {
  return abilities ? Math.floor((abilities.dex - 10) / 2) : 0;
}

function clampInit(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  return String(Math.max(1, n));
}

function modStr(n) { return n >= 0 ? `+${n}` : String(n); }

// Conditions are stored as objects: { id, turnsLeft }
// turnsLeft === null means "permanent" (no countdown)
function condId(c) { return typeof c === 'string' ? c : c.id; }
function condTurns(c) { return typeof c === 'string' ? null : (c.turnsLeft ?? null); }

function buildCombatants(entries) {
  const result = [];
  for (const entry of entries) {
    if (entry.type === 'player') {
      const p = entry.player;
      result.push({
        id: `${entry.id}-0`,
        sourceId: entry.sourceId,
        type: 'player',
        name: p.name,
        maxHp: p.hp ?? 10,
        damage: 0,
        ac: p.ac ?? 10,
        speed: p.speed ?? 30,
        initiative: null,
        initMod: dexMod(p.abilities) + (p.initiativeMod ?? 0),
        conditions: [],
        tempHp: 0,
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
      const groupInitMod = dexMod(m.abilities) + (m.initiativeMod ?? 0);
      for (let i = 0; i < count; i++) {
        const maxHp = m.hpFormula ? rollDice(m.hpFormula) : (m.hp ?? 10);
        result.push({
          id: `${entry.id}-${i}`,
          sourceId: entry.sourceId,
          groupKey: entry.sourceId,
          type: 'monster',
          name: count > 1 ? `${m.name} ${i + 1}` : m.name,
          baseName: m.name,
          maxHp,
          damage: 0,
          ac: m.ac ?? 10,
          speed: m.speed ?? 30,
          initiative: null,
          initMod: groupInitMod,
          conditions: [],
          tempHp: 0,
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
  const id    = condId(condition);
  const turns = condTurns(condition);
  const def   = CONDITIONS.find(c => c.id === id) ?? { label: id, color: '#666', bg: '#eee' };
  return (
    <span className="condition-chip" style={{ background: def.bg, color: def.color }} title={def.label}>
      {def.label}
      {turns !== null && <span style={{ marginLeft: 3, opacity: 0.75, fontSize: 9 }}>({turns}t)</span>}
      {onRemove && (
        <span style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, fontSize: 10 }}
          onClick={e => { e.stopPropagation(); onRemove(id); }}>×</span>
      )}
    </span>
  );
}

function ConditionToggleGrid({ active, onToggle }) {
  return (
    <div className="condition-toggle-grid">
      {CONDITIONS.map(c => {
        const activeEntry = active.find(a => condId(a) === c.id);
        const isActive = !!activeEntry;
        return (
          <button key={c.id} className={`condition-toggle${isActive ? ' active' : ''}`}
            style={isActive ? { background: c.color, borderColor: c.color } : {}}
            onClick={() => onToggle(c.id)}>
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
        <div key={i} className={`slot-pip${i < used ? ' used' : ''}`}
          onClick={() => onToggle(i)} title={i < used ? 'Expended' : 'Available'} />
      ))}
    </div>
  );
}

// Apply damage, absorbing temp HP first. Returns { newDamage, newTempHp, absorbed }
function applyDamageWithTemp(c, amt) {
  const absorbed  = Math.min(c.tempHp || 0, amt);
  const remainder = amt - absorbed;
  const newTempHp = (c.tempHp || 0) - absorbed;
  const newDamage = Math.min(c.maxHp, c.damage + remainder);
  return { newDamage, newTempHp, absorbed };
}

function QuickHP({ label, color, sign, c, onUpdate, addLog, round }) {
  const [val, setVal] = useState('');

  function apply() {
    const amt = parseInt(val) || 0;
    if (amt === 0) return;
    if (sign < 0) {
      // Damage — temp HP absorbs first
      const { newDamage, newTempHp, absorbed } = applyDamageWithTemp(c, amt);
      onUpdate(c.id, { damage: newDamage, tempHp: newTempHp });
      const hpAfter = c.maxHp - newDamage;
      const absorbedNote = absorbed > 0 ? ` (${absorbed} absorbed by temp HP)` : '';
      addLog(`${c.name} took ${amt} damage${absorbedNote} (→ ${hpAfter} HP)`, round);
    } else {
      // Heal — restores real HP, doesn't touch temp HP
      const newDmg = Math.max(0, c.damage - amt);
      onUpdate(c.id, { damage: newDmg });
      addLog(`${c.name} healed ${amt} HP (→ ${c.maxHp - newDmg} HP)`, round);
    }
    setVal('');
  }

  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
      <input type="number" min={0} placeholder="0" value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') apply(); }}
        style={{ flex: 1, padding: '5px 8px', fontSize: 13 }} />
      <button className="btn btn-ghost btn-sm" style={{ color, flexShrink: 0, minWidth: 64 }} onClick={apply}>
        {label}
      </button>
    </div>
  );
}

function QuickTempHP({ c, onUpdate, addLog, round }) {
  const [val, setVal] = useState('');

  function apply() {
    const amt = parseInt(val) || 0;
    if (amt === 0) return;
    // Per 5e rules, temp HP doesn't stack — take the higher value
    const newTemp = Math.max(c.tempHp || 0, amt);
    onUpdate(c.id, { tempHp: newTemp });
    addLog(`${c.name} gained ${amt} temp HP (total: ${newTemp})`, round);
    setVal('');
  }

  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
      <input type="number" min={0} placeholder="0" value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') apply(); }}
        style={{ flex: 1, padding: '5px 8px', fontSize: 13 }} />
      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue-text, #3b82f6)', flexShrink: 0, minWidth: 64 }} onClick={apply}>
        Temp HP
      </button>
    </div>
  );
}

// ─── Expanded detail panel ────────────────────────────────────────────────────

function CombatantExpand({ c, onUpdate, onToggleSlot, onToggleCondition, addLog, round }) {
  const currentHp = c.maxHp - c.damage;
  const [condTurnsInput, setCondTurnsInput] = useState('');

  return (
    <div className="combatant-expand">

      {/* ── Stat block summary bar ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 14,
      }}>
        {/* HP */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', textAlign: 'center', minWidth: 72 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 2 }}>HP</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600, color: hpBarColor(hpStatus(currentHp, c.maxHp)), lineHeight: 1 }}>
            {currentHp}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>/ {c.maxHp}</div>
          {(c.tempHp || 0) > 0 && (
            <div style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>+{c.tempHp}t</div>
          )}
        </div>
        {/* AC */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 2 }}>AC</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{c.ac}</div>
        </div>
        {/* Speed */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', textAlign: 'center', minWidth: 64 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 2 }}>Speed</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{c.speed}<span style={{ fontSize: 9, color: 'var(--text3)' }}> ft</span></div>
        </div>
        {/* Initiative */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', textAlign: 'center', minWidth: 64 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 2 }}>Init</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
            {c.initiative ?? '—'}
            {c.initMod !== 0 && <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 2 }}>({modStr(c.initMod)})</span>}
          </div>
        </div>
        {/* Ability scores */}
        {c.abilities && (
          <div style={{ display: 'flex', flex: 1 }}>
            {['str','dex','con','int','wis','cha'].map((ab, i) => {
              const score = c.abilities[ab] ?? 10;
              const mod   = Math.floor((score - 10) / 2);
              return (
                <div key={ab} style={{
                  flex: 1, padding: '6px 4px', textAlign: 'center',
                  borderRight: i < 5 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 1 }}>{ab.toUpperCase()}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>{modStr(mod)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main two-col grid ── */}
      <div className="expand-grid">
        <div>
          {/* HP edit */}
          <div className="expand-section">
            <div className="expand-section-title">Hit Points</div>
            <div className="hp-edit-row">
              <div className="hp-edit-field">
                <span className="hp-edit-label">Max HP</span>
                <input type="number" className="hp-edit-input" min={1} value={c.maxHp}
                  onChange={e => onUpdate(c.id, { maxHp: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="hp-edit-field">
                <span className="hp-edit-label">Damage Taken</span>
                <input type="number" className="hp-edit-input" min={0} max={c.maxHp} value={c.damage}
                  onChange={e => onUpdate(c.id, { damage: Math.max(0, Math.min(c.maxHp, parseInt(e.target.value) || 0)) })} />
              </div>
              <div className="hp-edit-field">
                <span className="hp-edit-label">Current HP</span>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, padding: '6px 8px',
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  textAlign: 'center', color: hpBarColor(hpStatus(currentHp, c.maxHp)) }}>
                  {currentHp}
                </div>
              </div>
            </div>
            {/* Damage + Heal buttons — equal widths */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <QuickHP label="Damage" color="var(--accent)" sign={-1} c={c} onUpdate={onUpdate} addLog={addLog} round={round} />
              <QuickHP label="Heal"   color="var(--green)"  sign={+1} c={c} onUpdate={onUpdate} addLog={addLog} round={round} />
            </div>
            {/* Temp HP row */}
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              <QuickTempHP c={c} onUpdate={onUpdate} addLog={addLog} round={round} />
              {(c.tempHp || 0) > 0 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text3)', flexShrink: 0 }}
                  onClick={() => { onUpdate(c.id, { tempHp: 0 }); addLog(`${c.name} lost all temp HP`, round); }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Conditions */}
          <div className="expand-section">
            <div className="expand-section-title">Conditions</div>
            {/* Duration input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Duration (turns):</span>
              <input type="number" min={1} placeholder="∞" value={condTurnsInput}
                onChange={e => setCondTurnsInput(e.target.value)}
                style={{ width: 56, fontSize: 12, padding: '3px 6px', textAlign: 'center', fontFamily: 'DM Mono, monospace' }} />
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>leave blank = permanent</span>
            </div>
            <ConditionToggleGrid
              active={c.conditions}
              onToggle={id => onToggleCondition(c.id, id, condTurnsInput ? parseInt(condTurnsInput) : null)}
            />
          </div>

          {/* Attacks */}
          {c.attacks?.length > 0 && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Attacks</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {c.attacks.map((atk, i) => (
                  <div className="attack-row" key={i}>
                    <span className="attack-name">{atk.name}</span>
                    {atk.hitBonus !== undefined && <span className="attack-stat">{atk.hitBonus >= 0 ? '+' : ''}{atk.hitBonus} to hit</span>}
                    {atk.damage && <span className="attack-stat">{atk.damage} {atk.damageType ?? ''}</span>}
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
                      <SlotPips total={total} used={used} onToggle={() => onToggleSlot(c.id, lvl)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

// ─── Initiative input ─────────────────────────────────────────────────────────

function InitInput({ value, onChange, style = {} }) {
  return (
    <input
      type="number" min={1} placeholder="—" value={value}
      onChange={e => onChange(clampInit(e.target.value))}
      onBlur={e => { if (e.target.value !== '' && parseInt(e.target.value) < 1) onChange('1'); }}
      style={{ width: 72, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, ...style }}
    />
  );
}

// ─── Action Modal — 3-step flow with Healing + Condition ─────────────────────

function ActionModal({ attacker, combatants, onApply, onClose }) {
  const [step, setStep]                       = useState('action');
  const [selectedAction, setSelectedAction]   = useState(null);
  const [selectedTarget, setSelectedTarget]   = useState(null);
  const [damageVal, setDamageVal]             = useState('');
  const [healVal, setHealVal]                 = useState('');
  const [tempHpVal, setTempHpVal]             = useState('');
  const [rolledBreakdown, setRolledBreakdown] = useState('');
  const [conditionToApply, setConditionToApply] = useState('');
  const [condTurnsInput, setCondTurnsInput]   = useState('');

  const attacks = attacker.attacks ?? [];
  const spells  = (attacker.spells ?? []).filter(s => s.effect || s.damage);
  const hasActions = attacks.length > 0 || spells.length > 0;
  const targets = combatants.filter(c => c.id !== attacker.id && (c.maxHp - c.damage) > 0);

  function rollDamageExpr(expr) {
    if (!expr) return { total: 0, breakdown: '0' };
    const match = expr.trim().match(/^(\d*)d(\d+)([+-]\d+)?/i);
    if (!match) { const flat = parseInt(expr) || 0; return { total: flat, breakdown: String(flat) }; }
    const count = parseInt(match[1] || '1');
    const sides = parseInt(match[2]);
    const mod   = parseInt(match[3] || '0');
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const rollStr = count > 1 ? `[${rolls.join('+')}]` : String(rolls[0]);
    const breakdown = mod !== 0 ? `${rollStr}${mod > 0 ? '+' : ''}${mod}` : rollStr;
    return { total: Math.max(0, total), breakdown };
  }

  function handleRoll() {
    const expr = selectedAction?.damage ?? selectedAction?.effect ?? '';
    const { total, breakdown } = rollDamageExpr(expr);
    setDamageVal(String(total));
    setRolledBreakdown(breakdown);
  }

  function handleApply() {
    const dmg   = parseInt(damageVal) || 0;
    const heal  = parseInt(healVal) || 0;
    const tmpHp = parseInt(tempHpVal) || 0;
    const turns = condTurnsInput ? parseInt(condTurnsInput) : null;
    if (!selectedTarget) return;
    onApply(selectedTarget.id, dmg, heal, tmpHp, conditionToApply || null, turns, selectedAction, attacker);
    onClose();
  }

  const stepTitle = {
    action: `${attacker.name} — Choose Action`,
    target: `${selectedAction?.name ?? 'Action'} — Choose Target`,
    damage: `${selectedAction?.name ?? 'Action'} → ${selectedTarget?.name ?? '?'} — Resolve`,
  }[step];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">{stepTitle}</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">

          {/* Step 1: Action picker */}
          {step === 'action' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attacks.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: 0 }}>Attacks</div>
                  {attacks.map((atk, i) => (
                    <button key={i} onClick={() => { setSelectedAction({ ...atk, actionType: 'attack' }); setStep('target'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{atk.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                          {atk.hitBonus !== undefined && `${atk.hitBonus >= 0 ? '+' : ''}${atk.hitBonus} to hit`}
                          {atk.hitBonus !== undefined && atk.damage && ' · '}
                          {atk.damage && `${atk.damage} ${atk.damageType ?? ''}`}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </>
              )}
              {spells.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: attacks.length > 0 ? 8 : 0 }}>Spells</div>
                  {spells.map((sp, i) => (
                    <button key={i} onClick={() => { setSelectedAction({ ...sp, actionType: 'spell' }); setStep('target'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                          {sp.damage ? sp.damage : sp.effect ?? ''}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </>
              )}
              <div className="section-heading" style={{ marginTop: hasActions ? 8 : 0 }}>{hasActions ? 'Other' : 'Actions'}</div>
              <button onClick={() => { setSelectedAction({ name: 'Custom', actionType: 'custom', damage: '' }); setStep('target'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Custom / Other</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Unarmed strike, special ability, or manual damage</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Step 2: Target picker */}
          {step === 'target' && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setStep('action')}>← Back</button>
              {targets.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>No valid targets — all other combatants are down.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {targets.map(t => {
                    const tHp = t.maxHp - t.damage;
                    const tStatus = hpStatus(tHp, t.maxHp);
                    return (
                      <button key={t.id}
                        onClick={() => { setSelectedTarget(t); setDamageVal(''); setHealVal(''); setTempHpVal(''); setConditionToApply(''); setCondTurnsInput(''); setRolledBreakdown(''); setStep('damage'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                        <div className={`combatant-dot ${t.type === 'player' ? 'dot-player' : 'dot-monster'}`} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                            AC {t.ac} · HP {tHp}/{t.maxHp}
                            {t.conditions.length > 0 && ` · ${t.conditions.map(condId).join(', ')}`}
                          </div>
                        </div>
                        <div style={{ width: 60 }}>
                          <div className="hp-bar-track">
                            <div className="hp-bar-fill" style={{ width: `${Math.max(0, tHp / t.maxHp) * 100}%`, background: hpBarColor(tStatus) }} />
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Resolve */}
          {step === 'damage' && selectedTarget && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep('target')}>← Back</button>

              {/* Summary */}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`combatant-dot ${selectedTarget.type === 'player' ? 'dot-player' : 'dot-monster'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedTarget.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                    HP {selectedTarget.maxHp - selectedTarget.damage}/{selectedTarget.maxHp} · AC {selectedTarget.ac}
                  </div>
                </div>
              </div>

              {/* Damage + Healing + Temp HP — equal width columns */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Damage</div>
                  <input
                    type="number" min={0} placeholder="0"
                    value={damageVal} onChange={e => setDamageVal(e.target.value)}
                    style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 600, textAlign: 'center' }}
                    autoFocus
                  />
                  {(selectedAction?.damage || selectedAction?.effect) && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, width: '100%' }} onClick={handleRoll}>
                      🎲 Roll {selectedAction.damage ?? selectedAction.effect}
                    </button>
                  )}
                  {rolledBreakdown && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
                      {rolledBreakdown} = {damageVal}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Healing <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 10 }}>(opt)</span></div>
                  <input
                    type="number" min={0} placeholder="0"
                    value={healVal} onChange={e => setHealVal(e.target.value)}
                    style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 600, textAlign: 'center', color: 'var(--green)' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>real HP</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Temp HP <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 10 }}>(opt)</span></div>
                  <input
                    type="number" min={0} placeholder="0"
                    value={tempHpVal} onChange={e => setTempHpVal(e.target.value)}
                    style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 600, textAlign: 'center', color: '#3b82f6' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>blue bar</div>
                </div>
              </div>

              {/* Condition */}
              <div style={{ marginBottom: 14 }}>
                <div className="field-label" style={{ marginBottom: 4 }}>
                  Apply Condition <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional)</span>
                </div>
                {/* Duration input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>For</span>
                  <input type="number" min={1} placeholder="∞" value={condTurnsInput}
                    onChange={e => setCondTurnsInput(e.target.value)}
                    style={{ width: 52, fontSize: 12, padding: '3px 6px', textAlign: 'center', fontFamily: 'DM Mono, monospace' }} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>turns (blank = permanent)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CONDITIONS.map(cond => {
                    const active = conditionToApply === cond.id;
                    return (
                      <button key={cond.id}
                        onClick={() => setConditionToApply(active ? '' : cond.id)}
                        style={{ padding: '3px 10px', borderRadius: 99, border: `1.5px solid ${active ? 'transparent' : 'var(--border-strong)'}`, background: active ? cond.bg : 'var(--surface)', color: active ? cond.color : 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'DM Sans, sans-serif' }}>
                        {cond.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="btn btn-accent"
                style={{ width: '100%' }}
                onClick={handleApply}
                disabled={!damageVal && !healVal && !tempHpVal && !conditionToApply}>
                Apply to {selectedTarget.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Encounter select ─────────────────────────────────────────────────────────

function EncounterSelectScreen({ encounters, onSelect }) {
  if (!encounters?.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚔️</div>
        <div>No encounters yet.</div>
        <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text3)' }}>Build one in the Encounter Builder first.</div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Select an Encounter</div>
      <div className="card">
        {encounters.map(enc => (
          <div key={enc.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => onSelect(enc)}>
            <div className="list-row-main">
              <div className="list-row-title">{enc.name || 'Unnamed Encounter'}</div>
              <div className="list-row-sub">{enc.entries?.length ?? 0} entries</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Initiative mode ──────────────────────────────────────────────────────────

function InitiativeModeScreen({ encounter, onConfirm, onBack }) {
  const [mode, setMode] = useState('individual');
  const modes = [
    { id: 'individual', label: 'Individual', desc: 'Each monster rolls separately.' },
    { id: 'group',      label: 'Group',      desc: 'All monsters of the same type share one roll.' },
    { id: 'all',        label: 'All at Once', desc: 'Roll a single initiative for every monster.' },
  ];
  return (
    <div style={{ maxWidth: 480 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{encounter.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Choose initiative rolling mode.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {modes.map(m => (
          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: `1.5px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`, background: mode === m.id ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
            <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} style={{ accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{m.desc}</div>
            </div>
          </label>
        ))}
      </div>
      <button className="btn btn-accent" onClick={() => onConfirm(mode)}>Continue →</button>
    </div>
  );
}

// ─── Initiative input ─────────────────────────────────────────────────────────

function InitiativeInputScreen({ combatants, initiativeMode, onStart, onBack }) {
  const [initiatives, setInitiatives] = useState(() => {
    const init = {};
    combatants.forEach(c => { init[c.id] = ''; });
    return init;
  });

  const players  = combatants.filter(c => c.type === 'player');
  const monsters = combatants.filter(c => c.type === 'monster');

  function setVal(id, val) { setInitiatives(prev => ({ ...prev, [id]: val })); }

  function rollAll() {
    const next = { ...initiatives };
    if (initiativeMode === 'group') {
      const groups = {};
      monsters.forEach(c => { if (!(c.groupKey in groups)) groups[c.groupKey] = Math.floor(Math.random() * 20) + 1 + c.initMod; });
      monsters.forEach(c => { next[c.id] = String(Math.max(1, groups[c.groupKey])); });
    } else {
      monsters.forEach(c => { next[c.id] = String(Math.max(1, Math.floor(Math.random() * 20) + 1 + c.initMod)); });
    }
    setInitiatives(next);
  }

  const allSet = combatants.every(c => initiatives[c.id] !== '');

  function handleStart() {
    const withInit = combatants.map(c => ({ ...c, initiative: parseInt(initiatives[c.id]) || 0 }));
    const sorted   = [...withInit].sort((a, b) => b.initiative - a.initiative || b.initMod - a.initMod);
    onStart(sorted);
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Set Initiatives</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {initiativeMode === 'group' ? 'One roll for all monsters — they all act on the same turn.' : 'Each combatant rolls separately.'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={rollAll}>🎲 Roll All Monsters</button>
      </div>

      {players.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Players</div>
          <div className="card">
            {players.map(c => (
              <div className="list-row" key={c.id}>
                <div className="combatant-dot dot-player" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{c.name}</div>
                  <div className="list-row-sub">Enter initiative from player (min 1)</div>
                </div>
                <InitInput value={initiatives[c.id]} onChange={val => setVal(c.id, val)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div className="section-heading" style={{ marginTop: 0 }}>Monsters</div>
        <div className="card">
          {initiativeMode === 'group' ? (
            (() => {
              const allMonsters = combatants.filter(c => c.type === 'monster');
              const rep = allMonsters.reduce((best, c) => c.initMod > (best?.initMod ?? -99) ? c : best, null);
              const groupVal = rep ? initiatives[rep.id] : '';
              return (
                <div className="list-row">
                  <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                  <div className="list-row-main">
                    <div className="list-row-title">All Monsters</div>
                    <div className="list-row-sub">{allMonsters.length} combatants · highest init mod {rep?.initMod >= 0 ? '+' : ''}{rep?.initMod ?? 0}</div>
                  </div>
                  <InitInput value={groupVal} onChange={val => allMonsters.forEach(c => setVal(c.id, val))} />
                </div>
              );
            })()
          ) : (
            monsters.map(c => (
              <div className="list-row" key={c.id}>
                <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{c.name}</div>
                  <div className="list-row-sub">Init mod: {c.initMod >= 0 ? '+' : ''}{c.initMod}</div>
                </div>
                <InitInput value={initiatives[c.id]} onChange={val => setVal(c.id, val)} />
              </div>
            ))
          )}
        </div>
      </div>

      <button className="btn btn-accent" style={{ opacity: allSet ? 1 : 0.5 }}
        onClick={handleStart} disabled={!allSet} title={!allSet ? 'Set all initiatives to continue' : ''}>
        ⚔️ Start Combat
      </button>
      {!allSet && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>All initiatives must be set before starting.</div>}
    </div>
  );
}

// ─── Main CombatRunner ────────────────────────────────────────────────────────

export default function CombatRunner({
  encounters,
  screen,            setScreen,
  selectedEncounter, setSelectedEncounter,
  initiativeMode,    setInitiativeMode,
  pendingCombatants, setPendingCombatants,
  combatants,        setCombatants,
  round,             setRound,
  turnIdx,           setTurnIdx,
  log,               setLog,
}) {
  const [actionModal, setActionModal] = useState(null);

  const dragIdx     = useRef(null);
  const dragOverIdx = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const addLog = useCallback((msg, r) => {
    setLog(prev => [{ msg, round: r, id: Date.now() + Math.random() }, ...prev].slice(0, 80));
  }, [setLog]);

  function handleSelectEncounter(enc) {
    setSelectedEncounter(enc);
    setPendingCombatants(buildCombatants(enc.entries));
    setScreen('mode');
  }

  function handleConfirmMode(mode) {
    setInitiativeMode(mode);
    setScreen('initiative');
  }

  function handleStartCombat(sortedCombatants) {
    setCombatants(sortedCombatants);
    setRound(1); setTurnIdx(0); setLog([]);
    addLog('⚔️  Combat started!', 1);
    if (sortedCombatants[0]) addLog(`${sortedCombatants[0].name}'s turn`, 1);
    setScreen('combat');
  }

  function endCombat() {
    if (!confirm('End combat and return to encounter select?')) return;
    setScreen('select');
    setSelectedEncounter(null);
    setCombatants([]);
    setRound(1); setTurnIdx(0); setLog([]);
  }

  function nextTurn() {
    setCombatants(prev => {
      // Count down condition turns for the combatant whose turn is ending
      const withCountdown = prev.map((c, idx) => {
        if (idx !== turnIdx) return c;
        const conditions = c.conditions
          .map(cond => {
            if (typeof cond === 'string') return cond; // legacy
            if (cond.turnsLeft === null) return cond;  // permanent
            return { ...cond, turnsLeft: cond.turnsLeft - 1 };
          })
          .filter(cond => {
            const t = typeof cond === 'string' ? null : cond.turnsLeft;
            return t === null || t > 0;
          });
        return { ...c, conditions };
      });

      let next = turnIdx + 1;
      let newRound = round;
      if (next >= withCountdown.length) {
        next = 0;
        newRound = round + 1;
        addLog(`── Round ${newRound} begins ──`, newRound);
      }
      let safety = 0;
      while (withCountdown[next] && (withCountdown[next].maxHp - withCountdown[next].damage) <= 0 && safety < withCountdown.length) {
        next = (next + 1) % withCountdown.length;
        if (next === 0) newRound++;
        safety++;
      }
      setTurnIdx(next);
      setRound(newRound);
      if (withCountdown[next]) addLog(`${withCountdown[next].name}'s turn`, newRound);
      return withCountdown;
    });
  }

  function updateCombatant(id, changes) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function toggleCondition(id, condId, turnsLeft = null) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const existingIdx = c.conditions.findIndex(a => (typeof a === 'string' ? a : a.id) === condId);
      let conditions;
      if (existingIdx >= 0) {
        conditions = c.conditions.filter((_, i) => i !== existingIdx);
        addLog(`${c.name} lost ${condId}`, round);
      } else {
        const entry = turnsLeft !== null ? { id: condId, turnsLeft } : { id: condId, turnsLeft: null };
        conditions = [...c.conditions, entry];
        const turnStr = turnsLeft !== null ? ` for ${turnsLeft} turns` : '';
        addLog(`${c.name} gained ${condId}${turnStr}`, round);
      }
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

  function onApplyAction(targetId, damage, heal, tmpHp, condition, condTurnsVal, action, attacker) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      // Damage absorbs temp HP first
      let newTempHp = c.tempHp || 0;
      let newDamage = c.damage;
      if (damage) {
        const absorbed  = Math.min(newTempHp, damage);
        newTempHp = newTempHp - absorbed;
        newDamage = Math.min(c.maxHp, c.damage + (damage - absorbed));
      }
      // Healing restores real HP
      if (heal) newDamage = Math.max(0, newDamage - heal);
      // Temp HP: take higher per 5e rules
      if (tmpHp) newTempHp = Math.max(newTempHp, tmpHp);
      // Condition
      let conditions = c.conditions;
      if (condition && !conditions.find(a => condId(a) === condition)) {
        const entry = condTurnsVal !== null ? { id: condition, turnsLeft: condTurnsVal } : { id: condition, turnsLeft: null };
        conditions = [...conditions, entry];
      }
      return { ...c, damage: newDamage, tempHp: newTempHp, conditions };
    }));

    const target   = combatants.find(c => c.id === targetId);
    const curTmp   = target?.tempHp || 0;
    const absorbed = damage ? Math.min(curTmp, damage) : 0;
    const realDmg  = damage ? damage - absorbed : 0;
    const hpBefore = target ? target.maxHp - target.damage : 0;
    const hpAfter  = Math.max(0, Math.min(target?.maxHp ?? 0, hpBefore - realDmg + (heal || 0)));
    const actionDesc = action?.name ?? 'attack';
    let logMsg = `${attacker.name} used ${actionDesc} on ${target?.name ?? '?'}`;
    if (damage)    logMsg += ` for ${damage} dmg${absorbed > 0 ? ` (${absorbed} to temp HP)` : ''}`;
    if (heal)      logMsg += `${damage ? ',' : ''} healed ${heal}`;
    if (tmpHp)     logMsg += `${damage || heal ? ',' : ''} +${tmpHp} temp HP`;
    logMsg += ` (→ ${hpAfter} HP)`;
    if (condition) {
      const turnStr = condTurnsVal !== null ? ` for ${condTurnsVal} turns` : '';
      logMsg += ` · gains ${condition}${turnStr}`;
    }
    addLog(logMsg, round);
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  function onHandleDragStart(e, idx) {
    dragIdx.current = idx;
    setDraggingId(combatants[idx].id);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  }

  function onRowDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIdx.current = idx;
    setDragOverId(combatants[idx].id);
  }

  function onRowDragLeave() { setDragOverId(null); }
  function onDragEnd()      { dragIdx.current = null; setDraggingId(null); setDragOverId(null); }

  function onRowDrop(e, idx) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    setCombatants(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      if (turnIdx === from) setTurnIdx(idx);
      else if (from < turnIdx && idx >= turnIdx) setTurnIdx(t => t - 1);
      else if (from > turnIdx && idx <= turnIdx) setTurnIdx(t => t + 1);
      return next;
    });
    dragIdx.current = null; setDraggingId(null); setDragOverId(null);
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'select')     return <EncounterSelectScreen encounters={encounters} onSelect={handleSelectEncounter} />;
  if (screen === 'mode')       return <InitiativeModeScreen encounter={selectedEncounter} onConfirm={handleConfirmMode} onBack={() => setScreen('select')} />;
  if (screen === 'initiative') return <InitiativeInputScreen combatants={pendingCombatants} initiativeMode={initiativeMode} onStart={handleStartCombat} onBack={() => setScreen('mode')} />;

  const activeCombatant = combatants[turnIdx];

  // Combat log panel: 260 * 1.333 ≈ 347px → 348px
  const LOG_WIDTH = 348;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {actionModal && (
        <ActionModal
          attacker={actionModal}
          combatants={combatants}
          onApply={onApplyAction}
          onClose={() => setActionModal(null)}
        />
      )}

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
            <button className="btn btn-accent" onClick={nextTurn}>Next Turn →</button>
            <button className="btn btn-ghost" style={{ color: 'var(--accent)' }} onClick={endCombat}>End Combat</button>
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
                  isActive ? 'active-turn' : '',
                  isDead   ? 'dead' : '',
                  draggingId === c.id ? 'dragging' : '',
                  dragOverId === c.id && draggingId !== c.id ? 'drag-over' : '',
                ].filter(Boolean).join(' ')}
                onDragOver={e => onRowDragOver(e, idx)}
                onDragLeave={onRowDragLeave}
                onDrop={e => onRowDrop(e, idx)}
              >
                <div className="combatant-row-main">
                  <div className="drag-handle" title="Drag to reorder" draggable
                    onDragStart={e => onHandleDragStart(e, idx)} onDragEnd={onDragEnd}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
                      <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                    </svg>
                  </div>

                  <div className="combatant-init" title="Initiative">{c.initiative ?? '—'}</div>
                  <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`} />

                  <div className="combatant-name-col">
                    <div className="combatant-name">{c.name}</div>
                    {c.conditions.length > 0 && (
                      <div className="combatant-conditions">
                        {c.conditions.map((cond, i) => (
                          <ConditionChip key={i} condition={cond} />
                        ))}
                      </div>
                    )}
                    {/* HP bar — green base + blue temp HP overlay, both from left */}
                    <div className="hp-bar-track" style={{ marginTop: 4, position: 'relative' }}>
                      {/* Real HP */}
                      <div className="hp-bar-fill"
                        style={{ width: `${Math.max(0, hpPct) * 100}%`, background: hpBarColor(status) }} />
                      {/* Temp HP — blue, layered on top, starting from left */}
                      {(c.tempHp || 0) > 0 && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0,
                          height: '100%',
                          width: `${Math.min(100, ((c.tempHp || 0) / c.maxHp) * 100)}%`,
                          background: '#3b82f6',
                          borderRadius: 99,
                          opacity: 0.85,
                          transition: 'width 0.4s cubic-bezier(.4,0,.2,1)',
                          pointerEvents: 'none',
                        }} />
                      )}
                    </div>
                  </div>

                  <div className="combatant-stats">
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">HP</span>
                      <span className={`combatant-stat-value ${hpStatusClass(status)}`}>
                        {currentHp}
                        {status === 'bloody'   && ' 🩸'}
                        {status === 'critical' && ' ☠'}
                      </span>
                      <span className="combatant-stat-sub">/ {c.maxHp}</span>
                      {(c.tempHp || 0) > 0 && (
                        <span style={{ fontSize: 9, color: '#3b82f6', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>+{c.tempHp}t</span>
                      )}
                    </div>
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">AC</span>
                      <span className="combatant-stat-value">{c.ac}</span>
                    </div>
                    <div className="combatant-stat">
                      <span className="combatant-stat-label">Speed</span>
                      <span className="combatant-stat-value">{c.speed}</span>
                      <span className="combatant-stat-sub">ft</span>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 8, paddingRight: 4, display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: isDead ? 'var(--text3)' : 'var(--text2)' }}
                      disabled={isDead}
                      onClick={() => setActionModal(c)}
                      title="Use an action or attack"
                    >
                      Action
                    </button>
                  </div>

                  <div className="combatant-chevron" onClick={() => toggleExpanded(c.id)} title={c.expanded ? 'Collapse' : 'Expand'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: c.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {c.expanded && (
                  <CombatantExpand
                    c={c}
                    onUpdate={updateCombatant}
                    onToggleSlot={toggleSlot}
                    onToggleCondition={toggleCondition}
                    addLog={addLog}
                    round={round}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat log — 1/3 wider than original 260px = 348px */}
      <div style={{ width: LOG_WIDTH, flexShrink: 0 }}>
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
