import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Skull, Search } from 'lucide-react'
import Modal from '../components/Modal'
import MonsterForm from '../components/MonsterForm'
import { uid, modStr, abilityMod } from '../utils/helpers'

export default function MonsterLibrary({ monsters, setMonsters }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = monsters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.type?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (data) => {
    if (editing) {
      setMonsters(ms => ms.map(m => m.id === editing.id ? { ...data, id: editing.id } : m))
    } else {
      setMonsters(ms => [...ms, { ...data, id: uid() }])
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this monster template?')) return
    setMonsters(ms => ms.filter(m => m.id !== id))
  }

  const openEdit = (m) => { setEditing(m); setShowForm(true) }

  return (
    <div className="view">
      <div className="page-header">
        <h1 className="page-title">Monster Library</h1>
        <p className="page-subtitle">Reusable monster templates for your encounters.</p>
      </div>

      <div className="action-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Search monsters..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={15} /> New Monster
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Skull size={48} />
          <p className="empty-state-title">{search ? 'No monsters match' : 'No monsters yet'}</p>
          <p className="empty-state-subtitle">
            {search ? 'Try a different search.' : 'Create a monster template to get started.'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(m => (
            <div key={m.id} className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{m.name}</div>
                  <div className="card-subtitle">
                    CR {m.cr} · {m.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}><Edit2 size={13} /></button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(m.id)}><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-chip">
                  <span className="stat-chip-label">HP</span>
                  <span className="stat-chip-value">{m.hp}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">AC</span>
                  <span className="stat-chip-value">{m.ac}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">Init</span>
                  <span className="stat-chip-value">{modStr(m.initiativeMod)}</span>
                </div>
                {Object.entries(m.abilities || {}).slice(0,3).map(([k,v]) => (
                  <div key={k} className="stat-chip">
                    <span className="stat-chip-label">{k}</span>
                    <span className="stat-chip-value">{v}</span>
                  </div>
                ))}
              </div>

              {m.attacks?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="section-label">Attacks</div>
                  {m.attacks.map(a => (
                    <div key={a.id} style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', gap: 6, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {a.hitBonus >= 0 ? '+' : ''}{a.hitBonus} · {a.damage}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(m.spellSlots || {}).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="section-label">Spell Slots</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(m.spellSlots).filter(([,v]) => v > 0).map(([l, v]) => (
                      <span key={l} className="badge badge-purple">L{l}: {v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit — ${editing.name}` : 'New Monster Template'}
          onClose={() => { setShowForm(false); setEditing(null) }}
          wide
        >
          <MonsterForm initial={editing || {}} onSave={handleSave} />
        </Modal>
      )}
    </div>
  )
}
