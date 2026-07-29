import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, PERSONAL_CATEGORIES, CATEGORY_COLORS } from "@/lib/currency";
import { PlusCircle, Trash2, TrendingUp, Wallet, Calendar, Tag, Sparkles, FileSpreadsheet, Printer } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, generatePersonalPDFReport } from "@/lib/export-utils";
import { useAuth } from "@/contexts/AuthContext";
import { EmiLoanManager } from "@/components/personal/EmiLoanManager";

interface PersonalExpense {
  id: number;
  userId: number;
  description: string;
  amount: string | number;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
}

interface PersonalData {
  totalSpent: number;
  monthlySpent: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  expenses: PersonalExpense[];
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
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function PersonalTracker() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Food",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data, isLoading, isError } = useQuery<PersonalData>({
    queryKey: ["personal-expenses"],
    queryFn: () => apiFetch("/api/personal"),
  });

  const [receiptUrl, setReceiptUrl] = useState<string>("");

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptUrl(reader.result as string);
      toast({ title: "🧾 Receipt Attached!", description: file.name });
    };
    reader.readAsDataURL(file);
  };

  const addMutation = useMutation({
    mutationFn: (formData: typeof form) =>
      apiFetch("/api/personal", {
        method: "POST",
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          note: formData.note || undefined,
          date: formData.date || undefined,
          receiptUrl: receiptUrl || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-expenses"] });
      setForm({ description: "", amount: "", category: "Food", note: "", date: format(new Date(), "yyyy-MM-dd") });
      setReceiptUrl("");
      setShowForm(false);
      toast({ title: "✅ Personal Expense Added!" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to add expense", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/personal/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-expenses"] });
      toast({ title: "Expense deleted" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    },
  });

  const expenses = data?.expenses || [];
  const totalSpent = data?.totalSpent || 0;
  const monthlySpent = data?.monthlySpent || 0;
  const categoryBreakdown = data?.categoryBreakdown || [];
  const topCategory = categoryBreakdown.length > 0 ? [...categoryBreakdown].sort((a, b) => b.amount - a.amount)[0] : null;

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) {
      toast({ variant: "destructive", title: "No expenses to export" });
      return;
    }
    const csvRows = expenses.map((e) => ({
      Date: format(new Date(e.date), "yyyy-MM-dd"),
      Description: e.description,
      Category: e.category || "General",
      "Amount (INR)": typeof e.amount === "number" ? e.amount : parseFloat(e.amount as string),
      Note: e.note || "",
    }));
    exportToCSV("personal_expenses_report.csv", csvRows);
    toast({ title: "📊 CSV Exported!", description: `Saved ${expenses.length} personal expenses to CSV.` });
  };

  const handleExportPDF = () => {
    generatePersonalPDFReport({
      userName: user?.name || "User",
      totalSpent,
      monthlySpent,
      expenses: expenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category || "General",
        amount: e.amount,
        note: e.note || undefined,
      })),
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Personal Tracker</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your private spending, separate from group expenses.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export CSV Button */}
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="gap-2 rounded-xl font-semibold border-primary/20 hover:bg-primary/5 text-primary text-xs h-9"
              title="Export to CSV spreadsheet"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>

            {/* Print / Download PDF Report Button */}
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="gap-2 rounded-xl font-semibold border-primary/20 hover:bg-primary/5 text-primary text-xs h-9"
              title="Download or Print PDF Summary Report"
            >
              <Printer className="h-4 w-4" />
              PDF Report
            </Button>

            <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl font-semibold bg-primary text-xs h-9">
              <PlusCircle className="h-4 w-4" />
              {showForm ? "Close Form" : "Add Expense"}
            </Button>
          </div>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <Card className="border-2 border-primary/30 bg-primary/5 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                New Personal Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
                  <Input
                    placeholder="e.g. Coffee / Lunch / Books"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="h-10 rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="h-10 rounded-xl bg-background font-bold amount"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Category</Label>
                  <select
                    className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {PERSONAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="h-10 rounded-xl bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Note (optional)</Label>
                  <Input
                    placeholder="e.g. Paid via Paytm"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className="h-10 rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3 pt-1 border-t">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Attach Bill / Receipt Image (optional)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="h-10 rounded-xl cursor-pointer text-xs bg-background file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {receiptUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReceiptUrl("")}
                        className="text-xs text-destructive hover:bg-destructive/10 rounded-lg h-9 shrink-0"
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                  {receiptUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border max-w-xs shadow-sm">
                      <img src={receiptUrl} alt="Receipt preview" className="w-full h-28 object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  onClick={() => addMutation.mutate(form)}
                  disabled={!form.description.trim() || !form.amount || addMutation.isPending}
                  className="rounded-xl font-semibold gap-1.5 bg-primary"
                >
                  {addMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Spent</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-foreground">{formatINR(totalSpent)}</div>
                <p className="text-xs text-muted-foreground mt-1">{expenses.length} total expenses recorded</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-primary">{formatINR(monthlySpent)}</div>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Top Category</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topCategory ? (
                  <>
                    <div className="text-xl font-bold font-display flex items-center gap-1.5 truncate">
                      <span>{PERSONAL_CATEGORIES.find((c) => c.value === topCategory.category)?.icon}</span>
                      <span className="truncate">{topCategory.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatINR(topCategory.amount)}</p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No category data yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Category Breakdown Chart */}
        {categoryBreakdown.length > 0 ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={75}>
                        {categoryBreakdown.map((entry) => (
                          <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#6366f1"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryBreakdown
                    .sort((a, b) => b.amount - a.amount)
                    .map((c) => (
                      <div key={c.category} className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 text-xs">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: CATEGORY_COLORS[c.category] ?? "#6366f1" }}
                        />
                        <span className="truncate text-muted-foreground font-medium">{c.category}</span>
                        <span className="ml-auto font-semibold font-mono shrink-0">{formatINR(c.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* All Personal Expenses Table */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">All Expenses</CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)} className="rounded-xl h-8 text-xs font-semibold gap-1">
                <PlusCircle className="h-3.5 w-3.5" /> Add New
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : !expenses.length ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <p className="text-sm font-medium">No personal expenses yet.</p>
                <Button size="sm" onClick={() => setShowForm(true)} className="rounded-xl text-xs gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" /> Add Your First Personal Expense
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {expenses.map((e) => {
                  const cat = PERSONAL_CATEGORIES.find((c) => c.value === e.category);
                  const numAmt = typeof e.amount === "number" ? e.amount : parseFloat(e.amount as string);
                  return (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 border"
                        style={{ background: (CATEGORY_COLORS[e.category] ?? "#6366f1") + "15", borderColor: (CATEGORY_COLORS[e.category] ?? "#6366f1") + "30" }}
                      >
                        {cat?.icon ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{e.description}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-foreground/80">{e.category}</span>
                          <span>•</span>
                          <span>{format(new Date(e.date), "d MMM yyyy")}</span>
                          {e.note && (
                            <>
                              <span>•</span>
                              <span className="truncate italic">{e.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm text-foreground shrink-0">{formatINR(numAmt)}</div>
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 💳 EMI & Personal Loans / Debt Tracker */}
        <EmiLoanManager />
      </div>
    </Layout>
  );
}
