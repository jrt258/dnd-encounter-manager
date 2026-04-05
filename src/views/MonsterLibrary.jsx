import { useState } from 'react';
import MonsterForm from '../components/MonsterForm';
import Modal from '../components/Modal';

const SORT_KEYS = { name: 'name', cr: 'cr', hp: 'hp', ac: 'ac', type: 'type' };

function crNumber(cr) {
  if (cr === undefined || cr === '' || cr === null) return -1;
  if (String(cr) === '0.125') return 0.125;
  if (String(cr) === '0.25')  return 0.25;
  if (String(cr) === '0.5')   return 0.5;
  const n = parseFloat(cr);
  return isNaN(n) ? -1 : n;
}

function crLabel(cr) {
  if (cr === undefined || cr === '' || cr === null) return '—';
  const fracs = { '0.125': '⅛', '0.25': '¼', '0.5': '½' };
  return fracs[String(cr)] ?? String(cr);
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function MonsterLibrary({ monsters, setMonsters, externalEditing, setExternalEditing }) {
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [sortCol, setSortCol]   = useState('name');
  const [sortDir, setSortDir]   = useState('asc');

  // Merge external "new" trigger from App header button
  const effectiveEditing = externalEditing ?? editing;
  const setEffectiveEditing = (val) => {
    if (setExternalEditing) setExternalEditing(val);
    setEditing(val);
  };

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function saveMonster(data) {
    if (effectiveEditing === 'new') {
      setMonsters(prev => [...prev, { ...data, id: Date.now().toString() }]);
    } else {
      setMonsters(prev => prev.map(m => m.id === effectiveEditing.id ? { ...effectiveEditing, ...data } : m));
    }
    setEffectiveEditing(null);
  }

  function deleteMonster(id) {
    if (!confirm('Delete this monster?')) return;
    setMonsters(prev => prev.filter(m => m.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const filtered = monsters
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va, vb;
      if (sortCol === 'cr')   { va = crNumber(a.cr); vb = crNumber(b.cr); }
      else if (sortCol === 'hp' || sortCol === 'ac') { va = a[sortCol] ?? 0; vb = b[sortCol] ?? 0; }
      else { va = (a[sortCol] ?? '').toLowerCase(); vb = (b[sortCol] ?? '').toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

  return (
    <>
      {/* Toolbar */}
      <div className="gap-row" style={{ marginBottom: 14 }}>
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
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} of {monsters.length}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🐉</div>
            {monsters.length === 0 ? 'No monsters yet. Add one to get started.' : 'No monsters match your search.'}
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortCol === 'name' ? 'sorted' : ''}>
                  Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('type')} className={sortCol === 'type' ? 'sorted' : ''}>
                  Type <SortIcon col="type" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th onClick={() => handleSort('cr')} className={sortCol === 'cr' ? 'sorted' : ''} style={{ textAlign: 'center' }}>
                  CR <SortIcon col="cr" sortCol={sortCol} sortDir={sortDir} />
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
              {filtered.map(m => (
                <>
                  <tr
                    key={m.id}
                    className={expanded === m.id ? 'expanded-row' : ''}
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  >
                    <td>
                      <div className="table-name">{m.name}</div>
                      {m.size && <div className="table-sub">{m.size}</div>}
                    </td>
                    <td>
                      <span className="tag tag-gray">{m.type || 'Monster'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="table-mono">{crLabel(m.cr)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tag tag-red mono">{m.hp ?? '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tag tag-gray mono">{m.ac ?? '—'}</span>
                    </td>
                    <td>
                      <div className="table-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon" title="Edit" onClick={() => setEffectiveEditing(m)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Delete" onClick={() => deleteMonster(m.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                        <svg
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: 'var(--text3)', transform: expanded === m.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expanded === m.id && (
                    <tr className="table-expand-row" key={`${m.id}-expand`}>
                      <td colSpan={6}>
                        <div className="table-expand-content">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                            {/* Ability scores */}
                            {m.abilities && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Ability Scores</div>
                                <div className="ability-grid">
                                  {['str','dex','con','int','wis','cha'].map(ab => {
                                    const score = m.abilities?.[ab] ?? 10;
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

                            {/* Attacks */}
                            {m.attacks?.length > 0 && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Attacks</div>
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                  {m.attacks.map((atk, i) => (
                                    <div className="attack-row" key={i}>
                                      <span className="attack-name">{atk.name}</span>
                                      {atk.toHit !== undefined && <span className="attack-stat">+{atk.toHit} to hit</span>}
                                      {atk.damage && <span className="attack-stat">{atk.damage}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Spell slots */}
                            {m.spellSlots && Object.values(m.spellSlots).some(v => v > 0) && (
                              <div>
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

                            {/* Notes */}
                            {m.notes && (
                              <div>
                                <div className="section-heading" style={{ marginTop: 0 }}>Notes</div>
                                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{m.notes}</p>
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

      {/* Form modal */}
      {effectiveEditing !== null && (
        <Modal
          title={effectiveEditing === 'new' ? 'New Monster' : `Edit ${effectiveEditing.name}`}
          onClose={() => setEffectiveEditing(null)}
        >
          <MonsterForm
            initial={effectiveEditing === 'new' ? null : effectiveEditing}
            onSave={saveMonster}
            onClose={() => setEffectiveEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
