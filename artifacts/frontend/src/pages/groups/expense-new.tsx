import { useGetGroup, useCreateExpense, getGetExpensesQueryKey, getGetGroupQueryKey, getGetBalancesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, Users, DollarSign } from "lucide-react";
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

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: "", amount: undefined, payerId: undefined, splitType: "equal", category: "" },
  });

  const onSubmit = (data: ExpenseForm) => {
    createExpenseMutation.mutate({ data: { ...data, groupId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpensesQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Expense added!" });
        setLocation(`/groups/${groupId}`);
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to add expense", description: err.message }),
    });
  };

  if (isLoading || !group) return null;

  const watchAmount = form.watch("amount");
  const perPerson = watchAmount && group.members?.length ? (watchAmount / group.members.length) : null;

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
          <div className="rounded-2xl border bg-card p-6 space-y-1 text-center">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount ({group.currency})</label>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-3xl text-muted-foreground font-display">₹</span>
              <input
                type="number" step="0.01" placeholder="0.00"
                {...form.register("amount")}
                className="text-4xl font-display font-bold tracking-tight w-44 text-center bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/30"
              />
            </div>
            {perPerson && (
              <p className="text-xs text-primary font-medium mt-2">
                ≈ ₹{perPerson.toFixed(2)} per person
              </p>
            )}
            {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          {/* Details card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Input {...form.register("description")} placeholder="e.g. Dinner at Barbeque Nation" className="h-10 rounded-lg" />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Paid by</Label>
                <Controller
                  control={form.control} name="payerId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <SelectTrigger className="h-10 rounded-lg">
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
                      <SelectTrigger className="h-10 rounded-lg">
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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Split type</Label>
              <Controller
                control={form.control} name="splitType"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "equal", label: "Equal", icon: Users },
                      { value: "percentage", label: "%" },
                      { value: "amount", label: "Custom" },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value} type="button"
                        onClick={() => field.onChange(value)}
                        className={`h-9 rounded-lg text-xs font-medium transition-all border ${
                          field.value === value
                            ? "bg-primary text-white border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {form.watch("splitType") === "equal" && group.members?.length && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Split equally between {group.members.length} people</span>
                </div>
                {perPerson && (
                  <span className="amount text-xs font-bold text-primary">₹{perPerson.toFixed(2)}/each</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href={`/groups/${groupId}`} className="flex-1">
              <Button variant="outline" type="button" className="w-full rounded-lg">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createExpenseMutation.isPending} className="flex-1 rounded-lg font-semibold">
              {createExpenseMutation.isPending ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
