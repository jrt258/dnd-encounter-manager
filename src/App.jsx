import React, { useState } from 'react'
import { Skull, Users, Swords, Sword } from 'lucide-react'
import { useLocalStorage } from './hooks/useLocalStorage'
import MonsterLibrary from './views/MonsterLibrary'
import PlayerRoster from './views/PlayerRoster'
import EncounterBuilder from './views/EncounterBuilder'
import CombatRunner from './views/CombatRunner'

const NAV = [
  { id: 'monsters',   label: 'Monster Library', icon: Skull,  section: 'Library' },
  { id: 'players',    label: 'Player Roster',   icon: Users,  section: 'Library' },
  { id: 'encounters', label: 'Encounters',       icon: Swords, section: 'Play' },
]

export default function App() {
  const [view, setView] = useState('monsters')
  const [monsters, setMonsters]     = useLocalStorage('dnd_monsters', [])
  const [players, setPlayers]       = useLocalStorage('dnd_players', [])
  const [encounters, setEncounters] = useLocalStorage('dnd_encounters', [])
  const [activeEncounter, setActiveEncounter] = useState(null)

  const handleRunEncounter = (enc) => {
    setActiveEncounter(enc)
    setView('combat')
  }

  const handleExitCombat = () => {
    setActiveEncounter(null)
    setView('encounters')
  }

  const sections = [...new Set(NAV.map(n => n.section))]

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">⚔ Encounter</div>
          <div className="sidebar-subtitle">D&D Combat Manager</div>
        </div>
        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {NAV.filter(n => n.section === section).map(item => {
                const Icon = item.icon
                const isActive = view === item.id
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setView(item.id); setActiveEncounter(null) }}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}

          {view === 'combat' && activeEncounter && (
            <div className="nav-section">
              <div className="nav-section-label">Active</div>
              <div className="nav-item active">
                <Sword size={16} />
                {activeEncounter.name}
              </div>
            </div>
          )}
        </nav>

        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            Data stored locally on this device.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {monsters.length} monsters · {players.length} players · {encounters.length} encounters
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {view === 'monsters' && (
          <MonsterLibrary monsters={monsters} setMonsters={setMonsters} />
        )}
        {view === 'players' && (
          <PlayerRoster players={players} setPlayers={setPlayers} />
        )}
        {view === 'encounters' && (
          <EncounterBuilder
            encounters={encounters}
            setEncounters={setEncounters}
            monsters={monsters}
            players={players}
            onRunEncounter={handleRunEncounter}
          />
        )}
        {view === 'combat' && activeEncounter && (
          <CombatRunner
            encounter={activeEncounter}
            monsters={monsters}
            players={players}
            onExit={handleExitCombat}
          />
        )}
      </main>
    </div>
  )
}
