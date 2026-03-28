import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { GraphQLError } from 'graphql'
import { signToken } from '../../auth/jwt'
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../../email'
import type { Context } from './types'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      return ctx.user
    },
  },

  Mutation: {
    register: async (_: unknown, args: { email: string; password: string; name: string }, ctx: Context) => {
      const existing = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (existing) throw new GraphQLError('Email already in use', { extensions: { code: 'BAD_USER_INPUT' } })

      const passwordHash = await bcrypt.hash(args.password, 10)
      const verificationToken = generateToken()
      const user = await ctx.prisma.user.create({
        data: { email: args.email, passwordHash, name: args.name, verificationToken },
      })

      sendVerificationEmail(user.email, user.name, verificationToken).catch(console.error)

      return { token: signToken(user.id), user }
    },

    login: async (_: unknown, args: { email: string; password: string }, ctx: Context) => {
      const user = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (!user) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } })

      if (!user.passwordHash) throw new GraphQLError('This account uses Google Sign-In', { extensions: { code: 'BAD_USER_INPUT' } })

      const valid = await bcrypt.compare(args.password, user.passwordHash)
      if (!valid) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } })

      return { token: signToken(user.id), user }
    },

    updateProfile: async (_: unknown, args: { name?: string; dateOfBirth?: string; avatarUrl?: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(args.name !== undefined && { name: args.name }),
          ...(args.dateOfBirth !== undefined && { dateOfBirth: args.dateOfBirth ? new Date(args.dateOfBirth) : null }),
          ...(args.avatarUrl !== undefined && { avatarUrl: args.avatarUrl || null }),
        },
      })
    },

    googleLogin: async (_: unknown, args: { idToken: string }, ctx: Context) => {
      const ticket = await googleClient.verifyIdToken({
        idToken: args.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      }).catch(() => {
        throw new GraphQLError('Invalid Google token', { extensions: { code: 'UNAUTHENTICATED' } })
      })

      const payload = ticket.getPayload()
      if (!payload?.email) throw new GraphQLError('Google account has no email', { extensions: { code: 'BAD_USER_INPUT' } })

      const { email, name, sub: googleId } = payload

      let user = await ctx.prisma.user.findUnique({ where: { googleId } })
      let linked = false

      if (!user) {
        // Check if email already exists (link accounts)
        const existing = await ctx.prisma.user.findUnique({ where: { email } })
        if (existing) {
          user = await ctx.prisma.user.update({ where: { id: existing.id }, data: { googleId } })
          linked = true
        } else {
          user = await ctx.prisma.user.create({
            data: { email, name: name ?? email, googleId },
          })
        }
      }

      return { token: signToken(user.id), user, linked }
    },

    changePassword: async (_: unknown, args: { currentPassword: string; newPassword: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
      if (!user) throw new GraphQLError('User not found')
      if (!user.passwordHash) throw new GraphQLError('This account uses Google Sign-In', { extensions: { code: 'BAD_USER_INPUT' } })
      const valid = await bcrypt.compare(args.currentPassword, user.passwordHash)
      if (!valid) throw new GraphQLError('Current password is incorrect', { extensions: { code: 'BAD_USER_INPUT' } })
      if (args.newPassword.length < 8) throw new GraphQLError('Password must be at least 8 characters', { extensions: { code: 'BAD_USER_INPUT' } })
      const passwordHash = await bcrypt.hash(args.newPassword, 10)
      await ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { passwordHash } })
      return true
    },

    deleteAccount: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
      return true
    },

    requestPasswordReset: async (_: unknown, args: { email: string }, ctx: Context) => {
      const user = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      // Always return true — don't reveal whether the email exists
      if (!user || !user.passwordHash) return true

      const token = generateToken()
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })
      sendPasswordResetEmail(user.email, user.name, token).catch(console.error)
      return true
    },

    resetPassword: async (_: unknown, args: { token: string; newPassword: string }, ctx: Context) => {
      const user = await ctx.prisma.user.findFirst({
        where: { resetToken: args.token, resetTokenExpiry: { gt: new Date() } },
      })
      if (!user) throw new GraphQLError('Reset link is invalid or has expired', { extensions: { code: 'BAD_USER_INPUT' } })
      if (args.newPassword.length < 8) throw new GraphQLError('Password must be at least 8 characters', { extensions: { code: 'BAD_USER_INPUT' } })

      const passwordHash = await bcrypt.hash(args.newPassword, 10)
      const updated = await ctx.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetTokenExpiry: null },
      })
      return { token: signToken(updated.id), user: updated }
    },

    verifyEmail: async (_: unknown, args: { token: string }, ctx: Context) => {
      const user = await ctx.prisma.user.findFirst({ where: { verificationToken: args.token } })
      if (!user) throw new GraphQLError('Invalid or expired verification link', { extensions: { code: 'BAD_USER_INPUT' } })
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verificationToken: null },
      })
      sendWelcomeEmail(user.email, user.name).catch(console.error)
      return true
    },

    resendVerification: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
      if (!user || user.emailVerified) return true

      const token = generateToken()
      await ctx.prisma.user.update({ where: { id: user.id }, data: { verificationToken: token } })
      sendVerificationEmail(user.email, user.name, token).catch(console.error)
      return true
    },

    refreshToken: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
      if (!user) throw new GraphQLError('User not found')
      return { token: signToken(user.id), user }
    },

    linkGoogleAccount: async (_: unknown, args: { idToken: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })

      const ticket = await googleClient.verifyIdToken({
        idToken: args.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      }).catch(() => {
        throw new GraphQLError('Invalid Google token', { extensions: { code: 'UNAUTHENTICATED' } })
      })

      const payload = ticket.getPayload()
      if (!payload?.sub) throw new GraphQLError('Invalid Google token', { extensions: { code: 'UNAUTHENTICATED' } })

      const existing = await ctx.prisma.user.findUnique({ where: { googleId: payload.sub } })
      if (existing && existing.id !== ctx.user.id) {
        throw new GraphQLError('This Google account is already linked to another user', { extensions: { code: 'BAD_USER_INPUT' } })
      }

      return ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { googleId: payload.sub } })
    },
  },

  User: {
    googleLinked: (user: { googleId?: string | null }) => !!user.googleId,
    emailVerified: (user: { emailVerified?: boolean }) => !!user.emailVerified,
    campaigns: (user: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.campaign.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
  },
}
