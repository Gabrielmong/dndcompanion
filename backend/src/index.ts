import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { typeDefs } from './schema/typeDefs'
import { resolvers } from './schema/resolvers'
import { createLoaders } from './loaders'
import { prisma } from './db/client'
import { getUserFromToken } from './auth/jwt'

async function main() {
  const server = new ApolloServer({ typeDefs, resolvers, csrfPrevention: false })
  await server.start()

  const app = express()

  const corsOptions = cors<cors.CorsRequest>({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })

  // R2 map upload
  const r2 = process.env.R2_ENDPOINT
    ? new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
      })
    : null

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

  app.options('/api/upload/map', corsOptions)
  app.post('/api/upload/map', corsOptions, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        res.status(413).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 100 MB)' : err.message })
        return
      }
      if (err) { res.status(500).json({ error: 'Upload failed' }); return }
      next()
    })
  }, async (req, res) => {
    if (!r2) { res.status(503).json({ error: 'R2 not configured' }); return }
    if (!req.file) { res.status(400).json({ error: 'No file' }); return }

    const ext = req.file.originalname.split('.').pop() ?? 'bin'
    const key = `maps/${randomUUID()}.${ext}`

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }))

    const url = `${process.env.R2_PUBLIC_URL}/${key}`
    res.json({ url, key })
  })

  // PDF proxy — only allows D&D Beyond sheet-pdf URLs to prevent SSRF
  app.options('/api/proxy-pdf', corsOptions)
  app.post('/api/proxy-pdf', corsOptions, express.json(), async (req, res) => {
    const { url } = req.body ?? {}
    if (typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' })
      return
    }
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    try {
      const parsed = new URL(normalized)
      if (
        !parsed.hostname.endsWith('dndbeyond.com') ||
        !parsed.pathname.startsWith('/sheet-pdfs/')
      ) {
        res.status(403).json({ error: 'Only D&D Beyond sheet-pdf URLs are allowed.' })
        return
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL.' })
      return
    }
    try {
      const upstream = await fetch(normalized, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DnDCompanion/1.0)' },
      })
      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream responded ${upstream.status}` })
        return
      }
      const contentType = upstream.headers.get('content-type') ?? 'application/pdf'
      res.setHeader('Content-Type', contentType)
      const buffer = await upstream.arrayBuffer()
      res.send(Buffer.from(buffer))
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch PDF.' })
    }
  })

  // D&D Beyond character import — fetches public character data by ID
  app.options('/api/dndbeyond-character', corsOptions)
  app.post('/api/dndbeyond-character', corsOptions, express.json(), async (req, res) => {
    const { characterId } = req.body ?? {}
    if (!characterId) {
      res.status(400).json({ error: 'characterId is required' })
      return
    }
    const id = String(characterId).replace(/\D/g, '')
    if (!id) {
      res.status(400).json({ error: 'Invalid character ID' })
      return
    }
    try {
      const upstream = await fetch(
        `https://character-service.dndbeyond.com/character/v5/character/${id}?includeCustomItems=true`,
        {
          headers: {
            Origin: 'https://www.dndbeyond.com',
            Referer: 'https://www.dndbeyond.com/',
            'User-Agent': 'Mozilla/5.0 (compatible; DnDCompanion/1.0)',
          },
        }
      )
      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `D&D Beyond responded ${upstream.status}` })
        return
      }
      const json = (await upstream.json()) as { success: boolean; message: string; data: Record<string, unknown> }
      if (!json.success || !json.data) {
        res.status(404).json({ error: json.message ?? 'Character not found or not public' })
        return
      }
      type DdbModifier = { type: string; subType: string; value: number | null }
      type DdbInventoryItem = {
        quantity: number; equipped: boolean
        definition: {
          name: string; armorClass: number | null; armorTypeId: number | null
          damage: { diceString: string } | null; attackType: number | null
          type: string; properties?: Array<{ name: string }>
        } | null
      }
      type DdbClass = {
        level: number
        definition: { name: string; hitDice: number }
        subclassDefinition?: { name: string }
      }
      const d = json.data as {
        name: string; username: string; gender: string; age: number; hair: string
        eyes: string; skin: string; height: string; weight: number
        baseHitPoints: number; removedHitPoints: number
        stats: Array<{ id: number; value: number | null }>
        classes: DdbClass[]
        race: { fullName: string; baseName: string } | null
        background: { definition?: { name: string } | null; customBackground?: unknown } | null
        decorations: { avatarUrl: string | null } | null
        inventory: DdbInventoryItem[]
        currencies: { cp: number; sp: number; ep: number; gp: number; pp: number } | null
        modifiers: Record<string, DdbModifier[]>
        customProficiencies: Array<{ name: string; type: number }>
      }

      // Ability scores
      const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
      const statValues: Record<string, number> = {}
      for (const stat of d.stats ?? []) {
        const name = statNames[stat.id - 1]
        if (name && stat.value != null) statValues[name] = stat.value
      }
      function modNum(score: number) { return Math.floor((score - 10) / 2) }
      function modStr(score: number) { const m = modNum(score); return m >= 0 ? `+${m}` : `${m}` }

      // Class & level
      const cls = d.classes?.[0]
      const level = cls?.level ?? 1
      const className = cls?.definition?.name
      const subclassName = cls?.subclassDefinition?.name
      const classDisplay = subclassName ? `${className} (${subclassName})` : className
      const allClasses = (d.classes ?? []).map((c) => `${c.definition?.name} ${c.level}`).join(' / ')
      const hitDice = cls?.definition?.hitDice ? `${level}d${cls.definition.hitDice}` : undefined

      const background = d.background?.definition?.name ??
        (d.background?.customBackground != null ? 'Custom Background' : undefined)

      // HP
      const hpMax = d.baseHitPoints
      const hpCurrent = Math.max(0, (d.baseHitPoints ?? 0) - (d.removedHitPoints ?? 0))

      // Proficiency bonus
      const profBonusNum = Math.ceil(level / 4) + 1
      const profBonusStr = `+${profBonusNum}`

      // Flatten all modifiers
      const allMods: DdbModifier[] = Object.values(d.modifiers ?? {}).flat()
      const hasProfIn = (subType: string) => allMods.some((m) => m.type === 'proficiency' && m.subType === subType)
      const hasExpertiseIn = (subType: string) => allMods.some((m) => m.type === 'expertise' && m.subType === subType)

      // Saving throws
      const stAbilities = [
        ['Strength', 'strength', 'strength-saving-throws'],
        ['Dexterity', 'dexterity', 'dexterity-saving-throws'],
        ['Constitution', 'constitution', 'constitution-saving-throws'],
        ['Intelligence', 'intelligence', 'intelligence-saving-throws'],
        ['Wisdom', 'wisdom', 'wisdom-saving-throws'],
        ['Charisma', 'charisma', 'charisma-saving-throws'],
      ] as const
      const savingThrows: Record<string, string> = {}
      for (const [label, stat, subType] of stAbilities) {
        const base = modNum(statValues[stat] ?? 10)
        const bonus = base + (hasProfIn(subType) ? profBonusNum : 0)
        savingThrows[label] = bonus >= 0 ? `+${bonus}` : `${bonus}`
      }

      // Skills
      const skillDefs = [
        ['Acrobatics', 'dexterity', 'acrobatics'],
        ['Animal Handling', 'wisdom', 'animal-handling'],
        ['Arcana', 'intelligence', 'arcana'],
        ['Athletics', 'strength', 'athletics'],
        ['Deception', 'charisma', 'deception'],
        ['History', 'intelligence', 'history'],
        ['Insight', 'wisdom', 'insight'],
        ['Intimidation', 'charisma', 'intimidation'],
        ['Investigation', 'intelligence', 'investigation'],
        ['Medicine', 'wisdom', 'medicine'],
        ['Nature', 'intelligence', 'nature'],
        ['Perception', 'wisdom', 'perception'],
        ['Performance', 'charisma', 'performance'],
        ['Persuasion', 'charisma', 'persuasion'],
        ['Religion', 'intelligence', 'religion'],
        ['Sleight of Hand', 'dexterity', 'sleight-of-hand'],
        ['Stealth', 'dexterity', 'stealth'],
        ['Survival', 'wisdom', 'survival'],
      ] as const
      const skills: Record<string, string> = {}
      for (const [label, stat, subType] of skillDefs) {
        const base = modNum(statValues[stat] ?? 10)
        const extra = hasExpertiseIn(subType) ? profBonusNum * 2 : hasProfIn(subType) ? profBonusNum : 0
        const bonus = base + extra
        skills[label] = bonus >= 0 ? `+${bonus}` : `${bonus}`
      }

      // Passive perception
      const passivePerception = 10 + modNum(statValues.wisdom ?? 10) + (hasProfIn('perception') ? profBonusNum : 0)

      // AC from equipped armor
      const strMod = modNum(statValues.strength ?? 10)
      const dexMod = modNum(statValues.dexterity ?? 10)
      let baseAC = 10 + dexMod
      let shieldBonus = 0
      for (const item of d.inventory ?? []) {
        if (!item.equipped || !item.definition?.armorClass) continue
        const { armorTypeId, armorClass } = item.definition
        if (armorTypeId === 4) shieldBonus = armorClass
        else if (armorTypeId === 1) baseAC = armorClass + dexMod
        else if (armorTypeId === 2) baseAC = armorClass + Math.min(dexMod, 2)
        else if (armorTypeId === 3) baseAC = armorClass
      }
      // Check unarmored defense bonuses (e.g. CON for Barbarian, WIS for Monk)
      const unarmoredDef = allMods.find((m) => m.type === 'set' && m.subType === 'unarmored-armor-class')
      if (unarmoredDef) baseAC = 10 + dexMod + modNum(statValues.constitution ?? 10)
      const totalAC = baseAC + shieldBonus

      // Speed (look for set-base-speed modifier, default 30)
      const speedMod = allMods.find((m) => m.subType === 'speed' && m.type === 'set' && m.value)
      const speedFt = speedMod?.value ?? 30
      const speedStr = `${speedFt} ft.`

      // Initiative
      const initiativeStr = modStr(statValues.dexterity ?? 10)

      // Weapons from equipped inventory items with attackType
      const isFinesseOrRanged = (item: DdbInventoryItem) => {
        const props = item.definition?.properties?.map((p) => p.name.toLowerCase()) ?? []
        return props.includes('finesse') || (item.definition?.attackType === 2)
      }
      const weapons = (d.inventory ?? [])
        .filter((i) => i.equipped && i.definition?.attackType != null)
        .map((i) => {
          const defn = i.definition!
          const usesDex = isFinesseOrRanged(i) && dexMod > strMod
          const atkMod = (usesDex ? dexMod : strMod) + profBonusNum
          const dmgMod = usesDex ? dexMod : strMod
          const atkBonus = atkMod >= 0 ? `+${atkMod}` : `${atkMod}`
          let damage = defn.damage?.diceString ?? '1'
          if (dmgMod !== 0) damage += dmgMod > 0 ? `+${dmgMod}` : `${dmgMod}`
          return { name: defn.name, attackBonus: atkBonus, damage }
        })

      // Unarmed strike
      const unarmedAtk = strMod + profBonusNum
      weapons.push({
        name: 'Unarmed Strike',
        attackBonus: unarmedAtk >= 0 ? `+${unarmedAtk}` : `${unarmedAtk}`,
        damage: `${Math.max(1, 1 + strMod)} Bludgeoning`,
      })

      // Equipment list (all inventory items)
      const equipment = (d.inventory ?? [])
        .filter((i) => i.definition)
        .map((i) => ({ name: i.definition!.name, qty: i.quantity != null ? String(i.quantity) : undefined }))

      // Currency
      const cur = d.currencies
      const currency =
        cur && (cur.cp || cur.sp || cur.ep || cur.gp || cur.pp)
          ? { cp: cur.cp || undefined, sp: cur.sp || undefined, ep: cur.ep || undefined, gp: cur.gp || undefined, pp: cur.pp || undefined }
          : undefined

      const sheet = {
        name: d.name,
        playerName: d.username || undefined,
        race: d.race?.fullName ?? d.race?.baseName,
        class: (d.classes?.length ?? 0) > 1 ? allClasses : (classDisplay || undefined),
        level,
        background,
        gender: d.gender || undefined,
        age: d.age != null ? String(d.age) : undefined,
        height: d.height || undefined,
        weight: d.weight != null ? String(d.weight) : undefined,
        eyes: d.eyes || undefined,
        skin: d.skin || undefined,
        hair: d.hair || undefined,
        ...statValues,
        strengthMod: modStr(statValues.strength ?? 10),
        dexterityMod: modStr(statValues.dexterity ?? 10),
        constitutionMod: modStr(statValues.constitution ?? 10),
        intelligenceMod: modStr(statValues.intelligence ?? 10),
        wisdomMod: modStr(statValues.wisdom ?? 10),
        charismaMod: modStr(statValues.charisma ?? 10),
        hpMax,
        hpCurrent,
        armorClass: totalAC,
        speed: speedStr,
        initiative: initiativeStr,
        hitDice,
        proficiencyBonus: profBonusStr,
        passivePerception,
        savingThrows,
        skills,
        weapons: weapons.length ? weapons : undefined,
        equipment: equipment.length ? equipment : undefined,
        currency,
        portraitUrl: d.decorations?.avatarUrl || undefined,
      }

      res.json({ success: true, data: sheet })
    } catch {
      res.status(500).json({ error: 'Failed to fetch character from D&D Beyond.' })
    }
  })

  app.use(
    '/graphql',
    corsOptions,
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '') ?? ''
        const user = token ? await getUserFromToken(token) : null
        return {
          prisma,
          loaders: createLoaders(prisma),
          user,
        }
      },
    })
  )

  const port = Number(process.env.PORT) || 4000
  app.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
  })
}

main().catch(console.error)
