export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1
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
export const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

export const DEFAULT_ABILITIES = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

// ─── Monster spellcasting ─────────────────────────────────────────────────────
// Monster stat blocks don't use spell slots or spell levels. A monster has one
// Spellcasting entry (ability + save DC + optional attack bonus) and each spell
// is either At Will or usable N times per day, cast as an action, bonus action
// or reaction. "2/Day Each" means every spell in that group has its own 2 uses.

export const SPELLCASTING_ABILITIES = ['int', 'wis', 'cha']

export const EMPTY_SPELLCASTING = {
  ability: 'cha',
  saveDC: 13,
  attackBonus: null, // null = use the standard value, save DC − 8
  note: '',
}

export const SPELL_ACTION_TYPES = [
  { id: 'action',   label: 'Action',       short: 'Action'   },
  { id: 'bonus',    label: 'Bonus Action', short: 'Bonus'    },
  { id: 'reaction', label: 'Reaction',     short: 'Reaction' },
]

export const EMPTY_MONSTER_SPELL = {
  id: '',
  name: '',
  frequency: 'atWill',   // 'atWill' | 'perDay'
  usesPerDay: 1,
  actionType: 'action',  // 'action' | 'bonus' | 'reaction'
  castLevel: null,       // optional, e.g. a level 4 version of Fireball
  defenseType: 'none',   // 'none' | 'save' | 'attack'
  saveAbility: 'dex',
  onSave: '',
  effect: '',
  range: '',
  duration: '',
  concentration: false,
  description: '',
}

// Spell attack bonus from the spellcasting block (save DC − 8 unless overridden).
export function spellAttackBonus(spellcasting) {
  if (!spellcasting) return 0
  const override = spellcasting.attackBonus
  if (override !== null && override !== undefined && override !== '') return Number(override)
  return (Number(spellcasting.saveDC) || 0) - 8
}

// "Charisma · Save DC 15 · +7 to hit"
export function spellcastingSummary(spellcasting) {
  if (!spellcasting) return ''
  const ability = ABILITY_NAMES[spellcasting.ability] ?? spellcasting.ability
  return `${ability} · Save DC ${spellcasting.saveDC} · ${modStr(spellAttackBonus(spellcasting))} to hit`
}

export function isLimitedSpell(spell) {
  return spell?.frequency === 'perDay' && (spell.usesPerDay ?? 0) > 0
}

// "At Will" | "2/Day"
export function spellFrequencyLabel(spell) {
  return isLimitedSpell(spell) ? `${spell.usesPerDay}/Day` : 'At Will'
}

// "DEX save DC 15 · half damage on save" | "+7 to hit" | ''
export function spellDefenseLine(spell, spellcasting) {
  if (spell.defenseType === 'save') {
    const ab = ABILITY_LABELS[spell.saveAbility] ?? spell.saveAbility
    return `${ab} save DC ${spellcasting?.saveDC ?? '?'}${spell.onSave ? ` · ${spell.onSave} on save` : ''}`
  }
  if (spell.defenseType === 'attack') {
    return `${modStr(spellAttackBonus(spellcasting))} to hit`
  }
  return ''
}

// Groups spells the way a stat block prints them: At Will first, then the
// highest per-day count down to 1/Day. Names sorted inside each group.
export function groupSpellsByFrequency(spells = []) {
  const groups = new Map()
  for (const sp of spells) {
    const key = isLimitedSpell(sp) ? sp.usesPerDay : 0
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(sp)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === 0) return -1
      if (b === 0) return 1
      return b - a
    })
    .map(([key, list]) => ({
      key: String(key),
      label: key === 0 ? 'At Will' : `${key}/Day${list.length > 1 ? ' Each' : ''}`,
      spells: [...list].sort((x, y) => (x.name ?? '').localeCompare(y.name ?? '')),
    }))
}

// A spell saved by the old editor (spell level + slots) instead of frequency.
export function isLegacySpell(spell) {
  return !!spell && spell.frequency === undefined
}

function actionTypeFromCastingTime(castingTime = '') {
  const t = castingTime.toLowerCase()
  if (t.includes('bonus')) return 'bonus'
  if (t.includes('reaction')) return 'reaction'
  return 'action'
}

// Convert an old-format spell. Cantrips become At Will; leveled spells become
// 1/Day and keep their level as the cast level. The fallback id is stable so a
// snapshot normalized twice still produces the same ids.
export function migrateMonsterSpell(spell, index = 0) {
  if (!isLegacySpell(spell)) return spell
  const level = Number(spell.level) || 0
  return {
    ...EMPTY_MONSTER_SPELL,
    id: spell.id || `spell-${index}-${(spell.name ?? '').replace(/\s+/g, '-').toLowerCase()}`,
    name: spell.name ?? '',
    frequency: level === 0 ? 'atWill' : 'perDay',
    usesPerDay: 1,
    actionType: actionTypeFromCastingTime(spell.castingTime),
    castLevel: level > 0 ? level : null,
    defenseType: spell.defenseType ?? 'none',
    saveAbility: spell.saveAbility ?? 'dex',
    onSave: spell.onSave ?? '',
    effect: spell.effect ?? '',
    range: spell.range ?? '',
    duration: spell.duration ?? '',
    concentration: !!spell.concentration,
    description: spell.description ?? '',
  }
}

// Best guess at the spellcasting ability: the highest of INT / WIS / CHA.
function guessSpellcastingAbility(abilities) {
  if (!abilities) return EMPTY_SPELLCASTING.ability
  return SPELLCASTING_ABILITIES.reduce((best, ab) =>
    (abilities[ab] ?? 0) > (abilities[best] ?? 0) ? ab : best, 'cha')
}

export function monsterNeedsMigration(monster) {
  if (!monster) return false
  const spells = monster.spells ?? []
  if (spells.some(isLegacySpell)) return true
  if (spells.length > 0 && !monster.spellcasting) return true
  if (monster.spellSlots && Object.keys(monster.spellSlots).length > 0) return true
  return false
}

// Bring a monster (library entry or encounter snapshot) to the current spell
// format. Returns the same object when nothing needs to change.
export function normalizeMonster(monster) {
  if (!monsterNeedsMigration(monster)) return monster
  const oldSpells = monster.spells ?? []
  const spells = oldSpells.map((s, i) => migrateMonsterSpell(s, i))

  let spellcasting = monster.spellcasting
  if (!spellcasting && spells.length > 0) {
    const firstSave   = oldSpells.find(s => s.defenseType === 'save' && s.saveDC)
    const firstAttack = oldSpells.find(s => s.defenseType === 'attack' && s.attackBonus !== undefined)
    const saveDC = firstSave ? Number(firstSave.saveDC) : EMPTY_SPELLCASTING.saveDC
    const attack = firstAttack ? Number(firstAttack.attackBonus) : null
    spellcasting = {
      ...EMPTY_SPELLCASTING,
      ability: guessSpellcastingAbility(monster.abilities),
      saveDC,
      attackBonus: attack !== null && attack !== saveDC - 8 ? attack : null,
    }
  }

  const { spellSlots, ...rest } = monster
  return { ...rest, spells, spellcasting: spellcasting ?? null }
}

// ─── Empty records ────────────────────────────────────────────────────────────

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
  spellcasting: null,
  notes: '',
  isAlly: false,
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

// Player spells still use levels and slots.
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
  defenseType: 'none',
  saveAbility: 'dex',
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
