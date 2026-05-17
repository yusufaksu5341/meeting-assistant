import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { meetingsRouter } from './routes/meetings.js'
import { webhooksRouter } from './routes/webhooks.js'
import { integrationsRouter } from './routes/integrations.js'

const fastify = Fastify({
  logger: {
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  },
})

await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env['VITE_API_URL'] ?? 'http://localhost:5173',
  credentials: true,
})

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

await fastify.register(meetingsRouter, { prefix: '/api' })
await fastify.register(webhooksRouter, { prefix: '/webhooks' })
await fastify.register(integrationsRouter, { prefix: '/api' })

const port = parseInt(process.env['PORT'] ?? '3000', 10)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await fastify.listen({ port, host })
  console.log(`Server running at http://${host}:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
