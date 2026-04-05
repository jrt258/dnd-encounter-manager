import { useState } from 'react';

export default function EncounterBuilder({ monsters, players, encounter, setEncounter }) {
  const [search, setSearch] = useState('');

  const inEncounter = id => encounter.some(e => e.sourceId === id && e.type === 'monster');

  function addMonster(monster) {
    const existing = encounter.find(e => e.sourceId === monster.id && e.type === 'monster');
    if (existing) {
      setEncounter(prev =>
        prev.map(e => e.id === existing.id ? { ...e, count: (e.count || 1) + 1 } : e)
      );
    } else {
      setEncounter(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sourceId: monster.id,
          type: 'monster',
          name: monster.name,
          count: 1,
          monster,
        },
      ]);
    }
  }

  function addPlayer(player) {
    if (encounter.some(e => e.sourceId === player.id && e.type === 'player')) return;
    setEncounter(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sourceId: player.id,
        type: 'player',
        name: player.name,
        count: 1,
        player,
      },
    ]);
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

  return (
    <>
      {/* ── Current encounter ── */}
      <div className="section-heading" style={{ marginTop: 0 }}>
        Current Encounter
      </div>

      {encounter.length === 0 ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="empty-state">
            <div className="empty-state-icon">⚔️</div>
            Add monsters and players below to build your encounter.
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          {/* Players */}
          {playerEntries.map(e => (
            <div className="list-row" key={e.id}>
              <div className="combatant-type-dot dot-player" style={{ flexShrink: 0 }} />
              <div className="list-row-main">
                <div className="list-row-title">{e.name}</div>
                <div className="list-row-sub">Player</div>
              </div>
              <button className="btn btn-icon danger" onClick={() => removeEntry(e.id)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          {/* Monsters */}
          {monsterEntries.map(e => (
            <div className="list-row" key={e.id}>
              <div className="combatant-type-dot dot-monster" style={{ flexShrink: 0 }} />
              <div className="list-row-main">
                <div className="list-row-title">{e.name}</div>
                <div className="list-row-sub">
                  Monster · {e.monster?.hp ?? '—'} HP · {e.monster?.ac ?? '—'} AC
                </div>
              </div>
              <div className="list-row-right">
                {/* Count stepper */}
                <div className="stepper">
                  <button className="stepper-btn" onClick={() => changeCount(e.id, -1)}>−</button>
                  <span className="stepper-val">{e.count}</span>
                  <button className="stepper-btn" onClick={() => changeCount(e.id, +1)}>+</button>
                </div>
              </div>
              <button className="btn btn-icon danger" onClick={() => removeEntry(e.id)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          {/* Clear */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" style={{ color: 'var(--accent)' }} onClick={clearEncounter}>
              Clear encounter
            </button>
          </div>
        </div>
      )}

      {/* ── Add players ── */}
      {players.length > 0 && (
        <>
          <div className="section-heading">Party Members</div>
          <div className="card" style={{ marginBottom: 20 }}>
            {players.map(p => {
              const added = encounter.some(e => e.sourceId === p.id && e.type === 'player');
              return (
                <div className="list-row" key={p.id}>
                  <div className="combatant-type-dot dot-player" style={{ flexShrink: 0 }} />
                  <div className="list-row-main">
                    <div className="list-row-title">{p.name}</div>
                    <div className="list-row-sub">
                      {[p.class, p.level ? `Level ${p.level}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    className={`btn btn-ghost${added ? '' : ''}`}
                    style={added ? { color: 'var(--text3)', cursor: 'default' } : {}}
                    onClick={() => !added && addPlayer(p)}
                    disabled={added}
                  >
                    {added ? 'Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Add monsters ── */}
      <div className="section-heading">Monster Library</div>

      {monsters.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            No monsters in your library yet.
          </div>
        </div>
      ) : (
        <>
          <div className="search-bar">
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
              <div className="empty-state">No monsters match your search.</div>
            ) : (
              filteredMonsters.map(m => (
                <div className="list-row" key={m.id}>
                  <div className="combatant-type-dot dot-monster" style={{ flexShrink: 0 }} />
                  <div className="list-row-main">
                    <div className="list-row-title">{m.name}</div>
                    <div className="list-row-sub">
                      {m.type || 'Monster'} · {m.hp ?? '—'} HP · {m.ac ?? '—'} AC
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => addMonster(m)}>
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}
