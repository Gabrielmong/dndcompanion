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
