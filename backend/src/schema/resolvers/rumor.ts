import type { Context } from './types'

export const rumorResolvers = {
  Query: {
    rumors: (_: unknown, args: { campaignId: string }, ctx: Context) =>
      ctx.prisma.rumor.findMany({
        where: { campaignId: args.campaignId },
        orderBy: { createdAt: 'desc' },
      }),
  },

  Mutation: {
    createRumor: (_: unknown, args: { input: {
      campaignId: string; chapterId?: string; content: string
      source?: string; isTrue?: boolean; notes?: string
    } }, ctx: Context) =>
      ctx.prisma.rumor.create({ data: args.input }),

    updateRumor: (_: unknown, args: { id: string; input: {
      chapterId?: string | null; content?: string; source?: string | null
      isTrue?: boolean | null; notes?: string | null
    } }, ctx: Context) =>
      ctx.prisma.rumor.update({ where: { id: args.id }, data: args.input }),

    deleteRumor: async (_: unknown, args: { id: string }, ctx: Context) => {
      await ctx.prisma.rumor.delete({ where: { id: args.id } })
      return true
    },
  },

  Rumor: {
    chapter: (rumor: { chapterId: string | null }, _: unknown, ctx: Context) =>
      rumor.chapterId ? ctx.prisma.chapter.findUnique({ where: { id: rumor.chapterId } }) : null,
  },
}
