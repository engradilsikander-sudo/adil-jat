import { assertMembershipPaymentCollectionEnabled } from '../membership-fee';
// src/lib/admin/actions.ts
import { createServerFn } from "@tanstack/react-start";
import { createSupabaseAdminClient } from "../supabase/admin";
import {
  MEMBERSHIP_BASE_FEE,
  MEMBERSHIP_FEE_CURRENCY,
  type MembershipPayment,
} from "../membership-fee";
import {
  validateApproveInput,
  validateMemberEditInput,
  validatePaymentStatusInput,
  validateReceiptInput,
  validateRejectInput,
} from "./member-action-validation";

type MemberStatus = "pending" | "approved" | "rejected";

const MEMBERSHIP_REVIEW_ROLES: Array<
  "admin" | "super_admin" | "membership_admin"
> = ["admin", "super_admin", "membership_admin"];

type MemberReviewRow = {
  id: string;
  user_id: string;
  full_name: string;
  status: MemberStatus;
  member_no: string | null;
};

type AdminActor = Awaited<ReturnType<typeof requireMembershipReviewer>>["user"];

type AuditAction = "insert" | "update" | "delete";

type AuditLogInput = {
  actor: AdminActor;
  action: AuditAction;
  actionLabel: string;
  moduleKey: string;
  entityTable: string;
  entityId: string | null;
  recordLabel: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedData?: Record<string, unknown> | null;
};

const PAYMENT_AUDIT_FIELDS = [
  "status",
  "admin_note",
  "paid_at",
  "receipt_path",
  "receipt_file_name",
  "receipt_mime_type",
  "receipt_size_bytes",
  "receipt_uploaded_at",
  "updated_at",
] as const;

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requireMembershipReviewer(accessToken: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (userError) {
    throw new Error(userError.message);
  }

  if (!userData.user) {
    throw new Error("Invalid or expired session.");
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userData.user.id)
    .in("role", MEMBERSHIP_REVIEW_ROLES)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    throw new Error(roleError.message);
  }

  if (!role) {
    throw new Error("Membership admin access required.");
  }

  return {
    supabaseAdmin,
    user: userData.user,
  };
}

async function getMemberForReview(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  memberId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, user_id, full_name, status, member_no")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Member record not found.");
  }

  return data as MemberReviewRow;
}

function requirePendingMember(
  member: MemberReviewRow,
  action: "approve" | "reject",
) {
  if (member.status === "approved") {
    throw new Error(
      `${member.full_name} is already approved. This application cannot be ${action}d again.`,
    );
  }

  if (member.status === "rejected") {
    throw new Error(
      `${member.full_name} is already rejected. Ask the member to update and resubmit the application first.`,
    );
  }

  if (member.status !== "pending") {
    throw new Error("Only pending applications can be reviewed.");
  }
}

async function writeAdminAuditLog(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  input: AuditLogInput,
) {
  const { error } = await supabaseAdmin.from("audit_logs" as never).insert({
    actor_user_id: input.actor.id,
    actor_email: input.actor.email ?? null,
    action: input.action,
    action_label: input.actionLabel,
    module_key: input.moduleKey,
    entity_schema: "public",
    entity_table: input.entityTable,
    entity_id: input.entityId,
    record_label: input.recordLabel,
    old_data: input.oldData ?? null,
    new_data: input.newData ?? null,
    changed_data: input.changedData ?? null,
  } as never);

  if (error) {
    throw new Error(`Action was saved but audit log failed: ${error.message}`);
  }
}

function pickAuditFields<T extends readonly string[]>(
  row: Record<string, unknown> | null | undefined,
  fields: T,
) {
  if (!row) return null;

  const picked: Record<string, unknown> = {};

  for (const field of fields) {
    picked[field] = redactAuditValue(field, row[field]);
  }

  return picked;
}

function buildAuditDiff(
  oldRow: Record<string, unknown> | null | undefined,
  newRow: Record<string, unknown> | null | undefined,
  fields: readonly string[],
) {
  const changed: Record<string, { from: unknown; to: unknown }> = {};

  for (const field of fields) {
    const previous = redactAuditValue(field, oldRow?.[field]);
    const next = redactAuditValue(field, newRow?.[field]);

    if (JSON.stringify(previous ?? null) !== JSON.stringify(next ?? null)) {
      changed[field] = { from: previous ?? null, to: next ?? null };
    }
  }

  return changed;
}

