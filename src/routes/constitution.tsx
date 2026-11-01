// src/routes/constitution.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/constitution')({
  component: constitutionPage,
})

function constitutionPage() {
  return <CmsPublicPage slug="constitution" />
}
