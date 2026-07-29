import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight, ArrowDownRight, Wallet, Users, Activity,
  TrendingUp, Sparkles, ChevronRight, Receipt
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { formatINR } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

function StatCard({
  label, value, icon: Icon, variant, sub
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant: "owed" | "owe" | "total" | "groups";
  sub?: string;
}) {
  const configs = {
    owed: {
      cls: "stat-card-owed",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
      dotColor: "bg-emerald-500",
    },
    owe: {
      cls: "stat-card-owe",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      valueColor: "text-rose-700",
      dotColor: "bg-rose-500",
    },
    total: {
      cls: "stat-card-total",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-indigo-700",
      dotColor: "bg-indigo-500",
    },
    groups: {
      cls: "stat-card-groups",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
      dotColor: "bg-amber-500",
    },
  };
  const c = configs[variant];

  return (
    <div className={`${c.cls} rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${c.iconColor}`} />
        </div>
        <div className={`h-2 w-2 rounded-full ${c.dotColor} opacity-60`} />
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold amount ${c.valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-56 shimmer" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl shimmer" />)}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl shimmer" />
            <Skeleton className="h-64 rounded-2xl shimmer" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!summary) return null;

  const netBalance = summary.totalOwed - summary.totalOwe;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Overview</span>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Hey, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {netBalance > 0
                ? `You're owed ${formatINR(netBalance)} across all groups`
                : netBalance < 0
                ? `You owe ${formatINR(Math.abs(netBalance))} across all groups`
                : "You're all settled up — great job!"}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">
            <Activity className="h-3 w-3" />
            <span>Live balance</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="You are owed" value={formatINR(summary.totalOwed)} icon={ArrowDownRight} variant="owed" sub="Total across groups" />
          <StatCard label="You owe" value={formatINR(summary.totalOwe)} icon={ArrowUpRight} variant="owe" sub="Outstanding balance" />
          <StatCard label="Total Expenses" value={formatINR(summary.totalExpenses)} icon={Wallet} variant="total" sub="All time" />
          <StatCard label="Active Groups" value={String(summary.totalGroups)} icon={Users} variant="groups" sub={summary.totalGroups === 1 ? "group" : "groups"} />
        </div>

        {/* Groups + Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold">Your Groups</h2>
              <Link href="/groups">
                <span className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
                  View all <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            </div>

            {summary.groupSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No groups yet</p>
                <Link href="/groups">
                  <span className="text-xs text-primary hover:underline">Create your first group →</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.groupSummaries.slice(0, 4).map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <div className="group-card rounded-xl border bg-card px-4 py-3 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary font-display font-bold text-sm">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-none">{group.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{group.memberCount} members</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`amount text-sm font-semibold ${
                          group.myBalance > 0 ? "text-emerald-600" :
                          group.myBalance < 0 ? "text-rose-600" :
                          "text-muted-foreground"
                        }`}>
                          {group.myBalance > 0 ? "+" : ""}{formatINR(group.myBalance)}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="space-y-3">
            <h2 className="text-base font-display font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </h2>

            {summary.recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card overflow-hidden">
                {summary.recentActivity.map((activity, i) => (
                  <div
                    key={activity.id}
                    className={`px-4 py-3 flex items-center gap-3 ${
                      i < summary.recentActivity.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      activity.type === "expense" ? "bg-primary/10" : "bg-emerald-50"
                    }`}>
                      {activity.type === "expense"
                        ? <Receipt className="h-3.5 w-3.5 text-primary" />
                        : <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.groupName} · {format(new Date(activity.createdAt), "MMM d")}
                      </p>
                    </div>
                    <span className="amount text-sm font-semibold text-foreground shrink-0">
                      {formatINR(activity.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
