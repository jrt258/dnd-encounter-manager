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

// ─── Saving throws ────────────────────────────────────────────────────────────
// 2024 stat blocks list a Save bonus next to each ability modifier, and the two
// can differ (proficient saves). A monster stores only the saves that differ from
// the plain modifier in `saves`, e.g. { dex: 5, wis: 3 }. Any ability not listed
// saves with its modifier, so it keeps tracking the score if the score changes.

export function hasSaveOverride(monster, ability) {
  return Number.isFinite(monster?.saves?.[ability])
}

export function saveBonus(monster, ability) {
  return hasSaveOverride(monster, ability)
    ? monster.saves[ability]
    : abilityMod(monster?.abilities?.[ability] ?? 10)
}

// ─── Speeds ───────────────────────────────────────────────────────────────────
// `speed` is the walking speed. Other movement modes live in `speeds`,
// e.g. { fly: 60, swim: 30 }; a missing or 0 entry means the monster has none.

export const SPEED_TYPES = [
  { id: 'fly',    label: 'Fly' },
  { id: 'swim',   label: 'Swim' },
  { id: 'climb',  label: 'Climb' },
  { id: 'burrow', label: 'Burrow' },
]

export function otherSpeeds(monster) {
  return SPEED_TYPES
    .map(t => ({ ...t, value: monster?.speeds?.[t.id] }))
    .filter(t => Number.isFinite(t.value) && t.value > 0)
}

export function hasOtherSpeeds(monster) {
  return otherSpeeds(monster).length > 0
}

// "30 ft, fly 60 ft, swim 30 ft"
export function speedText(monster) {
  return [
    `${monster?.speed ?? 30} ft`,
    ...otherSpeeds(monster).map(t => `${t.id} ${t.value} ft`),
  ].join(', ')
}

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
  multiattack: false,    // can replace an attack in the owner's Multiattack (action spells only)
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
    multiattack: false,
  }
}

// Best guess at the spellcasting ability: the highest of INT / WIS / CHA.
function guessSpellcastingAbility(abilities) {
  if (!abilities) return EMPTY_SPELLCASTING.ability
  return SPELLCASTING_ABILITIES.reduce((best, ab) =>
    (abilities[ab] ?? 0) > (abilities[best] ?? 0) ? ab : best, 'cha')
}

function spellsNeedMigration(monster) {
  const spells = monster.spells ?? []
  if (spells.some(isLegacySpell)) return true
  if (spells.length > 0 && !monster.spellcasting) return true
  if (monster.spellSlots && Object.keys(monster.spellSlots).length > 0) return true
  return false
}

export function monsterNeedsMigration(monster) {
  if (!monster) return false
  if (spellsNeedMigration(monster)) return true
  if ((monster.attacks ?? []).some(attackNeedsMigration)) return true
  return false
}

// Bring a monster (library entry or encounter snapshot) to the current spell
// and attack format. Returns the same object when nothing needs to change.
export function normalizeMonster(monster) {
  if (!monsterNeedsMigration(monster)) return monster
  const withAttacks = (monster.attacks ?? []).some(attackNeedsMigration)
    ? { ...monster, attacks: monster.attacks.map(normalizeAttack) }
    : monster
  if (!spellsNeedMigration(withAttacks)) return withAttacks
  return migrateMonsterSpells(withAttacks)
}

