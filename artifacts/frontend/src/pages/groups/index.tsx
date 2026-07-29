import { useGetGroups, useCreateGroup, getGetGroupsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Wallet, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  currency: z.string().default("INR"),
});
type CreateGroupForm = z.infer<typeof createGroupSchema>;

const GROUP_EMOJIS = ["🏠", "✈️", "🍕", "🎉", "💼", "🏕️", "🎮", "🎵"];

export default function Groups() {
  const { data: groups, isLoading } = useGetGroups();
  const createGroupMutation = useCreateGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", description: "", currency: "INR" },
  });

  const onSubmit = (data: CreateGroupForm) => {
    createGroupMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setOpen(false); form.reset();
        toast({ title: "Group created!" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to create group", description: err.message }),
    });
  };

  // Deterministic emoji from group name
  const getEmoji = (name: string) => GROUP_EMOJIS[name.charCodeAt(0) % GROUP_EMOJIS.length];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Workspace</span>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Groups</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {groups?.length ? `${groups.length} active group${groups.length !== 1 ? "s" : ""}` : "Manage shared expenses with your people"}
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9 rounded-lg font-semibold">
                <Plus className="h-4 w-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create a group</DialogTitle>
                <DialogDescription>Start a new shared expense tracker.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Group Name</Label>
                  <Input {...form.register("name")} placeholder="e.g. Goa Trip 2025" className="h-10 rounded-lg" />
                  {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input {...form.register("description")} placeholder="What's this group for?" className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Currency</Label>
                  <Input {...form.register("currency")} placeholder="INR" className="h-10 rounded-lg" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-lg">Cancel</Button>
                  <Button type="submit" disabled={createGroupMutation.isPending} className="rounded-lg font-semibold">
                    {createGroupMutation.isPending ? "Creating…" : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl shimmer" />)}
          </div>
        ) : groups?.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No groups yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create a group to start tracking shared expenses with friends, family, or colleagues.
            </p>
            <Button onClick={() => setOpen(true)} className="rounded-lg font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Create your first group
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="group-card rounded-2xl border bg-card p-5 cursor-pointer flex flex-col h-full">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center text-2xl">
                      {getEmoji(group.name)}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      group.myBalance > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : group.myBalance < 0
                        ? "bg-rose-50 text-rose-700"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {group.myBalance > 0 ? <TrendingUp className="h-3 w-3" /> :
                       group.myBalance < 0 ? <TrendingDown className="h-3 w-3" /> :
                       <Minus className="h-3 w-3" />}
                      {group.myBalance > 0 ? "owed" : group.myBalance < 0 ? "owes" : "settled"}
                    </div>
                  </div>

                  {/* Name & desc */}
                  <h3 className="font-display font-semibold text-base leading-tight mb-0.5">{group.name}</h3>
                  {group.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{group.description}</p>}

                  {/* Balance */}
                  <div className={`amount text-xl font-bold mb-4 ${
                    group.myBalance > 0 ? "text-emerald-600" :
                    group.myBalance < 0 ? "text-rose-600" :
                    "text-muted-foreground"
                  }`}>
                    {group.myBalance > 0 ? "+" : ""}{group.myBalance.toFixed(2)} {group.currency}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      {group.totalExpenses.toFixed(2)} total
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
