// src/routes/vision-mission.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CmsPublicPage } from './-cms-public-page'

export const Route = createFileRoute('/vision-mission')({
  component: visionmissionPage,
})

function visionmissionPage() {
  return <CmsPublicPage slug="vision-mission" />
}
