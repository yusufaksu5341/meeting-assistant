import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { meetingsRouter } from './routes/meetings.js'
import { webhooksRouter } from './routes/webhooks.js'
import { integrationsRouter } from './routes/integrations.js'
import { billingRouter } from './routes/billing.js'

const fastify = Fastify({
  logger: {
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  },
})

// Stripe webhook ham body doğrulaması için JSON'ı buffer olarak da sakla
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
  try {
    const raw = body as Buffer
    const parsed = JSON.parse(raw.toString())
    ;(parsed as Record<string, unknown>)['__rawBody'] = raw
    done(null, parsed)
  } catch (err) {
    done(err as Error, undefined)
  }
})

await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env['VITE_API_URL'] ?? 'http://localhost:5173',
  credentials: true,
})

fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error)
  const statusCode = error.statusCode ?? 500
  return reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Sunucu hatası' : error.message,
    ...(process.env['NODE_ENV'] !== 'production' && { stack: error.stack }),
  })
})

fastify.setNotFoundHandler((_request, reply) => {
  return reply.status(404).send({ error: 'Bu endpoint bulunamadı' })
})

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

await fastify.register(meetingsRouter, { prefix: '/api' })
await fastify.register(webhooksRouter, { prefix: '/webhooks' })
await fastify.register(integrationsRouter, { prefix: '/api' })
await fastify.register(billingRouter, { prefix: '/api' })

const port = parseInt(process.env['PORT'] ?? '3000', 10)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await fastify.listen({ port, host })
  console.log(`Server running at http://${host}:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
