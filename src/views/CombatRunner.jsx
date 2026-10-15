import { useState, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import MonsterForm from '../components/MonsterForm';
import SpellcastingBlock from '../components/SpellcastingBlock';
import AttacksBlock from '../components/AttacksBlock';
import MonsterTraitsBlock from '../components/MonsterTraitsBlock';
import AbilityGrid from '../components/AbilityGrid';
import {
  normalizeMonster, isLimitedSpell, spellFrequencyLabel, spellDefenseLine, SPELL_ACTION_TYPES,
  normalizeAttack, attackDamageParts, attackDamageText, attackKindLabel, attackReachText,
  multiattackText, numberWord, diceAverage, rollDiceExpr, applyDamageDefenses, damageResponse,
  damageTypeLabel, hasDefenses, hasOtherSpeeds, speedText,
} from '../utils/helpers';

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

function clampInit(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  return String(Math.max(1, n));
}

// ── Sides ────────────────────────────────────────────────────────────────────
// Every combatant belongs to one of three sides. Allies are monsters flagged
// `isAlly` in the library; they fight for the party but roll as their own group.

const SIDES = [
  { id: 'player', label: 'Players' },
  { id: 'ally',   label: 'Allies'  },
  { id: 'enemy',  label: 'Enemies' },
];

const SIDE_RANK = { player: 0, ally: 1, enemy: 2 };

function sideOf(c) {
  if (c.type === 'player') return 'player';
  return c.isAlly ? 'ally' : 'enemy';
}

// Inline override so allies get a green dot without needing a new CSS class.
function sideDotStyle(c) {
  return sideOf(c) === 'ally' ? { background: 'var(--green)' } : {};
}

// A single initiative roll: the raw d20 face plus a modifier. The total is
// floored at 1 (the input fields don't accept lower); `die` is kept so the
// initiative screen can show what actually came up on the d20.
function rollInit(mod) {
  const die = rollD20();
  const m = mod ?? 0;
  return { die, mod: m, total: Math.max(1, die + m) };
}

// One roll shared by a whole group: a single d20 plus the group's best modifier,
// so every member ends up with the same number and acts together.
function rollGroupInit(members) {
  if (members.length === 0) return null;
  const bestMod = Math.max(...members.map(c => c.initMod ?? 0));
  return rollInit(bestMod);
}

function fmtMod(mod) {
  return mod >= 0 ? `+${mod}` : String(mod);
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
        tempHp: 0,
        ac: p.ac ?? 10,
        speed: p.speed ?? 30,
        initiative: null,
        initMod: dexMod(p.abilities) + (p.initiativeMod ?? 0),
        conditions: [],          // now: array of { id, turns } objects
        spellSlots: p.spellSlots ? JSON.parse(JSON.stringify(p.spellSlots)) : null,
        usedSlots: {},
        attacks: p.attacks ?? [],
        spells: p.spells ?? [],
        notes: p.notes ?? '',
        abilities: p.abilities ?? null,
        expanded: false,
      });
    } else if (entry.type === 'monster') {
      const m = normalizeMonster(entry.monster);
      const count = entry.count || 1;
      const groupInitMod = dexMod(m.abilities) + (m.initiativeMod ?? 0);
      for (let i = 0; i < count; i++) {
        const maxHp = m.hp ?? 10;
        result.push({
          id: `${entry.id}-${i}`,
          sourceId: entry.sourceId,
          groupKey: entry.sourceId,
          type: 'monster',
          isAlly: !!m.isAlly,
          name: count > 1 ? `${m.name} ${i + 1}` : m.name,
          baseName: m.name,
          maxHp,
          damage: 0,
          tempHp: 0,
          ac: m.ac ?? 10,
          speed: m.speed ?? 30,
          initiative: null,
          initMod: groupInitMod,
          conditions: [],
          spellSlots: null,        // monsters don't use slots
          usedSlots: {},
          spellcasting: m.spellcasting ?? null,
          usedSpells: {},          // { [spellId]: uses spent } for X/Day spells
          attacks: m.attacks ?? [],
          spells: m.spells ?? [],
          notes: m.notes ?? '',
          abilities: m.abilities ?? null,
          expanded: false,
          cr: m.cr,
          diverged: false,
          template: JSON.parse(JSON.stringify(m)),
        });
      }
    }
  }
  return result;
}

// ─── Library sync helpers ─────────────────────────────────────────────────────

// Recompute a monster's initiative modifier from its template.
function monsterInitMod(m) {
  return dexMod(m?.abilities) + (m?.initiativeMod ?? 0);
}

// Clamp spent X/Day uses to the (possibly new) per-day limits. Uses for
// spells that were removed, or are now At Will, are dropped.
function clampUsedSpells(usedSpells, spells) {
  const next = {};
  for (const sp of spells ?? []) {
    const used = usedSpells?.[sp.id] ?? 0;
    if (isLimitedSpell(sp) && used > 0) next[sp.id] = Math.min(used, sp.usesPerDay);
  }
  return next;
}

// Pull a dice expression like "8d6" or "2d10+4" out of free text.
function diceFromText(text) {
  const m = (text ?? '').match(/\d*d\d+(\s*[+-]\s*\d+)?/i);
  return m ? m[0].replace(/\s+/g, '') : '';
}

// Re-number an instance name when its base (library) name changes,
// preserving any " 2"/" 3" suffix the instance already had.
function renameFromBase(currentName, oldBase, newBase) {
  if (oldBase && currentName.startsWith(oldBase)) {
    return newBase + currentName.slice(oldBase.length);
  }
  return newBase;
}

// Field-merge a library template onto a live combatant.
// Template-level stats are overwritten; transient combat state is preserved:
// damage, tempHp, conditions, initiative, expanded, and (clamped) spell uses.
function applyTemplateToCombatant(c, rawTmpl) {
  const tmpl = normalizeMonster(rawTmpl);
  const spells = tmpl.spells ?? [];
  const maxHp = tmpl.hp ?? c.maxHp;
  return {
    ...c,
    isAlly: !!tmpl.isAlly,
    name: renameFromBase(c.name, c.baseName, tmpl.name),
    baseName: tmpl.name,
    maxHp,
    damage: Math.min(c.damage ?? 0, maxHp), // keep damage taken, but never exceed new max
    ac: tmpl.ac ?? 10,
    speed: tmpl.speed ?? 30,
    initMod: monsterInitMod(tmpl),
    spellSlots: null,
    usedSlots: {},
    spellcasting: tmpl.spellcasting ?? null,
    usedSpells: clampUsedSpells(c.usedSpells, spells),
    attacks: tmpl.attacks ?? [],
    spells,
    notes: tmpl.notes ?? '',
    abilities: tmpl.abilities ?? null,
    cr: tmpl.cr,
    template: JSON.parse(JSON.stringify(tmpl)),
    diverged: false,
  };
}