function redactAuditValue(field: string, value: unknown) {
  if (value === undefined) return null;

  if (typeof value !== "string") return value ?? null;

  if (field === "cnic") return maskValue(value, 2, 2);

  if (field === "mobile" || field === "emergency_contact_mobile") {
    return maskValue(value, 4, 2);
  }

  if (field === "photo_url" || field === "receipt_path") {
    return value ? "[stored-file]" : null;
  }

  return value;
}

function maskValue(value: string, visibleStart: number, visibleEnd: number) {
  const normalized = value.trim();
  if (normalized.length <= visibleStart + visibleEnd) return "***";
  return `${normalized.slice(0, visibleStart)}***${normalized.slice(-visibleEnd)}`;
}

function paymentRecordLabel(row: Record<string, unknown> | null | undefined) {
  const memberId = row?.member_id;
  return typeof memberId === "string"
    ? `Membership payment · ${memberId}`
    : "Membership payment";
}

async function fetchPaymentForAdmin(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  paymentId: string,
  memberId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("membership_payments" as never)
    .select("*")
    .eq("id" as never, paymentId as never)
    .eq("member_id" as never, memberId as never)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Payment record not found.");

  return data as unknown as MembershipPayment;
}

export const approveMemberAction = createServerFn({ method: "POST" })
  .inputValidator(validateApproveInput)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin, user } = await requireMembershipReviewer(
        data.accessToken,
      );

      const member = await getMemberForReview(supabaseAdmin, data.memberId);
      requirePendingMember(member, "approve");

      const { data: approved, error } = await supabaseAdmin.rpc(
        "approve_member",
        {
          _member_id: data.memberId,
          _reviewed_by: user.id,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        ok: true,
        action: "approved" as const,
        memberId: data.memberId,
        reviewedBy: user.id,
        result: approved,
      };
    } catch (error) {
      throw new Error(toErrorMessage(error, "Failed to approve member."));
    }
  });

export const rejectMemberAction = createServerFn({ method: "POST" })
  .inputValidator(validateRejectInput)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin, user } = await requireMembershipReviewer(
        data.accessToken,
      );

      const member = await getMemberForReview(supabaseAdmin, data.memberId);
      requirePendingMember(member, "reject");

      const { data: rejected, error } = await supabaseAdmin.rpc(
        "reject_member",
        {
          _member_id: data.memberId,
          _rejection_reason: data.rejectionReason,
          _reviewed_by: user.id,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        ok: true,
        action: "rejected" as const,
        memberId: data.memberId,
        reviewedBy: user.id,
        rejectionReason: data.rejectionReason,
        result: rejected,
      };
    } catch (error) {
      throw new Error(toErrorMessage(error, "Failed to reject member."));
    }
  });

export const updateMemberApplicationAction = createServerFn({ method: "POST" })
  .inputValidator(validateMemberEditInput)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin, user } = await requireMembershipReviewer(
        data.accessToken,
      );

      const { data: updated, error } = await supabaseAdmin.rpc(
        "update_member_application_as_reviewer",
        {
          _member_id: data.memberId,
          _reviewed_by: user.id,
          _payload: data.payload as never,
        },
      );

      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Application could not be updated.");

      return {
        ok: true,
        action: "member_updated" as const,
        memberId: data.memberId,
        updatedBy: user.id,
        member: updated,
      };
    } catch (error) {
      throw new Error(
        toErrorMessage(error, "Failed to update application details."),
      );
    }
  });

