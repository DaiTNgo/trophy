import { describe, expect, it } from 'vitest'
import { app } from '../app'

describe('admin session CORS', () => {
  it('permits If-Match during a credentialed admin preflight', async () => {
    const response = await app.request('/api/admin/products/7/customization/activate', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, if-match',
      },
    }, {} as never)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('If-Match')
  })
})
