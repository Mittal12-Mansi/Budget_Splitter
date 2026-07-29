import { useState, useEffect } from "react";
import { useGetGroup, useCreateExpense, getGetExpensesQueryKey, getGetGroupQueryKey, getGetBalancesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Check, Percent, Calculator, Sparkles, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PERSONAL_CATEGORIES } from "@/lib/currency";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  payerId: z.coerce.number().min(1, "Payer is required"),
  splitType: z.enum(["equal", "percentage", "amount"]),
  category: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

export default function NewExpense({ groupId }: { groupId: number }) {
  const [, setLocation] = useLocation();
  const { data: group, isLoading } = useGetGroup(groupId);
  const createExpenseMutation = useCreateExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<number, number>>({});
  const [editedUserIds, setEditedUserIds] = useState<number[]>([]);
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

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: "", amount: undefined, payerId: undefined, splitType: "equal", category: "" },
  });

  const watchSplitType = form.watch("splitType");
  const watchAmount = form.watch("amount");

  useEffect(() => {
    if (group?.members) {
      setSelectedMemberIds(group.members.map((m) => m.userId));
      const initial: Record<number, number> = {};
      group.members.forEach((m) => {
        initial[m.userId] = 0;
      });
      setCustomSplits(initial);
    }
  }, [group]);

  const toggleMember = (userId: number) => {
    if (selectedMemberIds.includes(userId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
      } else {
        toast({ variant: "destructive", title: "At least 1 member must be selected for the split" });
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleCustomAmountChange = (userId: number, val: number) => {
    const numVal = isNaN(val) ? 0 : val;
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: numVal,
    }));
    if (!editedUserIds.includes(userId)) {
      setEditedUserIds((prev) => [...prev, userId]);
    }
  };

  const handlePercentageChange = (userId: number, val: number) => {
    const numVal = isNaN(val) ? 0 : val;
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: numVal,
    }));
  };

  // Calculations for custom amount mode
  const totalCustomAmount = Object.values(customSplits).reduce((sum, v) => sum + (v || 0), 0);
  const remainingAmountToSplit = watchAmount ? watchAmount - totalCustomAmount : 0;
  const uneditedMembers = group?.members ? group.members.filter((m) => !editedUserIds.includes(m.userId)) : [];

  // Auto-split remaining amount equally among unedited members
  const autoSplitRemaining = () => {
    if (!watchAmount || !group?.members) return;
    const editedTotal = group.members
      .filter((m) => editedUserIds.includes(m.userId))
      .reduce((sum, m) => sum + (customSplits[m.userId] || 0), 0);

    const remaining = watchAmount - editedTotal;
    if (remaining < 0) {
      toast({ variant: "destructive", title: "Edited amounts exceed total expense amount!" });
      return;
    }

    const targetMembers = uneditedMembers.length > 0 ? uneditedMembers : group.members;
    const perPerson = Math.round((remaining / targetMembers.length) * 100) / 100;

    const newSplits = { ...customSplits };
    targetMembers.forEach((m) => {
      newSplits[m.userId] = perPerson;
    });

    setCustomSplits(newSplits);
    toast({ title: `⚡ Split remaining ₹${remaining.toFixed(2)} equally among ${targetMembers.length} members!` });
  };

  const resetCustomSplits = () => {
    if (!group?.members) return;
    setEditedUserIds([]);
    const reset: Record<number, number> = {};
    group.members.forEach((m) => (reset[m.userId] = 0));
    setCustomSplits(reset);
  };

  const totalPercentage = Object.values(customSplits).reduce((sum, v) => sum + (v || 0), 0);

  const onSubmit = (data: ExpenseForm) => {
    let splitsPayload: Array<{ userId: number; value: number }> = [];

    if (data.splitType === "equal") {
      if (selectedMemberIds.length === 0) {
        toast({ variant: "destructive", title: "Select at least 1 member to split the expense" });
        return;
      }
      splitsPayload = selectedMemberIds.map((userId) => ({ userId, value: 0 }));
    } else if (data.splitType === "percentage") {
      const roundedTotal = Math.round(totalPercentage * 100) / 100;
      if (Math.abs(roundedTotal - 100) > 0.5) {
        toast({ variant: "destructive", title: "Percentages must total 100%", description: `Current total: ${roundedTotal}%` });
        return;
      }
      splitsPayload = group!.members.map((m) => ({
        userId: m.userId,
        value: customSplits[m.userId] || 0,
      }));
    } else if (data.splitType === "amount") {
      const roundedTotal = Math.round(totalCustomAmount * 100) / 100;
      if (Math.abs(roundedTotal - data.amount) > 0.5) {
        toast({ variant: "destructive", title: "Custom amounts must equal total expense amount", description: `Entered: ₹${roundedTotal} / Total: ₹${data.amount}` });
        return;
      }
      splitsPayload = group!.members.map((m) => ({
        userId: m.userId,
        value: customSplits[m.userId] || 0,
      }));
    }

    const payload = {
      ...data,
      receiptUrl: receiptUrl || undefined,
      splits: splitsPayload,
    };

    createExpenseMutation.mutate({ groupId, data: payload as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpensesQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "✅ Expense Added!" });
        setLocation(`/groups/${groupId}`);
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to add expense", description: err.message }),
    });
  };

  if (isLoading || !group) return null;

  const perPersonEqual = watchAmount && selectedMemberIds.length ? watchAmount / selectedMemberIds.length : null;

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight">Add Expense</h1>
            <p className="text-xs text-muted-foreground">to {group.name}</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Amount — hero field */}
          <div className="rounded-2xl border bg-card p-6 space-y-1 text-center shadow-sm">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount ({group.currency || "INR"})</label>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-3xl text-muted-foreground font-display">₹</span>
              <input
                type="number" step="0.01" placeholder="0.00"
                {...form.register("amount")}
                className="text-4xl font-display font-bold tracking-tight w-44 text-center bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/30"
              />
            </div>
            {watchSplitType === "equal" && perPersonEqual ? (
              <p className="text-xs text-primary font-medium mt-2">
                ≈ ₹{perPersonEqual.toFixed(2)} per participating person ({selectedMemberIds.length} members selected)
              </p>
            ) : null}
            {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          {/* Details card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Input {...form.register("description")} placeholder="e.g. Bus ticket / Dinner / Food" className="h-10 rounded-xl" />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Paid by</Label>
                <Controller
                  control={form.control} name="payerId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Who paid?" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId.toString()}>{m.user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.payerId && <p className="text-xs text-destructive">{form.formState.errors.payerId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Category</Label>
                <Controller
                  control={form.control} name="category"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONAL_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* 🧾 Receipt Image Attachment Box */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Attach Bill / Receipt Image <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="h-10 rounded-xl cursor-pointer text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
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
                  <img src={receiptUrl} alt="Receipt preview" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>

            {/* Split Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Split type</Label>
              <Controller
                control={form.control} name="splitType"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "equal", label: "Equal" },
                      { value: "percentage", label: "%" },
                      { value: "amount", label: "Custom" },
                    ].map(({ value, label }) => (
                      <button
                        key={value} type="button"
                        onClick={() => {
                          field.onChange(value);
                          if (value === "amount" && watchAmount) {
                            const init: Record<number, number> = {};
                            group.members.forEach((m) => (init[m.userId] = 0));
                            setCustomSplits(init);
                            setEditedUserIds([]);
                          } else if (value === "percentage") {
                            const perPct = Math.round((100 / group.members.length) * 100) / 100;
                            const init: Record<number, number> = {};
                            group.members.forEach((m) => (init[m.userId] = perPct));
                            setCustomSplits(init);
                          }
                        }}
                        className={`h-10 rounded-xl text-xs font-semibold transition-all border ${
                          field.value === value
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-muted/20 text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* 1. EQUAL SPLIT MODE */}
            {watchSplitType === "equal" && group.members?.length ? (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Participating Members ({selectedMemberIds.length} of {group.members.length})
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-primary px-2 hover:bg-primary/10"
                    onClick={() => setSelectedMemberIds(group.members.map((m) => m.userId))}
                  >
                    Select All
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleMember(m.userId)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-foreground font-medium shadow-xs"
                            : "bg-muted/20 border-border text-muted-foreground opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center text-[10px] font-bold transition-colors ${
                          isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/40 bg-background"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{m.user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.user.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {perPersonEqual ? (
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Split equally between {selectedMemberIds.length} members</span>
                    </div>
                    <span className="amount text-xs font-bold text-primary">₹{perPersonEqual.toFixed(2)}/each</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 2. PERCENTAGE SPLIT MODE (%) */}
            {watchSplitType === "percentage" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Enter Percentage for Each Member
                    </Label>
                  </div>
                  <span className={`text-xs font-bold ${Math.abs(totalPercentage - 100) < 0.5 ? "text-emerald-600" : "text-destructive"}`}>
                    Total: {Math.round(totalPercentage * 10) / 10}% / 100%
                  </span>
                </div>

                <div className="space-y-2">
                  {group.members.map((m) => {
                    const pct = customSplits[m.userId] ?? 0;
                    const calculatedShare = watchAmount ? (watchAmount * pct) / 100 : 0;
                    return (
                      <div key={m.userId} className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/10 gap-3">
                        <div className="truncate flex-1">
                          <p className="text-xs font-medium truncate">{m.user.name}</p>
                          <p className="text-[10px] text-muted-foreground">≈ ₹{calculatedShare.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={pct || ""}
                            onChange={(e) => handlePercentageChange(m.userId, parseFloat(e.target.value))}
                            placeholder="0"
                            className="h-8 w-20 text-right text-xs rounded-lg"
                          />
                          <span className="text-xs font-medium text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. CUSTOM UNEQUAL EXACT AMOUNT SPLIT MODE (WITH DYNAMIC SMART AUTO-SPLIT) */}
            {watchSplitType === "amount" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Unequal Amount Split
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                      onClick={resetCustomSplits}
                    >
                      <RefreshCw className="h-3 w-3" /> Reset
                    </Button>
                    <span className={`text-xs font-bold ${watchAmount && Math.abs(totalCustomAmount - watchAmount) < 0.5 ? "text-emerald-600" : "text-destructive"}`}>
                      Entered: ₹{totalCustomAmount.toFixed(2)} / ₹{watchAmount || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.members.map((m) => {
                    const amt = customSplits[m.userId] ?? 0;
                    const isEdited = editedUserIds.includes(m.userId);
                    return (
                      <div
                        key={m.userId}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isEdited ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-border"
                        }`}
                      >
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium truncate">{m.user.name}</p>
                            {isEdited && <span className="text-[10px] text-primary font-semibold">(Custom)</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{m.user.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={amt || ""}
                            onChange={(e) => handleCustomAmountChange(m.userId, parseFloat(e.target.value))}
                            placeholder="0.00"
                            className="h-8 w-24 text-right text-xs rounded-lg font-medium"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Smart Auto-Split Button */}
                {watchAmount && remainingAmountToSplit > 0.01 ? (
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                        Remaining to split: <strong className="text-primary font-display font-bold">₹{remainingAmountToSplit.toFixed(2)}</strong>
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={autoSplitRemaining}
                      className="w-full h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-Split Remaining ₹{remainingAmountToSplit.toFixed(2)} Equally ({uneditedMembers.length || group.members.length} members)
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href={`/groups/${groupId}`} className="flex-1">
              <Button variant="outline" type="button" className="w-full rounded-xl">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createExpenseMutation.isPending} className="flex-1 rounded-xl font-semibold">
              {createExpenseMutation.isPending ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
