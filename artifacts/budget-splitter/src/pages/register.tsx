import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SplitSquareHorizontal, ArrowRight, CheckCircle } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type RegisterForm = z.infer<typeof registerSchema>;

const perks = [
  "Unlimited groups & members",
  "Smart debt minimisation algorithm",
  "Real-time balance tracking",
  "Recurring expense support",
];

export default function Register() {
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const registerMutation = useRegister();

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => { setAuth(res); toast({ title: "Welcome to Splitter!" }); },
      onError: (err) => {
        toast({ variant: "destructive", title: "Registration failed", description: err.data?.message || err.message });
      },
    });
  };

  return (
    <div className="min-h-screen flex auth-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "hsl(224 71% 8%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(243 75% 65%) 0%, hsl(243 75% 50%) 100%)" }}>
            <SplitSquareHorizontal className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">Splitter</span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(243 75% 65%)" }}>
            Free forever
          </p>
          <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Everything you<br />need. Nothing you don't.
          </h2>
          <div className="space-y-2.5 mt-6">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm" style={{ color: "hsl(220 20% 70%)" }}>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "hsl(220 20% 35%)" }}>© 2025 Splitter. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <SplitSquareHorizontal className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Splitter</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl tracking-tight">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start splitting expenses in under a minute</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-register">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input id="name" placeholder="Jane Doe" {...form.register("name")} className="h-10 rounded-lg" data-testid="input-name" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} className="h-10 rounded-lg" data-testid="input-email" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" placeholder="Min. 6 characters" {...form.register("password")} className="h-10 rounded-lg" data-testid="input-password" />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg font-semibold gap-2 mt-2"
              disabled={registerMutation.isPending}
              data-testid="button-submit-register"
            >
              {registerMutation.isPending ? "Creating account…" : (
                <>Create free account <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
