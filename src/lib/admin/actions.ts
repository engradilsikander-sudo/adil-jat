// src/lib/admin/actions.ts
import { createServerFn } from "@tanstack/react-start";
import { createSupabaseAdminClient } from "../supabase/admin";
import {
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

export const approveMemberAction = createServerFn({ method: "POST" })
  .validator(validateApproveInput)
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

      if (!approved || approved.id !== data.memberId || approved.status !== "approved") {
        throw new Error("Review was not confirmed. Refresh the application before trying again.");
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
  .validator(validateRejectInput)
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

      if (!rejected || rejected.id !== data.memberId || rejected.status !== "rejected") {
        throw new Error("Review was not confirmed. Refresh the application before trying again.");
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
  .validator(validateMemberEditInput)
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
  .validator(validateReceiptInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await requireMembershipReviewer(data.accessToken);
    const { data: payment, error } = await supabaseAdmin.rpc('review_membership_payment_500', {
      _member_id: data.memberId, _reviewer: user.id, _receipt: data.receipt, _payment_id: data.paymentId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true, memberId: data.memberId, paymentId: payment.id, payment: payment as MembershipPayment };
  });

export const updateMembershipPaymentStatusAction = createServerFn({ method: "POST" })
  .validator(validatePaymentStatusInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await requireMembershipReviewer(data.accessToken);
    const { data: payment, error } = await supabaseAdmin.rpc('review_membership_payment_500', {
      _member_id: data.memberId, _reviewer: user.id, _status: data.status, _note: data.adminNote ?? undefined, _payment_id: data.paymentId,
    });
    if (error) throw new Error(error.message);
    if (payment.id !== data.paymentId) throw new Error('Payment identity changed. Please refresh.');
    return { ok: true, memberId: data.memberId, paymentId: payment.id, payment: payment as MembershipPayment };
  });
