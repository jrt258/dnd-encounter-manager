import { useState } from 'react';
import MonsterLibrary from './views/MonsterLibrary';
import PlayerRoster from './views/PlayerRoster';
import EncounterBuilder from './views/EncounterBuilder';
import CombatRunner from './views/CombatRunner';
import { useLocalStorage } from './hooks/useLocalStorage';

const NAV_ITEMS = [
  {
    id: 'monsters',
    label: 'Monsters',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M12 2C7 2 3 6 3 11c0 3 1.5 5.5 4 7l-1 2h12l-1-2c2.5-1.5 4-4 4-7 0-5-4-9-9-9z" />
        <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
        <path d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5" />
      </svg>
    ),
  },
  {
    id: 'players',
    label: 'Players',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    id: 'encounter',
    label: 'Encounter',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M12 3l1.8 5.5H19l-4.4 3.2 1.7 5.3L12 14l-4.3 3 1.7-5.3L5 8.5h5.2z" />
      </svg>
    ),
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M14.5 2.5L21 9l-9 4-7.5-7.5 10-3z" />
        <path d="M3 21l6-6" />
        <path d="M16 14l5 5" />
        <path d="M14 16l4 4" />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState('monsters');

  const [monsters, setMonsters] = useLocalStorage('dnd_monsters', []);
  const [players, setPlayers] = useLocalStorage('dnd_players', []);
  const [encounter, setEncounter] = useLocalStorage('dnd_encounter', []);

  const tabLabel = NAV_ITEMS.find(n => n.id === tab)?.label ?? '';

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <span className="app-title">
          D<span className="app-title-accent">&amp;</span>D
        </span>
        <span className="header-badge">{tabLabel}</span>
      </header>

      {/* ── Page content ── */}
      <main className="main-content">
        {tab === 'monsters' && (
          <MonsterLibrary monsters={monsters} setMonsters={setMonsters} />
        )}
        {tab === 'players' && (
          <PlayerRoster players={players} setPlayers={setPlayers} />
        )}
        {tab === 'encounter' && (
          <EncounterBuilder
            monsters={monsters}
            players={players}
            encounter={encounter}
            setEncounter={setEncounter}
          />
        )}
        {tab === 'combat' && (
          <CombatRunner
            encounter={encounter}
            setEncounter={setEncounter}
            players={players}
          />
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-btn${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
