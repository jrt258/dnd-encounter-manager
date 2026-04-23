import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function makeEncounter(name = 'New Encounter') {
  return { id: uid(), name, entries: [] };
}

const CR_XP = {
  '0': 10, '0.125': 25, '0.25': 50, '0.5': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
};

function encounterXp(entries) {
  return entries
    .filter(e => e.type === 'monster')
    .reduce((sum, e) => sum + ((CR_XP[String(e.monster?.cr ?? 0)] ?? 0) * (e.count || 1)), 0);
}

function crNumber(cr) {
  if (cr === undefined || cr === '' || cr === null) return -1;
  const fracs = { '0.125': 0.125, '0.25': 0.25, '0.5': 0.5 };
  if (fracs[String(cr)] !== undefined) return fracs[String(cr)];
  const n = parseFloat(cr);
  return isNaN(n) ? -1 : n;
}

function crLabel(cr) {
  if (cr === undefined || cr === '' || cr === null) return '—';
  const fracs = { '0.125': '⅛', '0.25': '¼', '0.5': '½' };
  return fracs[String(cr)] ?? String(cr);
}

function matchesCrFilter(cr, filter) {
  if (filter === 'all') return true;
  const n = crNumber(cr);
  if (filter === '5plus') return n >= 5;
  return Math.abs(n - parseFloat(filter)) < 0.001;
}

function modStr(mod) { return mod >= 0 ? `+${mod}` : String(mod); }

const CR_BRACKETS = [
  { label: 'All CR', value: 'all' },
  { label: 'CR 0',   value: '0' },
  { label: 'CR ⅛',   value: '0.125' },
  { label: 'CR ¼',   value: '0.25' },
  { label: 'CR ½',   value: '0.5' },
  { label: 'CR 1',   value: '1' },
  { label: 'CR 2',   value: '2' },
  { label: 'CR 3',   value: '3' },
  { label: 'CR 4',   value: '4' },
  { label: 'CR 5+',  value: '5plus' },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDuplicate = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 99,
      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
      background: active ? 'var(--accent-bg)' : 'var(--surface)',
      color: active ? 'var(--accent-text)' : 'var(--text2)',
      fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
    }}>
      {label}
    </button>
  );
}

// ─── Monster Card Modal ───────────────────────────────────────────────────────

