import { useState } from "react";
import {
  useGetGroup,
  useGetExpenses,
  useGetBalances,
  useGetSettlements,
  useGetDebtGraph,
  useRemoveMember,
  getGetGroupQueryKey,
  getGetBalancesQueryKey,
  getGetDashboardSummaryQueryKey,
  type ExpenseDetail,
  type MemberWithBalance,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Receipt,
  Users,
  ArrowRightLeft,
  HandCoins,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  UserPlus,
  UserX,
  Settings,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { formatINR } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV, generateGroupPDFReport } from "@/lib/export-utils";

import { AddMemberModal } from "@/components/groups/AddMemberModal";
import { ExpenseDetailsModal } from "@/components/groups/ExpenseDetailsModal";
import { EditGroupModal } from "@/components/groups/EditGroupModal";
import { SettleUpModal } from "@/components/groups/SettleUpModal";

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  Food: { emoji: "🍽️", color: "bg-orange-50 text-orange-700 border-orange-100" },
  Transport: { emoji: "🚗", color: "bg-blue-50 text-blue-700 border-blue-100" },
  Shopping: { emoji: "🛍️", color: "bg-purple-50 text-purple-700 border-purple-100" },
  Entertainment: { emoji: "🎬", color: "bg-pink-50 text-pink-700 border-pink-100" },
  Health: { emoji: "🏥", color: "bg-green-50 text-green-700 border-green-100" },
  Bills: { emoji: "💡", color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  Travel: { emoji: "✈️", color: "bg-teal-50 text-teal-700 border-teal-100" },
  Other: { emoji: "📦", color: "bg-gray-50 text-gray-700 border-gray-100" },
};

