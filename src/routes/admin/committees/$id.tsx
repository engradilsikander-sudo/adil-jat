import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  addCommitteeMember,
  committeeStatusOptions,
  committeeTypeOptions,
  currentUserCanManageCommittees,
  fetchCommitteeDetails,
  fetchDesignations,
  formatCommitteeDate,
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  getCommitteeTypeLabel,
  getCommitteeLocationLabel,
  removeCommitteeMember,
  searchApprovedMembers,
  updateCommittee,
  updateCommitteeMember,
  type CommitteeDetails,
  type CommitteeMemberRecord,
  type CommitteeStatus,
  type CommitteeType,
  type DesignationRecord,
  type MemberSearchFilters,
  type MemberSearchResult,
} from '../../../lib/committees'
import { AdminShell } from '../../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/committees/$id')({
  component: AdminCommitteeDetailPage,
})

type CommitteeForm = {
  committeeType: CommitteeType
  name: string
  division: string
  district: string
  taluka: string
  tenureStart: string
  tenureEnd: string
  status: CommitteeStatus
  publicDisplay: boolean
  notes: string
}

type MemberForm = {
  designationId: string
  designationTitle: string
  status: CommitteeStatus
  sortOrder: string
  tenureStart: string
  tenureEnd: string
  appointmentNotes: string
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

function AdminCommitteeDetailPage() {
  const { id } = Route.useParams()
  const [committee, setCommittee] = useState<CommitteeDetails | null>(null)
  const [designations, setDesignations] = useState<DesignationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [memberSaving, setMemberSaving] = useState(false)
  const [memberSearching, setMemberSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [limitSearchToCommitteeArea, setLimitSearchToCommitteeArea] = useState(true)
  const [committeeForm, setCommitteeForm] = useState<CommitteeForm>({
    committeeType: 'central',
    name: '',
    division: '',
    district: '',
    taluka: '',
    tenureStart: '',
    tenureEnd: '',
    status: 'active',
    publicDisplay: true,
    notes: '',
  })
  const [memberForm, setMemberForm] = useState<MemberForm>({
    designationId: '',
    designationTitle: '',
    status: 'active',
    sortOrder: '1',
    tenureStart: '',
    tenureEnd: '',
    appointmentNotes: '',
  })

  const committeeMembers = useMemo(() => {
    return [...(committee?.members ?? [])].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.designation_title.localeCompare(b.designation_title)
    })
  }, [committee])

  const activeOfficeBearers = useMemo(
    () => committeeMembers.filter((member) => member.status === 'active'),
    [committeeMembers],
  )

  const selectedDesignationTaken = useMemo(() => {
    const normalizedTitle = memberForm.designationTitle.trim().toLowerCase()
    if (!normalizedTitle) return null

    return activeOfficeBearers.find((member) => {
      if (member.id === editingMemberId) return false
      return member.designation_title.trim().toLowerCase() === normalizedTitle
    })
  }, [activeOfficeBearers, editingMemberId, memberForm.designationTitle])

  const selectedMemberAlreadyAssigned = useMemo(() => {
    if (!selectedMember) return null

    return activeOfficeBearers.find(
      (member) => member.member_id === selectedMember.id && member.id !== editingMemberId,
    )
  }, [activeOfficeBearers, editingMemberId, selectedMember])

  const memberSearchFilters = useMemo<MemberSearchFilters>(() => {
    if (!limitSearchToCommitteeArea) {
      return { requireMemberNo: true }
    }

    if (
      committeeForm.committeeType === 'central' ||
      committeeForm.committeeType === 'central_advisory' ||
      committeeForm.committeeType === 'provincial' ||
      committeeForm.committeeType === 'divisional'
    ) {
      return { requireMemberNo: true }
    }

    if (committeeForm.committeeType === 'district') {
      return {
        district: committeeForm.district.trim() || null,
        requireMemberNo: true,
      }
    }

    return {
      district: committeeForm.district.trim() || null,
      taluka: committeeForm.taluka.trim() || null,
      requireMemberNo: true,
    }
  }, [committeeForm.committeeType, committeeForm.division, committeeForm.district, committeeForm.taluka, limitSearchToCommitteeArea])

  const searchScopeLabel = useMemo(() => {
    if (
      !limitSearchToCommitteeArea ||
      committeeForm.committeeType === 'central' ||
      committeeForm.committeeType === 'central_advisory' ||
      committeeForm.committeeType === 'provincial'
    ) {
      return 'Searching all approved JAS members with issued member numbers.'
    }

    if (committeeForm.committeeType === 'divisional') {
      return committeeForm.division.trim()
        ? `Searching approved members for ${committeeForm.division.trim()} level assignment.`
        : 'Add committee division first or turn off area filter.'
    }

    if (committeeForm.committeeType === 'district') {
      return committeeForm.district.trim()
        ? `Searching approved members in ${committeeForm.district.trim()}.`
        : 'Add committee district first or turn off area filter.'
    }

    const parts = [committeeForm.taluka.trim(), committeeForm.district.trim()].filter(Boolean)
    return parts.length
      ? `Searching approved members in ${parts.join(', ')}.`
      : 'Add committee district/taluka first or turn off area filter.'
  }, [committeeForm.committeeType, committeeForm.division, committeeForm.district, committeeForm.taluka, limitSearchToCommitteeArea])

  useEffect(() => {
    void loadDetails()
  }, [id])

  useEffect(() => {
    if (!committee) return

    let cancelled = false

    async function loadScopedDesignations() {
      try {
        const designationList = await fetchDesignations(committeeForm.committeeType)
        if (!cancelled) {
          setDesignations(designationList.filter((item) => item.is_active))
        }
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : 'Failed to load designations.')
        }
      }
    }

    void loadScopedDesignations()

    return () => {
      cancelled = true
    }
  }, [committee, committeeForm.committeeType])

  useEffect(() => {
    if (editingMemberId) return

    const query = memberSearch.trim()
    if (query.length < 2) {
      setMemberResults([])
      setMemberSearching(false)
      return
    }

    let cancelled = false
    setMemberSearching(true)

    const timer = window.setTimeout(() => {
      void searchApprovedMembers(query, memberSearchFilters)
        .then((results) => {
          if (!cancelled) setMemberResults(results)
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setMessage(err instanceof Error ? err.message : 'Member search failed.')
            setMemberResults([])
          }
        })
        .finally(() => {
          if (!cancelled) setMemberSearching(false)
        })
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [editingMemberId, memberSearch, memberSearchFilters])

  async function loadDetails() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageCommittees()
      if (!allowed) {
        setMessage('Only admin or super admin can manage committees and designations.')
        setCommittee(null)
        return
      }

      const details = await fetchCommitteeDetails(id)
      if (!details) {
        setMessage('Level unit not found.')
        setCommittee(null)
        return
      }

      const designationList = await fetchDesignations(details.committee_type)
      setCommittee(details)
      setDesignations(designationList.filter((item) => item.is_active))
      setCommitteeForm({
        committeeType: details.committee_type,
        name: details.name,
        division: details.division ?? '',
        district: details.district ?? '',
        taluka: details.taluka ?? '',
        tenureStart: details.tenure_start ?? '',
        tenureEnd: details.tenure_end ?? '',
        status: details.status,
        publicDisplay: details.public_display,
        notes: details.notes ?? '',
      })
      setMemberForm((current) => ({
        ...current,
        sortOrder: String((details.members?.length ?? 0) + 1),
      }))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load committee.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCommitteeSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!committeeForm.name.trim()) throw new Error('Committee name is required.')
      if (committeeForm.committeeType === 'divisional' && !committeeForm.division.trim()) {
        throw new Error('Division is required for divisional level unit.')
      }
      if (
        (committeeForm.committeeType === 'district' || committeeForm.committeeType === 'taluka') &&
        !committeeForm.district.trim()
      ) {
        throw new Error('District is required for district/taluka level units.')
      }
      if (committeeForm.committeeType === 'taluka' && !committeeForm.taluka.trim()) {
        throw new Error('Taluka is required for taluka level unit.')
      }

      await updateCommittee(id, {
        committee_type: committeeForm.committeeType,
        name: committeeForm.name.trim(),
        division: committeeForm.committeeType === 'divisional' ? committeeForm.division.trim() : null,
        district:
          committeeForm.committeeType === 'district' || committeeForm.committeeType === 'taluka'
            ? committeeForm.district.trim()
            : null,
        taluka: committeeForm.committeeType === 'taluka' ? committeeForm.taluka.trim() : null,
        tenure_start: committeeForm.tenureStart || null,
        tenure_end: committeeForm.tenureEnd || null,
        status: committeeForm.status,
        public_display: committeeForm.publicDisplay,
        notes: committeeForm.notes.trim() || null,
      })

      setMessage('Committee updated successfully.')
      await loadDetails()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update committee.')
    } finally {
      setSaving(false)
    }
  }

  async function handleMemberSearch() {
    const query = memberSearch.trim()
    if (query.length < 2) {
      setMessage('Enter at least 2 characters to search approved members.')
      return
    }

    setMemberSearching(true)
    setMessage('')

    try {
      setMemberResults(await searchApprovedMembers(query, memberSearchFilters))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Member search failed.')
      setMemberResults([])
    } finally {
      setMemberSearching(false)
    }
  }

  function handleCommitteeTypeChange(value: CommitteeType) {
    setCommitteeForm((current) => ({
      ...current,
      committeeType: value,
      division: value === 'divisional' ? current.division : '',
      district: value === 'district' || value === 'taluka' ? current.district : '',
      taluka: value === 'taluka' ? current.taluka : '',
    }))
    resetMemberForm({ keepSearch: true })
  }

  function handleDesignationChange(value: string) {
    const selectedDesignation = designations.find((item) => item.id === value)

    setMemberForm((current) => ({
      ...current,
      designationId: value,
      designationTitle: selectedDesignation?.title ?? current.designationTitle,
    }))
  }

  function selectMember(member: MemberSearchResult) {
    setSelectedMember(member)
    setMemberSearch(`${member.full_name} ${member.member_no ?? ''}`.trim())
  }

  function startEditMember(member: CommitteeMemberRecord) {
    setEditingMemberId(member.id)
    setSelectedMember(null)
    setMemberSearch('')
    setMemberResults([])
    setMemberForm({
      designationId: member.designation_id ?? '',
      designationTitle: member.designation_title,
      status: member.status,
      sortOrder: String(member.sort_order),
      tenureStart: member.tenure_start ?? '',
      tenureEnd: member.tenure_end ?? '',
      appointmentNotes: member.appointment_notes ?? '',
    })
  }

  function resetMemberForm(options?: { keepSearch?: boolean }) {
    setEditingMemberId(null)
    setSelectedMember(null)
    if (!options?.keepSearch) setMemberSearch('')
    setMemberResults([])
    setMemberForm({
      designationId: '',
      designationTitle: '',
      status: 'active',
      sortOrder: String((committee?.members.length ?? 0) + 1),
      tenureStart: '',
      tenureEnd: '',
      appointmentNotes: '',
    })
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMemberSaving(true)
    setMessage('')

    try {
      if (!memberForm.designationTitle.trim()) throw new Error('Designation title is required.')

      const payload = {
        designation_id: memberForm.designationId || null,
        designation_title: memberForm.designationTitle.trim(),
        status: memberForm.status,
        sort_order: Number(memberForm.sortOrder) || 1,
        tenure_start: memberForm.tenureStart || null,
        tenure_end: memberForm.tenureEnd || null,
        appointment_notes: memberForm.appointmentNotes.trim() || null,
      }

      if (editingMemberId) {
        await updateCommitteeMember(editingMemberId, payload)
        setMessage('Assigned designation updated successfully.')
      } else {
        if (!selectedMember) throw new Error('Select an approved member first.')
        if (!selectedMember.member_no) throw new Error('Selected member must have an issued member number.')
        if (selectedMemberAlreadyAssigned) {
          throw new Error(
            `${selectedMember.full_name} already has an active designation in this unit as ${selectedMemberAlreadyAssigned.designation_title}. Edit that record or remove it first.`,
          )
        }

        await addCommitteeMember({
          committee_id: id,
          member: selectedMember,
          ...payload,
        })
        setMessage('Designation assigned successfully.')
      }

      resetMemberForm()
      await loadDetails()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save designation assignment.')
    } finally {
      setMemberSaving(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    const confirmed = window.confirm('Remove this member from this level unit record?')
    if (!confirmed) return

    setMessage('')

    try {
      await removeCommitteeMember(memberId)
      setMessage('Designation assignment removed.')
      await loadDetails()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to remove designation assignment.')
    }
  }

  if (loading) {
    return (
      <AdminShell title="Level Unit Detail" subtitle="Manage level unit information and member designation assignments.">
        <div className="admin-nested-page">
          <div className="page-wrap py-10">
            <StateCard message="Loading level unit details..." />
          </div>
        </div>
      </AdminShell>
    )
  }

  if (!committee) {
    return (
      <AdminShell title="Level Unit Detail" subtitle="Manage level unit information and member designation assignments.">
        <div className="admin-nested-page">
          <div className="page-wrap py-10">
            <StateCard message={message || 'Level unit not found.'} tone="error" />
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Level Unit Detail" subtitle="Manage level unit information and member designation assignments.">
      <div className="admin-nested-page">
        <div className="px-3 py-6 sm:px-4 sm:py-10">
          <div className="page-wrap space-y-6">
        <Link
          to="/admin/committees"
          className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline"
        >
          <ArrowLeft size={16} /> Back to Organization Levels
        </Link>

        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                {getCommitteeTypeLabel(committee.committee_type)}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {committee.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {getCommitteeLocationLabel(committee)} · Tenure{' '}
                {formatCommitteeDate(committee.tenure_start)} to {formatCommitteeDate(committee.tenure_end)}
              </p>
            </div>
            <span className={`rounded-full px-4 py-2 text-xs font-black uppercase ring-1 ${getCommitteeStatusClass(committee.status)}`}>
              {getCommitteeStatusLabel(committee.status)}
            </span>
          </div>
        </header>

        {message ? (
          <StateCard
            message={message}
            tone={isErrorMessage(message) ? 'error' : 'default'}
          />
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <div className="space-y-6">
            <form
              onSubmit={handleCommitteeSave}
              className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Save size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Level Unit Details</h2>
                  <p className="text-sm text-slate-500">Update level, location and tenure.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Level">
                  <select
                    value={committeeForm.committeeType}
                    onChange={(event) => handleCommitteeTypeChange(event.target.value as CommitteeType)}
                    className={inputClass}
                  >
                    {committeeTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Name">
                  <input
                    value={committeeForm.name}
                    onChange={(event) => setCommitteeForm((current) => ({ ...current, name: event.target.value }))}
                    className={inputClass}
                  />
                </Field>

                {committeeForm.committeeType === 'central' || committeeForm.committeeType === 'central_advisory' || committeeForm.committeeType === 'provincial' ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
                    {committeeForm.committeeType === 'central'
                      ? 'Central Executive Committee covers Sindh / Central level, so no area field is required.'
                      : committeeForm.committeeType === 'central_advisory'
                        ? 'Central Advisory Committee covers Sindh / Central advisory level, so no area field is required.'
                        : 'Provincial level covers Sindh / Provincial level, so no district or taluka field is required.'}
                  </div>
                ) : null}

                {committeeForm.committeeType === 'divisional' ? (
                  <Field label="Division">
                    <input
                      value={committeeForm.division}
                      onChange={(event) => setCommitteeForm((current) => ({ ...current, division: event.target.value }))}
                      className={inputClass}
                      placeholder="Mirpur Khas Division"
                    />
                  </Field>
                ) : null}

                {committeeForm.committeeType === 'district' || committeeForm.committeeType === 'taluka' ? (
                  <Field label="District">
                    <input
                      value={committeeForm.district}
                      onChange={(event) => setCommitteeForm((current) => ({ ...current, district: event.target.value }))}
                      className={inputClass}
                      placeholder="Umerkot"
                    />
                  </Field>
                ) : null}

                {committeeForm.committeeType === 'taluka' ? (
                  <Field label="Taluka">
                    <input
                      value={committeeForm.taluka}
                      onChange={(event) => setCommitteeForm((current) => ({ ...current, taluka: event.target.value }))}
                      className={inputClass}
                      placeholder="Kunri"
                    />
                  </Field>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Tenure Start">
                    <input
                      type="date"
                      value={committeeForm.tenureStart}
                      onChange={(event) => setCommitteeForm((current) => ({ ...current, tenureStart: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tenure End">
                    <input
                      type="date"
                      value={committeeForm.tenureEnd}
                      onChange={(event) => setCommitteeForm((current) => ({ ...current, tenureEnd: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Status">
                  <select
                    value={committeeForm.status}
                    onChange={(event) => setCommitteeForm((current) => ({ ...current, status: event.target.value as CommitteeStatus }))}
                    className={inputClass}
                  >
                    {committeeStatusOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>

                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={committeeForm.publicDisplay}
                    onChange={(event) => setCommitteeForm((current) => ({ ...current, publicDisplay: event.target.checked }))}
                  />
                  Public display later
                </label>

                <Field label="Notes">
                  <textarea
                    value={committeeForm.notes}
                    onChange={(event) => setCommitteeForm((current) => ({ ...current, notes: event.target.value }))}
                    className={`${inputClass} min-h-[90px] py-3`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>

            <form
              onSubmit={handleMemberSubmit}
              className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-50 text-lime-800">
                  {editingMemberId ? <Edit3 size={22} /> : <UserPlus size={22} />}
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {editingMemberId ? 'Edit Designation Assignment' : 'Assign Designation'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select an approved member and assign their JAS designation.
                  </p>
                </div>
              </div>

              {!editingMemberId ? (
                <MemberPicker
                  memberSearch={memberSearch}
                  onSearchChange={(value) => {
                    setMemberSearch(value)
                    setSelectedMember(null)
                  }}
                  onSearch={() => void handleMemberSearch()}
                  memberSearching={memberSearching}
                  memberResults={memberResults}
                  selectedMember={selectedMember}
                  onSelectMember={selectMember}
                  alreadyAssignedMemberId={selectedMemberAlreadyAssigned?.member_id ?? null}
                  searchScopeLabel={searchScopeLabel}
                  limitSearchToCommitteeArea={limitSearchToCommitteeArea}
                  onToggleAreaFilter={setLimitSearchToCommitteeArea}
                />
              ) : (
                <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">
                  Editing designation details only. To change the person, remove this assignment and add the correct approved member again.
                </div>
              )}

              <div className="space-y-4">
                <Field label="Designation">
                  <select
                    value={memberForm.designationId}
                    onChange={(event) => handleDesignationChange(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Custom designation</option>
                    {designations.map((designation) => (
                      <option key={designation.id} value={designation.id}>{designation.title}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Designation Title">
                  <input
                    value={memberForm.designationTitle}
                    onChange={(event) => setMemberForm((current) => ({ ...current, designationTitle: event.target.value }))}
                    className={inputClass}
                    placeholder="General Secretary"
                  />
                </Field>

                {selectedDesignationTaken ? (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">
                    {selectedDesignationTaken.designation_title} is already assigned to {selectedDesignationTaken.full_name_snapshot}. You can still save if this designation may have multiple office bearers.
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Status">
                    <select
                      value={memberForm.status}
                      onChange={(event) => setMemberForm((current) => ({ ...current, status: event.target.value as CommitteeStatus }))}
                      className={inputClass}
                    >
                      {committeeStatusOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Display Order">
                    <input
                      type="number"
                      min="1"
                      value={memberForm.sortOrder}
                      onChange={(event) => setMemberForm((current) => ({ ...current, sortOrder: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Tenure Start">
                    <input
                      type="date"
                      value={memberForm.tenureStart}
                      onChange={(event) => setMemberForm((current) => ({ ...current, tenureStart: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tenure End">
                    <input
                      type="date"
                      value={memberForm.tenureEnd}
                      onChange={(event) => setMemberForm((current) => ({ ...current, tenureEnd: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Appointment Notes">
                  <textarea
                    value={memberForm.appointmentNotes}
                    onChange={(event) => setMemberForm((current) => ({ ...current, appointmentNotes: event.target.value }))}
                    className={`${inputClass} min-h-[86px] py-3`}
                    placeholder="Appointment reference, decision note or meeting record."
                  />
                </Field>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="submit"
                    disabled={memberSaving}
                    className="primary-btn disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {memberSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editingMemberId ? 'Update Assignment' : 'Assign Designation'}
                  </button>
                  <button type="button" onClick={() => resetMemberForm()} className="secondary-btn">
                    {editingMemberId ? 'Cancel Edit' : 'Clear Selection'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Assigned Designations</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {committeeMembers.length} assigned member{committeeMembers.length === 1 ? '' : 's'} · {activeOfficeBearers.length} active.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                <Users className="h-4 w-4" /> Level Unit List
              </div>
            </div>

            {committeeMembers.length === 0 ? <StateCard message="No designations assigned yet. Use the form on the left to search an approved member and add the first designation assignment." /> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {committeeMembers.map((member) => (
                <OfficeBearerCard
                  key={member.id}
                  member={member}
                  onEdit={startEditMember}
                  onRemove={(memberId) => void handleRemoveMember(memberId)}
                />
              ))}
            </div>
          </section>
        </section>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function MemberPicker({
  memberSearch,
  onSearchChange,
  onSearch,
  memberSearching,
  memberResults,
  selectedMember,
  onSelectMember,
  alreadyAssignedMemberId,
  searchScopeLabel,
  limitSearchToCommitteeArea,
  onToggleAreaFilter,
}: {
  memberSearch: string
  onSearchChange: (value: string) => void
  onSearch: () => void
  memberSearching: boolean
  memberResults: MemberSearchResult[]
  selectedMember: MemberSearchResult | null
  onSelectMember: (member: MemberSearchResult) => void
  alreadyAssignedMemberId: string | null
  searchScopeLabel: string
  limitSearchToCommitteeArea: boolean
  onToggleAreaFilter: (value: boolean) => void
}) {
  const queryReady = memberSearch.trim().length >= 2

  return (
    <div className="mb-4 space-y-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <Field label="Search & Select Approved Member">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={memberSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Name, father name, mobile or JAS member no"
            />
          </div>
          <button
            type="button"
            onClick={onSearch}
            disabled={memberSearching || !queryReady}
            className="secondary-btn px-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memberSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
          </button>
        </div>
      </Field>

      <label className="flex items-start gap-2 rounded-2xl bg-white p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={limitSearchToCommitteeArea}
          onChange={(event) => onToggleAreaFilter(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          Limit search to level unit area.
          <span className="mt-1 block font-semibold text-slate-500">{searchScopeLabel}</span>
        </span>
      </label>

      {selectedMember ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-black">Selected: {selectedMember.full_name}</p>
              <p className="mt-1 text-xs font-bold text-emerald-800">
                {selectedMember.member_no} · Father: {selectedMember.father_name || 'N/A'}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {selectedMember.district ?? 'District N/A'} {selectedMember.taluka ? `· ${selectedMember.taluka}` : ''}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {alreadyAssignedMemberId ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800 ring-1 ring-red-100">
          This member already has an active designation in this level unit. Edit/remove the existing record first.
        </div>
      ) : null}

      {memberSearching ? <StateCard message="Searching approved members..." /> : null}

      {!memberSearching && queryReady && memberResults.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          No approved member found. Try member number, father name, mobile number, or turn off area filter.
        </div>
      ) : null}

      {memberResults.length ? (
        <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
          {memberResults.map((member) => {
            const isSelected = selectedMember?.id === member.id
            const isAlreadyAssigned = alreadyAssignedMemberId === member.id

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectMember(member)}
                className={`rounded-2xl border p-3 text-left text-sm transition ${
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate font-black text-slate-950">{member.full_name}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">
                      {member.member_no ?? 'No member no'} · Father: {member.father_name || 'N/A'}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {member.district ?? 'District N/A'} {member.taluka ? `· ${member.taluka}` : ''}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-black uppercase ring-1 ${isSelected ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                    {isSelected ? 'Selected' : isAlreadyAssigned ? 'Assigned' : 'Select'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function OfficeBearerCard({
  member,
  onEdit,
  onRemove,
}: {
  member: CommitteeMemberRecord
  onEdit: (member: CommitteeMemberRecord) => void
  onRemove: (memberId: string) => void
}) {
  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            {member.designation_title}
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{member.full_name_snapshot}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {member.member_no_snapshot ?? 'No member no'} · Father: {member.father_name_snapshot ?? 'N/A'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getCommitteeStatusClass(member.status)}`}>
          {getCommitteeStatusLabel(member.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Location" value={`${member.district_snapshot ?? 'N/A'}${member.taluka_snapshot ? ` · ${member.taluka_snapshot}` : ''}`} />
        <Info label="Order" value={String(member.sort_order)} />
        <Info label="Tenure" value={`${formatCommitteeDate(member.tenure_start)} → ${formatCommitteeDate(member.tenure_end)}`} />
        <Info label="Updated" value={formatCommitteeDate(member.updated_at)} />
      </div>

      {member.appointment_notes ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-100">
          {member.appointment_notes}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => onEdit(member)} className="secondary-btn">
          <Edit3 size={15} /> Edit
        </button>
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 shadow-sm transition hover:bg-red-100"
        >
          <Trash2 size={15} /> Remove
        </button>
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  )
}

function StateCard({
  message,
  tone = 'default',
}: {
  message: string
  tone?: 'default' | 'error'
}) {
  return (
    <div
      className={`rounded-2xl p-5 text-sm font-bold ring-1 ${
        tone === 'error'
          ? 'bg-red-50 text-red-700 ring-red-100'
          : 'bg-slate-50 text-slate-600 ring-slate-200'
      }`}
    >
      {tone === 'error' ? <ShieldAlert className="mr-2 inline h-4 w-4" /> : null}
      {message}
    </div>
  )
}

function isErrorMessage(message: string) {
  const value = message.toLowerCase()
  return (
    value.includes('failed') ||
    value.includes('required') ||
    value.includes('only') ||
    value.includes('already') ||
    value.includes('not found')
  )
}
