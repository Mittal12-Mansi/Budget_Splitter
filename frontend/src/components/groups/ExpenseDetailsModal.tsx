import { useState } from "react";
import { useDeleteExpense, getGetExpensesQueryKey, getGetGroupQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import type { ExpenseDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/currency";
import { format } from "date-fns";
import { Receipt, User, Trash2, Calendar, FileText, Maximize2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExpenseDetailsModalProps {
  groupId: number;
  expense: ExpenseDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRequested?: (expense: ExpenseDetail) => void;
}

export function ExpenseDetailsModal({ groupId, expense, open, onOpenChange, onEditRequested }: ExpenseDetailsModalProps) {
  const deleteExpenseMutation = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  if (!expense) return null;

  const receiptUrl = (expense as any).receiptUrl;

  const handleDelete = () => {
    deleteExpenseMutation.mutate(
      { groupId, expenseId: expense.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetExpensesQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
          setConfirmDelete(false);
          toast({ title: "✅ Expense Deleted", description: `Deleted "${expense.description}".` });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete expense." });
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setConfirmDelete(false); }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                {expense.category || "General"}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(expense.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            <DialogTitle className="font-display text-2xl mt-1">{expense.description}</DialogTitle>
            <DialogDescription className="text-2xl font-bold amount text-primary pt-1">
              {formatINR(parseFloat(expense.amount as any))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Payer Info */}
            <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                  {expense.payer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Paid by</p>
                  <p className="text-sm font-semibold leading-tight">{expense.payer.name}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[11px] font-normal">
                {expense.splitType.toUpperCase()} SPLIT
              </Badge>
            </div>

            {/* Splits Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                <span>Split Between ({expense.splits?.length || 0})</span>
                <span>Amount</span>
              </div>
              <div className="rounded-xl border divide-y overflow-hidden">
                {expense.splits?.map((split) => (
                  <div key={split.id} className="p-3 flex items-center justify-between bg-card text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {split.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{split.user.name}</span>
                    </div>
                    <span className="font-semibold amount text-xs">
                      {formatINR(parseFloat(split.amount as any))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 🧾 Receipt Attachment Section */}
            {receiptUrl ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Attached Bill / Receipt
                </span>
                <div
                  onClick={() => setShowFullReceipt(true)}
                  className="relative rounded-2xl border-2 border-primary/20 overflow-hidden cursor-pointer group bg-muted/30 hover:border-primary/50 transition-all shadow-sm"
                >
                  <img
                    src={receiptUrl}
                    alt="Attached Bill Receipt"
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-xs gap-2">
                    <Maximize2 className="h-4 w-4" /> Click to Zoom Receipt
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            {confirmDelete ? (
              <div className="w-full flex items-center gap-2">
                <p className="text-xs text-destructive font-medium flex-1">Are you sure?</p>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="rounded-lg">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteExpenseMutation.isPending}
                  onClick={handleDelete}
                  className="rounded-lg font-semibold"
                >
                  {deleteExpenseMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Screen Receipt Zoom Modal */}
      {showFullReceipt && receiptUrl && (
        <Dialog open={showFullReceipt} onOpenChange={setShowFullReceipt}>
          <DialogContent className="sm:max-w-3xl rounded-3xl p-4 bg-background border shadow-2xl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Receipt Image - {expense.description}
              </DialogTitle>
            </DialogHeader>
            <div className="p-2 flex items-center justify-center bg-black/5 rounded-2xl max-h-[80vh] overflow-auto">
              <img src={receiptUrl} alt="Full Receipt" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg" />
            </div>
            <DialogFooter className="pt-2">
              <Button onClick={() => setShowFullReceipt(false)} className="rounded-xl font-semibold w-full sm:w-auto">
                Close Viewer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
