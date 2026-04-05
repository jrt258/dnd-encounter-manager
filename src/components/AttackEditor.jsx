import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { uid } from '../utils/helpers'

const EMPTY_ATTACK = { id: '', name: '', hitBonus: 0, damage: '1d6', damageType: 'slashing', notes: '' }

export default function AttackEditor({ attacks, onChange }) {
  const [expanded, setExpanded] = useState(null)

  const add = () => {
    const a = { ...EMPTY_ATTACK, id: uid() }
    const next = [...attacks, a]
    onChange(next)
    setExpanded(a.id)
  }

  const update = (id, field, val) => {
    onChange(attacks.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  const remove = (id) => {
    onChange(attacks.filter(a => a.id !== id))
    if (expanded === id) setExpanded(null)
  }

  return (
    <div>
      {attacks.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No attacks added yet.</p>
      )}
      {attacks.map(a => (
        <div key={a.id} style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
          overflow: 'hidden',
        }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', cursor: 'pointer',
              background: expanded === a.id ? 'var(--surface2)' : 'var(--surface)',
            }}
            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {a.name || 'Unnamed Attack'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {a.hitBonus >= 0 ? '+' : ''}{a.hitBonus} hit · {a.damage} {a.damageType}
            </span>
            <button className="btn btn-danger btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); remove(a.id) }}>
              <Trash2 size={13} />
            </button>
          </div>
          {expanded === a.id && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group">
                  <label className="form-label">Attack Name</label>
                  <input className="form-input" value={a.name}
                    placeholder="e.g. Shortsword"
                    onChange={e => update(a.id, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hit Bonus</label>
                  <input className="form-input" type="number" value={a.hitBonus}
                    onChange={e => update(a.id, 'hitBonus', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Damage Dice</label>
                  <input className="form-input" value={a.damage}
                    placeholder="e.g. 2d6+3"
                    onChange={e => update(a.id, 'damage', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Damage Type</label>
                  <select className="form-select" value={a.damageType}
                    onChange={e => update(a.id, 'damageType', e.target.value)}>
                    {['slashing','piercing','bludgeoning','fire','cold','lightning',
                      'acid','poison','necrotic','radiant','psychic','thunder','force'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={a.notes}
                  placeholder="Optional — reach, range, special effects..."
                  onChange={e => update(a.id, 'notes', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ marginTop: 4 }}>
        <Plus size={14} /> Add Attack
      </button>
    </div>
  )
}
