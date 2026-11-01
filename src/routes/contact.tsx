// src/routes/contact.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/contact')({
  component: contactPage,
})

function contactPage() {
  return <CmsPublicPage slug="contact" />
}
