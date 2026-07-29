import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SplitSquareHorizontal, ArrowRight, Shield, Zap, Users } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Zap, text: "Instant expense splitting" },
  { icon: Users, text: "Multi-group management" },
  { icon: Shield, text: "Secure & private" },
];

export default function Login() {
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const loginMutation = useLogin();

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => { setAuth(res); toast({ title: "Welcome back!" }); },
      onError: (err) => {
        toast({ variant: "destructive", title: "Login failed", description: err.data?.message || err.message });
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
          <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Split bills,<br />not friendships.
          </h2>
          <p className="text-base mb-8" style={{ color: "hsl(220 20% 55%)" }}>
            The smarter way to track shared expenses with friends, family, and teammates.
          </p>
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm" style={{ color: "hsl(220 20% 70%)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "hsl(220 20% 35%)" }}>© 2025 Splitter. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <SplitSquareHorizontal className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Splitter</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-login">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email" type="email" placeholder="you@example.com"
                {...form.register("email")}
                className="h-10 rounded-lg"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password" type="password" placeholder="••••••••"
                {...form.register("password")}
                className="h-10 rounded-lg"
                data-testid="input-password"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg font-semibold gap-2 mt-2"
              disabled={loginMutation.isPending}
              data-testid="button-submit-login"
            >
              {loginMutation.isPending ? "Signing in…" : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline" data-testid="link-register">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
