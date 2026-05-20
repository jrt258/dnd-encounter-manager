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

// Clamp initiative input to minimum 1
function clampInit(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  return String(Math.max(1, n));
}

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
        result.push({
          id: `${entry.id}-${i}`,
          sourceId: entry.sourceId,
          groupKey: entry.sourceId,
          type: 'monster',
          name: count > 1 ? `${m.name} ${i + 1}` : m.name,
          baseName: m.name,
          maxHp: m.hp ?? 10,
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
  const def = CONDITIONS.find(c => c.id === condition) ?? { label: condition, color: '#666', bg: '#eee' };
  return (
    <span className="condition-chip" style={{ background: def.bg, color: def.color }} title={def.label}>
      {def.label}
      {onRemove && (
        <span style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, fontSize: 10 }}
          onClick={e => { e.stopPropagation(); onRemove(condition); }}>×</span>
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

function QuickHPRow({ label, color, placeholder, onApply }) {
  const [val, setVal] = useState('');
  function commit() {
    const amt = parseInt(val) || 0;
    if (amt === 0) return;
    onApply(amt);
    setVal('');
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="number"
        min={0}
        placeholder={placeholder ?? '0'}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit()}
        style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
      />
      <button
        className="btn btn-ghost btn-sm"
        style={{ color, flexShrink: 0, minWidth: 72 }}
        onClick={commit}
      >
        {label}
      </button>
    </div>
  );
}

// ─── Expanded detail panel — reroll removed, initiative shown as read-only ───

function CombatantExpand({ c, onUpdate, onToggleSlot, onToggleCondition }) {
  const currentHp = c.maxHp - c.damage;
  return (
    <div className="combatant-expand">
      <div className="expand-grid">
        <div>
          {/* HP */}
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
              <div className="hp-edit-field">
                <span className="hp-edit-label">Temp HP</span>
                <input
                  type="number"
                  className="hp-edit-input"
                  min={0}
                  value={c.tempHp ?? 0}
                  onChange={e => onUpdate(c.id, { tempHp: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ color: 'var(--blue, #3b82f6)' }}
                />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <QuickHPRow
                label="Damage"
                color="var(--accent)"
                placeholder="Amount"
                onApply={amt => onUpdate(c.id, { damage: Math.min(c.maxHp, c.damage + amt) })}
              />
              <QuickHPRow
                label="Heal"
                color="var(--green)"
                placeholder="Amount"
                onApply={amt => onUpdate(c.id, { damage: Math.max(0, c.damage - amt) })}
              />
              <QuickHPRow
                label="Temp HP"
                color="var(--blue, #3b82f6)"
                placeholder="Amount"
                onApply={amt => onUpdate(c.id, { tempHp: (c.tempHp ?? 0) + amt })}
              />
            </div>
          </div>

          {/* Initiative — read-only display */}
          <div className="expand-section" style={{ marginTop: 14 }}>
            <div className="expand-section-title">Initiative</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>
                {c.initiative ?? '—'}
              </span>
              {c.initMod !== 0 && (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  (mod {c.initMod >= 0 ? `+${c.initMod}` : c.initMod})
                </span>
              )}
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

        <div>
          <div className="expand-section">
            <div className="expand-section-title">Conditions</div>
            <ConditionToggleGrid active={c.conditions} onToggle={id => onToggleCondition(c.id, id)} />
          </div>

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

// ─── Initiative input field (min 1) ──────────────────────────────────────────

function InitInput({ value, onChange, style = {} }) {
  return (
    <input
      type="number"
      min={1}
      placeholder="—"
      value={value}
      onChange={e => onChange(clampInit(e.target.value))}
      onBlur={e => { if (e.target.value !== '' && parseInt(e.target.value) < 1) onChange('1'); }}
      style={{
        width: 72, textAlign: 'center',
        fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500,
        ...style,
      }}
    />
  );
}

// ─── Action Modal — 3-step attack flow ───────────────────────────────────────

function ActionModal({ attacker, combatants, onApply, onClose }) {
  const [step, setStep]           = useState('action');  // 'action' | 'target' | 'damage'
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [damageVal, setDamageVal] = useState('');
  const [rolledBreakdown, setRolledBreakdown] = useState('');

  // Build action list: attacks + spells + custom
  const attacks = attacker.attacks ?? [];
  const spells  = (attacker.spells ?? []).filter(s => s.effect || s.damage);
  const hasActions = attacks.length > 0 || spells.length > 0;

  // Targets: all living combatants except the attacker
  const targets = combatants.filter(c => c.id !== attacker.id && (c.maxHp - c.damage) > 0);

  // Parse a dice expression like "2d6+3" and roll it, returning {total, breakdown}
  function rollDamageExpr(expr) {
    if (!expr) return { total: 0, breakdown: '0' };
    const match = expr.trim().match(/^(\d*)d(\d+)([+-]\d+)?/i);
    if (!match) {
      const flat = parseInt(expr) || 0;
      return { total: flat, breakdown: String(flat) };
    }
    const count  = parseInt(match[1] || '1');
    const sides  = parseInt(match[2]);
    const mod    = parseInt(match[3] || '0');
    const rolls  = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total  = rolls.reduce((a, b) => a + b, 0) + mod;
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
    const dmg = parseInt(damageVal);
    if (!dmg || !selectedTarget) return;
    onApply(selectedTarget.id, dmg, selectedAction, attacker);
    onClose();
  }

  // ── Step titles ───────────────────────────────────────────────────────────
  const stepTitle = {
    action: `${attacker.name} — Choose Action`,
    target: `${selectedAction?.name ?? 'Action'} — Choose Target`,
    damage: `${selectedAction?.name ?? 'Action'} → ${selectedTarget?.name ?? '?'} — Set Damage`,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        width: 380, maxHeight: '80vh', overflow: 'auto', padding: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{stepTitle[step]}</div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step 1: choose action */}
        {step === 'action' && (
          <div>
            {!hasActions && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>No defined actions — enter custom damage below.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" min={0} placeholder="Damage" value={damageVal}
                    onChange={e => setDamageVal(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                  <button className="btn btn-accent" onClick={() => setStep('target')}
                    disabled={!damageVal || parseInt(damageVal) <= 0}>
                    Next →
                  </button>
                </div>
              </div>
            )}
            {attacks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>Attacks</div>
                {attacks.map((atk, i) => (
                  <button key={i} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 4, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                    onClick={() => { setSelectedAction(atk); setStep('target'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{atk.name}</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>
                        {atk.hitBonus !== undefined ? `${atk.hitBonus >= 0 ? '+' : ''}${atk.hitBonus} to hit` : ''}
                        {atk.damage ? `  ${atk.damage}` : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {spells.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>Spells</div>
                {spells.map((sp, i) => (
                  <button key={i} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 4, cursor: 'pointer',
                  }}
                    onClick={() => { setSelectedAction(sp); setStep('target'); }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</div>
                    {sp.effect && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{sp.effect}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: choose target */}
        {step === 'target' && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setStep('action')}>← Back</button>
            {targets.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>No valid targets.</div>
            ) : (
              targets.map(t => {
                const currentHp = t.maxHp - t.damage;
                const pct = t.maxHp > 0 ? currentHp / t.maxHp : 0;
                const status = hpStatus(currentHp, t.maxHp);
                return (
                  <button key={t.id} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 4, cursor: 'pointer',
                  }}
                    onClick={() => { setSelectedTarget(t); setStep('damage'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: hpBarColor(status) }}>
                        {currentHp}/{t.maxHp} HP
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: hpBarColor(status), transition: 'width 0.2s' }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Step 3: set damage */}
        {step === 'damage' && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setStep('target')}>← Back</button>
            {selectedAction?.damage && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  Damage formula: <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{selectedAction.damage}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleRoll}>🎲 Roll {selectedAction.damage}</button>
                {rolledBreakdown && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>= {rolledBreakdown}</span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="number" min={0} placeholder="Damage amount" value={damageVal}
                onChange={e => setDamageVal(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
              <button className="btn btn-accent" onClick={handleApply}
                disabled={!damageVal || parseInt(damageVal) <= 0 || !selectedTarget}>
                Apply
              </button>
            </div>
            {selectedAction?.notes && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                {selectedAction.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Encounter select screen ──────────────────────────────────────────────────

function EncounterSelectScreen({ encounters, onSelect }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div className="section-heading" style={{ marginTop: 0 }}>Select Encounter</div>
      {encounters.length === 0 ? (
        <div className="card">
          <div className="empty-state">No encounters yet. Build one in the Encounter Builder.</div>
        </div>
      ) : (
        <div className="card">
          {encounters.map(enc => (
            <div key={enc.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => onSelect(enc)}>
              <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
              <div className="list-row-main">
                <div className="list-row-title">{enc.name}</div>
                <div className="list-row-sub">{enc.entries.length} combatant{enc.entries.length !== 1 ? 's' : ''}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Initiative mode screen ───────────────────────────────────────────────────

function InitiativeModeScreen({ encounter, onConfirm, onBack }) {
  const [mode, setMode] = useState('individual');
  return (
    <div style={{ maxWidth: 420 }}>
      <div className="section-heading" style={{ marginTop: 0 }}>Initiative Mode — {encounter.name}</div>
      <div className="card" style={{ padding: 20 }}>
        {[
          { value: 'individual', label: 'Individual', desc: 'Each combatant rolls separately' },
          { value: 'group',      label: 'Group',      desc: 'All monsters in a group share one roll' },
          { value: 'auto',       label: 'Auto-roll',  desc: 'System rolls for everyone automatically' },
        ].map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="radio" name="initMode" value={opt.value} checked={mode === opt.value}
              onChange={() => setMode(opt.value)} style={{ accentColor: 'var(--accent)', width: 'auto' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{opt.desc}</div>
            </div>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => onConfirm(mode)}>
            Next: Set Initiatives →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Initiative input screen ──────────────────────────────────────────────────

function InitiativeInputScreen({ combatants, initiativeMode, onStart, onBack }) {
  const [inits, setInits] = useState(() => {
    if (initiativeMode === 'auto') {
      return Object.fromEntries(combatants.map(c => [c.id, String(rollD20() + c.initMod)]));
    }
    if (initiativeMode === 'group') {
      const groupRolls = {};
      return Object.fromEntries(combatants.map(c => {
        if (c.type === 'player') return [c.id, ''];
        const key = c.groupKey ?? c.id;
        if (!groupRolls[key]) groupRolls[key] = '';
        return [c.id, groupRolls[key]];
      }));
    }
    return Object.fromEntries(combatants.map(c => [c.id, '']));
  });

  const [groupVals, setGroupVals] = useState(() => {
    if (initiativeMode !== 'group') return {};
    const keys = [...new Set(combatants.filter(c => c.type === 'monster').map(c => c.groupKey ?? c.id))];
    return Object.fromEntries(keys.map(k => [k, '']));
  });

  function setGroupInit(groupKey, val) {
    setGroupVals(prev => ({ ...prev, [groupKey]: val }));
    setInits(prev => {
      const next = { ...prev };
      combatants.forEach(c => { if ((c.groupKey ?? c.id) === groupKey && c.type === 'monster') next[c.id] = val; });
      return next;
    });
  }

  const allSet = combatants.every(c => inits[c.id] !== '' && parseInt(inits[c.id]) >= 1);

  function handleStart() {
    const withInits = combatants.map(c => ({ ...c, initiative: parseInt(inits[c.id]) }));
    const sorted = [...withInits].sort((a, b) => b.initiative - a.initiative);
    onStart(sorted);
  }

  const groupKeys = initiativeMode === 'group'
    ? [...new Set(combatants.filter(c => c.type === 'monster').map(c => c.groupKey ?? c.id))]
    : [];

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="section-heading" style={{ marginTop: 0 }}>Set Initiatives</div>
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>

        {initiativeMode === 'group' ? (
          <div>
            {combatants.filter(c => c.type === 'player').map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="combatant-dot dot-player" />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <InitInput value={inits[c.id] ?? ''} onChange={v => setInits(prev => ({ ...prev, [c.id]: v }))} />
              </div>
            ))}
            {groupKeys.map(gk => {
              const members = combatants.filter(c => (c.groupKey ?? c.id) === gk && c.type === 'monster');
              const rep = members[0];
              return (
                <div key={gk} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="combatant-dot dot-monster" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{rep?.baseName ?? rep?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{members.length} combatant{members.length !== 1 ? 's' : ''} · mod {rep?.initMod >= 0 ? `+${rep?.initMod}` : rep?.initMod}</div>
                  </div>
                  <InitInput value={groupVals[gk] ?? ''} onChange={v => setGroupInit(gk, v)} />
                </div>
              );
            })}
          </div>
        ) : (
          combatants.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>mod {c.initMod >= 0 ? `+${c.initMod}` : c.initMod}</span>
              {initiativeMode === 'auto' ? (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, width: 72, textAlign: 'center',
                  padding: '6px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {inits[c.id]}
                </div>
              ) : (
                <InitInput value={inits[c.id] ?? ''} onChange={v => setInits(prev => ({ ...prev, [c.id]: v }))} />
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-accent" style={{ flex: 1, opacity: allSet ? 1 : 0.5 }}
          onClick={handleStart}
          disabled={!allSet}
          title={!allSet ? 'Set all initiatives to continue' : ''}
        >
          ⚔️ Start Combat
        </button>
      </div>
      {!allSet && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
          All initiatives must be set before starting.
        </div>
      )}
    </div>
  );
}

// ─── Main CombatRunner ────────────────────────────────────────────────────────

export default function CombatRunner({ encounters }) {
  const [screen, setScreen]                       = useState('select');
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [initiativeMode, setInitiativeMode]       = useState('individual');
  const [pendingCombatants, setPendingCombatants] = useState([]);

  const [combatants, setCombatants] = useState([]);
  const [round, setRound]           = useState(1);
  const [turnIdx, setTurnIdx]       = useState(0);
  const [log, setLog]               = useState([]);
  const [actionModal, setActionModal] = useState(null); // null | combatant object

  // Drag — only the handle div is draggable; the outer row is NOT
  const dragIdx     = useRef(null);
  const dragOverIdx = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const addLog = useCallback((msg, r) => {
    setLog(prev => [{ msg, round: r, id: Date.now() + Math.random() }, ...prev].slice(0, 80));
  }, []);

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
      let next = turnIdx + 1;
      let newRound = round;
      if (next >= prev.length) { next = 0; newRound = round + 1; addLog(`── Round ${newRound} begins ──`, newRound); }
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

  function updateCombatant(id, changes) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function toggleCondition(id, condId) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const has = c.conditions.includes(condId);
      const conditions = has ? c.conditions.filter(x => x !== condId) : [...c.conditions, condId];
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

  function onApplyAction(targetId, damage, action, attacker) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      const newDamage = Math.min(c.maxHp, c.damage + damage);
      return { ...c, damage: newDamage };
    }));
    const target = combatants.find(c => c.id === targetId);
    const targetHpAfter = target ? Math.max(0, (target.maxHp - target.damage) - damage) : 0;
    const actionDesc = action?.name ?? 'attack';
    addLog(`${attacker.name} used ${actionDesc} on ${target?.name ?? '?'} for ${damage} dmg (→ ${targetHpAfter} HP)`, round);
  }

  // ── Drag — only fires from the drag handle div, not the whole row ──────────

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

  // ── Combat screen ──────────────────────────────────────────────────────────

  const activeCombatant = combatants[turnIdx];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* Action modal */}
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

                  {/* Drag handle */}
                  <div
                    className="drag-handle"
                    title="Drag to reorder"
                    draggable
                    onDragStart={e => onHandleDragStart(e, idx)}
                    onDragEnd={onDragEnd}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
                      <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                    </svg>
                  </div>

                  <div className="combatant-init" title="Initiative">{c.initiative ?? '—'}</div>
                  <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`} />

                  <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.name}</span>
                      {c.conditions.map(cond => <ConditionChip key={cond} condition={cond} />)}
                    </div>
                    {/* HP bar */}
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(0, Math.min(1, hpPct)) * 100}%`,
                          background: hpBarColor(status),
                          transition: 'width 0.3s, background 0.3s',
                        }} />
                      </div>
                      <span className={`hp-badge ${hpStatusClass(status)}`} style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap',
                        color: hpBarColor(status),
                      }}>
                        {currentHp}/{c.maxHp}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingRight: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>AC {c.ac}</span>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                      onClick={() => setActionModal(c)}>
                      ⚔ Act
                    </button>
                    <div
                      style={{ padding: '4px 6px', cursor: 'pointer', color: 'var(--text3)', borderRadius: 'var(--radius-xs)' }}
                      title={c.expanded ? 'Collapse' : 'Expand'}
                      onClick={() => toggleExpanded(c.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: c.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {c.expanded && (
                  <CombatantExpand c={c} onUpdate={updateCombatant}
                    onToggleSlot={toggleSlot} onToggleCondition={toggleCondition} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat log */}
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