function migrateMonsterSpells(monster) {
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
  size: 'Medium',
  type: 'Beast',
  cr: '1',
  hp: 10,
  maxHp: 10,
  ac: 12,
  speed: 30,
  initiativeMod: 0,
  speeds: {},               // extra movement, e.g. { fly: 60, swim: 30 }
  abilities: { ...DEFAULT_ABILITIES },
  saves: {},                // only saves that differ from the modifier, e.g. { dex: 5 }
  attacks: [],
  multiattack: null,        // null = no Multiattack, otherwise { count, description }
  skills: [],               // [{ skill: 'perception', bonus: 4 }]
  resistances: [],          // damage types, e.g. ['poison']
  immunities: [],           // damage types, e.g. ['poison', 'psychic']
  vulnerabilities: [],      // damage types, e.g. ['bludgeoning']
  conditionImmunities: [],  // condition ids, e.g. ['charmed', 'poisoned']
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
  melee: true,             // Melee and Ranged can both be true ("Melee or Ranged Attack Roll")
  ranged: false,
  reach: 5,                // ft, used when melee
  range: '',               // e.g. '120' or '80/320', used when ranged
  damage: '1d6',           // primary damage dice
  damageType: 'slashing',
  damageAverage: null,     // null = calculate from the dice
  extraDamage: [],         // up to MAX_EXTRA_DAMAGE × { id, dice, type, average }
  multiattack: false,      // can be used as part of the owner's Multiattack
  notes: '',
}

// ─── Attacks ──────────────────────────────────────────────────────────────────

export const MAX_EXTRA_DAMAGE = 3

export const EMPTY_DAMAGE_PART = {
  id: '',
  dice: '1d6',
  type: 'poison',
  average: null,           // null = calculate from the dice
}

export const EMPTY_MULTIATTACK = {
  count: 2,
  description: '',         // blank = generate "The X makes two Y attacks."
}

// Average of a dice expression, rounded down the way stat blocks print it.
// "3d8+3" → 16, "5d6" → 17, "4" → 4, "2d6 + 1d4 - 1" → 8. Returns null when the
// text isn't a dice expression.
// Accept dice typed the way stat blocks print them. "6 (1d6 + 3) + 5 (2d4)"
// → "1d6+3+2d4", "11 (2d10)" → "2d10". Plain expressions pass through as-is.
export function cleanDice(expr) {
  const s = String(expr ?? '').trim()
  if (!s.includes('(')) return s
  const inner = [...s.matchAll(/\(([^()]*)\)/g)].map(m => m[1].trim()).filter(Boolean)
  return inner.length ? inner.join(' + ') : s.replace(/[()]/g, '')
}

export function diceAverage(expr) {
  const s = cleanDice(expr).replace(/\s+/g, '').toLowerCase()
  if (!s) return null
  const terms = s.match(/[+-]?[^+-]+/g)
  if (!terms) return null
  let total = 0
  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[+-]/, '')
    const dice = body.match(/^(\d*)d(\d+)$/)
    if (dice) {
      const count = parseInt(dice[1] || '1')
      const sides = parseInt(dice[2])
      total += sign * count * (sides + 1) / 2
    } else if (/^\d+$/.test(body)) {
      total += sign * parseInt(body)
    } else {
      return null
    }
  }
  return Math.max(0, Math.floor(total))
}

// Roll a dice expression with any number of terms ("2d6+1d4+3").
// Returns { total, breakdown } — breakdown like "[4+2]+3".
export function rollDiceExpr(expr) {
  const s = cleanDice(expr).replace(/\s+/g, '').toLowerCase()
  if (!s) return { total: 0, breakdown: '0' }
  const terms = s.match(/[+-]?[^+-]+/g) ?? []
  let total = 0
  const pieces = []
  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[+-]/, '')
    const dice = body.match(/^(\d*)d(\d+)$/)
    if (dice) {
      const count = parseInt(dice[1] || '1')
      const sides = parseInt(dice[2])
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
      total += sign * rolls.reduce((a, b) => a + b, 0)
      const str = rolls.length > 1 ? `[${rolls.join('+')}]` : String(rolls[0])
      pieces.push(pieces.length === 0 && sign > 0 ? str : `${sign < 0 ? '-' : '+'}${str}`)
    } else {
      const n = parseInt(body) || 0
      total += sign * n
      pieces.push(pieces.length === 0 && sign > 0 ? String(n) : `${sign < 0 ? '-' : '+'}${n}`)
    }
  }
  return { total: Math.max(0, total), breakdown: pieces.join('') || '0' }
}

