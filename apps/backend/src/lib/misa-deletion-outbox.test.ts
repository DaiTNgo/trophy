import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/client', () => ({ getDb: vi.fn() }))
vi.mock('./misa', () => {
  class MisaRequestError extends Error {
    readonly status: number
    readonly method: string
    readonly resource: string
    constructor(message: string, status: number, request: { method?: string; resource?: string } = {}) {
      super(message)
      this.status = status
      this.method = request.method ?? 'GET'
      this.resource = request.resource ?? ''
    }
  }
  return { deleteMisaProducts: vi.fn(), MisaRequestError }
})

import { getDb } from '../db/client'
import { MisaRequestError, deleteMisaProducts } from './misa'
import { misaDeletionJobValues, processMisaDeletionJobs } from './misa-deletion-outbox'

function createDb(jobs: Array<{ id: string; misaProductId: number; attempts: number }>) {
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
    get: vi.fn(async () => ({ id: 'job-1' })),
  }
  return { updates, select: vi.fn(() => selectChain), update: vi.fn(() => updateChain) }
}

describe('MISA deletion outbox', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deduplicates MISA product ids when queuing work', () => {
    expect(misaDeletionJobValues([10, 10, 11]).map((job) => job.misaProductId)).toEqual([10, 11])
  })

  it('marks a successful remote deletion complete after leasing the job', async () => {
    const db = createDb([{ id: 'job-1', misaProductId: 10, attempts: 0 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(deleteMisaProducts).mockResolvedValue(null)

    await processMisaDeletionJobs({} as never)

    expect(deleteMisaProducts).toHaveBeenCalledWith(expect.anything(), [10])
    expect(db.updates).toContainEqual({ set: expect.objectContaining({ completedAt: expect.any(String), leaseToken: null }) })
  })

  it('treats MISA not found as an idempotent completed deletion', async () => {
    const db = createDb([{ id: 'job-1', misaProductId: 10, attempts: 2 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(deleteMisaProducts).mockRejectedValue(new MisaRequestError('not found', 404, { method: 'DELETE', resource: '/Products' }))

    await processMisaDeletionJobs({} as never)

    expect(db.updates).toContainEqual({ set: expect.objectContaining({ completedAt: expect.any(String), lastError: null }) })
  })

  it('records an exponential-backoff retry for other MISA errors', async () => {
    const db = createDb([{ id: 'job-1', misaProductId: 10, attempts: 2 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(deleteMisaProducts).mockRejectedValue(new MisaRequestError('unavailable', 503))

    await processMisaDeletionJobs({} as never)

    expect(db.updates).toContainEqual({
      set: expect.objectContaining({ attempts: 3, lastError: 'unavailable', nextAttemptAt: expect.any(String) }),
    })
  })

  it('retries a 404 returned before DELETE /Products', async () => {
    const db = createDb([{ id: 'job-1', misaProductId: 10, attempts: 2 }])
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(deleteMisaProducts).mockRejectedValue(new MisaRequestError('token endpoint missing', 404, { method: 'POST', resource: '/Account' }))

    await processMisaDeletionJobs({} as never)

    expect(db.updates).toContainEqual({
      set: expect.objectContaining({ attempts: 3, lastError: 'token endpoint missing', nextAttemptAt: expect.any(String) }),
    })
  })
})
