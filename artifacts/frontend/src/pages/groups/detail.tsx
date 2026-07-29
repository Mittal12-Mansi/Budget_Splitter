import { useGetGroup, useGetExpenses, useGetBalances, useGetSettlements } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Receipt, Users, ArrowRightLeft, HandCoins, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { formatINR } from "@/lib/currency";

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
  const { data: group, isLoading: groupLoading } = useGetGroup(groupId);
  const { data: expenses, isLoading: expensesLoading } = useGetExpenses(groupId, { query: { enabled: !!group } });
  const { data: balances, isLoading: balancesLoading } = useGetBalances(groupId, { query: { enabled: !!group } });
  const { data: settlements, isLoading: settlementsLoading } = useGetSettlements(groupId, { query: { enabled: !!group } });

  const isLoading = groupLoading || expensesLoading || balancesLoading || settlementsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 shimmer rounded-xl" />
          <div className="grid gap-4 grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl shimmer" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl shimmer" />
        </div>
      </Layout>
    );
  }

  if (!group) return null;

  const totalExpenseAmount = expenses?.reduce((s, e) => s + parseFloat(e.amount as string), 0) ?? 0;

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
            <h1 className="text-2xl font-display font-bold tracking-tight truncate">{group.name}</h1>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/groups/${groupId}/recurring`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg h-8 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Recurring</span>
              </Button>
            </Link>
            <Link href={`/groups/${groupId}/debt-graph`}>
              <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs font-semibold">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Settle Up</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="amount text-lg font-bold">{formatINR(totalExpenseAmount)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
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
               { value: "balances", label: "Balances", icon: Users },
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
                    <Button size="sm" className="rounded-lg">Add expense</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => {
                    const cat = expense.category ? CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.Other : null;
                    return (
                      <div key={expense.id} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center text-sm shrink-0">
                          {cat?.emoji ?? "💸"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-none truncate">{expense.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {expense.payer.name} · {format(new Date(expense.createdAt), "MMM d")}
                            </p>
                            {cat && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                                {expense.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="amount text-sm font-bold">{formatINR(parseFloat(expense.amount as string))}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{expense.splitType}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-0"></TabsContent>

            {/* ── Balances Tab ── */}
            <TabsContent value="balances" className="mt-0">
              <div className="rounded-2xl border overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Member Balances</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Net position for each member</p>
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
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          member.netBalance > 0 ? "bg-emerald-50" :
                          member.netBalance < 0 ? "bg-rose-50" : "bg-muted"
                        }`}>
                          {member.netBalance > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> :
                           member.netBalance < 0 ? <TrendingDown className="h-3 w-3 text-rose-600" /> :
                           <Minus className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className={`amount text-sm font-bold ${
                            member.netBalance > 0 ? "text-emerald-600" :
                            member.netBalance < 0 ? "text-rose-600" : "text-muted-foreground"
                          }`}>
                            {member.netBalance > 0 ? "+" : ""}{formatINR(member.netBalance)}
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

            {/* ── Settlements Tab ── */}
            <TabsContent value="settlements" className="mt-0">
              {!settlements?.length ? (
                <div className="rounded-2xl border border-dashed p-12 text-center">
                  <HandCoins className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">No settlements yet</p>
                  <p className="text-xs text-muted-foreground">Settlements appear here after debts are cleared</p>
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
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-semibold">{settlement.receiver.name}</span>
                          </p>
                          {settlement.note && <p className="text-xs text-muted-foreground mt-0.5">{settlement.note}</p>}
                        </div>
                      </div>
                      <span className="amount text-sm font-bold text-emerald-600">{formatINR(parseFloat(settlement.amount as string))}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
