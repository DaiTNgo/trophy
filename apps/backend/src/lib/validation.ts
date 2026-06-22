import type { Context } from 'hono'
import * as v from 'valibot'

const issuePathToString = (path: unknown) => {
  if (!Array.isArray(path)) {
    return null
  }

  const segments = path
    .map((item) => {
      if (typeof item === 'object' && item && 'key' in item) {
        return String(item.key)
      }

      return null
    })
    .filter(Boolean)

  return segments.length > 0 ? segments.join('.') : null
}

const formatIssues = (issues: unknown[]) =>
  issues.map((issue) => {
    const typedIssue = issue as {
      message?: string
      path?: unknown
    }

    return {
      message: typedIssue.message ?? 'Invalid value',
      path: issuePathToString(typedIssue.path)
    }
  })

export const jsonError = (c: Context, status: number, error: string) =>
  c.json({ error }, status as 400 | 404 | 409 | 422)

export const parseJson = async <TOutput>(
  c: Context,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
) => {
  const payload = await c.req.json().catch(() => undefined)

  if (payload === undefined) {
    return {
      success: false as const,
      response: c.json({ error: 'Invalid JSON body' }, 400)
    }
  }

  const result = v.safeParse(schema, payload)

  if (!result.success) {
    return {
      success: false as const,
      response: c.json(
        {
          error: 'Validation failed',
          issues: formatIssues(result.issues)
        },
        400
      )
    }
  }

  return {
    success: true as const,
    output: result.output
  }
}

export const parseParams = <TOutput>(
  c: Context,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
) => {
  const result = v.safeParse(schema, c.req.param())

  if (!result.success) {
    return {
      success: false as const,
      response: c.json(
        {
          error: 'Validation failed',
          issues: formatIssues(result.issues)
        },
        400
      )
    }
  }

  return {
    success: true as const,
    output: result.output
  }
}
