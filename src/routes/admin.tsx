// src/routes/admin.tsx
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  BarChart3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  IdCard,
  ImageOff,
  ListChecks,
  MapPin,
  Network,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase/client";
import {
  formatDisplayDate as formatDate,
  maskCnic,
  maskMobile,
  uniqueSorted,
} from "../lib/shared/formatters";
import { useAdminDashboardCopy } from "../lib/admin-dashboard-i18n";
import { AdminShell } from "../components/admin/AdminShell";
import { useI18n } from "../lib/i18n";
import {
  filterRowsByAreaAccess,
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from "../lib/area-permissions";
import {
  fetchAuditLogs,
  formatAuditDate,
  getAuditActionClass,
  getAuditModuleLabel,
  type AuditLogRow,
} from "../lib/audit-logs";
import { buildFullMemberCardCsv } from "../lib/admin-member-card-csv";
import {
  buildMemberCardExportFileName,
  buildMemberCardExportSearchFilter,
  fetchMembersForCardCsv,
  getMemberCardExportDateStart,
  logMemberCardCsvExportAudit,
} from "../lib/admin-member-card-export";
import { PUBLIC_SITE_ORIGIN } from "../lib/member-card-config";
import { fetchActiveMemberCardDesignations } from "../lib/member-card-designation";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const adminRoleNames = [
  "admin",
  "super_admin",
  "membership_admin",
  "education_admin",
  "health_admin",
  "employment_admin",
  "ration_admin",
  "welfare_admin",
  "finance_admin",
] as const;

type AdminRoleName = (typeof adminRoleNames)[number];
type AdminModuleKey =
  | "membership"
  | "education"
  | "health"
  | "welfare"
  | "employment"
  | "finance"
  | "cms"
  | "media"
  | "reports"
  | "roles"
  | "area-permissions"
  | "audit-logs"
  | "committees";

type MemberStatus = "pending" | "approved" | "rejected";
type StatusFilter = "all" | MemberStatus;
type DateFilter = "all" | "today" | "7d" | "30d";
type SortBy = "newest" | "oldest" | "name" | "district";

type Member = {
  id: string;
  full_name: string;
  cnic: string;
  mobile: string;
  district: string;
  taluka: string | null;
  photo_url: string | null;
  status: MemberStatus;
  member_no: string | null;
  created_at: string;
};

type AdminAccessResult =
  | { ok: true; userId: string; roles: AdminRoleName[] }
  | { ok: false; redirectTo: "/login" | "/dashboard" };

type AdminRouteTo =
  | "/admin/finance"
  | "/admin/cms"
  | "/admin/news"
  | "/admin/reports"
  | "/admin/committees"
  | "/admin/roles"
  | "/admin/area-permissions"
  | "/admin/audit-logs";

type AdminQuickActionConfig = {
  key: AdminModuleKey;
  title: string;
  description: string;
  to?: AdminRouteTo;
  icon: LucideIcon;
  tone: "emerald" | "amber" | "sky" | "violet" | "slate" | "rose";
  metric?: string;
  metricLabel?: string;
  onClick?: () => void;
};

const ADMIN_MEMBERS_PAGE_SIZE = 50;
const ADMIN_MEMBERS_RESTRICTED_FETCH_LIMIT = 200;
const MEMBER_PHOTO_BUCKET = "member-photos";
const MEMBER_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

const adminDashboardDedupeCopy = {
  en: {
    priorityWork: "Priority Work",
    workQueueTitle: "Admin work queue",
    workQueueDescription:
      "Important membership review numbers and daily admin shortcuts are shown here.",
    pendingApplications: "Pending applications",
    approvedMembers: "Approved members",
    cardsIssued: "Cards issued",
    cleanerFlow: "Membership Summary",
    navigationMoved: "Current member records",
    navigationMovedDescription:
      "Quick overview of total and rejected membership applications in the current admin records.",
    total: "Total",
    rejected: "Rejected",
    quickActions: "Quick actions",
    frequentTasks: "Frequent admin tasks",
    actions: {
      reviewPending: {
        title: "Review pending members",
        description:
          "Open the member table with pending applications selected.",
        metricLabel: "Pending",
      },
      finance: {
        title: "Finance",
        description:
          "Track donations, expenses, receipts and finance audit logs.",
      },
      reports: {
        title: "Reports",
        description: "View organization summaries, exports and review reports.",
      },
      news: {
        title: "News",
        description: "Create or update public announcements and news posts.",
      },
      cms: {
        title: "CMS",
        description: "Edit public website pages and multilingual content.",
      },
      committees: {
        title: "Organization Levels",
        description: "Manage level units used for designation assignment.",
      },
    },
  },
  ur: {
    priorityWork: "اہم کام",
    workQueueTitle: "ایڈمن ورک کیو",
    workQueueDescription:
      "اہم ممبرشپ ریویو نمبرز اور روزمرہ ایڈمن شارٹ کٹس یہاں دکھائے جاتے ہیں۔",
    pendingApplications: "زیر التواء درخواستیں",
    approvedMembers: "منظور شدہ ممبرز",
    cardsIssued: "جاری شدہ کارڈز",
    cleanerFlow: "ممبرشپ خلاصہ",
    navigationMoved: "موجودہ ممبر ریکارڈ",
    navigationMovedDescription:
      "موجودہ ایڈمن ریکارڈز میں کل اور رد شدہ ممبرشپ درخواستوں کا مختصر جائزہ۔",
    total: "کل",
    rejected: "رد شدہ",
    quickActions: "فوری ایکشنز",
    frequentTasks: "عام ایڈمن کام",
    actions: {
      reviewPending: {
        title: "زیر التواء ممبرز ریویو کریں",
        description:
          "ممبر ٹیبل کو زیر التواء درخواستوں کے فلٹر کے ساتھ کھولیں۔",
        metricLabel: "زیر التواء",
      },
      finance: {
        title: "فنانس",
        description: "ڈونیشنز، اخراجات، رسیدیں اور فنانس آڈٹ لاگز ٹریک کریں۔",
      },
      reports: {
        title: "رپورٹس",
        description: "تنظیمی خلاصے، ایکسپورٹس اور ریویو رپورٹس دیکھیں۔",
      },
      news: {
        title: "نیوز",
        description: "عوامی اعلانات اور نیوز پوسٹس بنائیں یا اپڈیٹ کریں۔",
      },
      cms: {
        title: "CMS",
        description: "پبلک ویب سائٹ صفحات اور ملٹی لنگول مواد ایڈٹ کریں۔",
      },
      committees: {
        title: "کمیٹیز",
        description: "مرکزی، ڈویژنل، ضلعی اور تعلقہ کمیٹیز مینیج کریں۔",
      },
    },
  },
  sd: {
    priorityWork: "اهم ڪم",
    workQueueTitle: "ايڊمن ورڪ ڪيو",
    workQueueDescription:
      "اهم ميمبرشپ ريَويو نمبر ۽ روزمره ايڊمن شارٽ ڪٽس هتي ڏيکاريا وڃن ٿا.",
    pendingApplications: "زير التوا درخواستون",
    approvedMembers: "منظور ٿيل ميمبر",
    cardsIssued: "جاري ٿيل ڪارڊ",
    cleanerFlow: "ميمبرشپ خلاصو",
    navigationMoved: "موجوده ميمبر رڪارڊ",
    navigationMovedDescription:
      "موجوده ايڊمن رڪارڊز ۾ ڪل ۽ رد ٿيل ميمبرشپ درخواستن جو مختصر جائزو.",
    total: "ڪل",
    rejected: "رد ٿيل",
    quickActions: "جلدي عمل",
    frequentTasks: "عام ايڊمن ڪم",
    actions: {
      reviewPending: {
        title: "زير التوا ميمبر ريَويو ڪريو",
        description: "ميمبر ٽيبل کي زير التوا درخواستن جي فلٽر سان کوليو.",
        metricLabel: "زير التوا",
      },
      finance: {
        title: "فنانس",
        description: "ڊونيشنز، خرچ، رسيدون ۽ فنانس آڊٽ لاگز ٽريڪ ڪريو.",
      },
      reports: {
        title: "رپورٽس",
        description: "تنظيمي خلاصا، ايڪسپورٽس ۽ ريَويو رپورٽس ڏسو.",
      },
      news: {
        title: "نيوز",
        description: "عوامي اعلان ۽ نيوز پوسٽس ٺاهيو يا اپڊيٽ ڪريو.",
      },
      cms: {
        title: "CMS",
        description: "پبلڪ ويب سائيٽ صفحا ۽ ملٽي لنگول مواد ايڊٽ ڪريو.",
      },
      committees: {
        title: "ڪميٽيز",
        description: "مرڪزي، ڊويزنل، ضلعي ۽ تعلقي ڪميٽيز مينيج ڪريو.",
      },
    },
  },
} as const;

function AdminPage() {
  const navigate = useNavigate();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const isNestedAdminPage = normalizedPathname !== "/admin";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPhotoUrls, setMemberPhotoUrls] = useState<
    Record<string, string>
  >({});
  const [memberResultCount, setMemberResultCount] = useState(0);
  const [memberPage, setMemberPage] = useState(0);
  const [adminRoles, setAdminRoles] = useState<AdminRoleName[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [talukaFilter, setTalukaFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState("");
  const [areaNotice, setAreaNotice] = useState("");
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogRow[]>([]);
  const hasLoadedMembersRef = useRef(false);
  const adminCopy = useAdminDashboardCopy();
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const loadAdmin = useCallback(
    async (
      cancelledRef?: { current: boolean },
      options?: { silent?: boolean },
    ) => {
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setAreaNotice("");

      try {
        const access = await ensureAdminAccess();

        if (!access.ok) {
          if (!cancelledRef?.current) {
            await navigate({ to: access.redirectTo });
          }

          return;
        }

        if (!canManageMembersFromRoles(access.roles)) {
          if (!cancelledRef?.current) {
            await navigate({ to: getPrimaryAdminRoute(access.roles) });
          }

          return;
        }

        if (!cancelledRef?.current) {
          setAdminRoles(access.roles);
        }

        const areaAccess = await loadCurrentAdminAreaAccess(
          "membership",
          "view",
          {
            requiredRoles: ["admin", "super_admin", "membership_admin"],
            userId: access.userId,
            roles: access.roles,
          },
        );

        if (!areaAccess.ok) {
          throw new Error(areaAccess.message);
        }

        let membersQuery = supabase
          .from("members")
          .select(
            [
              "id",
              "full_name",
              "cnic",
              "mobile",
              "district",
              "taluka",
              "photo_url",
              "status",
              "member_no",
              "created_at",
            ].join(", "),
            { count: "exact" },
          );

        if (statusFilter !== "all") {
          membersQuery = membersQuery.eq("status", statusFilter);
        }

        if (districtFilter !== "all") {
          membersQuery = membersQuery.eq("district", districtFilter);
        }

        if (talukaFilter !== "all") {
          membersQuery = membersQuery.eq("taluka", talukaFilter);
        }

        const dateStart = getMemberCardExportDateStart(dateFilter);

        if (dateStart) {
          membersQuery = membersQuery.gte("created_at", dateStart);
        }

        const searchFilter = buildMemberCardExportSearchFilter(debouncedSearch);

        if (searchFilter) {
          membersQuery = membersQuery.or(searchFilter);
        }

        if (sortBy === "oldest") {
          membersQuery = membersQuery.order("created_at", { ascending: true });
        } else if (sortBy === "name") {
          membersQuery = membersQuery
            .order("full_name", { ascending: true })
            .order("created_at", { ascending: false });
        } else if (sortBy === "district") {
          membersQuery = membersQuery
            .order("district", { ascending: true })
            .order("taluka", { ascending: true })
            .order("created_at", { ascending: false });
        } else {
          membersQuery = membersQuery.order("created_at", { ascending: false });
        }

        membersQuery = membersQuery.order("id", { ascending: true });

        const pageFrom = memberPage * ADMIN_MEMBERS_PAGE_SIZE;
        const pageTo = pageFrom + ADMIN_MEMBERS_PAGE_SIZE - 1;

        const pagedMembersQuery = areaAccess.isRestricted
          ? membersQuery.limit(
              Math.max(
                ADMIN_MEMBERS_PAGE_SIZE,
                Math.min(ADMIN_MEMBERS_RESTRICTED_FETCH_LIMIT, pageTo + 1),
              ),
            )
          : membersQuery.range(pageFrom, pageTo);

        const {
          data,
          error: membersError,
          count,
        } = await pagedMembersQuery.returns<Member[]>();

        if (membersError) throw membersError;

        const safeMembers = areaAccess.isRestricted
          ? filterRowsByAreaAccess(data ?? [], areaAccess).slice(
              pageFrom,
              pageTo + 1,
            )
          : filterRowsByAreaAccess(data ?? [], areaAccess);

        const resultCount = count ?? safeMembers.length;

        if (resultCount > 0 && pageFrom >= resultCount && memberPage > 0) {
          if (!cancelledRef?.current) {
            setMemberPage(0);
          }

          return;
        }

        const recentLogs = access.roles.includes("super_admin")
          ? await fetchAuditLogs({ limit: 6 }).catch(() => [])
          : [];

        if (!cancelledRef?.current) {
          setMembers(safeMembers);
          setMemberResultCount(resultCount);
          setAreaNotice(getAreaAccessSummaryText(areaAccess));
          setRecentAuditLogs(recentLogs);
        }
      } catch (err) {
        if (!cancelledRef?.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load admin members.",
          );
        }
      } finally {
        if (!cancelledRef?.current) {
          setLoading(false);
          setRefreshing(false);
          hasLoadedMembersRef.current = true;
        }
      }
    },
    [
      dateFilter,
      debouncedSearch,
      districtFilter,
      memberPage,
      navigate,
      sortBy,
      statusFilter,
      talukaFilter,
    ],
  );

  useEffect(() => {
    setMemberPage(0);
  }, [
    dateFilter,
    debouncedSearch,
    districtFilter,
    sortBy,
    statusFilter,
    talukaFilter,
  ]);

  useEffect(() => {
    if (isNestedAdminPage) return;

    const cancelledRef = { current: false };

    void loadAdmin(cancelledRef, { silent: hasLoadedMembersRef.current });

    return () => {
      cancelledRef.current = true;
    };
  }, [isNestedAdminPage, loadAdmin]);

  useEffect(() => {
    let cancelled = false;

    const membersWithPhotos = members.filter((member) =>
      Boolean(member.photo_url),
    );

    if (membersWithPhotos.length === 0) {
      setMemberPhotoUrls({});
      return () => {
        cancelled = true;
      };
    }

    async function loadMemberPhotoUrls() {
      const entries = await Promise.all(
        membersWithPhotos.map(async (member) => {
          const signedUrl = await createAdminMemberPhotoSignedUrl(
            member.photo_url,
          );

          if (!signedUrl) return null;

          return [member.id, signedUrl] as const;
        }),
      );

      if (cancelled) return;

      setMemberPhotoUrls(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, string] =>
            Boolean(entry),
          ),
        ),
      );
    }

    void loadMemberPhotoUrls();

    return () => {
      cancelled = true;
    };
  }, [members]);

  const stats = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        acc.total += 1;
        acc[member.status] += 1;

        if (canOpenMemberCard(member)) {
          acc.cards += 1;
        }

        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cards: 0,
      },
    );
  }, [members]);

  const districtOptions = useMemo(() => {
    return uniqueSorted(
      members.map((member) => member.district).filter(Boolean),
    );
  }, [members]);

  const talukaOptions = useMemo(() => {
    const source =
      districtFilter === "all"
        ? members
        : members.filter((member) => member.district === districtFilter);

    return uniqueSorted(
      source.map((member) => member.taluka ?? "").filter(Boolean),
    );
  }, [districtFilter, members]);

  const filteredMembers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    const result = members.filter((member) => {
      const matchesStatus =
        statusFilter === "all" || member.status === statusFilter;

      const matchesDistrict =
        districtFilter === "all" || member.district === districtFilter;

      const matchesTaluka =
        talukaFilter === "all" || member.taluka === talukaFilter;

      const matchesDate = matchesDateFilter(member.created_at, dateFilter);

      const matchesSearch =
        query.length === 0 || buildMemberSearchText(member).includes(query);

      return (
        matchesStatus &&
        matchesDistrict &&
        matchesTaluka &&
        matchesDate &&
        matchesSearch
      );
    });

    return sortMembers(result, sortBy);
  }, [
    dateFilter,
    districtFilter,
    members,
    debouncedSearch,
    sortBy,
    statusFilter,
    talukaFilter,
  ]);

  const totalMemberPages = Math.max(
    1,
    Math.ceil(
      (memberResultCount || filteredMembers.length) / ADMIN_MEMBERS_PAGE_SIZE,
    ),
  );
  const currentMemberPage = Math.min(memberPage + 1, totalMemberPages);
  const pageStartNumber =
    memberResultCount > 0 ? memberPage * ADMIN_MEMBERS_PAGE_SIZE + 1 : 0;
  const pageEndNumber = Math.min(
    (memberPage + 1) * ADMIN_MEMBERS_PAGE_SIZE,
    memberResultCount || filteredMembers.length,
  );
  const canGoToPreviousMembersPage = memberPage > 0;
  const canGoToNextMembersPage = memberPage + 1 < totalMemberPages;

  const hasActiveFilters =
    statusFilter !== "all" ||
    districtFilter !== "all" ||
    talukaFilter !== "all" ||
    dateFilter !== "all" ||
    searchInput.trim().length > 0;

  function resetFilters() {
    setStatusFilter("all");
    setDistrictFilter("all");
    setTalukaFilter("all");
    setDateFilter("all");
    setSortBy("newest");
    setSearchInput("");
  }

  function handleDistrictFilter(value: string) {
    setDistrictFilter(value);
    setTalukaFilter("all");
  }

  function goToPreviousMembersPage() {
    setMemberPage((page) => Math.max(0, page - 1));
  }

  function goToNextMembersPage() {
    setMemberPage((page) => Math.min(totalMemberPages - 1, page + 1));
  }

  async function exportCsv() {
    const confirmed = window.confirm(adminCopy.exportConfirm);
    if (!confirmed) return;

    setExportingCsv(true);
    setError("");

    try {
      const access = await ensureAdminAccess();

      if (!access.ok) {
        await navigate({ to: access.redirectTo });
        return;
      }

      if (!canManageMembersFromRoles(access.roles)) {
        await navigate({ to: getPrimaryAdminRoute(access.roles) });
        return;
      }

      const areaAccess = await loadCurrentAdminAreaAccess(
        "membership",
        "view",
        {
          requiredRoles: ["admin", "super_admin", "membership_admin"],
          userId: access.userId,
          roles: access.roles,
        },
      );

      if (!areaAccess.ok) {
        throw new Error(areaAccess.message);
      }

      const exportMembers = await fetchMembersForCardCsv({
        statusFilter,
        districtFilter,
        talukaFilter,
        dateFilter,
        sortBy,
        search: debouncedSearch,
        areaAccess,
      });

      if (exportMembers.length === 0) {
        throw new Error("No member records are available for this CSV export.");
      }

      const designationsByMemberId =
        await fetchActiveMemberCardDesignations(
          exportMembers.map((member) => member.id),
          { throwOnError: true },
        );

      const csv = buildFullMemberCardCsv({
        members: exportMembers,
        designationsByMemberId,
        publicVerifyOrigin: PUBLIC_SITE_ORIGIN,
      });
      const fileName = buildMemberCardExportFileName();
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      try {
        await logMemberCardCsvExportAudit({
          statusFilter,
          districtFilter,
          talukaFilter,
          dateFilter,
          sortBy,
          search: debouncedSearch,
          areaAccess,
          recordCount: exportMembers.length,
          fileName,
        });

        link.href = url;
        link.download = fileName;
        link.click();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to export full member card data.",
      );
    } finally {
      setExportingCsv(false);
    }
  }

  if (isNestedAdminPage) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <AdminShell title={adminCopy.title} subtitle={adminCopy.subtitle}>
        <div className="rounded-3xl bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
            {adminCopy.loading}
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={adminCopy.title} subtitle={adminCopy.subtitle}>
      <div className="space-y-6">
        <header className="admin-dashboard-hero overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                  {adminCopy.brandEyebrow}
                </p>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {adminCopy.title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {adminCopy.subtitle}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {adminRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100"
                    >
                      {adminCopy.roleLabels[role] ?? role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:flex">
                <button
                  type="button"
                  onClick={() => setShowSensitive((value) => !value)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition ${
                    showSensitive
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {showSensitive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showSensitive
                    ? adminCopy.hideSensitive
                    : adminCopy.showSensitive}
                </button>

                <button
                  type="button"
                  onClick={() => void loadAdmin(undefined, { silent: true })}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? adminCopy.refreshing : adminCopy.refresh}
                </button>
              </div>
            </div>
          </div>

          {showSensitive ? (
            <div className="flex items-start gap-3 border-b border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 sm:px-7">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="m-0">{adminCopy.sensitiveWarning}</p>
            </div>
          ) : null}

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
            <StatCard
              label={adminCopy.stats.totalMembers}
              value={stats.total}
              tone="slate"
              icon={<Users className="h-5 w-5" />}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatCard
              label={adminCopy.stats.pendingReview}
              value={stats.pending}
              tone="amber"
              icon={<ListChecks className="h-5 w-5" />}
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            />
            <StatCard
              label={adminCopy.stats.approved}
              value={stats.approved}
              tone="emerald"
              icon={<UserCheck className="h-5 w-5" />}
              active={statusFilter === "approved"}
              onClick={() => setStatusFilter("approved")}
            />
            <StatCard
              label={adminCopy.stats.rejected}
              value={stats.rejected}
              tone="red"
              icon={<XCircle className="h-5 w-5" />}
              active={statusFilter === "rejected"}
              onClick={() => setStatusFilter("rejected")}
            />
            <StatCard
              label={adminCopy.stats.cardsIssued}
              value={stats.cards}
              tone="gold"
              icon={<IdCard className="h-5 w-5" />}
              active={false}
              onClick={() => setStatusFilter("approved")}
            />
          </div>
        </header>

        <AdminProgramShortcuts
          roles={adminRoles}
          stats={stats}
          onReviewPending={() => setStatusFilter("pending")}
        />

        {recentAuditLogs.length > 0 ? (
          <RecentAdminActivityCard rows={recentAuditLogs} />
        ) : null}

        {areaNotice ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{areaNotice}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="admin-members-section rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                <Filter className="h-3.5 w-3.5" />
                {adminCopy.membership.eyebrow}
              </div>

              <h2 className="mt-3 text-lg font-black text-slate-950">
                {adminCopy.membership.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {adminCopy.membership.showing(
                  filteredMembers.length,
                  memberResultCount || members.length,
                )}
              </p>

              {memberResultCount > ADMIN_MEMBERS_PAGE_SIZE ? (
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Use Next/Previous to browse more records, or search/filter to
                  narrow the list.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={filteredMembers.length === 0 || exportingCsv}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exportingCsv ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exportingCsv
                  ? adminCopy.membership.exportingCardCsv
                  : adminCopy.membership.exportCardCsv}
              </button>

              <button type="button" className="secondary-btn" onClick={() => {
                setStatusFilter('pending'); setSortBy('oldest'); setMemberPage(0);
              }}>Review oldest pending</button>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {adminCopy.membership.clearFilters}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
                placeholder={adminCopy.membership.searchPlaceholder}
                aria-label={adminCopy.membership.searchAria}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
              aria-label={adminCopy.membership.statusAria}
            >
              <option value="all">{adminCopy.membership.allStatuses}</option>
              <option value="pending">{adminCopy.status.pending}</option>
              <option value="approved">{adminCopy.status.approved}</option>
              <option value="rejected">{adminCopy.status.rejected}</option>
            </select>

            <select
              value={districtFilter}
              onChange={(event) => handleDistrictFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
              aria-label={adminCopy.membership.districtAria}
            >
              <option value="all">{adminCopy.membership.allDistricts}</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              value={talukaFilter}
              onChange={(event) => setTalukaFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
              aria-label={adminCopy.membership.talukaAria}
            >
              <option value="all">{adminCopy.membership.allTalukas}</option>
              {talukaOptions.map((taluka) => (
                <option key={taluka} value={taluka}>
                  {taluka}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as DateFilter)
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
              aria-label={adminCopy.membership.dateAria}
            >
              <option value="all">{adminCopy.membership.allDates}</option>
              <option value="today">{adminCopy.membership.today}</option>
              <option value="7d">{adminCopy.membership.last7Days}</option>
              <option value="30d">{adminCopy.membership.last30Days}</option>
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
              {adminCopy.membership.cardCsvHint}
            </p>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              aria-label={adminCopy.membership.sortAria}
            >
              <option value="newest">{adminCopy.membership.sortNewest}</option>
              <option value="oldest">{adminCopy.membership.sortOldest}</option>
              <option value="name">{adminCopy.membership.sortName}</option>
              <option value="district">
                {adminCopy.membership.sortDistrict}
              </option>
            </select>
          </div>

          {memberResultCount > ADMIN_MEMBERS_PAGE_SIZE ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600">
                Showing {pageStartNumber}-{pageEndNumber} of {memberResultCount}{" "}
                records · Page {currentMemberPage} of {totalMemberPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMembersPage}
                  disabled={!canGoToPreviousMembersPage || refreshing}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous 50
                </button>
                <button
                  type="button"
                  onClick={goToNextMembersPage}
                  disabled={!canGoToNextMembersPage || refreshing}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next 50
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:hidden">
            {filteredMembers.map((member) => (
              <MobileMemberCard
                key={member.id}
                member={member}
                photoUrl={memberPhotoUrls[member.id]}
                showSensitive={showSensitive}
              />
            ))}

            {filteredMembers.length === 0 ? (
              <EmptyState
                title={adminCopy.membership.noMembers}
                message={adminCopy.membership.noMembersMessage}
              />
            ) : null}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{adminCopy.table.photo}</th>
                  <th className="px-4 py-3">{adminCopy.table.member}</th>
                  <th className="px-4 py-3">{adminCopy.table.cnicMobile}</th>
                  <th className="px-4 py-3">{adminCopy.table.district}</th>
                  <th className="px-4 py-3">{adminCopy.table.status}</th>
                  <th className="px-4 py-3">{adminCopy.table.memberNo}</th>
                  <th className="px-4 py-3">{adminCopy.table.submitted}</th>
                  <th className="px-4 py-3">{adminCopy.table.digitalCard}</th>
                  <th className="px-4 py-3 text-right">
                    {adminCopy.table.application}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="bg-white transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <MemberPhoto
                        src={memberPhotoUrls[member.id]}
                        alt={member.full_name}
                        className="h-12 w-12 rounded-xl object-cover object-top ring-1 ring-slate-200"
                        fallbackClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                        fallbackText={<ImageOff className="h-4 w-4" />}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {adminCopy.table.id}: {member.id.slice(0, 8)}...
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">
                        {showSensitive ? member.cnic : maskCnic(member.cnic)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {showSensitive
                          ? member.mobile
                          : maskMobile(member.mobile)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                        {member.district}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.taluka || adminCopy.mobile.noTaluka}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {member.member_no ? (
                        <span className="font-bold">{member.member_no}</span>
                      ) : (
                        <span className="text-slate-400">
                          {adminCopy.mobile.notIssued}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(member.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <CardAccess member={member} layout="desktop" />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ViewApplicationLink memberId={member.id} />
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6">
                      <EmptyState
                        title="No members found"
                        message="Try changing the search text or filters."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function AdminProgramShortcuts({
  roles,
  stats,
  onReviewPending,
}: {
  roles: readonly AdminRoleName[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cards: number;
  };
  onReviewPending: () => void;
}) {
  const copy = useAdminDashboardCopy();
  const { language } = useI18n();
  const localCopy = adminDashboardDedupeCopy[language];
  const isSuperAdmin = roles.includes("super_admin");
  const accessLabel = isSuperAdmin
    ? copy.access.superAdmin
    : roles.includes("admin")
      ? copy.access.centralAdmin
      : copy.access.roleBased;

  const quickActions: AdminQuickActionConfig[] = [
    {
      key: "membership",
      title: localCopy.actions.reviewPending.title,
      description: localCopy.actions.reviewPending.description,
      icon: ListChecks,
      tone: "emerald",
      metric: String(stats.pending),
      metricLabel: localCopy.actions.reviewPending.metricLabel,
      onClick: onReviewPending,
    },
    {
      key: "finance",
      title: localCopy.actions.finance.title,
      description: localCopy.actions.finance.description,
      to: "/admin/finance",
      icon: BadgeIndianRupee,
      tone: "emerald",
    },
    {
      key: "reports",
      title: localCopy.actions.reports.title,
      description: localCopy.actions.reports.description,
      to: "/admin/reports",
      icon: BarChart3,
      tone: "sky",
    },
    {
      key: "media",
      title: localCopy.actions.news.title,
      description: localCopy.actions.news.description,
      to: "/admin/news",
      icon: Newspaper,
      tone: "amber",
    },
    {
      key: "cms",
      title: localCopy.actions.cms.title,
      description: localCopy.actions.cms.description,
      to: "/admin/cms",
      icon: FileText,
      tone: "violet",
    },
    {
      key: "committees",
      title: localCopy.actions.committees.title,
      description: localCopy.actions.committees.description,
      to: "/admin/committees",
      icon: Network,
      tone: "slate",
    },
  ];

  const visibleQuickActions = quickActions.filter((action) =>
    canAccessAdminModule(roles, action.key),
  );

  return (
    <section className="admin-overview-section rounded-[2rem] bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="admin-work-queue rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                {localCopy.priorityWork}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {localCopy.workQueueTitle}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {localCopy.workQueueDescription}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-emerald-100">
              {accessLabel}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={onReviewPending}
              className="admin-work-card text-left"
            >
              <span className="admin-work-card-icon bg-amber-100 text-amber-800">
                <ListChecks className="h-5 w-5" />
              </span>
              <span className="admin-work-card-value">{stats.pending}</span>
              <span className="admin-work-card-label">
                {localCopy.pendingApplications}
              </span>
            </button>

            <div className="admin-work-card">
              <span className="admin-work-card-icon bg-emerald-100 text-emerald-800">
                <UserCheck className="h-5 w-5" />
              </span>
              <span className="admin-work-card-value">{stats.approved}</span>
              <span className="admin-work-card-label">
                {localCopy.approvedMembers}
              </span>
            </div>

            <div className="admin-work-card">
              <span className="admin-work-card-icon bg-slate-100 text-slate-800">
                <IdCard className="h-5 w-5" />
              </span>
              <span className="admin-work-card-value">{stats.cards}</span>
              <span className="admin-work-card-label">
                {localCopy.cardsIssued}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-dashboard-note rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            {localCopy.cleanerFlow}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            {localCopy.navigationMoved}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {localCopy.navigationMovedDescription}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase text-slate-500">
                {localCopy.total}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {stats.total}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase text-slate-500">
                {localCopy.rejected}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {stats.rejected}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-quick-actions mt-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              {localCopy.quickActions}
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
              {localCopy.frequentTasks}
            </h2>
          </div>

          <p className="text-sm font-bold text-slate-500">
            {copy.modules.available(visibleQuickActions.length)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleQuickActions.map((action) => (
            <AdminQuickAction key={action.key} action={action} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminQuickAction({ action }: { action: AdminQuickActionConfig }) {
  const Icon = action.icon;
  const tone = getQuickActionTone(action.tone);
  const content = (
    <>
      <span className={`admin-quick-action-icon ${tone.icon}`}>
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-slate-950">
          {action.title}
        </span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">
          {action.description}
        </span>
      </span>

      {action.metric ? (
        <span className="admin-quick-action-metric">
          <strong>{action.metric}</strong>
          <small>{action.metricLabel}</small>
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
      )}
    </>
  );

  if (action.onClick) {
    return (
      <button
        type="button"
        onClick={action.onClick}
        className={`admin-quick-action ${tone.card}`}
      >
        {content}
      </button>
    );
  }

  if (!action.to) {
    return <div className={`admin-quick-action ${tone.card}`}>{content}</div>;
  }

  return (
    <Link to={action.to} className={`admin-quick-action ${tone.card}`}>
      {content}
    </Link>
  );
}

function getQuickActionTone(tone: AdminQuickActionConfig["tone"]) {
  const tones: Record<
    AdminQuickActionConfig["tone"],
    {
      card: string;
      icon: string;
    }
  > = {
    emerald: {
      card: "border-emerald-200 hover:bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-800",
    },
    amber: {
      card: "border-amber-200 hover:bg-amber-50",
      icon: "bg-amber-100 text-amber-800",
    },
    sky: {
      card: "border-sky-200 hover:bg-sky-50",
      icon: "bg-sky-100 text-sky-800",
    },
    violet: {
      card: "border-violet-200 hover:bg-violet-50",
      icon: "bg-violet-100 text-violet-800",
    },
    slate: {
      card: "border-slate-200 hover:bg-slate-50",
      icon: "bg-slate-100 text-slate-800",
    },
    rose: {
      card: "border-rose-200 hover:bg-rose-50",
      icon: "bg-rose-100 text-rose-800",
    },
  };

  return tones[tone];
}

function MobileMemberCard({
  member,
  photoUrl,
  showSensitive,
}: {
  member: Member;
  photoUrl?: string;
  showSensitive: boolean;
}) {
  const copy = useAdminDashboardCopy();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <MemberPhoto
          src={photoUrl}
          alt={member.full_name}
          className="h-14 w-14 shrink-0 rounded-xl object-cover object-top ring-1 ring-slate-200"
          fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200"
          fallbackText={<ImageOff className="h-4 w-4" />}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="min-w-0 text-base font-black leading-tight text-slate-950">
              {member.full_name}
            </h2>

            <StatusBadge status={member.status} />
          </div>

          <p className="mt-1 break-all text-xs font-medium text-slate-500">
            {copy.mobile.cnic}:{" "}
            {showSensitive ? member.cnic : maskCnic(member.cnic)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {copy.mobile.submitted}: {formatDate(member.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-500">
            {copy.mobile.location}
          </p>
          <p className="mt-1 font-bold text-slate-950">{member.district}</p>
          <p className="text-xs text-slate-500">
            {member.taluka || copy.mobile.noTaluka}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-500">
            {copy.mobile.memberNo}
          </p>
          <p className="mt-1 break-all font-bold text-slate-950">
            {member.member_no ?? copy.mobile.notIssued}
          </p>
          <p className="text-xs text-slate-500">
            {showSensitive ? member.mobile : maskMobile(member.mobile)}
          </p>
        </div>
      </div>

      <CardAccess member={member} layout="mobile" />

      <div className="mt-4">
        <ViewApplicationLink memberId={member.id} fullWidth />
      </div>
    </article>
  );
}

function RecentAdminActivityCard({ rows }: { rows: AuditLogRow[] }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Audit trail
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-950">
            Recent admin activity
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Latest sensitive actions recorded for JAS production review.
          </p>
        </div>

        <Link
          to="/admin/audit-logs"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 no-underline shadow-sm transition hover:bg-slate-50"
        >
          View full audit log
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${getAuditActionClass(row.action)}`}
                  >
                    {row.action_label || row.action}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    {getAuditModuleLabel(row.module_key)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-black text-slate-900">
                  {row.record_label || row.entity_table}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {row.actor_email || "System/server action"}
                </p>
              </div>
              <time className="shrink-0 text-xs font-bold text-slate-400">
                {formatAuditDate(row.created_at)}
              </time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "emerald" | "red" | "gold";
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const toneStyles: Record<
    "slate" | "amber" | "emerald" | "red" | "gold",
    string
  > = {
    slate: active
      ? "border-slate-300 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-950 hover:bg-slate-50",
    amber: active
      ? "border-amber-300 bg-amber-500 text-white"
      : "border-amber-100 bg-amber-50 text-amber-900 hover:bg-amber-100",
    emerald: active
      ? "border-emerald-300 bg-emerald-600 text-white"
      : "border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    red: active
      ? "border-red-300 bg-red-600 text-white"
      : "border-red-100 bg-red-50 text-red-900 hover:bg-red-100",
    gold: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-950 hover:from-amber-100 hover:to-yellow-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${toneStyles[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              active ? "text-white/75" : "opacity-70"
            }`}
          >
            {label}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>

        <span className={active ? "text-white/80" : "opacity-75"}>{icon}</span>
      </div>
    </button>
  );
}

function CardAccess({
  member,
  layout,
}: {
  member: Member;
  layout: "mobile" | "desktop";
}) {
  const copy = useAdminDashboardCopy();
  const isReady = canOpenMemberCard(member);

  if (isReady) {
    return (
      <div
        className={
          layout === "mobile"
            ? "mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-3 shadow-sm"
            : "min-w-[190px]"
        }
      >
        {layout === "mobile" ? (
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              {copy.card.digitalMemberCard}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {copy.card.sameDesign}
            </p>
          </div>
        ) : null}

        <Link
          to="/admin/members/$id/card"
          params={{ id: member.id }}
          className={
            layout === "mobile"
              ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black !text-slate-950 no-underline shadow-sm transition hover:bg-amber-300 hover:!text-slate-950"
              : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-bold !text-amber-900 no-underline shadow-sm transition hover:bg-amber-100 hover:!text-amber-950"
          }
          style={layout === "mobile" ? { color: "#020617" } : undefined}
        >
          <IdCard className="h-4 w-4" />
          {copy.card.openSameMemberCard}
        </Link>
      </div>
    );
  }

  const message =
    member.status !== "approved"
      ? copy.card.availableAfterApproval
      : copy.card.memberNoNotIssued;

  return (
    <div
      className={
        layout === "mobile"
          ? "mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
          : "min-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      }
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {copy.card.digitalCard}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
}

function ViewApplicationLink({
  memberId,
  fullWidth = false,
}: {
  memberId: string;
  fullWidth?: boolean;
}) {
  const copy = useAdminDashboardCopy();

  return (
    <Link
      to="/admin/members/$id"
      params={{ id: memberId }}
      className={`jas-dark-action-link inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold no-underline shadow-sm transition ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <ShieldCheck className="h-4 w-4" />
      {copy.viewApplication}
    </Link>
  );
}

function MemberPhoto({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackText,
}: {
  src?: string;
  alt: string;
  className: string;
  fallbackClassName: string;
  fallbackText: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <div className={fallbackClassName}>{fallbackText}</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-center ring-1 ring-slate-100">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const copy = useAdminDashboardCopy();
  const config: Record<
    MemberStatus,
    {
      icon: ReactNode;
      className: string;
      text: string;
    }
  > = {
    pending: {
      icon: <ListChecks className="h-3.5 w-3.5" />,
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      text: copy.status.pending,
    },
    approved: {
      icon: <BadgeCheck className="h-3.5 w-3.5" />,
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      text: copy.status.approved,
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "bg-red-50 text-red-700 ring-red-200",
      text: copy.status.rejected,
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${item.className}`}
    >
      {item.icon}
      {item.text}
    </span>
  );
}

async function createAdminMemberPhotoSignedUrl(photoPath: string | null) {
  if (!photoPath) return null;

  if (/^https?:\/\//i.test(photoPath)) {
    return photoPath;
  }

  const { data, error } = await supabase.storage
    .from(MEMBER_PHOTO_BUCKET)
    .createSignedUrl(photoPath, MEMBER_PHOTO_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn(
      "Admin member photo could not be loaded:",
      error?.message ?? photoPath,
    );
    return null;
  }

  return data.signedUrl;
}

async function ensureAdminAccess(): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, redirectTo: "/login" };
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", adminRoleNames);

  if (roleError || !roles?.length) {
    return { ok: false, redirectTo: "/dashboard" };
  }

  const safeRoles = roles
    .map((item) => item.role)
    .filter((role): role is AdminRoleName =>
      adminRoleNames.includes(role as AdminRoleName),
    );

  if (!safeRoles.length) {
    return { ok: false, redirectTo: "/dashboard" };
  }

  return { ok: true, userId: user.id, roles: safeRoles };
}

function canAccessAdminModule(
  roles: readonly AdminRoleName[],
  moduleKey: AdminModuleKey,
) {
  if (roles.includes("super_admin")) {
    return true;
  }

  if (
    moduleKey === "roles" ||
    moduleKey === "area-permissions" ||
    moduleKey === "audit-logs"
  ) {
    return false;
  }

  if (roles.includes("admin")) {
    return true;
  }

  const roleByModule: Partial<Record<AdminModuleKey, AdminRoleName>> = {
    membership: "membership_admin",
    education: "education_admin",
    health: "health_admin",
    welfare: "welfare_admin",
    employment: "employment_admin",
    finance: "finance_admin",
  };

  const requiredRole = roleByModule[moduleKey];

  return requiredRole ? roles.includes(requiredRole) : false;
}

function canManageMembersFromRoles(roles: readonly AdminRoleName[]) {
  return canAccessAdminModule(roles, "membership");
}

function getPrimaryAdminRoute(
  roles: readonly AdminRoleName[],
):
  | "/admin/programs/education"
  | "/admin/programs/health"
  | "/admin/programs/welfare"
  | "/admin/programs/employment"
  | "/admin/finance"
  | "/admin/cms"
  | "/admin/news"
  | "/admin/reports"
  | "/admin/roles"
  | "/admin/area-permissions"
  | "/admin/audit-logs"
  | "/admin/committees"
  | "/dashboard" {
  if (roles.includes("education_admin")) return "/admin/programs/education";
  if (roles.includes("health_admin")) return "/admin/programs/health";
  if (roles.includes("welfare_admin")) return "/admin/programs/welfare";
  if (roles.includes("employment_admin")) return "/admin/programs/employment";
  if (roles.includes("finance_admin")) return "/admin/finance";
  return "/dashboard";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function buildMemberSearchText(member: Member) {
  return [
    member.full_name,
    member.cnic,
    member.mobile,
    member.district,
    member.taluka ?? "",
    member.member_no ?? "",
    member.status,
  ]
    .join(" ")
    .toLowerCase();
}

function canOpenMemberCard(member: Member) {
  return member.status === "approved" && Boolean(member.member_no);
}

function sortMembers(members: Member[], sortBy: SortBy) {
  const copy = [...members];

  switch (sortBy) {
    case "oldest":
      return copy.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case "name":
      return copy.sort((a, b) => a.full_name.localeCompare(b.full_name));
    case "district":
      return copy.sort((a, b) => {
        const district = a.district.localeCompare(b.district);
        if (district !== 0) return district;
        return a.full_name.localeCompare(b.full_name);
      });
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

function matchesDateFilter(value: string, filter: DateFilter) {
  if (filter === "all") return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }

  const days = filter === "7d" ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return date >= cutoff;
}
