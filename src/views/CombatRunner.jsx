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

function ConditionChip({ condition }) {
  const def = CONDITIONS.find(c => c.id === condition) ?? { label: condition, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span className="condition-chip" style={{ background: def.bg, color: def.color }}>
      {def.label}
    </span>
  );
}

function SlotPips({ total, used, onToggle }) {
  return (
    <div className="slot-pips">
      {Array.from({ length: total }, (_, i) => (
        <button key={i} className={`slot-pip${i < used ? ' used' : ''}`} onClick={() => onToggle(i)} title={i < used ? 'Click to recover' : 'Click to expend'} />
      ))}
    </div>
  );
}

// ─── Combatant expand panel ───────────────────────────────────────────────────

function CombatantExpand({ c, onUpdate, onToggleSlot, onToggleCondition }) {
  const currentHp = c.maxHp - c.damage;
  const [dmgInput, setDmgInput] = useState('');
  const [healInput, setHealInput] = useState('');

  function applyDamage() {
    const n = parseInt(dmgInput);
    if (!n || n <= 0) return;
    onUpdate(c.id, { damage: Math.min(c.maxHp, c.damage + n) });
    setDmgInput('');
  }

  function applyHeal() {
    const n = parseInt(healInput);
    if (!n || n <= 0) return;
    onUpdate(c.id, { damage: Math.max(0, c.damage - n) });
    setHealInput('');
  }

  return (
    <div className="combatant-expand">
      <div className="expand-grid">
        {/* HP edit */}
        <div className="expand-section">
          <div className="expand-section-title">HP</div>
          <div className="hp-edit-row">
            <div className="hp-edit-field">
              <div className="hp-edit-label">Damage</div>
              <input type="number" min={0} className="hp-edit-input" placeholder="0"
                value={dmgInput} onChange={e => setDmgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyDamage()} />
            </div>
            <button className="btn btn-accent btn-sm" onClick={applyDamage}>Apply</button>
          </div>
          <div className="hp-edit-row" style={{ marginTop: 6 }}>
            <div className="hp-edit-field">
              <div className="hp-edit-label">Heal</div>
              <input type="number" min={0} className="hp-edit-input" placeholder="0"
                value={healInput} onChange={e => setHealInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyHeal()} />
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={applyHeal}>Heal</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
            Current: <strong style={{ color: 'var(--text)' }}>{currentHp}</strong> / {c.maxHp}
          </div>
        </div>

        {/* Conditions */}
        <div className="expand-section">
          <div className="expand-section-title">Conditions</div>
          <div className="condition-toggle-grid">
            {CONDITIONS.map(cond => {
              const active = c.conditions.includes(cond.id);
              return (
                <button key={cond.id}
                  className={`condition-toggle${active ? ' active' : ''}`}
                  style={active ? { background: cond.bg, color: cond.color, borderColor: 'transparent' } : {}}
                  onClick={() => onToggleCondition(c.id, cond.id)}
                >
                  {cond.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attacks */}
      {c.attacks?.length > 0 && (
        <div className="expand-section" style={{ marginTop: 14 }}>
          <div className="expand-section-title">Attacks</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {c.attacks.map((atk, i) => (
              <div key={i} className="attack-row">
                <span className="attack-name">{atk.name}</span>
                <span className="attack-stat">
                  {atk.hitBonus >= 0 ? '+' : ''}{atk.hitBonus} to hit · {atk.damage} {atk.damageType ?? ''}
                </span>
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
  const [step, setStep]                   = useState('action');
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [damageVal, setDamageVal]         = useState('');
  const [healVal, setHealVal]             = useState('');
  const [rolledBreakdown, setRolledBreakdown] = useState('');
  const [conditionToApply, setConditionToApply] = useState('');

  const attacks = attacker.attacks ?? [];
  const spells  = (attacker.spells ?? []).filter(s => s.effect || s.damage);
  const hasActions = attacks.length > 0 || spells.length > 0;

  const targets = combatants.filter(c => c.id !== attacker.id && (c.maxHp - c.damage) > 0);

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
    const dmg  = parseInt(damageVal) || 0;
    const heal = parseInt(healVal) || 0;
    if (!selectedTarget) return;
    onApply(selectedTarget.id, dmg, heal, conditionToApply || null, selectedAction, attacker);
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

          {/* ── Step 1: Action picker ── */}
          {step === 'action' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attacks.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: 0 }}>Attacks</div>
                  {attacks.map((atk, i) => (
                    <button key={i} onClick={() => { setSelectedAction({ ...atk, actionType: 'attack' }); setStep('target'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
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
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                          {sp.damage ? `${sp.damage}` : sp.effect ?? ''}
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
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Custom / Other</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Unarmed strike, special ability, or manual entry</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Step 2: Target picker ── */}
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
                        onClick={() => { setSelectedTarget(t); setDamageVal(''); setHealVal(''); setConditionToApply(''); setRolledBreakdown(''); setStep('damage'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                      >
                        <div className={`combatant-dot ${t.type === 'player' ? 'dot-player' : 'dot-monster'}`} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                            AC {t.ac} · HP {tHp}/{t.maxHp}
                            {t.conditions.length > 0 && ` · ${t.conditions.join(', ')}`}
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

          {/* ── Step 3: Resolve (damage + healing + condition) ── */}
          {step === 'damage' && selectedTarget && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep('target')}>← Back</button>

              {/* Summary card */}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`combatant-dot ${selectedTarget.type === 'player' ? 'dot-player' : 'dot-monster'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedTarget.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                    HP {selectedTarget.maxHp - selectedTarget.damage}/{selectedTarget.maxHp} · AC {selectedTarget.ac}
                  </div>
                </div>
              </div>

              {/* ── Damage ── */}
              <div style={{ marginBottom: 14 }}>
                <div className="field-label" style={{ marginBottom: 6 }}>Damage</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={0} placeholder="0"
                    value={damageVal} onChange={e => setDamageVal(e.target.value)}
                    style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 600, textAlign: 'center' }}
                    autoFocus
                  />
                  {(selectedAction?.damage || selectedAction?.effect) && (
                    <button className="btn btn-ghost btn-sm" onClick={handleRoll} title="Roll dice">
                      🎲 Roll {selectedAction.damage ?? selectedAction.effect}
                    </button>
                  )}
                </div>
                {rolledBreakdown && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                    Roll: {rolledBreakdown} = {damageVal}
                  </div>
                )}
              </div>

              {/* ── Healing ── */}
              <div style={{ marginBottom: 14 }}>
                <div className="field-label" style={{ marginBottom: 6 }}>Healing <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></div>
                <input
                  type="number" min={0} placeholder="0"
                  value={healVal} onChange={e => setHealVal(e.target.value)}
                  style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, textAlign: 'center', color: 'var(--green)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Applied after damage — e.g. life drain, vampiric touch
                </div>
              </div>

              {/* ── Apply Condition ── */}
              <div style={{ marginBottom: 20 }}>
                <div className="field-label" style={{ marginBottom: 6 }}>Apply Condition <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CONDITIONS.map(cond => {
                    const active = conditionToApply === cond.id;
                    return (
                      <button
                        key={cond.id}
                        onClick={() => setConditionToApply(active ? '' : cond.id)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          border: `1.5px solid ${active ? 'transparent' : 'var(--border-strong)'}`,
                          background: active ? cond.bg : 'var(--surface)',
                          color: active ? cond.color : 'var(--text2)',
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          transition: 'all 0.12s',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        {cond.label}
                      </button>
                    );
                  })}
                </div>
                {conditionToApply && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                    Will add <strong style={{ color: 'var(--text2)' }}>{CONDITIONS.find(c => c.id === conditionToApply)?.label}</strong> to {selectedTarget.name}
                  </div>
                )}
              </div>

              <button
                className="btn btn-accent"
                style={{ width: '100%' }}
                onClick={handleApply}
                disabled={!damageVal && !healVal && !conditionToApply}
              >
                Apply to {selectedTarget.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Encounter select screen ──────────────────────────────────────────────────

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

// ─── Initiative mode screen ───────────────────────────────────────────────────

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

// ─── Initiative input screen ──────────────────────────────────────────────────

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

  function getGroupVal(member) {
    if (initiativeMode !== 'group') return initiatives[member.id];
    const rep = monsters.find(c => c.groupKey === member.groupKey);
    return rep ? initiatives[rep.id] : '';
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
                    <div className="list-row-sub">{allMonsters.length} combatants</div>
                  </div>
                  <InitInput value={groupVal} onChange={val => { allMonsters.forEach(c => setVal(c.id, val)); }} />
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

      <button
        className="btn btn-accent"
        style={{ opacity: allSet ? 1 : 0.5 }}
        onClick={handleStart}
        disabled={!allSet}
        title={!allSet ? 'Set all initiatives to continue' : ''}
      >
        ⚔️ Start Combat
      </button>
      {!allSet && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
          All initiatives must be set before starting.
        </div>
      )}
    </div>
  );
}

// ─── Main CombatRunner ────────────────────────────────────────────────────────
// All combat state is received as props (lifted to App.jsx) so it persists
// when the user switches tabs.

export default function CombatRunner({
  encounters,
  screen,           setScreen,
  selectedEncounter, setSelectedEncounter,
  initiativeMode,   setInitiativeMode,
  pendingCombatants, setPendingCombatants,
  combatants,       setCombatants,
  round,            setRound,
  turnIdx,          setTurnIdx,
  log,              setLog,
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

  // Updated: now handles damage, healing, and condition in one call
  function onApplyAction(targetId, damage, heal, condition, action, attacker) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      let newDamage = Math.min(c.maxHp, c.damage + (damage || 0));
      newDamage = Math.max(0, newDamage - (heal || 0));
      const conditions = condition && !c.conditions.includes(condition)
        ? [...c.conditions, condition]
        : c.conditions;
      return { ...c, damage: newDamage, conditions };
    }));

    const target = combatants.find(c => c.id === targetId);
    const currentHp = target ? target.maxHp - target.damage : 0;
    const hpAfter   = Math.max(0, Math.min(target?.maxHp ?? 0, currentHp - (damage || 0) + (heal || 0)));
    const actionDesc = action?.name ?? 'attack';

    let logMsg = `${attacker.name} used ${actionDesc} on ${target?.name ?? '?'}`;
    if (damage)    logMsg += ` for ${damage} dmg`;
    if (heal)      logMsg += `${damage ? ',' : ''} healed ${heal}`;
    logMsg += ` (→ ${hpAfter} HP)`;
    if (condition) logMsg += ` · gains ${condition}`;
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

  // ── Combat screen ──────────────────────────────────────────────────────────

  const activeCombatant = combatants[turnIdx];

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
                  {/* Drag handle */}
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

                  {/* Name + conditions + HP bar — narrower bar via max-width on the track */}
                  <div className="combatant-name-col">
                    <div className="combatant-name">{c.name}</div>
                    {c.conditions.length > 0 && (
                      <div className="combatant-conditions">
                        {c.conditions.map(cond => <ConditionChip key={cond} condition={cond} />)}
                      </div>
                    )}
                    <div className="hp-bar-track" style={{ marginTop: 4, maxWidth: 120 }}>
                      <div className="hp-bar-fill"
                        style={{ width: `${Math.max(0, hpPct) * 100}%`, background: hpBarColor(status) }} />
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

                  {/* Action button */}
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
                  <CombatantExpand c={c} onUpdate={updateCombatant}
                    onToggleSlot={toggleSlot} onToggleCondition={toggleCondition} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat log — wider than before (340px) */}
      <div style={{ width: 340, flexShrink: 0 }}>
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