function MonsterCard({ monster, onClose, onAdd }) {
  const m = monster;
  const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

  return (
    <Modal title={m.name} onClose={onClose} wide>
      {/* Header strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <span className="tag tag-gray">{m.type || 'Monster'}</span>
        {m.cr !== undefined && m.cr !== '' && (
          <span className="tag tag-amber">CR {crLabel(m.cr)}</span>
        )}
        {m.size && <span className="tag tag-gray">{m.size}</span>}
        {m.isDefault && <span className="tag tag-blue" style={{ fontSize: 9 }}>SRD</span>}
      </div>

      {/* Core stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20,
        background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 12,
      }}>
        {[
          { label: 'Hit Points', value: m.hp ?? '—', sub: m.hpFormula ? `(${m.hpFormula})` : null },
          { label: 'Armor Class', value: m.ac ?? '—' },
          { label: 'Speed', value: m.speed ? `${m.speed} ft` : '—' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 2 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
              {s.value}
            </div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Ability scores */}
      {m.abilities && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Ability Scores</div>
          <div className="ability-grid">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ab => {
              const score = m.abilities[ab] ?? 10;
              const mod   = Math.floor((score - 10) / 2);
              return (
                <div className="ability-cell" key={ab}>
                  <span className="ability-name">{ABILITY_LABELS[ab]}</span>
                  <span className="ability-score">{score}</span>
                  <span className="ability-mod">{modStr(mod)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions / Attacks */}
      {m.attacks?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Actions</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {m.attacks.map((atk, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                borderBottom: i < m.attacks.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: atk.notes ? 4 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{atk.name}</span>
                  {atk.hitBonus !== undefined && (
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--blue-text)', background: 'var(--blue-bg)', padding: '1px 7px', borderRadius: 99 }}>
                      {modStr(atk.hitBonus)} to hit
                    </span>
                  )}
                  {atk.damage && (
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--accent-text)', background: 'var(--accent-bg)', padding: '1px 7px', borderRadius: 99 }}>
                      {atk.damage} {atk.damageType ?? ''}
                    </span>
                  )}
                </div>
                {atk.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{atk.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spell slots */}
      {m.spellSlots && Object.values(m.spellSlots).some(v => v > 0) && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Spell Slots</div>
          <div className="spell-slots-grid">
            {Object.entries(m.spellSlots).map(([lvl, count]) =>
              count > 0 ? (
                <div className="slot-level" key={lvl}>
                  <span className="slot-level-label">Lvl {lvl}</span>
                  <div className="slot-pips">
                    {Array.from({ length: count }).map((_, i) => (
                      <div className="slot-pip" key={i} />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Spells */}
      {m.spells?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Spells</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[...m.spells]
              .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
              .map((sp, i) => {
                let defLine = '';
                if (sp.defenseType === 'save') {
                  defLine = `${sp.saveAbility?.toUpperCase()} Save DC ${sp.saveDC}`;
                  if (sp.onSave) defLine += ` · ${sp.onSave} on save`;
                } else if (sp.defenseType === 'attack') {
                  defLine = `${modStr(sp.attackBonus)} spell attack`;
                }
                return (
                  <div key={sp.id ?? i} style={{
                    padding: '10px 14px',
                    borderBottom: i < m.spells.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</span>
                      <span className="tag tag-purple" style={{ fontSize: 9 }}>
                        {sp.level === 0 ? 'Cantrip' : `Lvl ${sp.level}`}
                      </span>
                      {sp.concentration && <span className="tag tag-amber" style={{ fontSize: 9 }}>⟳ Conc.</span>}
                      {sp.ritual && <span className="tag tag-blue" style={{ fontSize: 9 }}>ℛ Ritual</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', display: 'flex', flexWrap: 'wrap', gap: '0 10px', marginBottom: sp.description ? 4 : 0 }}>
                      {sp.castingTime && <span>{sp.castingTime}</span>}
                      {sp.range && <span>{sp.range}</span>}
                      {sp.effect && <span>{sp.effect}</span>}
                      {defLine && <span style={{ color: 'var(--accent-text)' }}>{defLine}</span>}
                    </div>
                    {sp.description && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{sp.description}</div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Notes */}
      {m.notes && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>Notes & Traits</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.notes}</p>
        </div>
      )}

      {/* Footer action */}
      {onAdd && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-accent" onClick={() => { onAdd(); onClose(); }}>+ Add to Encounter</button>
        </div>
      )}
    </Modal>
  );
}

// ─── Encounter sidebar item ────────────────────────────────────────────────────

function EncounterItem({ enc, active, onSelect, onRename, onDuplicate, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft]       = useState(enc.name);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed) onRename(enc.id, trimmed);
    else setDraft(enc.name);
    setRenaming(false);
  }

  const monsterCount = enc.entries.filter(e => e.type === 'monster').reduce((s, e) => s + (e.count || 1), 0);
  const playerCount  = enc.entries.filter(e => e.type === 'player').length;
  const hasContent   = monsterCount > 0 || playerCount > 0;

  // Build summary string — only show if there's something
  const parts = [];
  if (monsterCount > 0) parts.push(`${monsterCount} monster${monsterCount !== 1 ? 's' : ''}`);
  if (playerCount > 0)  parts.push(`${playerCount} player${playerCount !== 1 ? 's' : ''}`);
  const summary = parts.join(' · ');

  return (
    <div
      onClick={() => !renaming && onSelect(enc.id)}
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--accent-bg)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        cursor: 'pointer',
        transition: 'all 0.12s',
        marginBottom: 6,
      }}
    >
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setDraft(enc.name); setRenaming(false); }
          }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', fontSize: 13, fontWeight: 600, padding: '2px 4px', marginBottom: 6 }}
        />
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent-text)' : 'var(--text)', marginBottom: hasContent ? 4 : 8 }}>
          {enc.name}
        </div>
      )}

      {hasContent && (
        <div style={{ fontSize: 12, color: active ? 'var(--accent-text)' : 'var(--text2)', marginBottom: 8 }}>
          {summary}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button
          className="btn-icon"
          title="Rename"
          style={{ padding: 5 }}
          onClick={() => { setDraft(enc.name); setRenaming(true); }}
        >
          <IconEdit />
        </button>
        <button
          className="btn-icon"
          title="Duplicate"
          style={{ padding: 5 }}
          onClick={() => onDuplicate(enc.id)}
        >
          <IconDuplicate />
        </button>
        <button
          className="btn-icon danger"
          title="Delete"
          style={{ padding: 5 }}
          onClick={() => onDelete(enc.id)}
        >
          <IconDelete />
        </button>
      </div>
    </div>
  );
}

// ─── Main EncounterBuilder ─────────────────────────────────────────────────────

export default function EncounterBuilder({
  monsters, players, encounters, setEncounters,
  activeEncounterId, setActiveEncounterId,
  onNavigate,
}) {
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCr, setFilterCr]     = useState('all');
  const [previewMonster, setPreviewMonster] = useState(null);

  // Derive unique types from library
  const allTypes = useMemo(() => {
    const types = [...new Set(monsters.map(m => m.type).filter(Boolean))].sort();
    return ['all', ...types];
  }, [monsters]);

  // ── Encounter CRUD ────────────────────────────────────────────────────────

  function createEncounter() {
    const enc = makeEncounter(`Encounter ${encounters.length + 1}`);
    setEncounters(prev => [...prev, enc]);
    setActiveEncounterId(enc.id);
  }

  function renameEncounter(id, name) {
    setEncounters(prev => prev.map(e => e.id === id ? { ...e, name } : e));
  }

  function duplicateEncounter(id) {
    const src = encounters.find(e => e.id === id);
    if (!src) return;
    const copy = {
      ...src,
      id: uid(),
      name: `${src.name} (copy)`,
      entries: src.entries.map(entry => ({ ...entry, id: uid() })),
    };
    setEncounters(prev => [...prev, copy]);
    setActiveEncounterId(copy.id);
  }

  function deleteEncounter(id) {
    if (!confirm('Delete this encounter?')) return;
    setEncounters(prev => {
      const next = prev.filter(e => e.id !== id);
      if (activeEncounterId === id) {
        setActiveEncounterId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }

  // ── Active encounter entries ───────────────────────────────────────────────

  const activeEncounter = encounters.find(e => e.id === activeEncounterId) ?? null;

  function updateEntries(updater) {
    setEncounters(prev => prev.map(e =>
      e.id === activeEncounterId ? { ...e, entries: updater(e.entries) } : e
    ));
  }

  function addMonster(monster) {
    updateEntries(entries => {
      const existing = entries.find(e => e.sourceId === monster.id && e.type === 'monster');
      if (existing) {
        return entries.map(e => e.id === existing.id ? { ...e, count: (e.count || 1) + 1 } : e);
      }
      return [...entries, { id: uid(), sourceId: monster.id, type: 'monster', name: monster.name, count: 1, monster }];
    });
  }

  function addPlayer(player) {
    updateEntries(entries => {
      if (entries.some(e => e.sourceId === player.id && e.type === 'player')) return entries;
      return [...entries, { id: uid(), sourceId: player.id, type: 'player', name: player.name, count: 1, player }];
    });
  }

  function removeEntry(id) {
    updateEntries(entries => entries.filter(e => e.id !== id));
  }

  function changeCount(id, delta) {
    updateEntries(entries =>
      entries
        .map(e => e.id === id ? { ...e, count: Math.max(0, (e.count || 1) + delta) } : e)
        .filter(e => e.count > 0)
    );
  }

  function clearEntries() {
    if (!activeEncounter?.entries?.length) return;
    if (!confirm('Clear all combatants from this encounter?')) return;
    updateEntries(() => []);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const entries        = activeEncounter?.entries ?? [];
  const monsterEntries = entries.filter(e => e.type === 'monster');
  const playerEntries  = entries.filter(e => e.type === 'player');
  const totalXp        = encounterXp(entries);

  const filteredMonsters = monsters.filter(m => {
    if (!m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (!matchesCrFilter(m.cr, filterCr)) return false;
    return true;
  });

  const hasActiveFilters = search !== '' || filterType !== 'all' || filterCr !== 'all';

  return (
    <>
      {/* Monster card preview modal */}
      {previewMonster && (
        <MonsterCard
          monster={previewMonster}
          onClose={() => setPreviewMonster(null)}
          onAdd={activeEncounter ? () => addMonster(previewMonster) : null}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Col 1: Encounter list ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="section-heading" style={{ margin: 0 }}>Encounters</span>
            <button className="btn btn-accent btn-sm" onClick={createEncounter}>+ New</button>
          </div>

          {encounters.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
              No encounters yet. Click + New to create one.
            </div>
          ) : (
            encounters.map(enc => (
              <EncounterItem
                key={enc.id}
                enc={enc}
                active={enc.id === activeEncounterId}
                onSelect={setActiveEncounterId}
                onRename={renameEncounter}
                onDuplicate={duplicateEncounter}
                onDelete={deleteEncounter}
              />
            ))
          )}
        </div>

        {/* ── Col 2: Library picker ── */}
        <div>
          {!activeEncounter ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">⚔️</div>
                Create or select an encounter on the left to start building.
              </div>
            </div>
          ) : (
            <>
              {/* Players section */}
              <div className="section-heading" style={{ marginTop: 0 }}>Party Members</div>
              {players.length === 0 ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>No players in your roster yet.</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onNavigate?.('players')}
                    >
                      Go to Player Roster →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 16 }}>
                  {players.map(p => {
                    const added = entries.some(e => e.sourceId === p.id && e.type === 'player');
                    return (
                      <div className="list-row" key={p.id}>
                        <div className="combatant-dot dot-player" style={{ flexShrink: 0 }} />
                        <div className="list-row-main">
                          <div className="list-row-title">{p.name}</div>
                          <div className="list-row-sub">
                            {[p.class, p.level ? `Level ${p.level}` : null].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={added ? { color: 'var(--text3)', cursor: 'default' } : {}}
                          onClick={() => !added && addPlayer(p)}
                          disabled={added}
                        >
                          {added ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onNavigate?.('players')}
                    >
                      + Create New Player →
                    </button>
                  </div>
                </div>
              )}

              {/* Monster library */}
              <div className="section-heading" style={{ marginTop: 0 }}>Monster Library</div>
              {monsters.length === 0 ? (
                <div className="card">
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>No monsters in your library yet.</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onNavigate?.('monsters')}
                    >
                      Go to Monster Library →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search + filter controls */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <div className="search-bar" style={{ flex: 1 }}>
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search monsters…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>
                      {hasActiveFilters && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent)', flexShrink: 0 }}
                          onClick={() => { setSearch(''); setFilterType('all'); setFilterCr('all'); }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* CR pills */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                      {CR_BRACKETS.map(b => (
                        <FilterPill
                          key={b.value}
                          label={b.label}
                          active={filterCr === b.value}
                          onClick={() => setFilterCr(filterCr === b.value ? 'all' : b.value)}
                        />
                      ))}
                    </div>

                    {/* Type pills */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {allTypes.map(t => (
                        <FilterPill
                          key={t}
                          label={t === 'all' ? 'All Types' : t}
                          active={filterType === t}
                          onClick={() => setFilterType(filterType === t ? 'all' : t)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    {filteredMonsters.length === 0 ? (
                      <div className="empty-state" style={{ padding: 20 }}>No monsters match your filters.</div>
                    ) : (
                      filteredMonsters.map(m => (
                        <div
                          className="list-row"
                          key={m.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setPreviewMonster(m)}
                        >
                          <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                          <div className="list-row-main">
                            <div className="list-row-title">{m.name}</div>
                            <div className="list-row-sub">
                              {m.type || 'Monster'}
                              {m.cr !== undefined && m.cr !== '' ? ` · CR ${crLabel(m.cr)}` : ''}
                              {` · ${m.hp ?? '—'} HP · ${m.ac ?? '—'} AC`}
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); addMonster(m); }}
                          >
                            + Add
                          </button>
                        </div>
                      ))
                    )}
                    {/* Footer: go create a monster */}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onNavigate?.('monsters')}
                      >
                        + Create New Monster →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Col 3: Active encounter summary ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          {activeEncounter && (
            <>
              <div className="section-heading" style={{ marginTop: 0 }}>
                {activeEncounter.name}
                {totalXp > 0 && (
                  <span style={{ float: 'right', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--amber-text)' }}>
                    ~{totalXp.toLocaleString()} XP
                  </span>
                )}
              </div>

              {entries.length === 0 ? (
                <div className="card">
                  <div className="empty-state" style={{ padding: 28 }}>
                    <div className="empty-state-icon">⚔️</div>
                    Add monsters and players from the library.
                  </div>
                </div>
              ) : (
                <div className="card">
                  {playerEntries.map(e => (
                    <div className="list-row" key={e.id}>
                      <div className="combatant-dot dot-player" style={{ flexShrink: 0 }} />
                      <div className="list-row-main">
                        <div className="list-row-title">{e.name}</div>
                        <div className="list-row-sub">Player</div>
                      </div>
                      <button className="btn-icon danger" onClick={() => removeEntry(e.id)} title="Remove">
                        <IconX />
                      </button>
                    </div>
                  ))}

                  {monsterEntries.map(e => (
                    <div className="list-row" key={e.id}>
                      <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                      <div
                        className="list-row-main"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setPreviewMonster(e.monster)}
                      >
                        <div className="list-row-title">{e.name}</div>
                        <div className="list-row-sub">
                          CR {crLabel(e.monster?.cr)} · {e.monster?.hp ?? '—'} HP · {e.monster?.ac ?? '—'} AC
                        </div>
                      </div>
                      <div className="list-row-right">
                        <div className="stepper">
                          <button className="stepper-btn" onClick={() => changeCount(e.id, -1)}>−</button>
                          <span className="stepper-val">{e.count}</span>
                          <button className="stepper-btn" onClick={() => changeCount(e.id, +1)}>+</button>
                        </div>
                      </div>
                      <button className="btn-icon danger" onClick={() => removeEntry(e.id)} title="Remove">
                        <IconX />
                      </button>
                    </div>
                  ))}

                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {entries.length} combatant{entries.length !== 1 ? 's' : ''}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={clearEntries}>
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
