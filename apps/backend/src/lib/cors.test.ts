import { describe, expect, it } from 'vitest'
import { app } from '../app'
import { CUSTOMIZATION_CORS_POLICY } from './cors'
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
  it('declares every storefront customization upload header for the Vite dev server', () => {
    expect(CUSTOMIZATION_CORS_POLICY.allowHeaders).toEqual(expect.arrayContaining([
      'Content-Type',
      'X-Upload-Token',
      'X-Shopper-Draft-Id',
      'X-Shopper-Field-Id',
    ]))
  })

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

  it('serves static font file with public CORS headers on GET', async () => {
    const response = await app.request('/fonts/SansBold.ttf', {
      method: 'GET',
      headers: {
        Origin: 'https://trophy-admin.pages.dev',
      },
    }, {} as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('font/ttf')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Cache-Control')).toContain('public')
    expect(response.headers.get('Vary')).toContain('Origin')
  })

  it('serves static font file via alias with public CORS headers', async () => {
    const response = await app.request('/fonts/sans-regular', {
      method: 'GET',
      headers: {
        Origin: 'https://trophy-admin.pages.dev',
      },
    }, {} as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('font/ttf')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('permits a font preflight from any origin', async () => {
    const response = await app.request('/fonts/SansBold.ttf', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://trophy-admin.pages.dev',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'range',
      },
    }, {} as never)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET')
  })

  it('falls back to static font in assets brands route with public CORS', async () => {
    const response = await app.request('/api/assets/brands/SansBold.ttf/content', {
      method: 'GET',
      headers: {
        Origin: 'https://trophy-admin.pages.dev',
      },
    }, {
      CUSTOMIZATION_ASSETS: { get: async () => null },
    } as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('font/ttf')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
