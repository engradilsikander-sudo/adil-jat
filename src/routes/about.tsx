// src/routes/about.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/about')({
  component: aboutPage,
})

function aboutPage() {
  return <CmsPublicPage slug="about" />
}
