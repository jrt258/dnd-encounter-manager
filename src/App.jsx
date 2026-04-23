import { useState, useMemo } from 'react';
import MonsterLibrary from './views/MonsterLibrary';
import PlayerRoster from './views/PlayerRoster';
import EncounterBuilder from './views/EncounterBuilder';
import CombatRunner from './views/CombatRunner';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DEFAULT_MONSTERS } from './defaultMonsters';

const NAV_ITEMS = [
  {
    id: 'monsters',
    label: 'Monster Library',
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
    label: 'Player Roster',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <circle cx="9" cy="7" r="3.5" />
        <path d="M2 20c0-3.5 3-6 7-6" />
        <circle cx="17" cy="7" r="3.5" />
        <path d="M14 14c4 0 8 2.5 8 6" />
      </svg>
    ),
  },
  {
    id: 'encounter',
    label: 'Encounter Builder',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M12 3l1.8 5.5H19l-4.4 3.2 1.7 5.3L12 14l-4.3 3 1.7-5.3L5 8.5h5.2z" />
      </svg>
    ),
  },
  {
    id: 'combat',
    label: 'Combat Runner',
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

  // Monsters: defaults merged with user-created
  const [userMonsters, setUserMonsters] = useLocalStorage('dnd_monsters', []);
  const monsters = useMemo(() => {
    const userIds = new Set(userMonsters.map(m => m.id));
    const freshDefaults = DEFAULT_MONSTERS.filter(d => !userIds.has(d.id));
    return [...freshDefaults, ...userMonsters];
  }, [userMonsters]);
  const setMonsters = setUserMonsters;

  // Players
  const [players, setPlayers] = useLocalStorage('dnd_players', []);

  // Encounters: array of { id, name, entries[] }
  const [encounters, setEncounters]               = useLocalStorage('dnd_encounters', []);
  const [activeEncounterId, setActiveEncounterId] = useLocalStorage('dnd_active_encounter', null);

  // Lifted editing state for header buttons
  const [monsterEditing, setMonsterEditing] = useState(null);
  const [playerEditing, setPlayerEditing]   = useState(null);

  const currentNav = NAV_ITEMS.find(n => n.id === tab);

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="app-title">
            D<span className="app-title-accent">&amp;</span>D
          </div>
          <div className="app-subtitle">Encounter Manager</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {monsters.length} monster{monsters.length !== 1 ? 's' : ''} ·{' '}
          {players.length} player{players.length !== 1 ? 's' : ''} ·{' '}
          {encounters.length} encounter{encounters.length !== 1 ? 's' : ''}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-area">
        <div className="page-header">
          <div className="page-title">{currentNav?.label}</div>
          <div className="page-actions">
            {tab === 'monsters' && (
              <button className="btn btn-accent btn-sm" onClick={() => setMonsterEditing('new')}>
                + Add Monster
              </button>
            )}
            {tab === 'players' && (
              <button className="btn btn-accent btn-sm" onClick={() => setPlayerEditing('new')}>
                + Add Player
              </button>
            )}
          </div>
        </div>

        <div className="page-content">
          {tab === 'monsters' && (
            <MonsterLibrary
              monsters={monsters}
              setMonsters={setMonsters}
              externalEditing={monsterEditing}
              setExternalEditing={setMonsterEditing}
            />
          )}
          {tab === 'players' && (
            <PlayerRoster
              players={players}
              setPlayers={setPlayers}
              externalEditing={playerEditing}
              setExternalEditing={setPlayerEditing}
            />
          )}
          {tab === 'encounter' && (
            <EncounterBuilder
              monsters={monsters}
              players={players}
              encounters={encounters}
              setEncounters={setEncounters}
              activeEncounterId={activeEncounterId}
              setActiveEncounterId={setActiveEncounterId}
              onNavigate={setTab}
            />
          )}
          {tab === 'combat' && (
            <CombatRunner
              encounters={encounters}
            />
          )}
        </div>
      </div>
    </div>
  );
}
