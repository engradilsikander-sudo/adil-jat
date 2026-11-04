import { expect, it, vi } from 'vitest'
import { uploadRemainingProgramDocuments, type ProgramDocumentUploadProgress } from './upload-recovery'

type Kind = 'identity' | 'resume'
const file1 = new File(['identity'], 'identity.pdf', { type: 'application/pdf' })
const file2 = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })

function makeHarness() {
  const progress = new Map<Kind, ProgramDocumentUploadProgress>()
  const makePath = vi.fn((kind: Kind) => `member/application/${kind}.pdf`)
  const upload = vi.fn(async (_kind: Kind, _file: File, _path: string) => {})
  const record = vi.fn(async (_kind: Kind, _file: File, _path: string) => {})
  const args = {
    options: [{ type: 'identity', label: 'Identity' }, { type: 'resume', label: 'Resume' }] as const,
    files: { identity: file1, resume: file2 }, progress, makePath,
    validate: (_kind: Kind, _file: File) => null,
    upload, record,
  }
  return { progress, makePath, upload, record, args }
}

it('uploads and records each selected document once', async () => {
  const h = makeHarness()
  await uploadRemainingProgramDocuments(h.args)
  await uploadRemainingProgramDocuments(h.args)
  expect(h.upload).toHaveBeenCalledTimes(2)
  expect(h.record).toHaveBeenCalledTimes(2)
  expect(h.makePath).toHaveBeenCalledTimes(2)
})

it('retries only the failed upload, preserving the first completed document', async () => {
  const h = makeHarness()
  h.upload.mockRejectedValueOnce(new Error('network error'))
  await expect(uploadRemainingProgramDocuments(h.args)).rejects.toThrow('Identity: network error')
  expect(h.record).not.toHaveBeenCalled()
  await uploadRemainingProgramDocuments(h.args)
  expect(h.makePath).toHaveBeenCalledTimes(2)
  expect(h.upload).toHaveBeenCalledTimes(3)
  expect(h.record).toHaveBeenCalledTimes(2)
})

it('metadata failure retries the same path without re-uploading the file', async () => {
  const h = makeHarness()
  h.record.mockRejectedValueOnce(new Error('DB temporarily unavailable'))
  await expect(uploadRemainingProgramDocuments(h.args)).rejects.toThrow('Identity: DB temporarily unavailable')
  expect(h.upload).toHaveBeenCalledTimes(1)
  await uploadRemainingProgramDocuments(h.args)
  expect(h.upload).toHaveBeenCalledTimes(2)
  expect(h.record).toHaveBeenCalledTimes(3)
  expect(h.record.mock.calls[0]?.[2]).toBe(h.record.mock.calls[1]?.[2])
})

it('skips already finished files if a later document fails', async () => {
  const h = makeHarness()
  h.upload.mockImplementation(async (kind) => { if (kind === 'resume') throw new Error('try later') })
  await expect(uploadRemainingProgramDocuments(h.args)).rejects.toThrow('Resume: try later')
  h.upload.mockImplementation(async () => {})
  await uploadRemainingProgramDocuments(h.args)
  expect(h.upload.mock.calls.filter(([kind]) => kind === 'identity')).toHaveLength(1)
  expect(h.record.mock.calls.filter(([kind]) => kind === 'identity')).toHaveLength(1)
})

it('rejects a changed file instead of associating new content with a saved upload', async () => {
  const h = makeHarness()
  h.record.mockRejectedValueOnce(new Error('temporary'))
  await expect(uploadRemainingProgramDocuments(h.args)).rejects.toThrow('temporary')
  await expect(uploadRemainingProgramDocuments({ ...h.args, files: {
    ...h.args.files, identity: new File(['different'], 'identity.pdf', { type: 'application/pdf' }),
  } })).rejects.toThrow('selected document changed')
  expect(h.upload).toHaveBeenCalledTimes(1)
})

it('validates files before allocating a path or uploading', async () => {
  const h = makeHarness()
  await expect(uploadRemainingProgramDocuments({ ...h.args,
    validate: () => 'Invalid file',
  })).rejects.toThrow('Identity: Invalid file')
  expect(h.makePath).not.toHaveBeenCalled()
  expect(h.upload).not.toHaveBeenCalled()
})
