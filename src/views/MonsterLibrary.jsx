import { useState } from 'react';
import MonsterForm from '../components/MonsterForm';

export default function MonsterLibrary({ monsters, setMonsters }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // null | 'new' | monster object
  const [expanded, setExpanded] = useState(null);

  const filtered = monsters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  function saveMonster(data) {
    if (editing === 'new') {
      setMonsters(prev => [...prev, { ...data, id: Date.now().toString() }]);
    } else {
      setMonsters(prev => prev.map(m => m.id === editing.id ? { ...editing, ...data } : m));
    }
    setEditing(null);
  }

  function deleteMonster(id) {
    if (!confirm('Delete this monster?')) return;
    setMonsters(prev => prev.filter(m => m.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const crLabel = cr => {
    if (cr === undefined || cr === '') return '—';
    const fracs = { '0.125': '⅛', '0.25': '¼', '0.5': '½' };
    return fracs[String(cr)] ?? String(cr);
  };

  return (
    <>
      {/* Search + Add */}
      <div className="gap-row" style={{ marginBottom: 12 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
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
        <button className="btn btn-accent" onClick={() => setEditing('new')}>
          + Add
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🐉</div>
            {monsters.length === 0
              ? 'No monsters yet. Add one to get started.'
              : 'No monsters match your search.'}
          </div>
        </div>
      ) : (
        <div className="card">
          {filtered.map(m => (
            <div key={m.id}>
              <div
                className="list-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <div className="combatant-type-dot dot-monster" style={{ flexShrink: 0 }} />
                <div className="list-row-main">
                  <div className="list-row-title">{m.name}</div>
                  <div className="list-row-sub">
                    {m.type || 'Monster'}{m.size ? ` · ${m.size}` : ''}
                    {m.cr !== undefined && m.cr !== '' ? ` · CR ${crLabel(m.cr)}` : ''}
                  </div>
                </div>
                <div className="list-row-right">
                  <span className="tag tag-gray mono">{m.ac ?? '—'} AC</span>
                  <span className="tag tag-red mono">{m.hp ?? '—'} HP</span>
                  <svg style={{ width: 14, height: 14, color: 'var(--text3)', transform: expanded === m.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {expanded === m.id && (
                <div style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--border)' }}>
                  {/* Ability scores */}
                  {m.abilities && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Ability Scores</div>
                      <div className="ability-grid">
                        {['str','dex','con','int','wis','cha'].map(ab => {
                          const score = m.abilities?.[ab] ?? 10;
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

                  {/* Attacks */}
                  {m.attacks?.length > 0 && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Attacks</div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        {m.attacks.map((atk, i) => (
                          <div className="attack-row" key={i}>
                            <span className="attack-name">{atk.name}</span>
                            {atk.toHit !== undefined && <span className="attack-stat">+{atk.toHit} to hit</span>}
                            {atk.damage && <span className="attack-stat">{atk.damage}</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Spell slots */}
                  {m.spellSlots && Object.values(m.spellSlots).some(v => v > 0) && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Spell Slots</div>
                      <div className="spell-slots-grid">
                        {Object.entries(m.spellSlots).map(([lvl, count]) =>
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

                  {/* Notes */}
                  {m.notes && (
                    <>
                      <div className="section-heading" style={{ marginTop: 12 }}>Notes</div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{m.notes}</p>
                    </>
                  )}

                  {/* Actions */}
                  <div className="gap-row" style={{ marginTop: 14 }}>
                    <button className="btn btn-ghost" onClick={() => setEditing(m)}>Edit</button>
                    <button className="btn btn-icon danger" onClick={() => deleteMonster(m.id)}>
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

      {/* Form modal */}
      {editing !== null && (
        <MonsterForm
          initial={editing === 'new' ? null : editing}
          onSave={saveMonster}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
