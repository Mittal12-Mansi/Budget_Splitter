import { useGetGroup, useGetDebtGraph, useCreateSettlement, getGetBalancesQueryKey, getGetDebtGraphQueryKey, getGetSettlementsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function DebtGraph({ groupId }: { groupId: number }) {
  const { data: group, isLoading: groupLoading } = useGetGroup(groupId);
  const { data: debtGraph, isLoading: graphLoading } = useGetDebtGraph(groupId, { query: { enabled: !!group } as any });
  const createSettlement = useCreateSettlement();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isLoading = groupLoading || graphLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 shimmer rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl shimmer" />
          <Skeleton className="h-96 w-full rounded-2xl shimmer" />
        </div>
      </Layout>
    );
  }

  if (!group || !debtGraph) return null;

  const chartData = debtGraph.nodes
    .map(node => ({ name: node.name, balance: Number(node.netBalance.toFixed(2)), positive: node.netBalance > 0 }))
    .sort((a, b) => b.balance - a.balance);

  const handleSettle = (edge: typeof debtGraph.edges[0]) => {
    createSettlement.mutate(
      { groupId, data: { payerId: edge.fromUserId, receiverId: edge.toUserId, amount: edge.amount, note: "Settled via debt graph" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetDebtGraphQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetSettlementsQueryKey(groupId) });
          toast({ title: "Settlement recorded!" });
        },
        onError: (err) => toast({ variant: "destructive", title: "Failed to record settlement", description: err.message }),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Settle Up</h1>
            <p className="text-muted-foreground text-sm">{group.name} · optimised transactions</p>
          </div>
        </div>

        {/* Balance chart */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Net Balances</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Green = gets back · Red = owes</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 18% 94%)" />
                <XAxis type="number" tickFormatter={(v) => `₹${Math.abs(v)}`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [`₹${Math.abs(value).toFixed(2)}`, value > 0 ? "Gets back" : "Owes"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 20% 90%)", fontSize: 12 }}
                />
                <Bar dataKey="balance" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.positive ? "hsl(152 69% 38%)" : "hsl(355 78% 56%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Settlements */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-display font-semibold">Suggested Settlements</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Algorithm minimises the total number of transactions needed to clear all debts.
          </p>

          {debtGraph.edges.length === 0 ? (
            <div className="rounded-2xl border bg-emerald-50 border-emerald-100 p-10 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-emerald-800 mb-1">All Settled Up!</h3>
              <p className="text-sm text-emerald-600">No outstanding debts in this group.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {debtGraph.edges.map((edge, idx) => (
                <div key={idx} className="rounded-2xl border bg-card overflow-hidden hover:border-primary/20 transition-colors">
                  <div className="h-1 bg-gradient-to-r from-rose-400 to-emerald-400" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      {/* Payer */}
                      <div className="flex flex-col items-center gap-1.5 w-20">
                        <div className="h-11 w-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-display font-bold text-lg">
                          {edge.fromName.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-center leading-tight truncate w-full text-center">{edge.fromName}</span>
                        <span className="text-[10px] text-rose-600 font-medium uppercase">Pays</span>
                      </div>

                      {/* Amount arrow */}
                      <div className="flex flex-col items-center flex-1 px-2">
                        <span className="amount text-lg font-bold mb-1">
                          {group.currency} {edge.amount.toFixed(2)}
                        </span>
                        <div className="w-full flex items-center">
                          <div className="flex-1 h-px bg-gradient-to-r from-rose-200 to-emerald-200" />
                          <ArrowRight className="h-4 w-4 text-muted-foreground/60 -mx-0.5" />
                        </div>
                      </div>

                      {/* Receiver */}
                      <div className="flex flex-col items-center gap-1.5 w-20">
                        <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-display font-bold text-lg">
                          {edge.toName.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-center leading-tight truncate w-full text-center">{edge.toName}</span>
                        <span className="text-[10px] text-emerald-600 font-medium uppercase">Receives</span>
                      </div>
                    </div>

                    <Button
                      className="w-full h-9 rounded-xl text-sm font-semibold"
                      variant="outline"
                      onClick={() => handleSettle(edge)}
                      disabled={createSettlement.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark as Settled
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
