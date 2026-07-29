import { useState } from "react";
import { useInviteMember, useGetGroup, getGetGroupQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Phone, Mail, MessageSquare, ExternalLink, Copy, CheckCircle2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddMemberModalProps {
  groupId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberModal({ groupId, open, onOpenChange }: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addedMember, setAddedMember] = useState<{ name: string; phone: string; email?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMemberMutation = useInviteMember();
  const { data: group } = useGetGroup(groupId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      toast({ variant: "destructive", title: "Name is required", description: "Please enter the member's name." });
      return;
    }

    inviteMemberMutation.mutate(
      {
        groupId,
        data: {
          name: cleanName,
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setAddedMember({ name: cleanName, phone: cleanPhone, email: cleanEmail });
          toast({ title: "✅ Member Added!", description: `Added ${cleanName} to ${group?.name || "group"}.` });
        },
        onError: (err: any) => {
          const message = err.response?.data?.message || err.message || "Failed to add member";
          toast({ variant: "destructive", title: "Cannot add member", description: message });
        },
      }
    );
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddedMember(null);
    setCopied(false);
    onOpenChange(false);
  };

  const groupLink = `${window.location.origin}/groups/${groupId}`;
  const inviteText = `Hi ${addedMember?.name || "friend"}!\n\nYou have been added to the '${group?.name || "Group"}' group on Splitter to split expenses.\n\nClick here to view group balances & expenses:\n${groupLink}`;

  const cleanDigits = addedMember?.phone.replace(/\D/g, "") || "";
  const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(inviteText)}`;
  const smsUrl = `sms:${addedMember?.phone || ""}?body=${encodeURIComponent(inviteText)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteText);
    setCopied(true);
    toast({ title: "📋 Invite copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl sm:max-w-md border shadow-lg">
        {!addedMember ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2 text-primary">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Group Member
              </DialogTitle>
              <DialogDescription>
                Add friends using their name & phone number. Email is completely optional!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Member Name */}
              <div className="space-y-1.5">
                <Label htmlFor="member-name" className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="member-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shivani / Rahul Kumar"
                  className="h-10 rounded-xl"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="member-phone" className="text-sm font-semibold flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Phone Number (for SMS & WhatsApp)
                </Label>
                <Input
                  id="member-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="h-10 rounded-xl font-mono text-sm"
                />
              </div>

              {/* Email Address - OPTIONAL */}
              <div className="space-y-1.5">
                <Label htmlFor="member-email" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email Address <span className="text-xs font-normal">(optional)</span>
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. shivani@example.com (optional)"
                  className="h-10 rounded-xl bg-muted/30"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleAdd}
                disabled={inviteMemberMutation.isPending}
                className="rounded-xl font-semibold gap-2 bg-primary"
              >
                {inviteMemberMutation.isPending ? "Adding Member..." : "Add Member"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* SUCCESS VIEW: WhatsApp & SMS Invite Options */
          <div className="py-2 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold">{addedMember.name} Added!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Send an SMS or WhatsApp message so they can view group expenses & balances.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* WhatsApp Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm text-decoration-none transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Send WhatsApp Invite to {addedMember.name}
              </a>

              {/* SMS Button */}
              {addedMember.phone && (
                <a
                  href={smsUrl}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm text-decoration-none transition-all"
                >
                  <Phone className="h-4 w-4" />
                  Send Direct SMS to {addedMember.phone}
                </a>
              )}

              {/* Copy Invite Link */}
              <Button
                variant="outline"
                onClick={copyLink}
                className="w-full h-10 rounded-xl text-xs font-semibold gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied Link!" : "Copy Invite Message"}
              </Button>
            </div>

            <div className="pt-2">
              <Button onClick={handleClose} className="rounded-xl w-full">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