// Build a monster-shaped object (for the edit form) from a live combatant,
// using its stored template as the base for fields not tracked per-instance.
function combatantToMonster(c) {
  const base = c.template ?? {};
  return {
    ...base,
    id: c.sourceId,
    name: c.baseName ?? c.name,
    hp: c.maxHp,
    maxHp: c.maxHp,
    ac: c.ac,
    speed: c.speed,
    initiativeMod: base.initiativeMod ?? 0,
    abilities: c.abilities ?? base.abilities ?? null,
    attacks: c.attacks ?? [],
    spells: c.spells ?? [],
    spellcasting: c.spellcasting ?? base.spellcasting ?? null,
    notes: c.notes ?? '',
    cr: c.cr ?? base.cr,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// condition is now { id, turns } — turns === null means indefinite
function ConditionChip({ condition, onRemove }) {
  const def = CONDITIONS.find(c => c.id === condition.id) ?? { label: condition.id, color: '#666', bg: '#eee' };
  const label = condition.turns != null ? `${def.label} (${condition.turns} Turns)` : def.label;
  return (
    <span className="condition-chip" style={{ background: def.bg, color: def.color }} title={def.label}>
      {label}
      {onRemove && (
        <span style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, fontSize: 10 }}
          onClick={e => { e.stopPropagation(); onRemove(condition.id); }}>×</span>
      )}
    </span>
  );
}

