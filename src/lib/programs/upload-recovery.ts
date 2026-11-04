/** Resume document uploads without creating another application or re-uploading completed files.
 * Progress remains in memory only for the lifetime of the current form tab.
 */
export type ProgramDocumentUploadProgress = {
  file: File
  path: string
  uploaded: boolean
  recorded: boolean
}

export async function uploadRemainingProgramDocuments<K extends string>({
  options,
  files,
  progress,
  makePath,
  validate,
  upload,
  record,
}: {
  options: readonly { type: K; label: string }[]
  files: Partial<Record<K, File | null>>
  progress: Map<K, ProgramDocumentUploadProgress>
  makePath: (type: K, file: File) => string
  validate: (type: K, file: File) => string | null
  upload: (type: K, file: File, path: string) => Promise<void>
  record: (type: K, file: File, path: string) => Promise<void>
}) {
  for (const option of options) {
    const file = files[option.type]
    if (!file) continue

    const validationError = validate(option.type, file)
    if (validationError) throw new Error(`${option.label}: ${validationError}`)

    let entry = progress.get(option.type)
    if (entry && entry.file !== file) {
      throw new Error(`${option.label}: selected document changed after the application was saved.`)
    }
    if (!entry) {
      entry = { file, path: makePath(option.type, file), uploaded: false, recorded: false }
      progress.set(option.type, entry)
    }
    if (!entry.uploaded) {
      try { await upload(option.type, file, entry.path) }
      catch (error) {
        throw new Error(`${option.label}: ${error instanceof Error ? error.message : 'Upload failed'}`)
      }
      entry.uploaded = true
    }
    if (!entry.recorded) {
      try { await record(option.type, file, entry.path) }
      catch (error) {
        throw new Error(`${option.label}: ${error instanceof Error ? error.message : 'Document record failed'}`)
      }
      entry.recorded = true
    }
  }
}
