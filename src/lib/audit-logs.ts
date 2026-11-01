import { supabase } from "./supabase/client";

export type AuditAction = "insert" | "update" | "delete";

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  action_label: string;
  module_key: string;
  entity_table: string;
  entity_id: string | null;
  record_label: string | null;
  changed_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type AuditLogFilters = {
  moduleKey?: string;
  entityTable?: string;
  actorUserId?: string | null;
  query?: string;
  limit?: number;
};

export const auditModuleOptions = [
  { value: "", label: "All modules" },
  { value: "membership", label: "Membership" },
  { value: "roles", label: "Roles" },
  { value: "area_permissions", label: "Area Permissions" },
  { value: "committees", label: "Committees" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "welfare", label: "Welfare" },
  { value: "employment", label: "Employment" },
  { value: "finance", label: "Finance" },
  { value: "media", label: "News & Media" },
  { value: "cms", label: "CMS" },
  { value: "system", label: "System" },
] as const;

export const auditTableOptions = [
  { value: "", label: "All tables" },
  { value: "members", label: "Members" },
  { value: "membership_payments", label: "Membership Payments" },
  { value: "profile_update_requests", label: "Profile Update Requests" },
  { value: "member_card_csv_exports", label: "Member Card CSV Exports" },
  { value: "user_roles", label: "User Roles" },
  { value: "admin_area_permissions", label: "Area Permissions" },
  { value: "program_applications", label: "Program Applications" },
  { value: "program_documents", label: "Program Documents" },
  { value: "finance_donations", label: "Finance Donations" },
  { value: "finance_expenses", label: "Finance Expenses" },
  { value: "organization_committees", label: "Committees" },
  { value: "organization_designations", label: "Designations" },
  { value: "organization_committee_members", label: "Office Bearers" },
  { value: "cms_pages", label: "CMS Pages" },
  { value: "news_posts", label: "News Posts" },
  { value: "gallery_items", label: "Gallery Items" },
  { value: "events", label: "Events" },
] as const;

export async function fetchAuditLogs(filters: AuditLogFilters = {}) {
  const { data, error } = await (supabase as any).rpc("get_audit_logs", {
    _module_key: filters.moduleKey || null,
    _entity_table: filters.entityTable || null,
    _actor_user_id: filters.actorUserId || null,
    _query: filters.query || "",
    _limit: filters.limit || 100,
  });

  if (error) {
    throw new Error(error.message || "Failed to load audit logs.");
  }

  return (data || []) as AuditLogRow[];
}

export function getAuditModuleLabel(moduleKey: string | null | undefined) {
  if (!moduleKey) return "System";
  return (
    auditModuleOptions.find((item) => item.value === moduleKey)?.label ||
    toTitle(moduleKey)
  );
}

export function getAuditTableLabel(tableName: string | null | undefined) {
  if (!tableName) return "Unknown table";
  return (
    auditTableOptions.find((item) => item.value === tableName)?.label ||
    toTitle(tableName)
  );
}

export function getAuditActionLabel(action: string | null | undefined) {
  if (action === "insert") return "Created";
  if (action === "update") return "Updated";
  if (action === "delete") return "Deleted";
  return "Changed";
}

export function getAuditActionClass(action: string | null | undefined) {
  if (action === "insert")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (action === "update") return "border-amber-200 bg-amber-50 text-amber-800";
  if (action === "delete") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function formatAuditDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function auditLogsToCsv(rows: AuditLogRow[]) {
  const header = [
    "created_at",
    "actor_email",
    "action",
    "action_label",
    "module_key",
    "entity_table",
    "entity_id",
    "record_label",
    "changed_data",
  ];

  const lines = rows.map((row) =>
    [
      row.created_at,
      row.actor_email || "",
      row.action,
      row.action_label,
      row.module_key,
      row.entity_table,
      row.entity_id || "",
      row.record_label || "",
      JSON.stringify(row.changed_data || {}),
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export function downloadAuditCsv(rows: AuditLogRow[]) {
  const csv = auditLogsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jas-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
  return normalized;
}

function toTitle(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