// "3d8+3" → "3d8 + 3"
export function prettyDice(expr) {
  return String(expr ?? '').trim().replace(/\s*([+-])\s*/g, ' $1 ')
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

// Guess melee / ranged for attacks saved before the toggles existed.
const RANGED_ONLY = /\b(bow|shortbow|longbow|crossbow|sling|dart|blowgun|spray|web|rock|needles)\b/i
const THROWN = /\b(javelin|dagger|spear|handaxe|trident|light hammer)\b/i

export function attackNeedsMigration(atk) {
  return !!atk && (
    atk.melee === undefined || atk.ranged === undefined ||
    atk.extraDamage === undefined || atk.multiattack === undefined
  )
}

// Fill in fields added after an attack was saved. Same object if nothing is missing.
export function normalizeAttack(atk) {
  if (!attackNeedsMigration(atk)) return atk
  const name = atk.name ?? ''
  let melee = atk.melee
  let ranged = atk.ranged
  if (melee === undefined && ranged === undefined) {
    if (RANGED_ONLY.test(name))  { melee = false; ranged = true }
    else if (THROWN.test(name))  { melee = true;  ranged = true }
    else                         { melee = true;  ranged = false }
  }
  return {
    ...EMPTY_ATTACK,
    ...atk,
    melee: melee ?? true,
    ranged: ranged ?? false,
    reach: atk.reach ?? 5,
    range: atk.range ?? '',
    damageAverage: atk.damageAverage ?? null,
    extraDamage: atk.extraDamage ?? [],
    multiattack: atk.multiattack ?? false,
    notes: atk.notes ?? '',
  }
}

// The value to show for a damage part: the typed override, else the dice average.
export function partAverage(dice, override) {
  if (override !== null && override !== undefined && override !== '') return Number(override)
  return diceAverage(dice)
}

// Every damage component of an attack, primary first:
// [{ dice, type, average }]. Parts without dice are skipped.
export function attackDamageParts(atk) {
  if (!atk) return []
  const parts = []
  if (atk.damage) {
    const dice = cleanDice(atk.damage)
    parts.push({ dice, type: atk.damageType ?? '', average: partAverage(dice, atk.damageAverage) })
  }
  for (const p of atk.extraDamage ?? []) {
    if (!p?.dice) continue
    const dice = cleanDice(p.dice)
    parts.push({ dice, type: p.type ?? '', average: partAverage(dice, p.average) })
  }
  return parts
}

// "16 (3d8 + 3) Force" — flat damage prints as just the number: "1 Piercing".
export function formatDamagePart(part) {
  const flat = /^\d+$/.test(String(part.dice).trim())
  const type = capitalize(part.type)
  if (flat) return `${part.dice}${type ? ` ${type}` : ''}`
  const avg = part.average !== null && part.average !== undefined ? `${part.average} ` : ''
  return `${avg}(${prettyDice(part.dice)})${type ? ` ${type}` : ''}`
}

// "7 (1d6 + 4) Piercing plus 17 (5d6) Poison"
export function attackDamageText(atk) {
  return attackDamageParts(atk).map(formatDamagePart).join(' plus ')
}

// Total average across all damage parts.
export function attackAverageTotal(atk) {
  return attackDamageParts(atk).reduce((sum, p) => sum + (p.average ?? 0), 0)
}

// "Melee" | "Ranged" | "Melee or Ranged"
export function attackKindLabel(atk) {
  const a = normalizeAttack(atk)
  if (a.melee && a.ranged) return 'Melee or Ranged'
  if (a.ranged) return 'Ranged'
  return 'Melee'
}

function rangeText(range) {
  const r = String(range ?? '').trim()
  if (!r) return ''
  return /ft\.?$/i.test(r) ? `range ${r}` : `range ${r} ft.`
}

// "reach 5 ft. or range 120 ft."
export function attackReachText(atk) {
  const a = normalizeAttack(atk)
  const parts = []
  if (a.melee) parts.push(`reach ${a.reach ?? 5} ft.`)
  if (a.ranged && rangeText(a.range)) parts.push(rangeText(a.range))
  return parts.join(' or ')
}

// ─── Multiattack ──────────────────────────────────────────────────────────────

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function numberWord(n) {
  return NUMBER_WORDS[n] ?? String(n)
}

export function multiattackOptions(attacks = []) {
  return attacks.filter(a => a?.multiattack)
}

// Spells that can be cast as part of Multiattack. Only spells cast with an
// action qualify — a bonus action or reaction spell can't replace an attack.
export function multiattackSpellOptions(spells = []) {
  return spells.filter(s => s?.multiattack && (s.actionType ?? 'action') === 'action')
}

// "A", "A or B", "A, B, or C"
function orList(names) {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} or ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
}

