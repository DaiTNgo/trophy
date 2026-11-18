import { describe, expect, it } from 'vitest'
import { FONT_FILES } from '@trophy/customization'
import { app } from '../app'
import '../index'
import { getStaticFontBytes } from '../lib/static-fonts'

const request = (path: string) => app.request(path, { method: 'GET' }, {} as never)

describe('default font URLs', () => {
  it('serves the file mapped to every default font variant', async () => {
    for (const [variantId, file] of Object.entries(FONT_FILES)) {
      const response = await request(`/fonts/${variantId}`)
      expect(response.status, variantId).toBe(200)
      const bytes = new Uint8Array(await response.arrayBuffer())
      expect(bytes, variantId).toEqual(getStaticFontBytes(file))
    }
  })

  it('serves the regular file for a bare default family name', async () => {
    const sans = new Uint8Array(await (await request('/fonts/sans')).arrayBuffer())
    expect(sans).toEqual(getStaticFontBytes('Sans-Regular.ttf'))
    const script = new Uint8Array(await (await request('/fonts/script.ttf')).arrayBuffer())
    expect(script).toEqual(getStaticFontBytes('ScriptElegant.ttf'))
  })

  it('serves default fonts by their file name regardless of casing', async () => {
    expect((await request('/fonts/Sans-Regular.ttf')).status).toBe(200)
    expect((await request('/fonts/serif-bolditalic.ttf')).status).toBe(200)
  })

  it('serves a distinct file for each style of the sans and serif families', async () => {
    for (const family of ['sans', 'serif']) {
      const bodies = new Set<string>()
      for (const style of ['regular', 'bold', 'italic', 'bold-italic']) {
        const response = await request(`/fonts/${family}-${style}`)
        expect(response.status, `${family}-${style}`).toBe(200)
        bodies.add(Buffer.from(await response.arrayBuffer()).toString('base64'))
      }
      expect(bodies.size, family).toBe(4)
    }
  })

  it('has no bold or italic file for the script family', async () => {
    for (const style of ['script-bold', 'script-italic', 'script-bold-italic']) {
      expect((await request(`/fonts/${style}`)).status, style).toBe(404)
    }
  })

  it('returns a typed 404 for an unknown font', async () => {
    const response = await request('/fonts/does-not-exist')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })
})
