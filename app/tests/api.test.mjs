import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('built Lambda handlers', () => {
  it('health returns a healthy response', async () => {
    process.env.AWS_REGION = 'us-east-1'
    const { default: handler } = await import(
      '../.output/server/chunks/routes/api/health.get.mjs'
    )
    const response = await handler({})

    assert.equal(response.status, 'healthy')
    assert.equal(response.region, 'us-east-1')
    assert.equal(response.version, '1.0.0')
    assert.ok(response.timestamp)
  })

  it('render returns server-side data', async () => {
    const { default: handler } = await import(
      '../.output/server/chunks/routes/api/render.get.mjs'
    )
    const response = await handler({})

    assert.equal(response.renderMode, 'server-side')
    assert.ok(typeof response.requestId === 'string' && response.requestId.length > 0)
    assert.ok(typeof response.counter === 'number')
    assert.equal(response.version, '1.1.0')
  })
})
