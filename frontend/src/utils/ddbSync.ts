import type { ParsedCharacterSheet } from './parseCharacterSheet'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export function parseDndBeyondCharacterId(input: string): string | null {
  const s = input.trim()
  if (/^\d+$/.test(s)) return s
  const m = s.match(/dndbeyond\.com\/characters\/(\d+)/i)
  return m ? m[1] : null
}

export async function fetchDdbSheet(characterId: string): Promise<ParsedCharacterSheet> {
  const res = await fetch(`${API_BASE}/api/dndbeyond-character`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body.data as ParsedCharacterSheet
}

export function sheetToUpdateInput(sheet: ParsedCharacterSheet, sheetUrl: string) {
  const stats: Record<string, number> = {}
  if (sheet.strength) stats.STR = sheet.strength
  if (sheet.dexterity) stats.DEX = sheet.dexterity
  if (sheet.constitution) stats.CON = sheet.constitution
  if (sheet.intelligence) stats.INT = sheet.intelligence
  if (sheet.wisdom) stats.WIS = sheet.wisdom
  if (sheet.charisma) stats.CHA = sheet.charisma

  return {
    name: sheet.name ?? 'Unknown',
    description: [sheet.race, sheet.class, sheet.background].filter(Boolean).join(' · ') || undefined,
    hpMax: sheet.hpMax,
    hpCurrent: sheet.hpCurrent ?? sheet.hpMax,
    armorClass: sheet.armorClass,
    speed: sheet.speed ? parseInt(sheet.speed) || undefined : undefined,
    stats: Object.keys(stats).length ? stats : undefined,
    portraitUrl: sheet.portraitUrl || undefined,
    extra: {
      ...sheet,
      importType: 'url' as const,
      sheetUrl,
      lastSynced: new Date().toISOString(),
    } as unknown as Record<string, unknown>,
  }
}
