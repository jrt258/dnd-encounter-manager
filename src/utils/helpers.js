export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1
}

export function rollDice(notation) {
  if (!notation) return 0
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
  if (pct > 0.3) return 'var(--amber)'
  return 'var(--accent)'
}

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
export const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

export const DEFAULT_ABILITIES = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

export const EMPTY_MONSTER = {
  name: '',
  type: 'Beast',
  cr: '1',
  hp: 10,
  maxHp: 10,
  ac: 12,
  speed: 30,
  initiativeMod: 0,
  abilities: { ...DEFAULT_ABILITIES },
  attacks: [],
  spells: [],
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
  speed: 30,
  initiativeMod: 0,
  abilities: { ...DEFAULT_ABILITIES },
  attacks: [],
  spells: [],
  spellSlots: {},
  notes: '',
}

export const EMPTY_ATTACK = {
  id: '',
  name: '',
  hitBonus: 0,
  damage: '1d6',
  damageType: 'slashing',
  notes: '',
}

export const EMPTY_SPELL = {
  id: '',
  name: '',
  level: 1,
  school: 'Evocation',
  castingTime: '1 action',
  range: '60 ft',
  components: { v: true, s: true, m: false },
  material: '',
  duration: 'Instantaneous',
  defenseType: 'none',     // 'none' | 'save' | 'attack'
  saveAbility: 'dex',      // which ability for saves
  saveDC: 14,
  attackBonus: 5,
  onSave: 'half damage',
  effect: '',
  concentration: false,
  ritual: false,
  description: '',
}

export const MONSTER_TYPES = [
  'Aberration','Beast','Celestial','Construct','Dragon','Elemental',
  'Fey','Fiend','Giant','Humanoid','Monstrosity','Ooze','Plant','Undead',
]

export const SPELL_SCHOOLS = [
  'Abjuration','Conjuration','Divination','Enchantment',
  'Evocation','Illusion','Necromancy','Transmutation',
]

export const DAMAGE_TYPES = [
  'slashing','piercing','bludgeoning','fire','cold','lightning',
  'acid','poison','necrotic','radiant','psychic','thunder','force',
]

export const CASTING_TIMES = [
  '1 action','1 bonus action','1 reaction','1 minute',
  '10 minutes','1 hour','8 hours','Special',
]

export const SPELL_SLOT_LEVELS = [1,2,3,4,5,6,7,8,9]