export default function GroupDetail({ groupId }: { groupId: number }) {
  const { user: currentUser } = useAuth();
  const { data: group, isLoading: groupLoading } = useGetGroup(groupId);
  const { data: expenses, isLoading: expensesLoading } = useGetExpenses(groupId, { query: { enabled: !!group } as any });
  const { data: balances, isLoading: balancesLoading } = useGetBalances(groupId, { query: { enabled: !!group } as any });
  const { data: settlements, isLoading: settlementsLoading } = useGetSettlements(groupId, { query: { enabled: !!group } as any });
  const { data: debtGraph } = useGetDebtGraph(groupId, { query: { enabled: !!group } as any });

  const removeMemberMutation = useRemoveMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Modals state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState<number | undefined>();
  const [settleReceiver, setSettleReceiver] = useState<number | undefined>();
  const [settleAmount, setSettleAmount] = useState<number | undefined>();

  // Member search state (Phase 11)
  const [memberSearch, setMemberSearch] = useState("");
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const isLoading = groupLoading || expensesLoading || balancesLoading || settlementsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 shimmer rounded-xl" />
          <div className="grid gap-4 grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-2xl shimmer" />
        </div>
      </Layout>
    );
  }

  if (!group) return null;

  const isOwner = group.ownerId === currentUser?.id;
  const totalExpenseAmount = expenses?.reduce((s, e) => s + parseFloat(e.amount as any), 0) ?? 0;

  const filteredMembers = group.members?.filter(
    (m) =>
      m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.user.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleRemoveMember = (targetUserId: number, targetName: string) => {
    setRemovingUserId(targetUserId);
    removeMemberMutation.mutate(
      { groupId, userId: targetUserId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setRemovingUserId(null);
          toast({ title: "Member Removed", description: `Removed ${targetName} from the group.` });
        },
        onError: (err: any) => {
          setRemovingUserId(null);
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to remove member." });
        },
      }
    );
  };

  const openSettleForDebt = (fromId: number, toId: number, amt: number) => {
    setSettlePayer(fromId);
    setSettleReceiver(toId);
    setSettleAmount(amt);
    setSettleModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) {
      toast({ variant: "destructive", title: "No expenses to export" });
      return;
    }
    const csvRows = expenses.map((e) => ({
      "Date": format(new Date((e as any).date || e.createdAt), "yyyy-MM-dd"),
      "Description": e.description,
      "Category": e.category || "General",
      "Paid By": e.payer.name,
      "Split Type": e.splitType,
      "Amount (INR)": e.amount,
    }));
    exportToCSV(`${group.name.toLowerCase().replace(/\s+/g, "_")}_report.csv`, csvRows);
    toast({ title: "📊 CSV Exported!", description: `Saved ${expenses.length} expenses to CSV.` });
  };

  const handleExportPDF = () => {
    generateGroupPDFReport({
      groupName: group.name,
      description: group.description || undefined,
      totalExpenses: totalExpenseAmount,
      expensesCount: expenses?.length || 0,
      membersCount: group.members?.length || 0,
      expenses: (expenses || []).map((e) => ({
        id: e.id,
        date: (e as any).date || e.createdAt,
        description: e.description,
        category: e.category || "General",
        amount: e.amount,
        payerName: e.payer.name,
        splitType: e.splitType,
      })),
      balances: (balances?.members || []).map((m) => ({
        name: m.name,
        email: m.email,
        totalPaid: m.totalPaid,
        totalOwed: m.totalOwed,
        netBalance: m.netBalance,
      })),
      debts: (debtGraph?.edges || []).map((d) => ({
        fromName: d.fromName,
        toName: d.toName,
        amount: d.amount,
      })),
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/groups">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold tracking-tight truncate">{group.name}</h1>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditGroupOpen(true)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {group.description && <p className="text-sm text-muted-foreground truncate">{group.description}</p>}
          </div>

          <div className="flex gap-2 shrink-0 items-center">
            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 rounded-lg h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 text-primary"
              title="Export expenses to CSV spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>

            {/* Print / Download PDF Report Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-1.5 rounded-lg h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 text-primary"
              title="Download or Print PDF Summary Report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF Report</span>
            </Button>

            <Link href={`/groups/${groupId}/recurring`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg h-8 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Recurring</span>
              </Button>
            </Link>
            <Button
              onClick={() => {
                setSettlePayer(undefined);
                setSettleReceiver(undefined);
                setSettleAmount(undefined);
                setSettleModalOpen(true);
              }}
              size="sm"
              className="gap-1.5 rounded-lg h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <HandCoins className="h-3.5 w-3.5" />
              Settle Up
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="amount text-lg font-bold">{formatINR(totalExpenseAmount)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses Count</p>
            <p className="text-lg font-bold font-display">{expenses?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Members</p>
            <p className="text-lg font-bold font-display">{group.members?.length ?? 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-11 bg-transparent p-0 gap-1">
            {[
              { value: "expenses", label: "Expenses", icon: Receipt },
              { value: "members", label: "Members", icon: Users },
              { value: "balances", label: "Balances & Debt", icon: ArrowRightLeft },
              { value: "settlements", label: "Settlements", icon: HandCoins },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none h-11 px-4 text-sm font-medium gap-1.5 text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-5">
            {/* ── Expenses Tab ── */}
            <TabsContent value="expenses" className="mt-0 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {expenses?.length ?? 0} expense{expenses?.length !== 1 ? "s" : ""}
                </p>
                <Link href={`/groups/${groupId}/expenses/new`}>
                  <Button size="sm" className="gap-1.5 h-8 rounded-lg text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                  </Button>
                </Link>
              </div>

              {!expenses?.length ? (
                <div className="rounded-2xl border border-dashed p-12 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">No expenses yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add the first expense to get started</p>
                  <Link href={`/groups/${groupId}/expenses/new`}>
                    <Button size="sm" className="rounded-lg font-semibold">Add expense</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => {
                    const cat = expense.category ? CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.Other : null;
                    return (
                      <div
                        key={expense.id}
                        onClick={() => setSelectedExpense(expense)}
                        className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3 hover:border-primary/40 cursor-pointer transition-all hover:shadow-sm"
                      >
                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center text-sm shrink-0">
                          {cat?.emoji ?? "💸"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-none truncate">{expense.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Paid by <span className="font-medium text-foreground">{expense.payer.name}</span> · {format(new Date(expense.createdAt), "MMM d")}
                            </p>
                            {cat && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                                {expense.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="amount text-sm font-bold">{formatINR(parseFloat(expense.amount as any))}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            {expense.splits?.length || 0} SPLIT
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Members Tab (Phase 1, 3, 11) ── */}
            <TabsContent value="members" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar (Phase 11) */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search members by name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="h-9 pl-9 rounded-xl text-xs"
                  />
                </div>

                <Button onClick={() => setAddMemberOpen(true)} size="sm" className="gap-1.5 h-9 rounded-xl font-semibold">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              </div>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Group Members ({group.members?.length || 0})
                  </h3>
                </div>

                <div className="divide-y">
                  {filteredMembers?.map((m) => {
                    const isGroupOwner = m.role === "owner" || group.ownerId === m.userId;
                    const isSelf = currentUser?.id === m.userId;

                    return (
                      <div key={m.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                            {m.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold leading-none">{m.user.name}</p>
                              {/* Owner Badge (Phase 1 & 4) */}
                              {isGroupOwner ? (
                                <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 text-[10px] px-2 py-0 font-bold uppercase tracking-wider">
                                  Owner
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0 text-muted-foreground font-normal">
                                  Member
                                </Badge>
                              )}
                              {isSelf && <span className="text-[10px] text-muted-foreground font-medium">(You)</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{m.user.email}</p>
                          </div>
                        </div>

                        {/* Actions (Remove Member - Phase 1 & 3) */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`amount text-xs font-bold ${
                              m.balance > 0 ? "text-emerald-600" : m.balance < 0 ? "text-rose-600" : "text-muted-foreground"
                            }`}>
                              {m.balance > 0 ? "+" : ""}{formatINR(m.balance)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {m.balance > 0 ? "gets back" : m.balance < 0 ? "owes" : "settled"}
                            </p>
                          </div>

                          {(isOwner || isSelf) && !isGroupOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={removingUserId === m.userId}
                              onClick={() => handleRemoveMember(m.userId, m.user.name)}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-lg gap-1"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              {removingUserId === m.userId ? "Removing..." : "Remove"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ── Balances & Pairwise Debt Tab (Phase 5 & 12) ── */}
            <TabsContent value="balances" className="mt-0 space-y-4">
              {/* Simplified Debt Section (Phase 5 & 12) */}
              {debtGraph && debtGraph.edges.length > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-primary font-display flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Simplified Debts (Pairwise)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Minimum transactions calculated using greedy debt simplification algorithm
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {debtGraph.edges.map((edge, idx) => (
                      <div key={idx} className="rounded-xl border bg-background px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="font-semibold text-rose-600">{edge.fromName}</span>
                          <span className="text-xs text-muted-foreground">owes</span>
                          <span className="font-semibold text-emerald-600">{edge.toName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="amount font-bold text-sm">{formatINR(edge.amount)}</span>
                          <Button
                            size="sm"
                            onClick={() => openSettleForDebt(edge.fromUserId, edge.toUserId, edge.amount)}
                            className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          >
                            Pay {edge.toName.split(" ")[0]}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net Position */}
              <div className="rounded-2xl border overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Net Balances Summary</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Overall balance position per member</p>
                </div>
                <div className="divide-y">
                  {balances?.members.map((member) => (
                    <div key={member.userId} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-none">{member.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            member.netBalance > 0
                              ? "bg-emerald-50"
                              : member.netBalance < 0
                              ? "bg-rose-50"
                              : "bg-muted"
                          }`}
                        >
                          {member.netBalance > 0 ? (
                            <TrendingUp className="h-3 w-3 text-emerald-600" />
                          ) : member.netBalance < 0 ? (
                            <TrendingDown className="h-3 w-3 text-rose-600" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`amount text-sm font-bold ${
                              member.netBalance > 0
                                ? "text-emerald-600"
                                : member.netBalance < 0
                                ? "text-rose-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {member.netBalance > 0 ? "+" : ""}
                            {formatINR(member.netBalance)}
                          </p>
                          <p className="text-[10px] text-muted-foreground text-right">
                            {member.netBalance > 0 ? "gets back" : member.netBalance < 0 ? "owes" : "settled"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Settlements Tab (Phase 6) ── */}
            <TabsContent value="settlements" className="mt-0">
              {!settlements?.length ? (
                <div className="rounded-2xl border border-dashed p-12 text-center">
                  <HandCoins className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">No settlements yet</p>
                  <p className="text-xs text-muted-foreground">Settlements appear here after debts are paid</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {settlements.map((settlement) => (
                    <div key={settlement.id} className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-7 w-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-700">
                            {settlement.payer.name.charAt(0)}
                          </div>
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                            {settlement.receiver.name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            <span className="font-semibold">{settlement.payer.name}</span>
                            <span className="text-muted-foreground"> paid </span>
                            <span className="font-semibold">{settlement.receiver.name}</span>
                          </p>
                          {settlement.note && <p className="text-xs text-muted-foreground mt-0.5">{settlement.note}</p>}
                        </div>
                      </div>
                      <span className="amount text-sm font-bold text-emerald-600">
                        {formatINR(parseFloat(settlement.amount as any))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <AddMemberModal groupId={groupId} open={addMemberOpen} onOpenChange={setAddMemberOpen} />
      <ExpenseDetailsModal
        groupId={groupId}
        expense={selectedExpense}
        open={!!selectedExpense}
        onOpenChange={(open) => {
          if (!open) setSelectedExpense(null);
        }}
      />
      <EditGroupModal
        group={group}
        currentUserId={currentUser?.id || 0}
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
      />
      <SettleUpModal
        groupId={groupId}
        members={group.members || []}
        defaultPayerId={settlePayer}
        defaultReceiverId={settleReceiver}
        defaultAmount={settleAmount}
        open={settleModalOpen}
        onOpenChange={setSettleModalOpen}
      />
    </Layout>
  );
}
