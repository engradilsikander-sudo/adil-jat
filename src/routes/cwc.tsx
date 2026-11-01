// src/routes/cwc.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/cwc')({
  component: cwcPage,
})

function cwcPage() {
  return <CmsPublicPage slug="cwc" />
}
