import type { Context } from './types'

type CreateMerchantInput = {
  campaignId: string
  name: string
  type?: string
  region: string
  description?: string
}

type UpdateMerchantInput = {
  name?: string
  type?: string
  region?: string
  description?: string
}

type CreateWareInput = {
  merchantId: string
  name: string
  category?: string
  description?: string
  price?: number
  stock?: number
  maxStock?: number
  rarity?: string
  available?: boolean
  haggleCD?: number
  notes?: string
}

type UpdateWareInput = Partial<Omit<CreateWareInput, 'merchantId'>>

export const merchantResolvers = {
  Query: {
    merchants: (_: unknown, args: { campaignId: string }, ctx: Context) =>
      ctx.prisma.merchant.findMany({
        where: { campaignId: args.campaignId },
        include: { wares: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
        orderBy: [{ region: 'asc' }, { name: 'asc' }],
      }),

    merchant: (_: unknown, args: { id: string }, ctx: Context) =>
      ctx.prisma.merchant.findUnique({
        where: { id: args.id },
        include: { wares: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      }),
  },

  Mutation: {
    createMerchant: (_: unknown, args: { input: CreateMerchantInput }, ctx: Context) =>
      ctx.prisma.merchant.create({
        data: {
          campaignId: args.input.campaignId,
          name: args.input.name,
          type: args.input.type ?? 'general',
          region: args.input.region,
          description: args.input.description,
        },
        include: { wares: true },
      }),

    updateMerchant: (_: unknown, args: { id: string; input: UpdateMerchantInput }, ctx: Context) =>
      ctx.prisma.merchant.update({
        where: { id: args.id },
        data: args.input,
        include: { wares: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      }),

    deleteMerchant: async (_: unknown, args: { id: string }, ctx: Context) => {
      await ctx.prisma.merchant.delete({ where: { id: args.id } })
      return true
    },

    duplicateMerchant: async (_: unknown, args: { id: string }, ctx: Context) => {
      const src = await ctx.prisma.merchant.findUniqueOrThrow({
        where: { id: args.id },
        include: { wares: true },
      })
      return ctx.prisma.merchant.create({
        data: {
          campaignId: src.campaignId,
          name: `${src.name} (copy)`,
          type: src.type,
          region: src.region,
          description: src.description,
          wares: {
            create: src.wares.map((w) => ({
              name: w.name,
              category: w.category,
              description: w.description,
              price: w.price,
              stock: w.stock,
              maxStock: w.maxStock,
              rarity: w.rarity,
              available: w.available,
              haggleCD: w.haggleCD,
              notes: w.notes,
            })),
          },
        },
        include: { wares: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      })
    },

    createWare: (_: unknown, args: { input: CreateWareInput }, ctx: Context) => {
      const stock = args.input.stock ?? -1
      const maxStock = args.input.maxStock ?? stock
      return ctx.prisma.merchantWare.create({
        data: {
          merchantId: args.input.merchantId,
          name: args.input.name,
          category: (args.input.category ?? 'misc').toLowerCase(),
          description: args.input.description,
          price: args.input.price ?? 0,
          stock,
          maxStock,
          rarity: args.input.rarity,
          available: args.input.available ?? true,
          haggleCD: args.input.haggleCD,
          notes: args.input.notes,
        },
      })
    },

    updateWare: (_: unknown, args: { id: string; input: UpdateWareInput }, ctx: Context) => {
      const data: Record<string, unknown> = { ...args.input }
      if (data.category) data.category = (data.category as string).toLowerCase()
      return ctx.prisma.merchantWare.update({ where: { id: args.id }, data })
    },

    deleteWare: async (_: unknown, args: { id: string }, ctx: Context) => {
      await ctx.prisma.merchantWare.delete({ where: { id: args.id } })
      return true
    },

    sellWare: async (_: unknown, args: { id: string; qty?: number }, ctx: Context) => {
      const ware = await ctx.prisma.merchantWare.findUniqueOrThrow({ where: { id: args.id } })
      // -1 = unlimited stock, never decrement
      if (ware.stock === -1) return ware
      const qty = args.qty ?? 1
      const newStock = Math.max(0, ware.stock - qty)
      return ctx.prisma.merchantWare.update({
        where: { id: args.id },
        data: { stock: newStock },
      })
    },

    restockMerchant: async (_: unknown, args: { id: string }, ctx: Context) => {
      const merchant = await ctx.prisma.merchant.findUniqueOrThrow({
        where: { id: args.id },
        include: { wares: true },
      })
      // Reset each ware's stock to its maxStock (skip unlimited ones)
      await Promise.all(
        merchant.wares
          .filter((w) => w.maxStock !== -1)
          .map((w) => ctx.prisma.merchantWare.update({ where: { id: w.id }, data: { stock: w.maxStock } }))
      )
      return ctx.prisma.merchant.findUniqueOrThrow({
        where: { id: args.id },
        include: { wares: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      })
    },
  },
}
