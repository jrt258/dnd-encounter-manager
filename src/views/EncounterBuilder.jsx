import { useState } from 'react';

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

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDuplicate = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconDelete = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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

  return (
    <div
      onClick={() => !renaming && onSelect(enc.id)}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--accent-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.12s',
        marginBottom: 2,
      }}
    >
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(enc.name); setRenaming(false); } }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', fontSize: 13, fontWeight: 600, padding: '2px 4px' }}
        />
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent-text)' : 'var(--text)', marginBottom: 2 }}>
          {enc.name}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 11, color: active ? 'var(--accent-text)' : 'var(--text3)' }}>
          {monsterCount > 0 ? `${monsterCount} monster${monsterCount !== 1 ? 's' : ''}` : 'empty'}
          {playerCount > 0 ? ` · ${playerCount} player${playerCount !== 1 ? 's' : ''}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
          <button className="btn-icon" title="Rename" onClick={() => { setDraft(enc.name); setRenaming(true); }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="btn-icon" title="Duplicate" onClick={() => onDuplicate(enc.id)}><IconDuplicate /></button>
          <button className="btn-icon danger" title="Delete" onClick={() => onDelete(enc.id)}><IconDelete /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EncounterBuilder ─────────────────────────────────────────────────────

export default function EncounterBuilder({ monsters, players, encounters, setEncounters, activeEncounterId, setActiveEncounterId }) {
  const [search, setSearch] = useState('');

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

  const filteredMonsters = monsters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 300px', gap: 16, alignItems: 'start' }}>

      {/* ── Col 1: Encounter list ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="section-heading" style={{ margin: 0 }}>Encounters</span>
          <button className="btn btn-accent btn-sm" onClick={createEncounter}>+ New</button>
        </div>

        {encounters.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
            No encounters yet.
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
            {/* Players */}
            {players.length > 0 && (
              <>
                <div className="section-heading" style={{ marginTop: 0 }}>Party Members</div>
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
                </div>
              </>
            )}

            {/* Monster library */}
            <div className="section-heading" style={{ marginTop: 0 }}>Monster Library</div>
            {monsters.length === 0 ? (
              <div className="card">
                <div className="empty-state">No monsters in your library yet.</div>
              </div>
            ) : (
              <>
                <div className="search-bar" style={{ marginBottom: 10 }}>
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
                <div className="card">
                  {filteredMonsters.length === 0 ? (
                    <div className="empty-state" style={{ padding: 20 }}>No monsters match your search.</div>
                  ) : (
                    filteredMonsters.map(m => (
                      <div className="list-row" key={m.id}>
                        <div className="combatant-dot dot-monster" style={{ flexShrink: 0 }} />
                        <div className="list-row-main">
                          <div className="list-row-title">{m.name}</div>
                          <div className="list-row-sub">
                            {m.type || 'Monster'}
                            {m.cr !== undefined && m.cr !== '' ? ` · CR ${m.cr}` : ''}
                            {` · ${m.hp ?? '—'} HP · ${m.ac ?? '—'} AC`}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => addMonster(m)}>
                          + Add
                        </button>
                      </div>
                    ))
                  )}
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
                    <div className="list-row-main">
                      <div className="list-row-title">{e.name}</div>
                      <div className="list-row-sub">
                        {e.monster?.hp ?? '—'} HP · {e.monster?.ac ?? '—'} AC
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
  );
}
