import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'

/** In-memory only: no application fields, medical details, or File objects enter browser storage. */
export function useProgramApplicationContinuity<F extends object>({
  form,
  initialForm,
  files,
  leaveConfirm,
}: {
  form: F
  initialForm: F
  files: object
  leaveConfirm: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [savedApplication, setSavedApplication] = useState<{ id: string; userId: string } | null>(null)
  const busyRef = useRef(false)
  const completeRef = useRef(false)
  const savedRef = useRef<{ id: string; userId: string } | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm) ||
    Object.values(files).some(Boolean) || Boolean(savedApplication)
  const shouldGuard = !completeRef.current && (dirty || submitting)

  useBlocker({
    shouldBlockFn: () => !completeRef.current && (dirty || busyRef.current) && !window.confirm(leaveConfirm),
    enableBeforeUnload: shouldGuard,
  })

  function start() {
    if (busyRef.current || completeRef.current) return false
    busyRef.current = true
    setSubmitting(true)
    return true
  }

  function stop() {
    busyRef.current = false
    setSubmitting(false)
  }

  function markSaved(id: string, userId: string) {
    if (savedRef.current) throw new Error('An application has already been saved.')
    const record = { id, userId }
    savedRef.current = record
    setSavedApplication(record)
  }

  function complete() {
    completeRef.current = true
  }

  return { submitting, savedApplication, savedRef, start, stop, markSaved, complete }
}
