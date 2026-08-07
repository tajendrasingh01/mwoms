import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation } from "react-router-dom";
import { Mountain, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/store/auth-store";

const loginFormSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const { user, isLoadingSession, login, isLoggingIn, loginError } = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  // Already logged in? Bounce straight to where they were headed (or dashboard).
  if (!isLoadingSession && user) {
    const redirectTo =
      (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      await login(values);
    } catch {
      // loginError from useAuth already reflects the mutation's error;
      // this catch just prevents an unhandled promise rejection.
      setSubmitError(loginError);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mountain className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">MWOMS</h1>
            <p className="text-sm text-muted-foreground">
              Mine Workforce Operations Management System
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-foreground">Sign in</h2>
            <p className="text-xs text-muted-foreground">
              Use your Employee ID and password to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. ADMIN001"
                  aria-invalid={!!errors.employeeId}
                  {...register("employeeId")}
                />
                {errors.employeeId && (
                  <p className="text-xs text-danger">{errors.employeeId.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-danger">{errors.password.message}</p>
                )}
              </div>

              {(loginError || submitError) && (
                <div className="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{loginError ?? submitError}</span>
                </div>
              )}

              <Button type="submit" disabled={isLoggingIn} className="mt-1">
                {isLoggingIn && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
