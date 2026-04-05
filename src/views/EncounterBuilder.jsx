import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Swords, ChevronRight, Users, Skull, X } from 'lucide-react'
import Modal from '../components/Modal'
import { uid } from '../utils/helpers'

function EncounterForm({ initial, monsters, players, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [selectedMonsters, setSelectedMonsters] = useState(initial?.monsterSlots || [])
  const [selectedPlayers, setSelectedPlayers] = useState(initial?.playerIds || [])

  const addMonster = (monsterId) => {
    setSelectedMonsters(s => [...s, { id: uid(), monsterId, count: 1 }])
  }

  const removeMonster = (slotId) => {
    setSelectedMonsters(s => s.filter(s2 => s2.id !== slotId))
  }

  const updateCount = (slotId, count) => {
    setSelectedMonsters(s => s.map(slot => slot.id === slotId ? { ...slot, count: Math.max(1, count) } : slot))
  }

  const togglePlayer = (playerId) => {
    setSelectedPlayers(ps =>
      ps.includes(playerId) ? ps.filter(p => p !== playerId) : [...ps, playerId]
    )
  }

  const handleSave = () => {
    if (!name.trim()) { alert('Encounter needs a name!'); return }
    onSave({ name, notes, monsterSlots: selectedMonsters, playerIds: selectedPlayers })
  }

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Encounter Name *</label>
        <input className="form-input" value={name} placeholder="e.g. Ambush at the Crossroads"
          onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 10 }}>Players in Encounter</div>
        {players.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>No players in roster yet.</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {players.map(p => {
            const active = selectedPlayers.includes(p.id)
            return (
              <button key={p.id} onClick={() => togglePlayer(p.id)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid',
                fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
                background: active ? 'var(--blue-bg)' : 'var(--surface)',
                color: active ? 'var(--blue)' : 'var(--text2)',
                borderColor: active ? 'var(--blue)' : 'var(--border2)',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.12s',
              }}>
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 10 }}>Monsters</div>
        {selectedMonsters.map(slot => {
          const m = monsters.find(x => x.id === slot.monsterId)
          if (!m) return null
          return (
            <div key={slot.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: 'var(--surface2)',
              borderRadius: 'var(--radius)', marginBottom: 6,
            }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>CR {m.cr}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--text3)' }}>×</label>
                <input type="number" min={1} value={slot.count}
                  onChange={e => updateCount(slot.id, parseInt(e.target.value) || 1)}
                  style={{
                    width: 48, padding: '4px 6px', border: '1px solid var(--border2)',
                    borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 14,
                    textAlign: 'center', background: 'var(--surface)', color: 'var(--text)',
                    outline: 'none',
                  }} />
              </div>
              <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeMonster(slot.id)}>
                <X size={13} />
              </button>
            </div>
          )
        })}

        {monsters.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>No monsters in library yet.</p>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Add from library:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {monsters.map(m => (
                <button key={m.id} className="btn btn-secondary btn-sm" onClick={() => addMonster(m.id)}>
                  <Plus size={12} /> {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={3} value={notes}
          placeholder="Environment, objectives, DM notes..."
          onChange={e => setNotes(e.target.value)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save Encounter</button>
      </div>
    </div>
  )
}

export default function EncounterBuilder({ encounters, setEncounters, monsters, players, onRunEncounter }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSave = (data) => {
    if (editing) {
      setEncounters(es => es.map(e => e.id === editing.id ? { ...data, id: editing.id } : e))
    } else {
      setEncounters(es => [...es, { ...data, id: uid() }])
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this encounter?')) return
    setEncounters(es => es.filter(e => e.id !== id))
  }

  return (
    <div className="view">
      <div className="page-header">
        <h1 className="page-title">Encounters</h1>
        <p className="page-subtitle">Build and launch encounters for your session.</p>
      </div>

      <div className="action-bar">
        <div />
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={15} /> New Encounter
        </button>
      </div>

      {encounters.length === 0 ? (
        <div className="empty-state">
          <Swords size={48} />
          <p className="empty-state-title">No encounters yet</p>
          <p className="empty-state-subtitle">Build your first encounter to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {encounters.map(enc => {
            const encMonsters = enc.monsterSlots?.flatMap(slot => {
              const m = monsters.find(x => x.id === slot.monsterId)
              return m ? [`${slot.count}× ${m.name}`] : []
            }) || []
            const encPlayers = (enc.playerIds || []).map(pid => players.find(p => p.id === pid)?.name).filter(Boolean)

            return (
              <div key={enc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{enc.name}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                    {encPlayers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                        <Users size={13} />
                        {encPlayers.join(', ')}
                      </div>
                    )}
                    {encMonsters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                        <Skull size={13} />
                        {encMonsters.join(', ')}
                      </div>
                    )}
                  </div>
                  {enc.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{enc.notes}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(enc); setShowForm(true) }}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(enc.id)}>
                    <Trash2 size={13} />
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => onRunEncounter(enc)}>
                    Run <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit — ${editing.name}` : 'New Encounter'}
          onClose={() => { setShowForm(false); setEditing(null) }}
          wide
        >
          <EncounterForm
            initial={editing}
            monsters={monsters}
            players={players}
            onSave={handleSave}
          />
        </Modal>
      )}
    </div>
  )
}
