import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, PERSONAL_CATEGORIES, CATEGORY_COLORS } from "@/lib/currency";
import { PlusCircle, Trash2, TrendingUp, Wallet, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PersonalExpense {
  id: number;
  userId: number;
  description: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
}

interface PersonalSummary {
  total: number;
  thisMonthTotal: number;
  byCategory: { category: string; amount: number }[];
  monthlyTotals: { month: string; amount: number }[];
  count: number;
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

export default function PersonalTracker() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Food",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: expenses, isLoading: expLoading } = useQuery<PersonalExpense[]>({
    queryKey: ["personal-expenses"],
    queryFn: () => apiFetch("/api/personal"),
  });

  const { data: summary, isLoading: sumLoading } = useQuery<PersonalSummary>({
    queryKey: ["personal-summary"],
    queryFn: () => apiFetch("/api/personal/summary"),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/personal", {
        method: "POST",
        body: JSON.stringify({ ...data, amount: parseFloat(data.amount) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-expenses"] });
      qc.invalidateQueries({ queryKey: ["personal-summary"] });
      setForm({ description: "", amount: "", category: "Food", note: "", date: format(new Date(), "yyyy-MM-dd") });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/personal/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-expenses"] });
      qc.invalidateQueries({ queryKey: ["personal-summary"] });
    },
  });

  const isLoading = expLoading || sumLoading;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Personal Tracker</h1>
            <p className="text-muted-foreground mt-1">Track your own spending, separate from group expenses.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">New Personal Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g. Lunch at Saravana Bhavan"
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
                  <Label>Category</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {PERSONAL_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Note (optional)</Label>
                  <Input
                    placeholder="Any notes..."
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => addMutation.mutate(form)}
                  disabled={!form.description || !form.amount || addMutation.isPending}
                >
                  {addMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : summary && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{formatINR(summary.total)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.count} expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-primary">{formatINR(summary.thisMonthTotal)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {summary.byCategory.length > 0 ? (
                    <>
                      <div className="text-2xl font-bold">
                        {PERSONAL_CATEGORIES.find(c => c.value === summary.byCategory.sort((a, b) => b.amount - a.amount)[0]?.category)?.icon}{" "}
                        {summary.byCategory.sort((a, b) => b.amount - a.amount)[0]?.category}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatINR(summary.byCategory.sort((a, b) => b.amount - a.amount)[0]?.amount ?? 0)}
                      </p>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {summary.byCategory.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Spending by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={summary.byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                            {summary.byCategory.map((entry) => (
                              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#94a3b8"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatINR(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-3">
                      {summary.byCategory.sort((a, b) => b.amount - a.amount).map(c => (
                        <div key={c.category} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[c.category] ?? "#94a3b8" }} />
                          <span className="truncate text-muted-foreground">{c.category}</span>
                          <span className="ml-auto font-mono font-medium shrink-0">{formatINR(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {summary.monthlyTotals.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary.monthlyTotals.slice(-6)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: number) => formatINR(v)} />
                            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : !expenses?.length ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No personal expenses yet. Add your first one above!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {expenses.map(e => {
                  const cat = PERSONAL_CATEGORIES.find(c => c.value === e.category);
                  return (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                        style={{ background: (CATEGORY_COLORS[e.category] ?? "#94a3b8") + "22" }}
                      >
                        {cat?.icon ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{e.description}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                          <span>{e.category}</span>
                          <span>•</span>
                          <span>{format(new Date(e.date), "d MMM yyyy")}</span>
                          {e.note && <><span>•</span><span className="truncate">{e.note}</span></>}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-sm shrink-0">{formatINR(e.amount)}</div>
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
