import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Users, Search } from 'lucide-react'
import Modal from '../components/Modal'
import PlayerForm from '../components/PlayerForm'
import SpellSlots from '../components/SpellSlots'
import { uid, modStr } from '../utils/helpers'

export default function PlayerRoster({ players, setPlayers }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.class?.toLowerCase().includes(search.toLowerCase()) ||
    p.playerName?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (data) => {
    if (editing) {
      setPlayers(ps => ps.map(p => p.id === editing.id ? { ...data, id: editing.id } : p))
    } else {
      setPlayers(ps => [...ps, { ...data, id: uid() }])
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Remove this character from the roster?')) return
    setPlayers(ps => ps.filter(p => p.id !== id))
  }

  const openEdit = (p) => { setEditing(p); setShowForm(true) }

  return (
    <div className="view">
      <div className="page-header">
        <h1 className="page-title">Player Roster</h1>
        <p className="page-subtitle">Your recurring adventuring party.</p>
      </div>

      <div className="action-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Search characters..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={15} /> New Character
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p className="empty-state-title">{search ? 'No characters match' : 'No characters yet'}</p>
          <p className="empty-state-subtitle">
            {search ? 'Try a different search.' : 'Add your party members to get started.'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(p => (
            <div key={p.id} className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{p.name}</div>
                  <div className="card-subtitle">
                    {[p.race, p.class, p.level ? `Level ${p.level}` : null].filter(Boolean).join(' · ')}
                    {p.playerName && <span style={{ color: 'var(--text3)' }}> — {p.playerName}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-chip">
                  <span className="stat-chip-label">HP</span>
                  <span className="stat-chip-value">{p.hp}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">AC</span>
                  <span className="stat-chip-value">{p.ac}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">Init</span>
                  <span className="stat-chip-value">{modStr(p.initiativeMod)}</span>
                </div>
                {Object.entries(p.abilities || {}).slice(0,3).map(([k,v]) => (
                  <div key={k} className="stat-chip">
                    <span className="stat-chip-label">{k}</span>
                    <span className="stat-chip-value">{v}</span>
                  </div>
                ))}
              </div>

              {Object.keys(p.spellSlots || {}).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="section-label">Spell Slots</div>
                  <SpellSlots slots={p.spellSlots} readOnly />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit — ${editing.name}` : 'New Character'}
          onClose={() => { setShowForm(false); setEditing(null) }}
          wide
        >
          <PlayerForm initial={editing || {}} onSave={handleSave} />
        </Modal>
      )}
    </div>
  )
}
