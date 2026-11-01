import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/designation-card')({
  component: DesignationCardRedirectPage,
})

function DesignationCardRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: '/card', replace: true })
  }, [navigate])

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="page-wrap rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-600">
          Office bearer designations now appear on the standard JAS membership card.
        </p>
      </div>
    </main>
  )
}
