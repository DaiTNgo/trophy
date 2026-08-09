import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/client', () => ({ getDb: vi.fn() }))

import { getDb } from '../db/client'
import { processR2CleanupJobs, r2CleanupJobValues } from './r2-cleanup-outbox'

function createDb(jobs: Array<{ id: string; objectKey: string; attempts: number }>, claimed = true) {
  const updates: Array<{ set: unknown }> = []
  const selectChain: any = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    limit: vi.fn(async () => jobs),
  }
  const updateChain: any = {
    set: vi.fn((set: unknown) => {
      updates.push({ set })
      return updateChain
    }),
    where: vi.fn(() => updateChain),
    returning: vi.fn(() => updateChain),
    get: vi.fn(async () => claimed ? { id: 'job-1' } : null),
  }
  return {
    updates,
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
  }
}

describe('R2 cleanup outbox', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deduplicates object keys when queuing cleanup work', () => {
    const jobs = r2CleanupJobValues(['a', 'a', 'b'])
    expect(jobs).toHaveLength(2)
    expect(jobs.map((job) => job.objectKey)).toEqual(['a', 'b'])
  })

  it('marks a successful R2 deletion complete', async () => {
    const db = createDb([{ id: 'job-1', objectKey: 'background.png', attempts: 0 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    const deleteObject = vi.fn(async () => undefined)
    const env = { CUSTOMIZATION_ASSETS: { delete: deleteObject } } as never

    await processR2CleanupJobs(env)

    expect(deleteObject).toHaveBeenCalledWith('background.png')
    expect(db.updates).toContainEqual({ set: expect.objectContaining({ completedAt: expect.any(String), lastError: null }) })
  })

  it('does not delete an R2 object when another worker has already leased the job', async () => {
    const db = createDb([{ id: 'job-1', objectKey: 'background.png', attempts: 0 }], false)
    vi.mocked(getDb).mockReturnValue(db as never)
    const deleteObject = vi.fn(async () => undefined)

    await processR2CleanupJobs({ CUSTOMIZATION_ASSETS: { delete: deleteObject } } as never)

    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('records a retry with an incremented attempt count after an R2 failure', async () => {
    const db = createDb([{ id: 'job-1', objectKey: 'background.png', attempts: 2 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    const env = {
      CUSTOMIZATION_ASSETS: { delete: vi.fn(async () => { throw new Error('R2 unavailable') }) },
    } as never

    await processR2CleanupJobs(env)

    expect(db.updates).toContainEqual({
      set: expect.objectContaining({
        attempts: 3,
        lastError: 'R2 unavailable',
        nextAttemptAt: expect.any(String),
      }),
    })
  })
})
