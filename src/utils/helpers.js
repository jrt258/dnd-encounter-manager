export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1
}

export function rollDice(notation) {
  // supports "2d6+3", "1d8", "d4", etc.
  const match = notation.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return 0
  const count = parseInt(match[1] || '1')
  const sides = parseInt(match[2])
  const mod   = parseInt(match[3] || '0')
  let total = mod
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1
  return Math.max(0, total)
}

export function abilityMod(score) {
  return Math.floor((score - 10) / 2)
}

export function modStr(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function hpColor(current, max) {
  const pct = max > 0 ? current / max : 0
  if (pct > 0.6) return 'var(--green)'
  if (pct > 0.3) return 'var(--gold)'
  return 'var(--accent)'
}

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

export const ABILITY_KEYS = ['STR','DEX','CON','INT','WIS','CHA']

export const DEFAULT_ABILITIES = { STR:10, DEX:10, CON:10, INT:10, WIS:10, CHA:10 }

export const EMPTY_MONSTER = {
  name: '',
  type: 'Beast',
  cr: '1',
  hp: 10,
  maxHp: 10,
  ac: 12,
  initiativeMod: 0,
  abilities: { ...DEFAULT_ABILITIES },
  attacks: [],
  spellSlots: {},
  notes: '',
}

export const EMPTY_PLAYER = {
  name: '',
  playerName: '',
  race: '',
  class: '',
  level: 1,
  hp: 20,
  maxHp: 20,
  ac: 14,
  initiativeMod: 0,
  abilities: { ...DEFAULT_ABILITIES },
  spellSlots: {},
  notes: '',
}

export const MONSTER_TYPES = [
  'Aberration','Beast','Celestial','Construct','Dragon','Elemental',
  'Fey','Fiend','Giant','Humanoid','Monstrosity','Ooze','Plant','Undead',
]

export const SPELL_SLOT_LEVELS = [1,2,3,4,5,6,7,8,9]
