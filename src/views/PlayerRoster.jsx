import { useState } from 'react';
import PlayerForm from '../components/PlayerForm';

export default function PlayerRoster({ players, setPlayers }) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  function savePlayer(data) {
    if (editing === 'new') {
      setPlayers(prev => [...prev, { ...data, id: Date.now().toString() }]);
    } else {
      setPlayers(prev => prev.map(p => p.id === editing.id ? { ...editing, ...data } : p));
    }
    setEditing(null);
  }

  function deletePlayer(id) {
    if (!confirm('Remove this player?')) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    if (expanded === id) setExpanded(null);
  }

  return (
    <>
      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-accent" onClick={() => setEditing('new')}>
          + Add Player
        </button>
      </div>

      {players.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🧙</div>
            No players yet. Add your party members.
          </div>
        </div>
      ) : (
        <div className="card">
          {players.map(p => (
            <div key={p.id}>
              <div
                className="list-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <div className="combatant-type-dot dot-player" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{p.name}</div>
                  <div className="list-row-sub">
                    {[p.race, p.class, p.level ? `Level ${p.level}` : null]
                      .filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="list-row-right">
                  <span className="tag tag-blue mono">{p.ac ?? '—'} AC</span>
                  <span className="tag tag-green mono">{p.hp ?? '—'} HP</span>
                  <svg style={{ width: 14, height: 14, color: 'var(--text3)', transform: expanded === p.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {expanded === p.id && (
                <div style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--border)' }}>
                  {/* Ability scores */}
                  {p.abilities && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Ability Scores</div>
                      <div className="ability-grid">
                        {['str','dex','con','int','wis','cha'].map(ab => {
                          const score = p.abilities?.[ab] ?? 10;
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
                    </>
                  )}

                  {/* Spell slots */}
                  {p.spellSlots && Object.values(p.spellSlots).some(v => v > 0) && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Spell Slots</div>
                      <div className="spell-slots-grid">
                        {Object.entries(p.spellSlots).map(([lvl, count]) =>
                          count > 0 ? (
                            <div className="slot-level" key={lvl}>
                              <span className="slot-level-label">{lvl}</span>
                              <div className="slot-pips">
                                {Array.from({ length: count }).map((_, i) => (
                                  <div className="slot-pip" key={i} />
                                ))}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </>
                  )}

                  {/* Extra stats */}
                  {(p.speed || p.passivePerception || p.profBonus) && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Stats</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {p.speed && <span className="tag tag-gray">Speed: {p.speed} ft</span>}
                        {p.passivePerception && <span className="tag tag-gray">Passive Perc: {p.passivePerception}</span>}
                        {p.profBonus && <span className="tag tag-gray">Prof: +{p.profBonus}</span>}
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {p.notes && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Notes</div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{p.notes}</p>
                    </>
                  )}

                  <div className="gap-row" style={{ marginTop: 14 }}>
                    <button className="btn btn-ghost" onClick={() => setEditing(p)}>Edit</button>
                    <button className="btn btn-icon danger" onClick={() => deletePlayer(p.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <PlayerForm
          initial={editing === 'new' ? null : editing}
          onSave={savePlayer}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
