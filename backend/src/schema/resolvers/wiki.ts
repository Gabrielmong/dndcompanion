import type { Context } from './types'

interface CreateWikiPageInput {
  campaignId: string
  parentId?: string | null
  title?: string
  icon?: string
  orderIndex?: number
}

interface UpdateWikiPageInput {
  title?: string
  content?: string
  icon?: string
  parentId?: string | null
  orderIndex?: number
}

export const wikiResolvers = {
  Query: {
    wikiPages: (_: unknown, args: { campaignId: string }, ctx: Context) => {
      return ctx.prisma.wikiPage.findMany({
        where: { campaignId: args.campaignId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      })
    },

    wikiPage: (_: unknown, args: { id: string }, ctx: Context) => {
      return ctx.prisma.wikiPage.findUnique({ where: { id: args.id } })
    },
  },

  Mutation: {
    createWikiPage: async (_: unknown, args: { input: CreateWikiPageInput }, ctx: Context) => {
      const { campaignId, parentId, title, icon, orderIndex } = args.input
      // Count siblings to set orderIndex
      const siblingCount = await ctx.prisma.wikiPage.count({
        where: { campaignId, parentId: parentId ?? null },
      })
      return ctx.prisma.wikiPage.create({
        data: {
          campaignId,
          parentId: parentId ?? null,
          title: title ?? 'Untitled',
          icon: icon ?? '📄',
          orderIndex: orderIndex ?? siblingCount,
          content: '',
        },
      })
    },

    updateWikiPage: async (_: unknown, args: { id: string; input: UpdateWikiPageInput }, ctx: Context) => {
      const data: Record<string, unknown> = {}
      if (args.input.title !== undefined) data.title = args.input.title
      if (args.input.content !== undefined) data.content = args.input.content
      if (args.input.icon !== undefined) data.icon = args.input.icon
      if (args.input.orderIndex !== undefined) data.orderIndex = args.input.orderIndex
      if ('parentId' in args.input) data.parentId = args.input.parentId ?? null
      return ctx.prisma.wikiPage.update({ where: { id: args.id }, data })
    },

    deleteWikiPage: async (_: unknown, args: { id: string }, ctx: Context) => {
      await ctx.prisma.wikiPage.delete({ where: { id: args.id } })
      return true
    },
  },
}
