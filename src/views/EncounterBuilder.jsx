import { useState } from 'react';

export default function EncounterBuilder({ monsters, players, encounter, setEncounter }) {
  const [search, setSearch] = useState('');

  function addMonster(monster) {
    const existing = encounter.find(e => e.sourceId === monster.id && e.type === 'monster');
    if (existing) {
      setEncounter(prev => prev.map(e => e.id === existing.id ? { ...e, count: (e.count || 1) + 1 } : e));
    } else {
      setEncounter(prev => [...prev, {
        id: Date.now().toString(),
        sourceId: monster.id,
        type: 'monster',
        name: monster.name,
        count: 1,
        monster,
      }]);
    }
  }

  function addPlayer(player) {
    if (encounter.some(e => e.sourceId === player.id && e.type === 'player')) return;
    setEncounter(prev => [...prev, {
      id: Date.now().toString(),
      sourceId: player.id,
      type: 'player',
      name: player.name,
      count: 1,
      player,
    }]);
  }

  function removeEntry(id) {
    setEncounter(prev => prev.filter(e => e.id !== id));
  }

  function changeCount(id, delta) {
    setEncounter(prev =>
      prev
        .map(e => e.id === id ? { ...e, count: Math.max(0, (e.count || 1) + delta) } : e)
        .filter(e => e.count > 0)
    );
  }

  function clearEncounter() {
    if (!encounter.length) return;
    if (!confirm('Clear the entire encounter?')) return;
    setEncounter([]);
  }

  const filteredMonsters = monsters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const monsterEntries = encounter.filter(e => e.type === 'monster');
  const playerEntries  = encounter.filter(e => e.type === 'player');

  // XP estimate (rough)
  const totalXp = monsterEntries.reduce((sum, e) => {
    const crXp = { '0': 10, '0.125': 25, '0.25': 50, '0.5': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900 };
    const cr   = String(e.monster?.cr ?? 0);
    return sum + ((crXp[cr] ?? 0) * (e.count || 1));
  }, 0);

  return (
    <div className="encounter-layout">

      {/* ── Left: library to pick from ── */}
      <div>
        {/* Players */}
        {players.length > 0 && (
          <>
            <div className="section-heading" style={{ marginTop: 0 }}>Party Members</div>
            <div className="card" style={{ marginBottom: 16 }}>
              {players.map(p => {
                const added = encounter.some(e => e.sourceId === p.id && e.type === 'player');
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
        <div className="section-heading" style={{ marginTop: players.length > 0 ? 0 : 0 }}>Monster Library</div>

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
      </div>

      {/* ── Right: current encounter (sticky) ── */}
      <div style={{ position: 'sticky', top: 20 }}>
        <div className="section-heading" style={{ marginTop: 0 }}>
          Current Encounter
          {totalXp > 0 && (
            <span style={{ float: 'right', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--amber-text)' }}>
              ~{totalXp.toLocaleString()} XP
            </span>
          )}
        </div>

        {encounter.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 28 }}>
              <div className="empty-state-icon">⚔️</div>
              Add monsters and players to build your encounter.
            </div>
          </div>
        ) : (
          <div className="card">
            {/* Players */}
            {playerEntries.map(e => (
              <div className="list-row" key={e.id}>
                <div className="combatant-dot dot-player" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{e.name}</div>
                  <div className="list-row-sub">Player</div>
                </div>
                <button className="btn-icon danger" onClick={() => removeEntry(e.id)} title="Remove">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Monsters */}
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Summary + clear */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {encounter.length} combatant{encounter.length !== 1 ? 's' : ''}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={clearEncounter}>
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
