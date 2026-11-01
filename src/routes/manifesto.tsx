// src/routes/manifesto.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/manifesto')({
  component: manifestoPage,
})

function manifestoPage() {
  return <CmsPublicPage slug="manifesto" />
}
