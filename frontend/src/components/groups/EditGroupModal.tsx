import { useState } from "react";
import { useUpdateGroup, useDeleteGroup, getGetGroupQueryKey, getGetGroupsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import type { GroupDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface EditGroupModalProps {
  group: GroupDetail;
  currentUserId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGroupModal({ group, currentUserId, open, onOpenChange }: EditGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [currency, setCurrency] = useState(group.currency || "INR");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const isOwner = group.ownerId === currentUserId;

  const handleUpdate = () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }

    updateGroupMutation.mutate(
      { groupId: group.id, data: { name: name.trim(), description: description.trim(), currency: currency.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
          queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
          toast({ title: "✅ Group Saved", description: "Group settings updated." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Update failed", description: err.message }),
      }
    );
  };

  const handleDelete = () => {
    deleteGroupMutation.mutate(
      { groupId: group.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
          toast({ title: "Group Deleted" });
          setLocation("/groups");
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Delete failed", description: err.message }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setConfirmDelete(false); }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Group Settings
          </DialogTitle>
          <DialogDescription>
            Update group details and currency settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Group Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Trip expenses" className="h-10 rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Currency Symbol / Code</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="INR / ₹" className="h-10 rounded-xl" />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {isOwner && (
            confirmDelete ? (
              <div className="w-full flex items-center gap-2">
                <p className="text-xs text-destructive font-medium flex-1">Delete group permanently?</p>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="rounded-lg">Cancel</Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteGroupMutation.isPending} className="rounded-lg">
                  {deleteGroupMutation.isPending ? "Deleting..." : "Confirm"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete Group
              </Button>
            )
          )}

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateGroupMutation.isPending} className="rounded-xl font-semibold">
              {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
