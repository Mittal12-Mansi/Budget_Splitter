import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, KeyRound, QrCode, Phone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import apiRequest from "@/lib/axios";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [upiId, setUpiId] = useState((user as any)?.upiId || `${user?.name?.toLowerCase().replace(/\s+/g, "")}@upi`);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; password?: string; phone?: string; upiId?: string }) => {
      return apiRequest("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setPassword("");
      toast({ title: "✅ Profile Updated", description: "Your details & payment info have been saved." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      upiId: upiId.trim() || undefined,
      ...(password.trim() ? { password: password.trim() } : {}),
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">User Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account information and payment details.</p>
        </div>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-2xl text-primary font-display">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-xl font-display">{user?.name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Display Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mansi Mittal"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input value={email} disabled className="h-10 rounded-xl bg-muted/50 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">Email address cannot be changed.</p>
              </div>

              {/* UPI ID for Payments */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-emerald-600" />
                  UPI ID (GPay / PhonePe / Paytm / BHIM)
                </Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mansi@upi or 9876543210@paytm"
                  className="h-10 rounded-xl border-emerald-200 focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">This UPI ID will appear when friends click "Pay Mansi".</p>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number (optional)
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl font-semibold gap-2 bg-primary"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile & Payment Info"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
