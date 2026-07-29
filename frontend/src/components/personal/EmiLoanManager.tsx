import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/currency";
import { format, addMonths, differenceInDays, parseISO } from "date-fns";
import { CreditCard, Calendar, Plus, Trash2, CheckCircle2, AlertTriangle, Percent, ArrowUpRight, ArrowDownRight, Clock, History, DollarSign, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface EmiPaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface EmiLoanItem {
  id: string;
  title: string;
  lender: string; // e.g. HDFC, Bajaj Finserv, Rahul
  type: "emi" | "borrowed" | "lent"; // EMI loan, I owe, Someone owes me
  principal: number; // Principal Amount
  interestRate: number; // e.g. 0, 8.5%
  interestType: "none" | "simple" | "compound";
  tenureMonths: number; // Total tenure in months
  dueDay: number; // Day of month due (e.g. 5)
  startDate: string; // YYYY-MM-DD
  payments: EmiPaymentRecord[];
  createdAt: string;
}

// Calculate monthly EMI / Installment
export function calculateEmiDetails(item: EmiLoanItem) {
  const P = item.principal;
  const N = Math.max(item.tenureMonths, 1);
  const R = item.interestRate;

  let monthlyInstallment = 0;
  let totalPayable = P;
  let totalInterest = 0;

  if (R === 0 || item.interestType === "none") {
    monthlyInstallment = P / N;
    totalPayable = P;
    totalInterest = 0;
  } else if (item.interestType === "simple") {
    const timeYears = N / 12;
    totalInterest = (P * R * timeYears) / 100;
    totalPayable = P + totalInterest;
    monthlyInstallment = totalPayable / N;
  } else {
    // Compound / Amortized EMI
    const r = R / (12 * 100);
    const compoundFactor = Math.pow(1 + r, N);
    monthlyInstallment = (P * r * compoundFactor) / (compoundFactor - 1);
    totalPayable = monthlyInstallment * N;
    totalInterest = totalPayable - P;
  }

  const totalPaid = item.payments.reduce((sum, p) => sum + p.amount, 0);
  const amountLeft = Math.max(totalPayable - totalPaid, 0);

  const emisPaidCount = item.payments.length;
  const emisLeftCount = Math.max(N - emisPaidCount, 0);

  // Next due date calculation
  const today = new Date();
  let nextDue = new Date(today.getFullYear(), today.getMonth(), Math.min(item.dueDay, 28));
  if (today.getDate() > item.dueDay) {
    nextDue = addMonths(nextDue, 1);
  }
  const daysUntilDue = differenceInDays(nextDue, today);

  const progressPercent = Math.min(Math.round((totalPaid / totalPayable) * 100), 100);
  const isFullyPaid = amountLeft <= 1;

  return {
    monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    amountLeft: Math.round(amountLeft * 100) / 100,
    emisPaidCount,
    emisLeftCount,
    nextDueDate: nextDue,
    daysUntilDue,
    progressPercent,
    isFullyPaid,
  };
}

export function EmiLoanManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<EmiLoanItem[]>(() => {
    try {
      const saved = localStorage.getItem("splitter_emi_loans_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [payModalItem, setPayModalItem] = useState<EmiLoanItem | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<EmiLoanItem | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    lender: "",
    type: "emi" as "emi" | "borrowed" | "lent",
    principal: "",
    interestRate: "0",
    interestType: "none" as "none" | "simple" | "compound",
    tenureMonths: "12",
    dueDay: "5",
    startDate: format(new Date(), "yyyy-MM-dd"),
  });

  // Pay Form State
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    localStorage.setItem("splitter_emi_loans_v1", JSON.stringify(items));
  }, [items]);

  const handleCreate = () => {
    if (!form.title.trim() || !form.principal || parseFloat(form.principal) <= 0) {
      toast({ variant: "destructive", title: "Validation error", description: "Please enter title and valid principal amount." });
      return;
    }

    const newItem: EmiLoanItem = {
      id: `emi-${Date.now()}`,
      title: form.title.trim(),
      lender: form.lender.trim() || "Lender",
      type: form.type,
      principal: parseFloat(form.principal),
      interestRate: parseFloat(form.interestRate) || 0,
      interestType: parseFloat(form.interestRate) > 0 ? form.interestType : "none",
      tenureMonths: parseInt(form.tenureMonths) || 12,
      dueDay: parseInt(form.dueDay) || 5,
      startDate: form.startDate,
      payments: [],
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setAddModalOpen(false);
    setForm({
      title: "",
      lender: "",
      type: "emi",
      principal: "",
      interestRate: "0",
      interestType: "none",
      tenureMonths: "12",
      dueDay: "5",
      startDate: format(new Date(), "yyyy-MM-dd"),
    });

    toast({ title: "🎉 EMI / Loan Created!", description: `Added ${newItem.title} for ${formatINR(newItem.principal)}.` });
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Deleted EMI / Loan record" });
  };

  const handleRecordPayment = () => {
    if (!payModalItem || !payAmount || parseFloat(payAmount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid payment amount." });
      return;
    }

    const amt = parseFloat(payAmount);
    const newPayment: EmiPaymentRecord = {
      id: `pay-${Date.now()}`,
      amount: amt,
      date: format(new Date(), "yyyy-MM-dd"),
      note: payNote.trim() || undefined,
    };

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === payModalItem.id) {
          return { ...item, payments: [newPayment, ...item.payments] };
        }
        return item;
      })
    );

    setPayModalItem(null);
    setPayAmount("");
    setPayNote("");
    toast({ title: "✅ Payment Logged!", description: `Recorded payment of ${formatINR(amt)}.` });
  };

  // Find due soon alerts (due within 7 days & not fully paid)
  const dueSoonAlerts = items.map((item) => {
    const details = calculateEmiDetails(item);
    return { item, details };
  }).filter(({ details }) => !details.isFullyPaid && details.daysUntilDue <= 7);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Upcoming EMIs */}
      {dueSoonAlerts.length > 0 && (
        <Card className="border-2 border-amber-500/40 bg-amber-500/10 rounded-2xl shadow-sm animate-pulse">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  Upcoming EMI / Loan Alert ({dueSoonAlerts.length})
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {dueSoonAlerts[0].item.title} of {formatINR(dueSoonAlerts[0].details.monthlyInstallment)} is due in {dueSoonAlerts[0].details.daysUntilDue} day{dueSoonAlerts[0].details.daysUntilDue !== 1 ? "s" : ""} on {format(dueSoonAlerts[0].details.nextDueDate, "dd MMM yyyy")}!
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setPayModalItem(dueSoonAlerts[0].item)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0"
            >
              Pay Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            EMI, Loans & Interest Tracker
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your monthly EMIs, personal debts, interest calculations, and due dates.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="rounded-xl gap-2 font-semibold text-xs h-9 bg-primary">
          <Plus className="h-4 w-4" />
          Add EMI / Loan
        </Button>
      </div>

      {/* Cards List */}
      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed p-10 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-base mb-1">No EMIs or Loans Added</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Track your Phone EMI, Bike Loan, Home Loan, or money borrowed/lent with interest.
          </p>
          <Button onClick={() => setAddModalOpen(true)} variant="outline" className="rounded-xl text-xs font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add Your First EMI
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const d = calculateEmiDetails(item);

            return (
              <Card key={item.id} className="rounded-2xl border bg-card shadow-sm flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] uppercase font-bold rounded-md ${
                            item.type === "emi"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200"
                              : item.type === "borrowed"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                          }`}
                        >
                          {item.type === "emi" ? "EMI Loan" : item.type === "borrowed" ? "I Owe (Borrowed)" : "Lent Out"}
                        </Badge>

                        {item.interestRate > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-semibold">
                            <Percent className="h-2.5 w-2.5" />
                            {item.interestRate}% {item.interestType}
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="font-display text-lg mt-1.5 font-bold">{item.title}</CardTitle>
                      <CardDescription className="text-xs font-medium">{item.lender}</CardDescription>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Monthly EMI</p>
                      <p className="text-lg font-bold font-mono text-primary">{formatINR(d.monthlyInstallment)}</p>
                      <p className="text-[10px] text-muted-foreground">Due on {item.dueDay}th of month</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Amount Left</p>
                      <p className={`text-lg font-bold font-mono ${d.isFullyPaid ? "text-emerald-600" : "text-amber-600"}`}>
                        {formatINR(d.amountLeft)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.isFullyPaid ? "Fully Settled 🎉" : `${d.emisLeftCount} of ${item.tenureMonths} EMIs left`}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Paid: {formatINR(d.totalPaid)}</span>
                      <span className="text-primary">{d.progressPercent}% Completed</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${d.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Days Countdown & Due Alert */}
                  {!d.isFullyPaid && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                      d.daysUntilDue <= 5
                        ? "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200"
                        : "bg-muted/60 text-muted-foreground"
                    }`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        Next Due: {format(d.nextDueDate, "dd MMM yyyy")}
                      </span>
                      <Badge className={d.daysUntilDue <= 5 ? "bg-rose-600 text-white" : "bg-muted-foreground/20 text-muted-foreground"}>
                        {d.daysUntilDue === 0 ? "Due Today!" : `${d.daysUntilDue} days left`}
                      </Badge>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    {!d.isFullyPaid && (
                      <Button
                        onClick={() => {
                          setPayModalItem(item);
                          setPayAmount(d.monthlyInstallment.toString());
                        }}
                        className="flex-1 rounded-xl font-semibold text-xs h-9 gap-1.5 bg-primary"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Log Payment
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setHistoryModalItem(item)}
                      className="rounded-xl font-semibold text-xs h-9 gap-1.5"
                    >
                      <History className="h-3.5 w-3.5" /> History ({item.payments.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Add EMI or Personal Loan
            </DialogTitle>
            <DialogDescription>Track loans, interest calculations, and payment schedules.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category / Type</Label>
              <Select value={form.type} onValueChange={(val: any) => setForm((f) => ({ ...f, type: val }))}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emi">💳 Bank EMI (Phone / Car / Home Loan)</SelectItem>
                  <SelectItem value="borrowed">🔴 I Owe Someone (Borrowed Money)</SelectItem>
                  <SelectItem value="lent">🟢 Someone Owes Me (Lent Money)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. iPhone 16 EMI" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lender / Person</Label>
                <Input value={form.lender} onChange={(e) => setForm((f) => ({ ...f, lender: e.target.value }))} placeholder="e.g. HDFC / Rahul" className="h-10 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Principal Amount (₹) *</Label>
                <Input type="number" value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} placeholder="60000" className="h-10 rounded-xl font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tenure (Months)</Label>
                <Input type="number" value={form.tenureMonths} onChange={(e) => setForm((f) => ({ ...f, tenureMonths: e.target.value }))} placeholder="12" className="h-10 rounded-xl font-mono text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.1" value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))} placeholder="0 (No Cost EMI)" className="h-10 rounded-xl font-mono text-sm" />
              </div>

              {parseFloat(form.interestRate) > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Interest Calculation</Label>
                  <Select value={form.interestType} onValueChange={(val: any) => setForm((f) => ({ ...f, interestType: val }))}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Interest</SelectItem>
                      <SelectItem value="compound">Compound / Amortized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">EMI Due Day of Month</Label>
                <Input type="number" min="1" max="28" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} placeholder="5" className="h-10 rounded-xl font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="h-10 rounded-xl text-xs" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} className="rounded-xl font-semibold bg-primary">Create Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOG PAYMENT MODAL */}
      {payModalItem && (
        <Dialog open={!!payModalItem} onOpenChange={() => setPayModalItem(null)}>
          <DialogContent className="rounded-2xl sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Log Payment for {payModalItem.title}</DialogTitle>
              <DialogDescription>Record a monthly EMI or debt repayment.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Amount (₹)</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="h-10 rounded-xl font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Note / Transaction Ref (optional)</Label>
                <Input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Paid via GPay Ref #1234"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPayModalItem(null)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleRecordPayment} className="rounded-xl font-semibold bg-primary">Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PAYMENT HISTORY MODAL */}
      {historyModalItem && (
        <Dialog open={!!historyModalItem} onOpenChange={() => setHistoryModalItem(null)}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Payment History: {historyModalItem.title}</DialogTitle>
              <DialogDescription>Past payments and transaction records.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
              {historyModalItem.payments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No payments recorded yet.</p>
              ) : (
                historyModalItem.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs">
                    <div>
                      <p className="font-bold font-mono text-emerald-600">{formatINR(p.amount)}</p>
                      {p.note && <p className="text-muted-foreground text-[11px]">{p.note}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {p.date}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setHistoryModalItem(null)} className="rounded-xl w-full">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
