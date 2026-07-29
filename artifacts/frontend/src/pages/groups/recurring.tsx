import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/currency";
import { PlusCircle, RefreshCw, Pause, Play, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

interface RecurringExpense {
  id: number;
  groupId: number;
  description: string;
  amount: number;
  payerId: number;
  splitType: string;
  category?: string;
  frequency: string;
  dayOfMonth: number;
  isActive: boolean;
  lastGeneratedAt?: string;
  nextDueAt: string;
  createdAt: string;
  payer?: { id: number; name: string; email: string };
}

interface GroupMember {
  id: number;
  name: string;
  email: string;
}

async function apiFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export default function RecurringExpenses({ groupId }: { groupId: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    payerId: user?.id?.toString() ?? "",
    splitType: "equal",
    category: "Bills",
    frequency: "monthly",
    dayOfMonth: "1",
  });

  const { data: recurrings, isLoading } = useQuery<RecurringExpense[]>({
    queryKey: ["recurring", groupId],
    queryFn: () => apiFetch(`/api/groups/${groupId}/recurring`),
  });

  const { data: groupData } = useQuery<{ members: GroupMember[] }>({
    queryKey: ["group", groupId],
    queryFn: () => apiFetch(`/api/groups/${groupId}`),
  });

  const members: GroupMember[] = groupData?.members ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/groups/${groupId}/recurring`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          payerId: parseInt(data.payerId),
          dayOfMonth: parseInt(data.dayOfMonth),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring", groupId] });
      setShowForm(false);
      setForm({ description: "", amount: "", payerId: user?.id?.toString() ?? "", splitType: "equal", category: "Bills", frequency: "monthly", dayOfMonth: "1" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (recurringId: number) =>
      apiFetch(`/api/groups/${groupId}/recurring/${recurringId}/generate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring", groupId] });
      qc.invalidateQueries({ queryKey: ["expenses", groupId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/api/groups/${groupId}/recurring/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring", groupId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/groups/${groupId}/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring", groupId] }),
  });

  const isDue = (nextDueAt: string) => new Date(nextDueAt) <= new Date();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              <Link href={`/groups/${groupId}`} className="hover:text-foreground transition-colors">← Back to Group</Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Recurring Expenses</h1>
            <p className="text-muted-foreground mt-1">Monthly bills and subscriptions that auto-generate each month.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Recurring
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">New Recurring Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g. Monthly Rent"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Paid By</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.payerId}
                    onChange={e => setForm(f => ({ ...f, payerId: e.target.value }))}
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    placeholder="1"
                    value={form.dayOfMonth}
                    onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {["Rent", "Bills", "Food", "Transport", "Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Split Type</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.splitType}
                    onChange={e => setForm(f => ({ ...f, splitType: e.target.value }))}
                  >
                    <option value="equal">Equal</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.description || !form.amount || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !recurrings?.length ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No recurring expenses yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add monthly rent, EMIs, subscriptions, or utility bills.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recurrings.map(r => (
              <Card key={r.id} className={`transition-all ${!r.isActive ? "opacity-60" : isDue(r.nextDueAt) ? "border-amber-400/50 bg-amber-50/30" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.description}</span>
                        {!r.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Paused</span>
                        )}
                        {r.isActive && isDue(r.nextDueAt) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Due Now</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>Every month on day {r.dayOfMonth}</span>
                        <span>•</span>
                        <span>Paid by {r.payer?.name ?? "Unknown"}</span>
                        <span>•</span>
                        <span>Split: {r.splitType}</span>
                        {r.lastGeneratedAt && (
                          <><span>•</span><span>Last: {format(new Date(r.lastGeneratedAt), "d MMM")}</span></>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Next due: {format(new Date(r.nextDueAt), "d MMM yyyy")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-base">{formatINR(r.amount)}</div>
                      <div className="text-xs text-muted-foreground">per month</div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {r.isActive && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1"
                          onClick={() => generateMutation.mutate(r.id)}
                          disabled={generateMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Generate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleMutation.mutate({ id: r.id, isActive: !r.isActive })}
                      >
                        {r.isActive ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