export const saveMembershipReceiptAction = createServerFn({ method: "POST" })
  .inputValidator(validateReceiptInput)
  .handler(async ({ data }) => {
    try {
      assertMembershipPaymentCollectionEnabled();
      const { supabaseAdmin, user } = await requireMembershipReviewer(
        data.accessToken,
      );
      const member = await getMemberForReview(supabaseAdmin, data.memberId);
      const now = new Date().toISOString();

      let before: MembershipPayment | null = null;
      let savedPayment: MembershipPayment | null = null;
      let auditAction: AuditAction = "update";

      if (data.paymentId) {
        before = await fetchPaymentForAdmin(
          supabaseAdmin,
          data.paymentId,
          data.memberId,
        );

        if (before.status !== "pending" && before.status !== "failed") {
          throw new Error(
            "Only pending or failed payment records can receive replacement receipts.",
          );
        }

        const nextStatus =
          before.status === "failed" ? "pending" : before.status;

        const { data: updated, error } = await supabaseAdmin
          .from("membership_payments" as never)
          .update({
            ...data.receipt,
            status: nextStatus,
            updated_at: now,
          } as never)
          .eq("id" as never, data.paymentId as never)
          .eq("member_id" as never, data.memberId as never)
          .select("*")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!updated) throw new Error("Payment record could not be updated.");

        savedPayment = updated as unknown as MembershipPayment;
      } else {
        auditAction = "insert";

        const { data: inserted, error } = await supabaseAdmin
          .from("membership_payments" as never)
          .insert({
            member_id: data.memberId,
            user_id: member.user_id,
            base_amount: MEMBERSHIP_BASE_FEE,
            tax_amount: 0,
            total_amount: MEMBERSHIP_BASE_FEE,
            currency: MEMBERSHIP_FEE_CURRENCY,
            status: "pending",
            payment_method: "bank",
            gateway_provider: "manual_mobilink_microfinance_bank",
            gateway_reference: null,
            admin_note: null,
            paid_at: null,
            ...data.receipt,
            created_at: now,
            updated_at: now,
          } as never)
          .select("*")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!inserted) throw new Error("Payment record could not be created.");

        savedPayment = inserted as unknown as MembershipPayment;
      }

      await writeAdminAuditLog(supabaseAdmin, {
        actor: user,
        action: auditAction,
        actionLabel:
          auditAction === "insert"
            ? "Admin created membership payment receipt"
            : "Admin updated membership payment receipt",
        moduleKey: "membership",
        entityTable: "membership_payments",
        entityId: savedPayment.id,
        recordLabel: paymentRecordLabel(savedPayment),
        oldData: pickAuditFields(before, PAYMENT_AUDIT_FIELDS),
        newData: pickAuditFields(savedPayment, PAYMENT_AUDIT_FIELDS),
        changedData:
          auditAction === "insert"
            ? pickAuditFields(savedPayment, PAYMENT_AUDIT_FIELDS)
            : buildAuditDiff(before, savedPayment, PAYMENT_AUDIT_FIELDS),
      });

      return {
        ok: true,
        action: "receipt_saved" as const,
        memberId: data.memberId,
        updatedBy: user.id,
        payment: savedPayment,
      };
    } catch (error) {
      throw new Error(toErrorMessage(error, "Failed to save payment receipt."));
    }
  });

export const updateMembershipPaymentStatusAction = createServerFn({
  method: "POST",
})
  .inputValidator(validatePaymentStatusInput)
  .handler(async ({ data }) => {
    try {
      assertMembershipPaymentCollectionEnabled();
      const { supabaseAdmin, user } = await requireMembershipReviewer(
        data.accessToken,
      );
      const before = await fetchPaymentForAdmin(
        supabaseAdmin,
        data.paymentId,
        data.memberId,
      );
      const now = new Date().toISOString();
      const nextPaidAt =
        data.status === "paid" || data.status === "waived"
          ? typeof before.paid_at === "string" && before.paid_at
            ? before.paid_at
            : now
          : null;

      const { data: updated, error } = await supabaseAdmin
        .from("membership_payments" as never)
        .update({
          status: data.status,
          admin_note: data.adminNote,
          paid_at: nextPaidAt,
          updated_at: now,
        } as never)
        .eq("id" as never, data.paymentId as never)
        .eq("member_id" as never, data.memberId as never)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Payment record could not be updated.");

      const updatedRow = updated as unknown as MembershipPayment;

      await writeAdminAuditLog(supabaseAdmin, {
        actor: user,
        action: "update",
        actionLabel: "Admin updated membership payment status",
        moduleKey: "membership",
        entityTable: "membership_payments",
        entityId: data.paymentId,
        recordLabel: paymentRecordLabel(updatedRow),
        oldData: pickAuditFields(before, PAYMENT_AUDIT_FIELDS),
        newData: pickAuditFields(updatedRow, PAYMENT_AUDIT_FIELDS),
        changedData: buildAuditDiff(before, updatedRow, PAYMENT_AUDIT_FIELDS),
      });

      return {
        ok: true,
        action: "payment_status_updated" as const,
        memberId: data.memberId,
        paymentId: data.paymentId,
        updatedBy: user.id,
        payment: updatedRow,
      };
    } catch (error) {
      throw new Error(
        toErrorMessage(error, "Failed to update membership fee status."),
      );
    }
  });
