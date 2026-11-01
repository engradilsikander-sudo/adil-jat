// src/routes/donors.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Loader2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase/client";
import {
  formatDonationMoney,
  formatLeaderboardPurposes,
  getDonorBadge,
  getRankLabel,
  type DonationLeaderboardRow,
} from "../lib/donations";

export const Route = createFileRoute("/donors")({
  component: DonorsPage,
});

type AccessState =
  | { ok: true }
  | { ok: false; message: string; action: "login" | "membership" };

function DonorsPage() {
  const [rows, setRows] = useState<DonationLeaderboardRow[]>([]);
  const [access, setAccess] = useState<AccessState>({ ok: true });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setMessage("");

    const approvedAccess = await ensureApprovedMemberAccess();
    setAccess(approvedAccess);

    if (!approvedAccess.ok) {
      setRows([]);
      setLoading(false);
      return;
    }

    const client = supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{
        data: DonationLeaderboardRow[] | null;
        error: Error | null;
      }>;
    };

    const { data, error } = await client.rpc("get_donor_leaderboard", {
      _limit: 50,
    });

    if (error) {
      setMessage(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const totalDonated = rows.reduce(
      (sum, item) => sum + Number(item.total_donated || 0),
      0,
    );
    const totalDonations = rows.reduce(
      (sum, item) => sum + Number(item.donation_count || 0),
      0,
    );

    return { totalDonated, totalDonations, totalDonors: rows.length };
  }, [rows]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
            <Trophy className="h-4 w-4 text-amber-300" />
            Member-only Donor Leaderboard
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black md:text-6xl">
                JAS Top Donors
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">
                Approved JAS members ke liye donor leaderboard. Sirf finance
                admin approved donations count hoti hain.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
              <ShieldCheck className="h-8 w-8 text-amber-300" />
              <h2 className="mt-3 text-xl font-black">Privacy Rule</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Ye leaderboard sirf logged-in approved JAS members ko show hota
                hai. CNIC, phone, receipt aur transaction reference hidden rehte
                hain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl space-y-8">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : !access.ok ? (
            <RestrictedPanel access={access} />
          ) : message ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
              <h2 className="text-xl font-black">Unable to load leaderboard</h2>
              <p className="mt-2 text-sm font-semibold">{message}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Total Approved Donors"
                  value={totals.totalDonors}
                  icon={<Users className="h-5 w-5" />}
                />
                <StatCard
                  title="Approved Donations"
                  value={totals.totalDonations}
                  icon={<BadgeIndianRupee className="h-5 w-5" />}
                />
                <StatCard
                  title="Total Donated"
                  value={formatDonationMoney(totals.totalDonated)}
                  icon={<Trophy className="h-5 w-5" />}
                />
              </div>

              {rows.length ? (
                <div className="grid gap-5">
                  {rows.map((row, index) => (
                    <DonorRankCard
                      key={row.donor_member_id}
                      row={row}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <h2 className="text-2xl font-black text-slate-950">
                    No approved donations yet
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                    Finance admin approval ke baad donations yahan show hongi.
                  </p>
                  <Link to="/donate" className="primary-btn mt-6">
                    Submit Donation
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function DonorRankCard({
  row,
  rank,
}: {
  row: DonationLeaderboardRow;
  rank: number;
}) {
  const isTopThree = rank <= 3;

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
        isTopThree ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div
        className={`grid gap-5 p-6 md:grid-cols-[110px_1fr_260px] md:items-center ${
          isTopThree ? "bg-gradient-to-br from-amber-50 to-white" : ""
        }`}
      >
        <div className="flex items-center gap-4 md:block md:text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-black ${
              rank === 1
                ? "bg-amber-400 text-slate-950"
                : rank === 2
                  ? "bg-slate-200 text-slate-900"
                  : rank === 3
                    ? "bg-orange-200 text-orange-950"
                    : "bg-slate-100 text-slate-700"
            }`}
          >
            #{rank}
          </div>
          <p className="mt-0 text-sm font-black uppercase tracking-[0.16em] text-slate-500 md:mt-3">
            {getRankLabel(rank)}
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-950">
            {row.donor_name}
          </h2>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
            <p>
              <strong>Father:</strong> {row.donor_father_name}
            </p>
            <p>
              <strong>Member ID:</strong> {row.donor_member_no}
            </p>
            <p>
              <strong>Total Donated:</strong>{" "}
              {formatDonationMoney(row.total_donated)}
            </p>
            <p>
              <strong>Purpose:</strong>{" "}
              {formatLeaderboardPurposes(row.purposes)}
            </p>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            {getDonorBadge(Number(row.total_donated || 0))}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 p-5 text-white md:text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            Approved Total
          </p>
          <p className="mt-2 text-3xl font-black">
            {formatDonationMoney(row.total_donated)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {row.donation_count} approved donation
            {Number(row.donation_count || 0) === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </article>
  );
}

function RestrictedPanel({
  access,
}: {
  access: Exclude<AccessState, { ok: true }>;
}) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
      <div className="flex gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 flex-none" />
        <div>
          <h2 className="text-xl font-black">Members-only leaderboard</h2>
          <p className="mt-2 text-sm leading-6">{access.message}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {access.action === "login" ? (
              <Link to="/login" className="primary-btn">
                Login
              </Link>
            ) : (
              <Link to="/register" className="primary-btn">
                Complete Membership
              </Link>
            )}
            <Link to="/" className="secondary-btn">
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        {icon}
      </div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

async function ensureApprovedMemberAccess(): Promise<AccessState> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      action: "login",
      message: "Donor leaderboard dekhne ke liye pehle login karen.",
    };
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, member_no, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, action: "membership", message: error.message };
  }

  if (!data || data.status !== "approved" || !data.member_no) {
    return {
      ok: false,
      action: "membership",
      message:
        "Ye donor leaderboard sirf approved JAS members ke liye available hai.",
    };
  }

  return { ok: true };
}
