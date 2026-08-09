import { describe, expect, it } from 'vitest'
import { app } from '../app'
import '../index'

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

describe('storefront CORS', () => {
  it('permits a customization upload preflight from any origin', async () => {
    const response = await app.request('/api/storefront/customizations/assets', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://router-cf.dai-ngo.workers.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': [
          'content-type',
          'x-upload-token',
          'x-shopper-draft-id',
          'x-shopper-field-id',
        ].join(', '),
      },
    }, {} as never)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-shopper-field-id')
  })
})

describe('public asset CORS', () => {
  it('permits an asset preflight from any origin', async () => {
    const response = await app.request('/api/assets/products/asset-1/content', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://trophy-admin.pages.dev',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization',
      },
    }, {} as never)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('authorization')
  })
})
