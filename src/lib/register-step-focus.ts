function focusAndReveal(target: HTMLElement, block: ScrollLogicalPosition) {
  const headerHeight = document.querySelector('.jas-header')?.getBoundingClientRect().height ?? 0
  target.style.scrollMarginTop = `${Math.ceil(headerHeight) + 16}px`
  target.focus({ preventScroll: true })
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  target.scrollIntoView({ block, behavior: reduceMotion ? 'instant' : 'smooth' })
}

/** Run after the new step has mounted. Never moves focus on unrelated form edits. */
export function focusRegistrationStep(container: HTMLElement) {
  const heading = container.querySelector<HTMLElement>('h2')
  if (!heading) return false
  heading.tabIndex = -1
  focusAndReveal(heading, 'start')
  return true
}

/** Focus the rendered invalid field after validation changes to a different step. */
export function focusInvalidRegistrationField(container: HTMLElement) {
  const invalid = container.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!invalid) return false
  focusAndReveal(invalid, 'center')
  return true
}
