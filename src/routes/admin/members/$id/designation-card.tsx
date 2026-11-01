import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/admin/members/$id/designation-card')({
  component: AdminDesignationCardRedirectPage,
})

function AdminDesignationCardRedirectPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({
      to: '/admin/members/$id/card',
      params: { id },
      replace: true,
    })
  }, [id, navigate])

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="page-wrap rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-600">
          Designation preview now opens the standard JAS membership card.
        </p>
      </div>
    </main>
  )
}
