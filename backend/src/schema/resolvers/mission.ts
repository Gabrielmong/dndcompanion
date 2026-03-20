import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { Context } from './types'

const s3 = process.env.R2_ENDPOINT
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    })
  : null

export const missionResolvers = {
  Query: {
    missions: (
      _: unknown,
      args: { campaignId: string; chapterId?: string; status?: string },
      ctx: Context
    ) => {
      const where: Record<string, unknown> = { campaignId: args.campaignId }
      if (args.chapterId) where.chapterId = args.chapterId
      if (args.status) where.status = args.status.toLowerCase()
      return ctx.prisma.mission.findMany({ where, orderBy: { orderIndex: 'asc' } })
    },
  },

  Mutation: {
    createMission: (
      _: unknown,
      args: {
        input: {
          campaignId: string
          chapterId?: string
          name: string
          type?: string
          description?: string
          orderIndex?: number
        }
      },
      ctx: Context
    ) =>
      ctx.prisma.mission.create({
        data: {
          campaignId: args.input.campaignId,
          chapterId: args.input.chapterId,
          name: args.input.name,
          type: (args.input.type ?? 'MAIN').toLowerCase(),
          description: args.input.description,
          orderIndex: args.input.orderIndex ?? 0,
          status: 'pending',
        },
      }),

    updateMission: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: Context) => {
      const data: Record<string, unknown> = { ...args.input }
      if (data.status) data.status = (data.status as string).toLowerCase()
      if (data.type) data.type = (data.type as string).toLowerCase()
      const mission = await ctx.prisma.mission.update({ where: { id: args.id }, data })
      // Keep missionName on linked decisions in sync when the mission is renamed
      if (data.name) {
        await ctx.prisma.decision.updateMany({
          where: { missionId: args.id },
          data: { missionName: data.name as string },
        })
      }
      return mission
    },

    updateMissionStatus: (_: unknown, args: { id: string; status: string }, ctx: Context) =>
      ctx.prisma.mission.update({
        where: { id: args.id },
        data: { status: args.status.toLowerCase() },
      }),

    deleteMission: async (_: unknown, args: { id: string }, ctx: Context) => {
      await ctx.prisma.mission.delete({ where: { id: args.id } })
      return true
    },

    addMissionMap: async (
      _: unknown,
      args: { missionId: string; name: string; url: string; key: string },
      ctx: Context
    ) =>
      ctx.prisma.missionMap.create({
        data: { missionId: args.missionId, name: args.name, url: args.url, key: args.key },
      }),

    deleteMissionMap: async (_: unknown, args: { id: string }, ctx: Context) => {
      const map = await ctx.prisma.missionMap.findUnique({ where: { id: args.id } })
      if (!map) return false
      if (s3 && map.key) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: map.key }))
        } catch (e) {
          console.error('R2 delete failed:', e)
        }
      }
      await ctx.prisma.missionMap.delete({ where: { id: args.id } })
      return true
    },
  },

  Mission: {
    campaign: (m: { campaignId: string }, _: unknown, ctx: Context) =>
      ctx.prisma.campaign.findUnique({ where: { id: m.campaignId } }),

    chapter: (m: { chapterId: string | null }, _: unknown, ctx: Context) =>
      m.chapterId ? ctx.prisma.chapter.findUnique({ where: { id: m.chapterId } }) : null,

    decisions: async (m: { id: string; name: string }, _: unknown, ctx: Context) => {
      const decisions = await ctx.prisma.decision.findMany({
        where: { OR: [{ missionId: m.id }, { missionName: m.name, missionId: null }] },
        orderBy: { orderIndex: 'asc' },
      })
      // Back-fill missionId on any decisions that were linked only by name
      const needsBackfill = decisions.filter((d) => !d.missionId)
      if (needsBackfill.length > 0) {
        await ctx.prisma.decision.updateMany({
          where: { id: { in: needsBackfill.map((d) => d.id) } },
          data: { missionId: m.id },
        })
      }
      return decisions
    },

    maps: (m: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.missionMap.findMany({ where: { missionId: m.id }, orderBy: { createdAt: 'asc' } }),

    items: (m: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.item.findMany({ where: { missionId: m.id }, orderBy: { createdAt: 'asc' } }),

    type: (m: { type: string }) => m.type.toUpperCase(),
    status: (m: { status: string }) => m.status.toUpperCase(),
  },

  MissionMap: {
    missionId: (m: { missionId: string }) => m.missionId,
  },
}
