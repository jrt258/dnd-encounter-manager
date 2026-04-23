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

function QuickHP({ label, color, sign, c, onUpdate }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
      <input type="number" min={0} placeholder="0" value={val}
        onChange={e => setVal(e.target.value)}
        style={{ flex: 1, padding: '5px 8px', fontSize: 13 }} />
      <button className="btn btn-ghost btn-sm" style={{ color, flexShrink: 0 }}
        onClick={() => {
          const amt = parseInt(val) || 0;
          if (amt === 0) return;
          if (sign < 0) onUpdate(c.id, { damage: Math.min(c.maxHp, c.damage + amt) });
          else onUpdate(c.id, { damage: Math.max(0, c.damage - amt) });
          setVal('');
        }}>
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
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <QuickHP label="Damage" color="var(--accent)" sign={-1} c={c} onUpdate={onUpdate} />
              <QuickHP label="Heal"   color="var(--green)"  sign={+1} c={c} onUpdate={onUpdate} />
            </div>
          </div>

          {/* Initiative — read-only display, no reroll */}
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
    damage: `${selectedAction?.name ?? 'Action'} → ${selectedTarget?.name ?? '?'} — Damage`,
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
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.1s',
                      }}
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
                  <div className="section-heading">Spells</div>
                  {spells.map((sp, i) => (
                    <button key={i} onClick={() => { setSelectedAction({ ...sp, actionType: 'spell', damage: sp.effect ?? sp.damage }); setStep('target'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</span>
                          <span className="tag tag-purple" style={{ fontSize: 9 }}>{sp.level === 0 ? 'Cantrip' : `Lvl ${sp.level}`}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                          {sp.effect ?? sp.damage ?? ''}
                          {sp.defenseType === 'save' && ` · DC ${sp.saveDC} ${sp.saveAbility?.toUpperCase()}`}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </>
              )}

              {/* Custom / other */}
              <div className="section-heading">{hasActions ? 'Other' : 'Actions'}</div>
              <button onClick={() => { setSelectedAction({ name: 'Custom', actionType: 'custom', damage: '' }); setStep('target'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-strong)', background: 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
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
                        onClick={() => { setSelectedTarget(t); setDamageVal(''); setRolledBreakdown(''); setStep('damage'); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          transition: 'background 0.1s',
                        }}
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
                        {/* HP bar */}
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

          {/* ── Step 3: Damage ── */}
          {step === 'damage' && selectedTarget && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep('target')}>← Back</button>

              {/* Summary */}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>Attacker</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{attacker.name}</div>
                </div>
                <div style={{ color: 'var(--text3)', alignSelf: 'center' }}>→</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>Target</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedTarget.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>AC {selectedTarget.ac}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>Action</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedAction?.name}</div>
                  {selectedAction?.damage && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{selectedAction.damage}</div>
                  )}
                </div>
              </div>

              {/* Damage input */}
              <div className="section-heading" style={{ marginTop: 0 }}>Damage</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter damage..."
                    value={damageVal}
                    onChange={e => { setDamageVal(e.target.value); setRolledBreakdown(''); }}
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, textAlign: 'center', padding: '10px 12px' }}
                    autoFocus
                  />
                </div>
                {selectedAction?.damage && (
                  <button className="btn btn-ghost" onClick={handleRoll} style={{ height: 48, paddingLeft: 16, paddingRight: 16, fontSize: 13 }}>
                    🎲 Roll {selectedAction.damage}
                  </button>
                )}
              </div>

              {rolledBreakdown && (
                <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>
                  Roll: {rolledBreakdown} = {damageVal}
                </div>
              )}

              {/* Half damage shortcut */}
              {damageVal && parseInt(damageVal) > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDamageVal(String(Math.floor(parseInt(damageVal) / 2)))}>
                    ½ damage (save succeeded)
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button
                  className="btn btn-accent"
                  disabled={!damageVal || parseInt(damageVal) <= 0}
                  style={{ opacity: (!damageVal || parseInt(damageVal) <= 0) ? 0.5 : 1 }}
                  onClick={handleApply}
                >
                  Apply {damageVal ? `${damageVal} damage` : 'Damage'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EncounterSelectScreen({ encounters, onSelect }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="section-heading" style={{ marginTop: 0 }}>Select an Encounter to Run</div>
      {encounters.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚔️</div>
            No encounters saved yet. Build one in the Encounter Builder.
          </div>
        </div>
      ) : (
        <div className="card">
          {encounters.map(enc => {
            const monsterCount = enc.entries.filter(e => e.type === 'monster').reduce((s, e) => s + (e.count || 1), 0);
            const playerCount  = enc.entries.filter(e => e.type === 'player').length;
            const isEmpty = enc.entries.length === 0;
            const parts = [];
            if (monsterCount > 0) parts.push(`${monsterCount} monster${monsterCount !== 1 ? 's' : ''}`);
            if (playerCount > 0)  parts.push(`${playerCount} player${playerCount !== 1 ? 's' : ''}`);
            return (
              <div key={enc.id} className="list-row"
                style={{ cursor: isEmpty ? 'default' : 'pointer' }}
                onClick={() => !isEmpty && onSelect(enc)}>
                <div className="list-row-main">
                  <div className="list-row-title" style={{ color: isEmpty ? 'var(--text3)' : 'var(--text)' }}>
                    {enc.name}
                  </div>
                  {isEmpty
                    ? <div className="list-row-sub">Empty — add combatants in Encounter Builder</div>
                    : parts.length > 0 && <div className="list-row-sub">{parts.join(' · ')}</div>
                  }
                </div>
                {!isEmpty && <button className="btn btn-accent btn-sm">Run →</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Screen 2: Initiative Mode Select ────────────────────────────────────────

function InitiativeModeScreen({ encounter, onConfirm, onBack }) {
  const [mode, setMode] = useState('individual');

  return (
    <div style={{ maxWidth: 520 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{encounter.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Choose how monster initiative is rolled.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {[
          {
            value: 'individual',
            title: 'Individual Initiative',
            desc: 'Each monster rolls separately. More granular turn order, more overhead.',
          },
          {
            value: 'group',
            title: 'Group Initiative',
            desc: 'One roll for all monsters — they all act on the same initiative. The official optional rule from the DMG. Fastest play.',
          },
        ].map(opt => (
          <div key={opt.value} onClick={() => setMode(opt.value)} style={{
            padding: '14px 16px', borderRadius: 'var(--radius)',
            border: `2px solid ${mode === opt.value ? 'var(--accent)' : 'var(--border)'}`,
            background: mode === opt.value ? 'var(--accent-bg)' : 'var(--surface)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${mode === opt.value ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: mode === opt.value ? 'var(--accent)' : 'transparent',
                transition: 'all 0.15s',
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: mode === opt.value ? 'var(--accent-text)' : 'var(--text)' }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>
                  {opt.desc}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-accent" style={{ minWidth: 180 }} onClick={() => onConfirm(mode)}>
        Set Initiatives →
      </button>
    </div>
  );
}

// ─── Screen 3: Initiative Input ───────────────────────────────────────────────
// Shared mode: one row per monster group, one Roll button, sets all in group.
// Individual mode: one row per monster, each with their own Roll button.
// Players: always manual, always min 1.

function InitiativeInputScreen({ combatants, initiativeMode, onStart, onBack }) {
  const [initiatives, setInitiatives] = useState(() => {
    const init = {};
    combatants.forEach(c => { init[c.id] = ''; });
    return init;
  });

  // One entry per unique groupKey for shared mode
  const monsterGroups = [...new Map(
    combatants.filter(c => c.type === 'monster').map(c => [c.groupKey, c])
  ).values()];

  function setVal(id, val) {
    setInitiatives(prev => ({ ...prev, [id]: val }));
  }

  function setGroupVal(groupKey, val) {
    setInitiatives(prev => {
      const next = { ...prev };
      combatants.filter(c => c.groupKey === groupKey).forEach(c => { next[c.id] = val; });
      return next;
    });
  }

  // Shared: one roll per group, applied to all members
  function rollGroup(groupKey) {
    const rep = combatants.find(c => c.groupKey === groupKey);
    if (!rep) return;
    const result = String(Math.max(1, rollD20() + rep.initMod));
    setGroupVal(groupKey, result);
  }

  // Individual: roll separately for each monster
  function rollIndividual(id, initMod) {
    setVal(id, String(Math.max(1, rollD20() + initMod)));
  }

  // "Roll All Monsters" — respects the current mode
  function rollAll() {
    setInitiatives(prev => {
      const next = { ...prev };
      const allMonsters = combatants.filter(c => c.type === 'monster');
      if (initiativeMode === 'group') {
        // One roll for all monsters, use highest init mod
        const rep = allMonsters.reduce((best, c) => c.initMod > (best?.initMod ?? -99) ? c : best, null);
        const result = String(Math.max(1, rollD20() + (rep?.initMod ?? 0)));
        allMonsters.forEach(c => { next[c.id] = result; });
      } else {
        allMonsters.forEach(c => {
          next[c.id] = String(Math.max(1, rollD20() + c.initMod));
        });
      }
      return next;
    });
  }

  function handleStart() {
    const withInit = combatants.map(c => ({
      ...c,
      initiative: Math.max(1, parseInt(initiatives[c.id]) || 1),
    })).sort((a, b) => b.initiative - a.initiative || b.initMod - a.initMod);
    onStart(withInit);
  }

  const players = combatants.filter(c => c.type === 'player');
  const allSet  = combatants.every(c => initiatives[c.id] !== '' && !isNaN(parseInt(initiatives[c.id])));

  // Helper: get display value for a group (reads from first member)
  function getGroupVal(groupKey) {
    const member = combatants.find(c => c.groupKey === groupKey);
    return member ? initiatives[member.id] : '';
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Set Initiatives</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {initiativeMode === 'group'
              ? 'One roll for all monsters — they all act on the same turn.'
              : 'Each combatant rolls separately.'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={rollAll}>🎲 Roll All Monsters</button>
      </div>

      {/* Players */}
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

      {/* Monsters */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-heading" style={{ marginTop: 0 }}>Monsters</div>
        <div className="card">
          {initiativeMode === 'group' ? (
            // One roll for ALL monsters — 5e group initiative
            (() => {
              const allMonsters = combatants.filter(c => c.type === 'monster');
              // Use highest dex mod among all monsters as the representative (5e tiebreaker)
              const rep = allMonsters.reduce((best, c) => c.initMod > (best?.initMod ?? -99) ? c : best, null);
              const groupVal = rep ? initiatives[rep.id] : '';
              const totalCount = allMonsters.length;
              return (
                <div className="list-row">
                  <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                  <div className="list-row-main">
                    <div className="list-row-title">All Monsters</div>
                    <div className="list-row-sub">
                      {totalCount} combatant{totalCount !== 1 ? 's' : ''} · highest init mod {rep?.initMod >= 0 ? `+${rep?.initMod}` : rep?.initMod} · all act together
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
                    onClick={() => {
                      const result = String(Math.max(1, rollD20() + (rep?.initMod ?? 0)));
                      setInitiatives(prev => {
                        const next = { ...prev };
                        allMonsters.forEach(c => { next[c.id] = result; });
                        return next;
                      });
                    }}>
                    🎲 Roll
                  </button>
                  <InitInput
                    value={groupVal}
                    onChange={val => {
                      setInitiatives(prev => {
                        const next = { ...prev };
                        allMonsters.forEach(c => { next[c.id] = val; });
                        return next;
                      });
                    }}
                  />
                </div>
              );
            })()
          ) : (
            // Individual — one row per monster
            combatants.filter(c => c.type === 'monster').map(c => (
              <div className="list-row" key={c.id}>
                <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{c.name}</div>
                  <div className="list-row-sub">Init {c.initMod >= 0 ? `+${c.initMod}` : c.initMod}</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
                  onClick={() => rollIndividual(c.id, c.initMod)}>
                  🎲 Roll
                </button>
                <InitInput value={initiatives[c.id]} onChange={val => setVal(c.id, val)} />
              </div>
            ))
          )}
        </div>
      </div>

      <button
        className="btn btn-accent"
        style={{ minWidth: 180, opacity: allSet ? 1 : 0.5 }}
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
    // Prevent the event from bubbling to any outer draggable
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

        {/* Combatant rows — the outer div is NOT draggable; only the handle triggers drag */}
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
                // Row accepts drops but does NOT initiate drags
                onDragOver={e => onRowDragOver(e, idx)}
                onDragLeave={onRowDragLeave}
                onDrop={e => onRowDrop(e, idx)}
              >
                <div className="combatant-row-main">

                  {/* Drag handle — only this element is draggable */}
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

                  <div className="combatant-name-col">
                    <div className="combatant-name">{c.name}</div>
                    {c.conditions.length > 0 && (
                      <div className="combatant-conditions">
                        {c.conditions.map(cond => <ConditionChip key={cond} condition={cond} />)}
                      </div>
                    )}
                    <div className="hp-bar-track" style={{ marginTop: 4 }}>
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

                  <div className="combatant-chevron" onClick={() => toggleExpanded(c.id)}
                    title={c.expanded ? 'Collapse' : 'Expand'}>
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
