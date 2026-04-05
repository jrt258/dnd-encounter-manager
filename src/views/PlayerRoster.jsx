import { useState } from 'react';
import PlayerForm from '../components/PlayerForm';
import Modal from '../components/Modal';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function PlayerRoster({ players, setPlayers, externalEditing, setExternalEditing }) {
  const [editing, setEditing]   = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [sortCol, setSortCol]   = useState('name');
  const [sortDir, setSortDir]   = useState('asc');

  const effectiveEditing     = externalEditing ?? editing;
  const setEffectiveEditing  = (val) => {
    if (setExternalEditing) setExternalEditing(val);
    setEditing(val);
  };

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function savePlayer(data) {
    if (effectiveEditing === 'new') {
      setPlayers(prev => [...prev, { ...data, id: Date.now().toString() }]);
    } else {
      setPlayers(prev => prev.map(p => p.id === effectiveEditing.id ? { ...effectiveEditing, ...data } : p));
    }
    setEffectiveEditing(null);
  }

  function deletePlayer(id) {
    if (!confirm('Remove this player?')) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const sorted = [...players].sort((a, b) => {
    let va, vb;
    if (sortCol === 'hp' || sortCol === 'ac' || sortCol === 'level') {
      va = a[sortCol] ?? 0; vb = b[sortCol] ?? 0;
    } else {
      va = (a[sortCol] ?? '').toLowerCase(); vb = (b[sortCol] ?? '').toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  return (
    <>
      {players.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🧙</div>
            No players yet. Add your party members using the button above.
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortCol === 'name' ? 'sorted' : ''}>
                  Character <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('class')} className={sortCol === 'class' ? 'sorted' : ''}>
                  Class <SortIcon col="class" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('level')} className={sortCol === 'level' ? 'sorted' : ''} style={{ textAlign: 'center' }}>
                  Lvl <SortIcon col="level" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('hp')} className={sortCol === 'hp' ? 'sorted' : ''} style={{ textAlign: 'center' }}>
                  HP <SortIcon col="hp" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('ac')} className={sortCol === 'ac' ? 'sorted' : ''} style={{ textAlign: 'center' }}>
                  AC <SortIcon col="ac" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <>
                  <tr
                    key={p.id}
                    className={expanded === p.id ? 'expanded-row' : ''}
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <td>
                      <div className="table-name">{p.name}</div>
                      {(p.race || p.playerName) && (
                        <div className="table-sub">
                          {[p.race, p.playerName ? `Player: ${p.playerName}` : null].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {p.class ? <span className="tag tag-blue">{p.class}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="table-mono">{p.level ?? '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tag tag-green mono">{p.hp ?? '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tag tag-gray mono">{p.ac ?? '—'}</span>
                    </td>
                    <td>
                      <div className="table-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon" title="Edit" onClick={() => setEffectiveEditing(p)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Remove" onClick={() => deletePlayer(p.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                        <svg
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: 'var(--text3)', transform: expanded === p.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expanded === p.id && (
                    <tr className="table-expand-row" key={`${p.id}-expand`}>
                      <td colSpan={6}>
                        <div className="table-expand-content">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                            {/* Ability scores */}
                            {p.abilities && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Ability Scores</div>
                                <div className="ability-grid">
                                  {['str','dex','con','int','wis','cha'].map(ab => {
                                    const score = p.abilities?.[ab] ?? 10;
                                    const mod   = Math.floor((score - 10) / 2);
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

                            {/* Extra stats */}
                            <div>
                              <div className="section-heading" style={{ marginTop: 0 }}>Stats</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {p.speed            && <span className="tag tag-gray">Speed: {p.speed} ft</span>}
                                {p.passivePerception && <span className="tag tag-gray">Passive Perc: {p.passivePerception}</span>}
                                {p.profBonus        && <span className="tag tag-gray">Prof: +{p.profBonus}</span>}
                              </div>
                            </div>

                            {/* Spell slots */}
                            {p.spellSlots && Object.values(p.spellSlots).some(v => v > 0) && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Spell Slots</div>
                                <div className="spell-slots-grid">
                                  {Object.entries(p.spellSlots).map(([lvl, count]) =>
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

                            {/* Notes */}
                            {p.notes && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Notes</div>
                                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{p.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {effectiveEditing !== null && (
        <Modal
          title={effectiveEditing === 'new' ? 'New Character' : `Edit ${effectiveEditing.name}`}
          onClose={() => setEffectiveEditing(null)}
        >
          <PlayerForm
            initial={effectiveEditing === 'new' ? null : effectiveEditing}
            onSave={savePlayer}
            onClose={() => setEffectiveEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