// The Multiattack sentence. Uses the custom description when one is written;
// otherwise e.g. "The mage makes three Arcane Burst attacks.",
// "The assassin makes three attacks, using Shortsword or Light Crossbow in any combination."
// or, with spells, "… It can replace any of these attacks with a casting of Fire Bolt."
export function multiattackText(multiattack, attacks = [], ownerName = '', spells = []) {
  if (!multiattack) return ''
  if (multiattack.description?.trim()) return multiattack.description.trim()
  const who = ownerName ? `The ${ownerName.toLowerCase()}` : 'It'
  const n = multiattack.count ?? 2
  const count = numberWord(n)
  const attackNames = multiattackOptions(attacks).map(a => a.name || 'Unnamed Attack')
  const spellNames = multiattackSpellOptions(spells).map(s => s.name || 'Unnamed Spell')

  if (attackNames.length === 0 && spellNames.length === 0) return `${who} makes ${count} attacks.`

  if (attackNames.length === 0) {
    if (spellNames.length === 1) {
      return `${who} casts ${spellNames[0]} ${n === 2 ? 'twice' : `${count} times`}.`
    }
    return `${who} makes ${count} attacks, casting ${orList(spellNames)} in any combination.`
  }

  const text = attackNames.length === 1
    ? `${who} makes ${count} ${attackNames[0]} attacks.`
    : `${who} makes ${count} attacks, using ${orList(attackNames)} in any combination.`
  if (spellNames.length === 0) return text
  return `${text} It can replace any of these attacks with a casting of ${orList(spellNames)}.`
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export const SKILLS = [
  { id: 'acrobatics',     label: 'Acrobatics',      ability: 'dex' },
  { id: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { id: 'arcana',         label: 'Arcana',          ability: 'int' },
  { id: 'athletics',      label: 'Athletics',       ability: 'str' },
  { id: 'deception',      label: 'Deception',       ability: 'cha' },
  { id: 'history',        label: 'History',         ability: 'int' },
  { id: 'insight',        label: 'Insight',         ability: 'wis' },
  { id: 'intimidation',   label: 'Intimidation',    ability: 'cha' },
  { id: 'investigation',  label: 'Investigation',   ability: 'int' },
  { id: 'medicine',       label: 'Medicine',        ability: 'wis' },
  { id: 'nature',         label: 'Nature',          ability: 'int' },
  { id: 'perception',     label: 'Perception',      ability: 'wis' },
  { id: 'performance',    label: 'Performance',     ability: 'cha' },
  { id: 'persuasion',     label: 'Persuasion',      ability: 'cha' },
  { id: 'religion',       label: 'Religion',        ability: 'int' },
  { id: 'sleightOfHand',  label: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth',        label: 'Stealth',         ability: 'dex' },
  { id: 'survival',       label: 'Survival',        ability: 'wis' },
]

export function skillDef(id) {
  return SKILLS.find(s => s.id === id)
}

// Proficiency bonus from challenge rating ("1/4", "0.5", "6"…).
export function proficiencyBonusForCR(cr) {
  let n
  const s = String(cr ?? '').trim()
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number)
    n = b ? a / b : 0
  } else {
    n = parseFloat(s)
  }
  if (isNaN(n) || n < 5) return 2
  return Math.min(9, 2 + Math.ceil((n - 4) / 4))
}

// Standard skill bonus: ability modifier + proficiency bonus.
export function defaultSkillBonus(skillId, abilities, cr) {
  const def = skillDef(skillId)
  const score = def ? (abilities?.[def.ability] ?? 10) : 10
  return abilityMod(score) + proficiencyBonusForCR(cr)
}

// Skills in stat block (alphabetical) order.
export function sortedSkills(skills = []) {
  const order = id => {
    const i = SKILLS.findIndex(s => s.id === id)
    return i === -1 ? 999 : i
  }
  return [...skills].sort((a, b) => order(a.skill) - order(b.skill))
}

// ─── Damage & condition defenses ──────────────────────────────────────────────

export function damageTypeLabel(type) {
  return capitalize(type)
}

export function conditionLabel(id) {
  return CONDITIONS.find(c => c.toLowerCase() === String(id).toLowerCase()) ?? capitalize(id)
}

export function hasDefenses(m) {
  return !!m && (
    (m.skills?.length ?? 0) > 0 ||
    (m.resistances?.length ?? 0) > 0 ||
    (m.immunities?.length ?? 0) > 0 ||
    (m.vulnerabilities?.length ?? 0) > 0 ||
    (m.conditionImmunities?.length ?? 0) > 0
  )
}

// How a target takes one damage type: 'immune' | 'resistant' | 'vulnerable' | 'normal'.
// Immunity wins over everything. A stat block never lists one type as both a
// resistance and a vulnerability (the editor keeps them exclusive); if old data
// does, the two cancel out (half, then double) so it is treated as normal.
export function damageResponse(target, type) {
  const t = String(type ?? '').toLowerCase()
  if (!t || !target) return 'normal'
  if ((target.immunities ?? []).includes(t)) return 'immune'
  const resistant = (target.resistances ?? []).includes(t)
  const vulnerable = (target.vulnerabilities ?? []).includes(t)
  if (resistant && vulnerable) return 'normal'
  if (resistant) return 'resistant'
  if (vulnerable) return 'vulnerable'
  return 'normal'
}

// Apply a target's immunities / resistances / vulnerabilities to rolled damage.
// Damage of the same type is added together before halving or doubling.
// rolled: [{ type, amount, breakdown? }] → { total, lines: [{ type, raw, final, response }] }
export function applyDamageDefenses(rolled, target) {
  const byType = new Map()
  for (const r of rolled) {
    const key = String(r.type ?? '').toLowerCase()
    byType.set(key, (byType.get(key) ?? 0) + (r.amount ?? 0))
  }
  const lines = [...byType.entries()].map(([type, raw]) => {
    const response = damageResponse(target, type)
    const final =
      response === 'immune'     ? 0 :
      response === 'resistant'  ? Math.floor(raw / 2) :
      response === 'vulnerable' ? raw * 2 :
      raw
    return { type, raw, final, response }
  })
  return { total: lines.reduce((s, l) => s + l.final, 0), lines }
}

// Short labels for showing a damage response, e.g. on combat tags.
export const DAMAGE_RESPONSE_LABELS = {
  immune:     { verb: 'immune',     phrase: 'immune to',     tag: 'tag-green' },
  resistant:  { verb: 'resisted',   phrase: 'resistant to',  tag: 'tag-amber' },
  vulnerable: { verb: 'vulnerable', phrase: 'vulnerable to', tag: 'tag-red'   },
}

// The damage type named in free spell text, e.g. "3d6 fire damage" → 'fire'.
// Only matches "<type> damage" so words like "piercing gaze" don't count.
export function damageTypeFromText(text) {
  const s = String(text ?? '').toLowerCase()
  for (const t of DAMAGE_TYPES) {
    if (new RegExp(`\\b${t}\\s+damage\\b`).test(s)) return t
  }
  return ''
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

export const MONSTER_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

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