// Single "Turns:" field above the pill grid; blank = indefinite
function ConditionToggleGrid({ active, onToggle }) {
  const [pendingTurns, setPendingTurns] = useState('');

  function isActive(condId) {
    return active.some(c => c.id === condId);
  }

  function handleToggle(condId) {
    if (isActive(condId)) {
      // removing — pass null to signal removal
      onToggle(condId, null);
    } else {
      // adding — use pendingTurns if set, else null (indefinite)
      const turns = pendingTurns !== '' ? parseInt(pendingTurns) : null;
      onToggle(condId, turns);
    }
  }

  return (
    <div>
      {/* Single turns field */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
          Turns:
        </span>
        <input
          type="number"
          min={1}
          placeholder="∞"
          value={pendingTurns}
          onChange={e => setPendingTurns(e.target.value)}
          style={{ width: 64, padding: '3px 8px', fontSize: 12, textAlign: 'center' }}
          title="How many turns the next condition applied will last (leave blank for indefinite)"
        />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>for next condition applied</span>
      </div>
      {/* Pill grid */}
      <div className="condition-toggle-grid">
        {CONDITIONS.map(c => {
          const active_ = isActive(c.id);
          const entry = active.find(x => x.id === c.id);
          return (
            <button key={c.id}
              className={`condition-toggle${active_ ? ' active' : ''}`}
              style={active_ ? { background: c.color, borderColor: c.color } : {}}
              onClick={() => handleToggle(c.id)}
            >
              {c.label}
              {active_ && entry?.turns != null && (
                <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.85 }}>({entry.turns}t)</span>
              )}
            </button>
          );
        })}
      </div>
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

// ─── Expandable attack/spell row with notes ───────────────────────────────────

function AttackRowExpand({ atk, isLast }) {
  const [open, setOpen] = useState(false);
  const hasNotes = atk.notes && atk.notes.trim().length > 0;
  return (
    <div style={{ borderBottom: !isLast ? '1px solid var(--border)' : 'none' }}>
      <div className="attack-row" style={{ cursor: hasNotes ? 'pointer' : 'default' }}
        onClick={() => hasNotes && setOpen(o => !o)}>
        <span className="attack-name">{atk.name}</span>
        {atk.hitBonus !== undefined && <span className="attack-stat">{atk.hitBonus >= 0 ? '+' : ''}{atk.hitBonus} to hit</span>}
        {atk.damage && <span className="attack-stat">{atk.damage} {atk.damageType ?? ''}</span>}
        {hasNotes && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ marginLeft: 'auto', color: 'var(--text3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {open && hasNotes && (
        <div style={{ padding: '6px 12px 8px', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          {atk.notes}
        </div>
      )}
    </div>
  );
}

// ─── Expanded detail panel ────────────────────────────────────────────────────

function CombatantExpand({ c, onUpdate, onToggleSlot, onToggleCondition, onSetSpellUses }) {
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

          {/* AC — moved above Initiative */}
          <div className="expand-section" style={{ marginTop: 14 }}>
            <div className="expand-section-title">Armor Class</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={1}
                value={c.ac}
                onChange={e => onUpdate(c.id, { ac: parseInt(e.target.value) || 10 })}
                style={{ width: 72, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500 }}
              />
            </div>
          </div>

          {/* Other speeds (fly, swim, climb, burrow) */}
          {c.type === 'monster' && hasOtherSpeeds(c.template) && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Speed</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                {speedText({ speed: c.speed, speeds: c.template.speeds })}
              </div>
            </div>
          )}

          {/* Initiative — read-only */}
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
              <AbilityGrid
                abilities={c.abilities}
                saves={c.template?.saves}
                showSaves={c.type === 'monster'}
              />
            </div>
          )}
        </div>

        <div>
          <div className="expand-section">
            <div className="expand-section-title">Conditions</div>
            <ConditionToggleGrid active={c.conditions} onToggle={(condId, turns) => onToggleCondition(c.id, condId, turns)} />
          </div>

          {c.type === 'monster' && hasDefenses(c.template) && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Skills &amp; Defenses</div>
              <MonsterTraitsBlock monster={c.template} />
            </div>
          )}

          {(c.attacks?.length > 0 || (c.type === 'monster' && c.template?.multiattack)) && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Attacks</div>
              <AttacksBlock
                attacks={c.attacks ?? []}
                multiattack={c.type === 'monster' ? (c.template?.multiattack ?? null) : null}
                ownerName={c.baseName ?? c.name}
              />
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

          {c.type === 'monster' && c.spells?.length > 0 && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Spellcasting</div>
              <SpellcastingBlock
                spellcasting={c.spellcasting}
                spells={c.spells}
                usedSpells={c.usedSpells ?? {}}
                onSetUses={(spellId, used) => onSetSpellUses(c.id, spellId, used)}
              />
            </div>
          )}

          {c.type !== 'monster' && c.spells?.length > 0 && (
            <div className="expand-section" style={{ marginTop: 14 }}>
              <div className="expand-section-title">Spells</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {c.spells.map((sp, i) => (
                  <AttackRowExpand key={i} atk={{ name: sp.name, notes: sp.description ?? sp.effect ?? '', damage: sp.damage ?? sp.effect ?? '' }} isLast={i === c.spells.length - 1} />
                ))}
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

// ─── Initiative input field ───────────────────────────────────────────────────

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

// ─── Add Monster Modal ────────────────────────────────────────────────────────

function AddMonsterModal({ monsters, onAdd, onClose }) {
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [initiative, setInitiative] = useState('');

  const filtered = (monsters ?? []).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleRoll() {
    if (!selected) return;
    const mod    = dexMod(selected.abilities);
    const rolled = Math.max(1, rollD20() + mod);
    setInitiative(String(rolled));
  }

  function handleConfirm() {
    const init = parseInt(initiative);
    if (!selected || !init || init < 1) return;
    onAdd(selected, init);
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Add Monster to Combat</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Search */}
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Search monsters…"
              value={search}
              autoFocus
              onChange={e => { setSearch(e.target.value); setSelected(null); setInitiative(''); }}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
            />
          </div>

          {/* Monster list */}
          <div style={{
            maxHeight: 240, overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                No monsters found.
              </div>
            ) : (
              filtered.map((m, i) => {
                const isSelected = selected?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m); setInitiative(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 12px', textAlign: 'left',
                      background: isSelected ? 'var(--accent-bg)' : 'transparent',
                      border: 'none',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="combatant-dot dot-monster"
                      style={{ flexShrink: 0, ...(m.isAlly ? { background: 'var(--green)' } : {}) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'var(--accent-text)' : 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {m.name}
                        {m.isAlly && (
                          <span className="tag tag-green" style={{ fontSize: 9, marginLeft: 6 }}>Ally</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {[m.type, m.cr !== undefined && `CR ${m.cr}`, m.hp && `${m.hp} HP`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Initiative — shown once a monster is selected */}
          {selected && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>
                Initiative for {selected.name}
                {dexMod(selected.abilities) !== 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: 'var(--text3)' }}>
                    (DEX mod {dexMod(selected.abilities) >= 0 ? `+${dexMod(selected.abilities)}` : dexMod(selected.abilities)})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min={1}
                  placeholder="—"
                  value={initiative}
                  autoFocus
                  onChange={e => setInitiative(clampInit(e.target.value))}
                  style={{ width: 80, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500 }}
                />
                <button className="btn btn-ghost btn-sm" onClick={handleRoll}>
                  🎲 Roll
                </button>
              </div>
            </div>
          )}

          <button
            className="btn btn-accent btn-full"
            onClick={handleConfirm}
            disabled={!selected || !initiative || parseInt(initiative) < 1}
          >
            Add to Combat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Modal — 3-step attack/heal flow ───────────────────────────────────

// One attack in the action picker. Orange left edge + tag = Multiattack option.
function AttackPickButton({ atk, multi, onPick }) {
  const a = normalizeAttack(atk);
  const line = [
    `${a.hitBonus >= 0 ? '+' : ''}${a.hitBonus ?? 0} to hit`,
    attackReachText(a),
    attackDamageText(a),
  ].filter(Boolean).join(' · ');
  return (
    <button onClick={onPick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)', background: 'var(--surface)',
        borderLeft: multi ? '3px solid var(--orange)' : '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name || 'Unnamed Attack'}</span>
          <span className="tag tag-blue" style={{ fontSize: 9 }}>{attackKindLabel(a)}</span>
          {multi && <span className="tag tag-orange" style={{ fontSize: 9 }}>Multiattack</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
          {line}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function ActionModal({ attacker, combatants, onApply, onSpendSpell, onLog, onClose }) {
  const [step, setStep]           = useState('action');
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [damageVal, setDamageVal] = useState('');
  const [healVal, setHealVal]     = useState('');
  const [tempHpVal, setTempHpVal] = useState('');
  const [rolledBreakdown, setRolledBreakdown] = useState('');
  const [defenseLines, setDefenseLines] = useState([]); // [{ type, raw, final, response }]
  // Condition flow
  const [conditionId, setConditionId] = useState('');
  const [conditionTurns, setConditionTurns] = useState('');
  // Multiattack: how many of this turn's Multiattack attacks have been resolved
  const [maMade, setMaMade] = useState(0);

  const attacks = (attacker.attacks ?? []).map(normalizeAttack);
  const isMonster = attacker.type === 'monster';
  const multiattack = isMonster ? (attacker.template?.multiattack ?? null) : null;
  const maCount = multiattack?.count ?? 0;
  const maOptions = multiattack ? attacks.filter(a => a.multiattack) : [];
  const otherAttacks = multiattack ? attacks.filter(a => !a.multiattack) : attacks;
  const inMultiattack = !!multiattack && selectedAction?.actionType === 'attack' && !!selectedAction?.multiattack;

  // Damage components of the chosen action. Attacks can carry several damage
  // types; spells and custom actions have a single untyped expression.
  const damageParts = selectedAction?.actionType === 'attack'
    ? attackDamageParts(selectedAction)
    : (selectedAction?.damage
        ? [{ dice: selectedAction.damage, type: '', average: diceAverage(selectedAction.damage) }]
        : []);
  const targetDefenses = selectedTarget?.template ?? null;
  const notedDefenses = damageParts
    .map(p => ({ type: p.type, response: damageResponse(targetDefenses, p.type) }))
    .filter((d, i, arr) => d.response !== 'normal' && arr.findIndex(x => x.type === d.type) === i);
  const conditionImmune = new Set(targetDefenses?.conditionImmunities ?? []);
  // Players keep the old list (spells with an effect); monsters list every spell.
  const spells  = isMonster
    ? (attacker.spells ?? [])
    : (attacker.spells ?? []).filter(s => s.effect || s.damage);
  const hasActions = attacks.length > 0 || spells.length > 0;
  const isMonsterSpell = selectedAction?.actionType === 'spell' && !!selectedAction?.monsterSpell;

  function usesLeft(sp) {
    if (!isLimitedSpell(sp)) return null;
    return Math.max(0, sp.usesPerDay - (attacker.usedSpells?.[sp.id] ?? 0));
  }

  function pickMonsterSpell(sp) {
    setSelectedAction({ ...sp, actionType: 'spell', monsterSpell: true, damage: diceFromText(sp.effect) });
    setStep('target');
  }

  // Cast a spell that has no target (Misty Step, Shield…): spend the use and close.
  function castWithoutTarget() {
    if (isMonsterSpell) onSpendSpell(attacker.id, selectedAction.id, null);
    onClose();
  }

  const targets  = combatants.filter(c => c.id !== attacker.id && (c.maxHp - c.damage) > 0);
  const players  = targets.filter(c => sideOf(c) === 'player');
  const allies   = targets.filter(c => sideOf(c) === 'ally');
  const enemies  = targets.filter(c => sideOf(c) === 'enemy');

  // Total the rolled (or average) amount of each damage part, then apply the
  // target's resistances and immunities type by type.
  function setDamageFrom(rolled) {
    const { total, lines } = applyDamageDefenses(rolled, targetDefenses);
    setDamageVal(String(total));
    setRolledBreakdown(rolled.map(r => `${r.breakdown}${r.type ? ` ${r.type}` : ''}`).join(' + '));
    setDefenseLines(lines.filter(l => l.response !== 'normal'));
  }

  function handleRoll() {
    setDamageFrom(damageParts.map(p => {
      const { total, breakdown } = rollDiceExpr(p.dice);
      return { type: p.type, amount: total, breakdown };
    }));
  }

  function handleAverage() {
    setDamageFrom(damageParts.map(p => ({ type: p.type, amount: p.average ?? 0, breakdown: `avg ${p.average ?? 0}` })));
  }

  function resetResolve() {
    setDamageVal(''); setHealVal(''); setTempHpVal('');
    setRolledBreakdown(''); setDefenseLines([]);
    setConditionId(''); setConditionTurns('');
  }

  // After a Multiattack attack, go back to the picker for the next one until
  // every attack is used; anything else closes the modal.
  function finishAction() {
    if (inMultiattack && maMade + 1 < maCount) {
      setMaMade(n => n + 1);
      setSelectedAction(null);
      setSelectedTarget(null);
      resetResolve();
      setStep('action');
    } else {
      onClose();
    }
  }

  function handleApply() {
    const dmg    = parseInt(damageVal) || 0;
    const heal   = parseInt(healVal) || 0;
    const tmpHp  = parseInt(tempHpVal) || 0;
    const turns  = conditionId ? (conditionTurns !== '' ? parseInt(conditionTurns) : null) : undefined;
    if (!selectedTarget) return;
    if (isMonsterSpell) onSpendSpell(attacker.id, selectedAction.id, selectedTarget.name);
    onApply(selectedTarget.id, dmg, heal, tmpHp, selectedAction, attacker, conditionId || null, turns ?? null);
    finishAction();
  }

  function handleMiss() {
    if (!selectedTarget) return;
    onLog?.(`${attacker.name} → ${selectedTarget.name} [${selectedAction?.name ?? 'attack'}]: miss`);
    finishAction();
  }

  const stepTitle = {
    action: `${attacker.name} — Choose Action`,
    target: `${selectedAction?.name ?? 'Action'} — Choose Target`,
    damage: `${selectedAction?.name ?? 'Action'} → ${selectedTarget?.name ?? '?'} — Resolve`,
  }[step];

  // ─── Target group renderer ────────────────────────────────────────────────
  function TargetButton({ t }) {
    const tHp = t.maxHp - t.damage;
    const tStatus = hpStatus(tHp, t.maxHp);
    return (
      <button key={t.id}
        onClick={() => { setSelectedTarget(t); resetResolve(); setStep('damage'); }}
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
        <div className={`combatant-dot ${t.type === 'player' ? 'dot-player' : 'dot-monster'}`}
          style={{ flexShrink: 0, ...sideDotStyle(t) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
            AC {t.ac} · HP {tHp}/{t.maxHp}
            {t.conditions.length > 0 && ` · ${t.conditions.map(c => c.id).join(', ')}`}
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
  }

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
              {/* Multiattack tracker */}
              {multiattack && (
                <div style={{
                  border: '1px solid var(--orange)', background: 'var(--orange-bg)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, fontStyle: 'italic', color: 'var(--orange-text)' }}>Multiattack. </span>
                      {multiattackText(multiattack, attacks, attacker.baseName ?? attacker.name)}
                    </div>
                    <div className="slot-pips" style={{ flexShrink: 0 }} title={`${maMade} of ${maCount} attacks made`}>
                      {Array.from({ length: maCount }).map((_, i) => (
                        <div key={i} className="slot-pip" style={{
                          cursor: 'default', borderColor: 'var(--orange)',
                          background: i < maMade ? 'var(--orange)' : 'transparent',
                        }} />
                      ))}
                    </div>
                  </div>
                  {maMade > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--orange-text)' }}>
                        Attack {maMade + 1} of {maCount} — choose the next attack
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={onClose}>End Multiattack</button>
                    </div>
                  )}
                </div>
              )}

              {maOptions.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: 0, color: 'var(--orange-text)' }}>
                    Multiattack Options · {numberWord(maCount)} attacks
                  </div>
                  {maOptions.map((atk, i) => (
                    <AttackPickButton key={atk.id || i} atk={atk} multi
                      onPick={() => { setSelectedAction({ ...atk, actionType: 'attack' }); setStep('target'); }} />
                  ))}
                </>
              )}

              {otherAttacks.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: maOptions.length > 0 ? 8 : 0 }}>
                    {maOptions.length > 0 ? 'Other Attacks' : 'Attacks'}
                  </div>
                  {otherAttacks.map((atk, i) => (
                    <AttackPickButton key={atk.id || i} atk={atk}
                      onPick={() => { setSelectedAction({ ...atk, actionType: 'attack' }); setStep('target'); }} />
                  ))}
                </>
              )}

              {isMonster && spells.length > 0 && SPELL_ACTION_TYPES.map((type, ti) => {
                const list = spells
                  .filter(sp => (sp.actionType ?? 'action') === type.id)
                  .sort((a, b) =>
                    (isLimitedSpell(a) ? 1 : 0) - (isLimitedSpell(b) ? 1 : 0) ||
                    (b.usesPerDay ?? 0) - (a.usesPerDay ?? 0) ||
                    (a.name ?? '').localeCompare(b.name ?? ''));
                if (list.length === 0) return null;
                return (
                  <div key={type.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="section-heading" style={{ marginTop: (attacks.length > 0 || ti > 0) ? 8 : 0 }}>
                      Spells — {type.label}
                    </div>
                    {list.map(sp => {
                      const left = usesLeft(sp);
                      const exhausted = left === 0;
                      const defense = spellDefenseLine(sp, attacker.spellcasting);
                      return (
                        <button key={sp.id} disabled={exhausted}
                          onClick={() => !exhausted && pickMonsterSpell(sp)}
                          title={exhausted ? 'No uses left today — restore a pip in the expanded panel to cast again' : ''}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'var(--surface)',
                            cursor: exhausted ? 'not-allowed' : 'pointer', textAlign: 'left', width: '100%',
                            transition: 'background 0.1s', opacity: exhausted ? 0.5 : 1,
                          }}
                          onMouseEnter={e => { if (!exhausted) e.currentTarget.style.background = 'var(--surface2)'; }}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name || 'Unnamed Spell'}</span>
                              <span className="tag tag-purple" style={{ fontSize: 9 }}>{spellFrequencyLabel(sp)}</span>
                              {sp.castLevel ? <span className="tag tag-gray" style={{ fontSize: 9 }}>Lvl {sp.castLevel}</span> : null}
                              {sp.concentration && <span className="tag tag-amber" style={{ fontSize: 9 }}>⟳ Conc.</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                              {[sp.effect, defense].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </div>
                          {left !== null && (
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', flexShrink: 0,
                              color: exhausted ? 'var(--accent)' : 'var(--purple-text)' }}>
                              {exhausted ? 'none left' : `${left}/${sp.usesPerDay} left`}
                            </span>
                          )}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {!isMonster && spells.length > 0 && (
                <>
                  <div className="section-heading" style={{ marginTop: attacks.length > 0 ? 8 : 0 }}>
                    {hasActions ? 'Other' : 'Actions'}
                  </div>
                  {spells.map((sp, i) => (
                    <button key={i} onClick={() => { setSelectedAction({ ...sp, actionType: 'spell' }); setStep('target'); }}
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
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                          {sp.effect ?? sp.damage ?? ''}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </>
              )}

              {/* Custom / Other */}
              <div className="section-heading" style={{ marginTop: (attacks.length > 0 || spells.length > 0) ? 8 : 0 }}>Other</div>
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
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Unarmed strike, special ability, or manual entry</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Unlisted */}
              <button onClick={() => { setSelectedAction({ name: 'Unlisted', actionType: 'unlisted', damage: '' }); setStep('target'); }}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Unlisted</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Bonus action, reaction, legendary action, or other</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Step 2: Target picker — separated by type ── */}
          {step === 'target' && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setStep('action')}>← Back</button>
              {isMonsterSpell && (
                <button
                  onClick={castWithoutTarget}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--purple)', background: 'var(--purple-bg)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-text)' }}>Cast without a target</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                      Self, area or utility spell{isLimitedSpell(selectedAction) ? ' — uses 1 of today\'s casts' : ''}
                    </div>
                  </div>
                </button>
              )}
              {targets.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>No valid targets — all other combatants are down.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {players.length > 0 && (
                    <>
                      <div className="section-heading" style={{ marginTop: 0 }}>Players</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {players.map(t => <TargetButton key={t.id} t={t} />)}
                      </div>
                    </>
                  )}
                  {allies.length > 0 && (
                    <>
                      <div className="section-heading" style={{ marginTop: players.length > 0 ? 4 : 0 }}>Allies</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {allies.map(t => <TargetButton key={t.id} t={t} />)}
                      </div>
                    </>
                  )}
                  {enemies.length > 0 && (
                    <>
                      <div className="section-heading" style={{ marginTop: (players.length > 0 || allies.length > 0) ? 4 : 0 }}>Enemies</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {enemies.map(t => <TargetButton key={t.id} t={t} />)}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Resolve (damage / heal / temp HP / condition) ── */}
          {step === 'damage' && selectedTarget && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep('target')}>← Back</button>

              {/* Summary */}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`combatant-dot ${selectedTarget.type === 'player' ? 'dot-player' : 'dot-monster'}`}
                  style={sideDotStyle(selectedTarget)} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedTarget.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                    AC {selectedTarget.ac} · HP {selectedTarget.maxHp - selectedTarget.damage}/{selectedTarget.maxHp}
                  </div>
                </div>
              </div>

              {/* Damage row */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>
                  Damage
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={damageVal}
                    onChange={e => setDamageVal(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: 20, fontFamily: 'DM Mono, monospace', fontWeight: 500, textAlign: 'center' }}
                  />
                  {damageParts.length > 0 && (
                    <>
                      <button className="btn btn-ghost" onClick={handleRoll} style={{ flexShrink: 0 }}>
                        🎲 Roll {damageParts.map(p => p.dice).join(' + ')}
                      </button>
                      {damageParts.every(p => p.average !== null && p.average !== undefined) && (
                        <button className="btn btn-ghost" onClick={handleAverage} style={{ flexShrink: 0 }}
                          title="Use the average damage">
                          Avg {damageParts.reduce((s, p) => s + p.average, 0)}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {damageParts.length > 1 && !rolledBreakdown && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                    {damageParts.map(p => `${p.dice} ${p.type}`).join(' + ')}
                  </div>
                )}
                {rolledBreakdown && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                    = {rolledBreakdown}
                  </div>
                )}
                {defenseLines.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {defenseLines.map(l => (
                      <span key={l.type} className={`tag ${l.response === 'immune' ? 'tag-green' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                        {damageTypeLabel(l.type)} {l.response === 'immune' ? 'immune' : 'resisted'}: {l.raw} → {l.final}
                      </span>
                    ))}
                  </div>
                ) : notedDefenses.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {notedDefenses.map(d => (
                      <span key={d.type} className={`tag ${d.response === 'immune' ? 'tag-green' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                        {selectedTarget.name} is {d.response === 'immune' ? 'immune to' : 'resistant to'} {damageTypeLabel(d.type)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Healing row */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green)', marginBottom: 6 }}>
                  Healing
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={healVal}
                  onChange={e => setHealVal(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 500, textAlign: 'center' }}
                />
              </div>

              {/* Temp HP row */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', marginBottom: 6 }}>
                  Add Temp HP
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={tempHpVal}
                  onChange={e => setTempHpVal(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 500, textAlign: 'center' }}
                />
              </div>

              {/* Apply condition */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>
                  Apply Condition (optional)
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={conditionId} onChange={e => setConditionId(e.target.value)} style={{ flex: 1 }}>
                    <option value="">— None —</option>
                    {CONDITIONS.map(c => (
                      <option key={c.id} value={c.id} disabled={conditionImmune.has(c.id)}>
                        {c.label}{conditionImmune.has(c.id) ? ' — immune' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    placeholder="turns"
                    value={conditionTurns}
                    onChange={e => setConditionTurns(e.target.value)}
                    style={{ width: 72, textAlign: 'center', fontSize: 13 }}
                    title="How many turns it lasts (leave blank for indefinite)"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {selectedAction?.actionType === 'attack' && (
                  <button className="btn btn-ghost" onClick={handleMiss} style={{ flexShrink: 0 }}>
                    Miss
                  </button>
                )}
                <button
                  className="btn btn-accent btn-full"
                  onClick={handleApply}
                  disabled={!isMonsterSpell && !damageVal && !healVal && !tempHpVal && !conditionId}
                >
                  {isMonsterSpell ? 'Cast & Apply' : 'Apply'}
                  {inMultiattack && maMade + 1 < maCount ? ` · next attack (${maMade + 2}/${maCount})` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Encounter Select ─────────────────────────────────────────────────────────

function EncounterSelectScreen({ encounters, onSelect }) {
  if (encounters.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          No encounters yet. Build one in the Encounter Builder tab first.
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="section-heading">Select an Encounter</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {encounters.map(enc => (
          <button key={enc.id}
            onClick={() => onSelect(enc)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{enc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {enc.entries.filter(e => e.type === 'monster' && !e.monster?.isAlly).reduce((s, e) => s + (e.count || 1), 0)} monsters ·{' '}
                {enc.entries.filter(e => e.type === 'monster' && e.monster?.isAlly).reduce((s, e) => s + (e.count || 1), 0)} allies ·{' '}
                {enc.entries.filter(e => e.type === 'player').length} players
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Initiative Mode ──────────────────────────────────────────────────────────

function InitiativeModeScreen({ encounter, onConfirm, onBack }) {
  const modes = [
    { id: 'individual', label: 'Individual', desc: 'Each monster and ally rolls separately' },
    { id: 'group',      label: 'By Group',   desc: 'All of the same type share one roll' },
    { id: 'side',       label: 'By Side',    desc: 'Players, allies, and enemies each share one roll' },
  ];
  return (
    <div style={{ maxWidth: 400 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div className="section-heading">Initiative Mode — {encounter.name}</div>
      <div className="card">
        {modes.map((m, i) => (
          <button key={m.id} onClick={() => onConfirm(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: 'none', border: 'none',
              borderBottom: i < modes.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.desc}</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Initiative Input ─────────────────────────────────────────────────────────

// Defined at module level (not inside InitiativeInputScreen) so the number
// input keeps focus while you type instead of remounting on every keystroke.
// `roll` is the d20 breakdown behind the current value ({ die, mod, group }),
// or null when the value was typed in by hand.
function CombatantInitRow({ c, value, roll, onChange, onRoll, isLast }) {
  const isNat20 = roll?.die === 20;
  const isNat1  = roll?.die === 1;
  const rollColor = isNat20 ? 'var(--green)' : isNat1 ? 'var(--accent)' : 'var(--text2)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderBottom: !isLast ? '1px solid var(--border)' : 'none',
    }}>
      <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`}
        style={sideDotStyle(c)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 10px', fontSize: 11, color: 'var(--text3)' }}>
          {c.initMod !== 0 && <span>mod {fmtMod(c.initMod)}</span>}
          {roll && (
            <span style={{ fontFamily: 'DM Mono, monospace', color: rollColor }}
              title={roll.group ? 'Shared group roll — uses the group\'s best modifier' : 'Individual roll'}>
              d20 <strong>{roll.die}</strong> {fmtMod(roll.mod)}
              {roll.group && <span style={{ color: 'var(--text3)' }}> (group)</span>}
              {isNat20 && ' · nat 20'}
              {isNat1 && ' · nat 1'}
            </span>
          )}
        </div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ flexShrink: 0 }}
        onClick={onRoll}
        title={`Roll a d20 for ${c.name} and add their modifier (${fmtMod(c.initMod ?? 0)})`}
      >
        🎲 d20
      </button>
      <InitInput value={value} onChange={onChange} />
    </div>
  );
}

// Header for one side (Players / Allies / Enemies) with its group-roll controls.
function SideHeader({ label, count, onRollGroup, onSetGroup }) {
  const [val, setVal] = useState('');

  function handleSet() {
    if (val === '') return;
    onSetGroup(val);
    setVal('');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
      <span className="section-heading" style={{ margin: 0 }}>
        {label}
        <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text3)' }}>
          ({count})
        </span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <InitInput
          value={val}
          onChange={setVal}
          style={{ width: 56, padding: '3px 6px', fontSize: 12 }}
        />
        <button
          className="btn btn-ghost btn-sm"
          disabled={val === ''}
          onClick={handleSet}
          title={`Give every ${label.toLowerCase().replace(/s$/, '')} this same initiative (for a group roll made at the table)`}
        >
          Set all
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRollGroup}
          title="One d20 plus the group's best initiative modifier — everyone in the group gets the same number"
        >
          🎲 Roll as Group
        </button>
      </div>
    </div>
  );
}

function InitiativeInputScreen({ combatants, initiativeMode, onStart, onBack }) {
  const [inits, setInits] = useState(() => {
    const m = {};
    combatants.forEach(c => { m[c.id] = ''; });
    return m;
  });

  // d20 breakdown behind each value: { [id]: { die, mod, group } }.
  // Cleared for a combatant whenever their value is typed or set by hand.
  const [rolls, setRolls] = useState({});

  function clearRolls(ids) {
    setRolls(prev => {
      const next = { ...prev };
      ids.forEach(id => { delete next[id]; });
      return next;
    });
  }

  function setInit(id, val) {
    setInits(prev => ({ ...prev, [id]: val }));
    clearRolls([id]);
  }

  // Per-combatant roll: one d20 plus this combatant's own modifier.
  // Available in every mode, so anyone can re-roll on their own even after a
  // group or side roll.
  function rollOne(c) {
    const r = rollInit(c.initMod);
    setInits(prev => ({ ...prev, [c.id]: String(r.total) }));
    setRolls(prev => ({ ...prev, [c.id]: { die: r.die, mod: r.mod, group: false } }));
  }

  function sideMembers(sideId) {
    return combatants.filter(c => sideOf(c) === sideId);
  }

  function rollSide(sideId) {
    const members = sideMembers(sideId);
    const r = rollGroupInit(members);
    if (r == null) return;
    const v = String(r.total);
    setInits(prev => {
      const next = { ...prev };
      members.forEach(c => { next[c.id] = v; });
      return next;
    });
    setRolls(prev => {
      const next = { ...prev };
      members.forEach(c => { next[c.id] = { die: r.die, mod: r.mod, group: true }; });
      return next;
    });
  }

  // Give every member of one side the same typed-in value (a roll made at the table).
  function setSide(sideId, raw) {
    const v = clampInit(raw);
    if (v === '') return;
    const members = sideMembers(sideId);
    setInits(prev => {
      const next = { ...prev };
      members.forEach(c => { next[c.id] = v; });
      return next;
    });
    clearRolls(members.map(c => c.id));
  }

  // Top-bar roll button; behaviour follows the mode picked on the previous screen.
  function rollAll() {
    const next = { ...inits };
    const nextRolls = { ...rolls };
    const monsters = combatants.filter(c => c.type === 'monster'); // enemies + allies

    if (initiativeMode === 'individual') {
      monsters.forEach(c => {
        const r = rollInit(c.initMod);
        next[c.id] = String(r.total);
        nextRolls[c.id] = { die: r.die, mod: r.mod, group: false };
      });
    } else if (initiativeMode === 'group') {
      // One roll per monster type, kept separate for allies vs. enemies.
      const rolled = {};
      monsters.forEach(c => {
        const key = `${sideOf(c)}:${c.groupKey ?? c.baseName}`;
        if (rolled[key] === undefined) rolled[key] = rollInit(c.initMod);
        const r = rolled[key];
        next[c.id] = String(r.total);
        nextRolls[c.id] = { die: r.die, mod: r.mod, group: true };
      });
    } else {
      // 'side': players, allies, and enemies each share one roll.
      SIDES.forEach(s => {
        const members = sideMembers(s.id);
        const r = rollGroupInit(members);
        if (r == null) return;
        members.forEach(c => {
          next[c.id] = String(r.total);
          nextRolls[c.id] = { die: r.die, mod: r.mod, group: true };
        });
      });
    }
    setInits(next);
    setRolls(nextRolls);
  }

  const allSet = combatants.every(c => inits[c.id] !== '' && parseInt(inits[c.id]) >= 1);

  function handleStart() {
    if (!allSet) return;
    // Ties go players → allies → enemies, which also keeps a group that rolled
    // together acting together.
    const sorted = combatants
      .map(c => ({ ...c, initiative: parseInt(inits[c.id]) }))
      .sort((a, b) =>
        (b.initiative - a.initiative) || (SIDE_RANK[sideOf(a)] - SIDE_RANK[sideOf(b)])
      );
    onStart(sorted);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-ghost btn-sm" onClick={rollAll}>
          {initiativeMode === 'side' ? '🎲 Roll All Groups' : '🎲 Roll Monster & Ally Initiatives'}
        </button>
      </div>

      {SIDES.map(s => {
        const members = combatants.filter(c => sideOf(c) === s.id);
        if (members.length === 0) return null;
        return (
          <div key={s.id} style={{ marginBottom: 16 }}>
            <SideHeader
              label={s.label}
              count={members.length}
              onRollGroup={() => rollSide(s.id)}
              onSetGroup={val => setSide(s.id, val)}
            />
            <div className="card">
              {members.map((c, i) => (
                <CombatantInitRow
                  key={c.id}
                  c={c}
                  value={inits[c.id]}
                  roll={rolls[c.id] ?? null}
                  onChange={val => setInit(c.id, val)}
                  onRoll={() => rollOne(c)}
                  isLast={i === members.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}

      <button
        className="btn btn-accent btn-full"
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

export default function CombatRunner({
  encounters,
  setEncounters,
  monsters,
  setMonsters,
  // All combat state is lifted to App.jsx to persist across tab switches
  screen, setScreen,
  selectedEncounter, setSelectedEncounter,
  initiativeMode, setInitiativeMode,
  pendingCombatants, setPendingCombatants,
  combatants, setCombatants,
  round, setRound,
  turnIdx, setTurnIdx,
  log, setLog,
}) {
  const [actionModal, setActionModal] = useState(null);
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  // Full-stat edit of a single instance, and the follow-up "push to library?" prompt
  const [editingCombatant, setEditingCombatant] = useState(null); // combatant object | null
  const [pushPrompt, setPushPrompt] = useState(null);             // { combatantId, sourceId, data } | null

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
      // Clear actsNextTurn on whoever is about to become active
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
      // Clear actsNextTurn for the combatant now taking their turn
      return prev.map((c, i) => i === next && c.actsNextTurn ? { ...c, actsNextTurn: false } : c);
    });
  }

  // Step back one turn, mirroring nextTurn: skips downed combatants and drops
  // back a round when wrapping past the top of the order. Never goes earlier
  // than the first turn of round 1.
  function prevTurn() {
    if (combatants.length === 0) return;
    let prev = turnIdx;
    let newRound = round;
    let safety = 0;
    do {
      prev -= 1;
      if (prev < 0) { prev = combatants.length - 1; newRound -= 1; }
      safety++;
    } while ((combatants[prev].maxHp - combatants[prev].damage) <= 0 && safety < combatants.length);
    if (newRound < 1) return;
    setTurnIdx(prev);
    setRound(newRound);
    addLog(`↩ Back to ${combatants[prev].name}'s turn`, newRound);
  }

  function updateCombatant(id, changes) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  // conditions are now { id, turns } objects
  function toggleCondition(id, condId, turns) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const hasIdx = c.conditions.findIndex(x => x.id === condId);
      let conditions;
      if (turns === null && hasIdx >= 0) {
        // remove
        conditions = c.conditions.filter(x => x.id !== condId);
        addLog(`${c.name} lost ${condId}`, round);
      } else if (hasIdx < 0) {
        // add
        conditions = [...c.conditions, { id: condId, turns: turns ?? null }];
        const turnsStr = turns != null ? ` (${turns} turns)` : '';
        addLog(`${c.name} gained ${condId}${turnsStr}`, round);
      } else {
        return c;
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

  // Set how many uses of an X/Day spell a monster has spent (pip clicks).
  function setSpellUses(id, spellId, newUsed) {
    const c  = combatants.find(x => x.id === id);
    const sp = c?.spells?.find(x => x.id === spellId);
    if (!c || !sp || !isLimitedSpell(sp)) return;
    const used = c.usedSpells?.[spellId] ?? 0;
    const next = Math.max(0, Math.min(sp.usesPerDay, newUsed));
    if (next === used) return;
    setCombatants(prev => prev.map(x =>
      x.id === id ? { ...x, usedSpells: { ...(x.usedSpells ?? {}), [spellId]: next } } : x
    ));
    const left = sp.usesPerDay - next;
    addLog(next > used
      ? `${c.name} used ${sp.name} (${left}/${sp.usesPerDay} left)`
      : `${c.name} regained a use of ${sp.name} (${left}/${sp.usesPerDay} left)`, round);
  }

  // Casting from the action picker: spend one use of an X/Day spell and log it.
  function spendSpell(id, spellId, targetName) {
    const c  = combatants.find(x => x.id === id);
    const sp = c?.spells?.find(x => x.id === spellId);
    if (!c || !sp) return;
    const arrow = targetName ? ` → ${targetName}` : '';
    if (!isLimitedSpell(sp)) {
      // At Will: nothing to spend. Log a targetless cast; damage is logged on apply.
      if (!targetName) addLog(`${c.name} casts ${sp.name}`, round);
      return;
    }
    const used = c.usedSpells?.[spellId] ?? 0;
    const next = Math.min(sp.usesPerDay, used + 1);
    setCombatants(prev => prev.map(x =>
      x.id === id ? { ...x, usedSpells: { ...(x.usedSpells ?? {}), [spellId]: next } } : x
    ));
    addLog(`${c.name} casts ${sp.name}${arrow} (${sp.usesPerDay - next}/${sp.usesPerDay} left)`, round);
  }

  function toggleExpanded(id) {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  // ── Library sync / per-instance edit / push ────────────────────────────────

  // Pull the current library version into every non-diverged monster instance.
  function syncFromLibrary() {
    const affected = combatants.filter(
      c => c.type === 'monster' && !c.diverged && monsters.some(m => m.id === c.sourceId)
    );
    if (affected.length === 0) {
      addLog('🔄 Sync: no instances to update (all are diverged or unlinked).', round);
      return;
    }
    setCombatants(prev => prev.map(c => {
      if (c.type !== 'monster' || c.diverged) return c;
      const lib = monsters.find(m => m.id === c.sourceId);
      return lib ? applyTemplateToCombatant(c, lib) : c;
    }));
    addLog(`🔄 Synced ${affected.length} instance${affected.length !== 1 ? 's' : ''} from the library.`, round);
  }

  // Open the full-stat editor for one instance.
  function openEditCombatant(c) {
    setEditingCombatant(c);
  }

  // MonsterForm save: apply edits to this instance, then ask whether to push.
  function saveCombatantEdit(data) {
    if (!editingCombatant) return;
    const target = editingCombatant;
    setCombatants(prev => prev.map(c => c.id === target.id ? applyTemplateToCombatant(c, data) : c));
    setEditingCombatant(null);
    setPushPrompt({
      combatantId: target.id,
      sourceId: data.id ?? target.sourceId,
      data,
    });
  }

  // Push the edited stats to the library, the encounter snapshot, and all
  // non-diverged instances of the same monster.
  function confirmPush() {
    if (!pushPrompt) return;
    const { sourceId, data, combatantId } = pushPrompt;
    const libEntry = { ...data, id: sourceId, isDefault: false };

    // 1. Library: overwrite in place (defaults included), or add if missing.
    setMonsters(prev => {
      const exists = prev.some(m => m.id === sourceId);
      return exists
        ? prev.map(m => m.id === sourceId ? libEntry : m)
        : [...prev, libEntry];
    });

    // 2. Encounter snapshot for the encounter being run.
    if (setEncounters && selectedEncounter?.id) {
      setEncounters(prev => prev.map(enc =>
        enc.id !== selectedEncounter.id ? enc : {
          ...enc,
          entries: enc.entries.map(e =>
            (e.type === 'monster' && e.sourceId === sourceId)
              ? { ...e, name: libEntry.name, monster: JSON.parse(JSON.stringify(libEntry)) }
              : e
          ),
        }
      ));
    }

    // 3. Live instances: edited one + all non-diverged siblings.
    setCombatants(prev => prev.map(c =>
      (c.type === 'monster' && c.sourceId === sourceId && (!c.diverged || c.id === combatantId))
        ? applyTemplateToCombatant(c, libEntry)
        : c
    ));

    addLog(`📚 Pushed "${libEntry.name}" to the library and synced its instances.`, round);
    setPushPrompt(null);
  }

  // Keep the edit on this instance only; flag it so future syncs skip it.
  function declinePush() {
    if (!pushPrompt) return;
    const { combatantId } = pushPrompt;
    setCombatants(prev => prev.map(c => c.id === combatantId ? { ...c, diverged: true } : c));
    const edited = combatants.find(c => c.id === combatantId);
    addLog(`✏️ ${edited?.name ?? 'Instance'} edited for this combat only (won't sync).`, round);
    setPushPrompt(null);
  }

  // ── Add Monster During Combat ──────────────────────────────────────────────

  function addMonsterToCombat(rawTemplate, initiative) {
    const monsterTemplate = normalizeMonster(rawTemplate);
    const maxHp = monsterTemplate.hp ?? 10;

    // Number the new monster if one with the same base name already exists
    const sameBase = combatants.filter(
      c => c.baseName === monsterTemplate.name || c.name === monsterTemplate.name
    );
    const name = sameBase.length > 0
      ? `${monsterTemplate.name} ${sameBase.length + 1}`
      : monsterTemplate.name;

    const newCombatant = {
      id: `mid-combat-${Date.now()}`,
      sourceId: monsterTemplate.id,
      groupKey: monsterTemplate.id,
      type: 'monster',
      isAlly: !!monsterTemplate.isAlly,
      name,
      baseName: monsterTemplate.name,
      maxHp,
      damage: 0,
      tempHp: 0,
      ac: monsterTemplate.ac ?? 10,
      speed: monsterTemplate.speed ?? 30,
      initiative,
      initMod: dexMod(monsterTemplate.abilities),
      conditions: [],
      spellSlots: null,
      usedSlots: {},
      spellcasting: monsterTemplate.spellcasting ?? null,
      usedSpells: {},
      attacks: monsterTemplate.attacks ?? [],
      spells: monsterTemplate.spells ?? [],
      notes: monsterTemplate.notes ?? '',
      abilities: monsterTemplate.abilities ?? null,
      expanded: false,
      cr: monsterTemplate.cr,
      diverged: false,
      template: JSON.parse(JSON.stringify(monsterTemplate)),
      actsNextTurn: true,
    };

    setCombatants(prev => {
      const next = [...prev];

      // Find where this initiative score belongs in sorted order
      let insertAt = next.length;
      for (let i = 0; i < next.length; i++) {
        if ((next[i].initiative ?? 0) < initiative) {
          insertAt = i;
          break;
        }
      }

      // Never insert at or before the current turn — always act next turn
      if (insertAt <= turnIdx) {
        insertAt = turnIdx + 1;
      }

      next.splice(insertAt, 0, newCombatant);
      return next;
    });

    addLog(`🐉 ${name} entered combat (initiative ${initiative})`, round);
    setAddMonsterOpen(false);
  }

  // Updated: handles damage, healing, tempHp, and optional condition
  function onApplyAction(targetId, damage, heal, tempHp, action, attacker, conditionId, conditionTurns) {
    setCombatants(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      let newDamage = c.damage;
      let newTempHp = c.tempHp ?? 0;
      if (damage > 0) newDamage = Math.min(c.maxHp, c.damage + damage);
      if (heal > 0)   newDamage = Math.max(0, newDamage - heal);
      if (tempHp > 0) newTempHp = Math.max(newTempHp, tempHp); // temp HP doesn't stack, take highest

      let newConditions = [...c.conditions];
      if (conditionId) {
        const alreadyHas = newConditions.some(x => x.id === conditionId);
        if (!alreadyHas) newConditions = [...newConditions, { id: conditionId, turns: conditionTurns }];
      }
      return { ...c, damage: newDamage, tempHp: newTempHp, conditions: newConditions };
    }));

    const target = combatants.find(c => c.id === targetId);
    const actionDesc = action?.name ?? 'attack';
    const parts = [];
    if (damage > 0) {
      const targetHpAfter = target ? Math.max(0, (target.maxHp - target.damage) - damage) : 0;
      parts.push(`${damage} dmg (→ ${targetHpAfter} HP)`);
    }
    if (heal > 0) parts.push(`healed ${heal}`);
    if (tempHp > 0) parts.push(`+${tempHp} temp HP`);
    if (conditionId) parts.push(`applied ${conditionId}${conditionTurns != null ? ` (${conditionTurns}t)` : ''}`);
    if (parts.length > 0) {
      addLog(`${attacker.name} → ${target?.name ?? '?'} [${actionDesc}]: ${parts.join(', ')}`, round);
    }
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
  // Going back is possible unless this is the first living combatant's turn in round 1.
  const canGoBack = round > 1 || combatants.slice(0, turnIdx).some(c => (c.maxHp - c.damage) > 0);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* Action modal */}
      {actionModal && (
        <ActionModal
          attacker={actionModal}
          combatants={combatants}
          onApply={onApplyAction}
          onSpendSpell={spendSpell}
          onLog={msg => addLog(msg, round)}
          onClose={() => setActionModal(null)}
        />
      )}

      {/* Add Monster modal */}
      {addMonsterOpen && (
        <AddMonsterModal
          monsters={monsters ?? []}
          onAdd={addMonsterToCombat}
          onClose={() => setAddMonsterOpen(false)}
        />
      )}

      {/* Edit a single instance — full stat form */}
      {editingCombatant && (
        <Modal title={`Edit ${editingCombatant.name}`} onClose={() => setEditingCombatant(null)} wide>
          <MonsterForm
            initial={combatantToMonster(editingCombatant)}
            onSave={saveCombatantEdit}
            onClose={() => setEditingCombatant(null)}
          />
        </Modal>
      )}

      {/* Push-to-library prompt (shown after an instance edit is saved) */}
      {pushPrompt && (
        <Modal title="Push changes to the library?" onClose={declinePush}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 18 }}>
            Save <strong style={{ color: 'var(--text)' }}>{pushPrompt.data.name}</strong> to the Monster Library?
            This updates the library template and applies the new stats to every other instance of this monster
            in the current combat — current HP, conditions, and initiative are preserved. Choose
            “Just this instance” to keep the change here only; it will be marked <em>Edited</em> and skipped by Sync.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" onClick={declinePush}>Just this instance</button>
            <button className="btn btn-accent" onClick={confirmPush}>Push to library &amp; sync</button>
          </div>
        </Modal>
      )}

      {/* Main combatant list — slightly narrower to give log more room */}
      <div style={{ flex: '0 0 auto', width: 'calc(100% - 340px)', minWidth: 0 }}>

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
            <button className="btn btn-ghost" onClick={prevTurn} disabled={!canGoBack}
              style={{ opacity: canGoBack ? 1 : 0.5 }}
              title={canGoBack ? 'Go back to the previous turn' : 'Already at the first turn of combat'}>
              ← Prev Turn
            </button>
            <button className="btn btn-accent" onClick={nextTurn}>Next Turn →</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text2)' }} onClick={syncFromLibrary}
              title="Pull the latest library stats into all non-edited instances (preserves current HP & conditions)">
              🔄 Sync
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text2)' }} onClick={() => setAddMonsterOpen(true)}>+ Monster</button>
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
                  <div className={`combatant-dot ${c.type === 'player' ? 'dot-player' : 'dot-monster'}`}
                    style={sideDotStyle(c)} />

                  <div className="combatant-name-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <div className="combatant-name">{c.name}</div>
                      {c.isAlly && (
                        <span className="tag tag-green" style={{ fontSize: 9 }}>Ally</span>
                      )}
                      {c.actsNextTurn && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                          padding: '1px 7px', borderRadius: 99,
                          background: '#f97316', color: '#fff',
                          whiteSpace: 'nowrap', lineHeight: 1.7,
                        }}>
                          Acts next turn
                        </span>
                      )}
                      {c.diverged && (
                        <span title="Edited for this combat only — Sync and pushes won't overwrite it"
                          style={{
                            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                            padding: '1px 7px', borderRadius: 99,
                            background: 'var(--amber-bg, #fef3c7)', color: 'var(--amber-text, #92400e)',
                            whiteSpace: 'nowrap', lineHeight: 1.7,
                          }}>
                          Edited
                        </span>
                      )}
                    </div>
                    {c.conditions.length > 0 && (
                      <div className="combatant-conditions">
                        {c.conditions.map(cond => <ConditionChip key={cond.id} condition={cond} />)}
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
                    <div
                      className="combatant-stat"
                      title={c.type === 'monster' && hasOtherSpeeds(c.template)
                        ? speedText({ speed: c.speed, speeds: c.template.speeds })
                        : undefined}
                    >
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

                  {c.type === 'monster' && (
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                      <button className="btn-icon" title="Edit full stats for this monster"
                        onClick={() => openEditCombatant(c)} style={{ flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  )}

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
                    onToggleSlot={toggleSlot} onToggleCondition={toggleCondition}
                    onSetSpellUses={setSpellUses} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat log — wider */}
      <div style={{ width: 320, flexShrink: 0 }}>
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
