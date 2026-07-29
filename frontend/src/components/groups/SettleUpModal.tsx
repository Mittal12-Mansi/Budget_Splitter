import { useState, useEffect } from "react";
import { useCreateSettlement, getGetSettlementsQueryKey, getGetBalancesQueryKey, getGetGroupQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import type { MemberWithBalance } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandCoins, ArrowRightLeft, Copy, ExternalLink, QrCode, Phone, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/currency";

interface SettleUpModalProps {
  groupId: number;
  members: MemberWithBalance[];
  defaultPayerId?: number;
  defaultReceiverId?: number;
  defaultAmount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettleUpModal({
  groupId,
  members,
  defaultPayerId,
  defaultReceiverId,
  defaultAmount,
  open,
  onOpenChange,
}: SettleUpModalProps) {
  const [payerId, setPayerId] = useState<number>(defaultPayerId || members[0]?.userId || 0);
  const [receiverId, setReceiverId] = useState<number>(defaultReceiverId || members[1]?.userId || 0);
  const [amount, setAmount] = useState<string>(defaultAmount ? defaultAmount.toString() : "");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const createSettlementMutation = useCreateSettlement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (defaultPayerId) setPayerId(defaultPayerId);
    if (defaultReceiverId) setReceiverId(defaultReceiverId);
    if (defaultAmount) setAmount(defaultAmount.toString());
  }, [defaultPayerId, defaultReceiverId, defaultAmount]);

  const payerMember = members.find((m) => m.userId === payerId);
  const receiverMember = members.find((m) => m.userId === receiverId);

  const payerName = payerMember?.user.name || "Payer";
  const receiverName = receiverMember?.user.name || "Receiver";
  const receiverUser = receiverMember?.user as any;

  // Smart UPI ID generator
  const upiId = receiverUser?.upiId || `${receiverName.toLowerCase().replace(/\s+/g, "")}@upi`;
  const receiverPhone = receiverUser?.phone || "";

  const parsedAmount = parseFloat(amount) || 0;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(receiverName)}&am=${parsedAmount > 0 ? parsedAmount : ""}&cu=INR`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast({ title: "📋 UPI ID Copied!", description: `Copied ${upiId} to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettle = () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ variant: "destructive", title: "Valid amount required" });
      return;
    }
    if (payerId === receiverId) {
      toast({ variant: "destructive", title: "Payer and Receiver must be different" });
      return;
    }

    createSettlementMutation.mutate(
      {
        groupId,
        data: {
          payerId,
          receiverId,
          amount: parsedAmount,
          note: note.trim() || `Paid via UPI (${upiId})`,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettlementsQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
          setNote("");
          toast({ title: "✅ Settlement Recorded", description: `Marked ${formatINR(parsedAmount)} as paid to ${receiverName}.` });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Settlement failed", description: err.message }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md border shadow-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2 text-emerald-700">
            <HandCoins className="h-5 w-5 text-emerald-600" />
            Pay {receiverName}
          </DialogTitle>
          <DialogDescription>
            Pay using UPI (GPay, PhonePe, Paytm) and record the settlement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payer & Receiver selects */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Who paid?</Label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(Number(e.target.value))}
                className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-medium focus:ring-2 focus:ring-primary"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Who received?</Label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(Number(e.target.value))}
                className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-medium focus:ring-2 focus:ring-primary"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
            <span>{payerName}</span>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>{receiverName}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Amount (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 152.09"
              className="h-10 rounded-xl font-bold amount text-lg"
            />
          </div>

          {/* 🌟 RECEIVER'S UPI & PAYMENT CARD 🌟 */}
          <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-emerald-600" />
                {receiverName}'s UPI Payment Info
              </span>
            </div>

            <div className="bg-background rounded-xl p-3 border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">UPI ID (GPay / PhonePe / Paytm)</p>
                  <p className="text-xs font-bold font-mono text-foreground mt-0.5">{upiId}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyUpiId}
                  className="h-7 text-xs font-semibold rounded-lg gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy UPI"}
                </Button>
              </div>

              {receiverPhone ? (
                <div className="pt-1.5 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>Phone: <strong className="text-foreground font-mono">{receiverPhone}</strong></span>
                </div>
              ) : null}
            </div>

            {/* Direct Open UPI Link Button */}
            <a
              href={upiDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-decoration-none"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open UPI App (GPay / PhonePe / Paytm)
            </a>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Note / Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via Google Pay"
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl flex-1">Cancel</Button>
          <Button
            onClick={handleSettle}
            disabled={createSettlementMutation.isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold gap-1.5 flex-1"
          >
            {createSettlementMutation.isPending ? "Recording..." : "Record Settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
