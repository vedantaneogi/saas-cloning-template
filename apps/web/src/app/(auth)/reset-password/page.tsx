"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { resetPassword } from "@/features/auth/api";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="w-full" style={{ maxWidth: "500px" }}>
        <div className="bg-white" style={{ borderRadius: "8px", border: "1px solid rgba(19,0,50,0.08)", padding: "48px 56px" }}>
          <p style={{ color: "#D93025" }}>Invalid reset link. Please request a new one.</p>
          <Link href="/forgot-password" style={{ fontSize: "14px", color: "#260559", textDecoration: "underline", display: "block", marginTop: "12px" }}>
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError("");
    try {
      await resetPassword(token, data.password);
      setDone(true);
    } catch (err) {
      setServerError((err as Error).message);
    }
  });

  return (
    <div className="w-full" style={{ maxWidth: "500px" }}>
      <div className="bg-white" style={{ borderRadius: "8px", border: "1px solid rgba(19,0,50,0.08)", padding: "48px 56px" }}>
        {done ? (
          <div>
            <h1 style={{ color: "rgba(19,0,50,0.9)", fontSize: "24px", fontWeight: 400, marginBottom: "16px" }}>Password reset!</h1>
            <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.6)", marginBottom: "24px" }}>Your password has been updated. You can now sign in.</p>
            <Link href="/sign-in">
              <button style={{ width: "100%", height: "40px", background: "#260559", color: "#fff", border: "none", borderRadius: "4px", fontSize: "16px", fontWeight: 500, cursor: "pointer" }}>
                Sign In
              </button>
            </Link>
          </div>
        ) : (
          <div>
            <h1 style={{ color: "rgba(19,0,50,0.9)", fontSize: "24px", fontWeight: 400, marginBottom: "8px" }}>Choose a new password</h1>
            <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.6)", marginBottom: "24px" }}>Enter a new password for your account.</p>
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#1B0A3C", marginBottom: "4px" }}>
                  New Password <span style={{ color: "#D93025" }}>*</span>
                </label>
                <input
                  {...register("password")}
                  type="password"
                  autoFocus
                  placeholder="At least 8 characters"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.password ? "#D93025" : "#E0E0E0"}`, borderRadius: "4px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) => (e.target.style.borderColor = errors.password ? "#D93025" : "#E0E0E0")}
                />
                {errors.password && <p style={{ marginTop: "4px", fontSize: "12px", color: "#D93025" }}>{errors.password.message}</p>}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#1B0A3C", marginBottom: "4px" }}>
                  Confirm Password <span style={{ color: "#D93025" }}>*</span>
                </label>
                <input
                  {...register("confirm")}
                  type="password"
                  placeholder="Repeat new password"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.confirm ? "#D93025" : "#E0E0E0"}`, borderRadius: "4px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) => (e.target.style.borderColor = errors.confirm ? "#D93025" : "#E0E0E0")}
                />
                {errors.confirm && <p style={{ marginTop: "4px", fontSize: "12px", color: "#D93025" }}>{errors.confirm.message}</p>}
              </div>
              {serverError && (
                <div style={{ padding: "12px", background: "#FFEBEE", borderRadius: "4px", fontSize: "14px", color: "#D93025" }}>
                  {serverError}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ width: "100%", height: "40px", background: isSubmitting ? "#9E9E9E" : "#260559", color: "#fff", border: "none", borderRadius: "4px", fontSize: "16px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer" }}
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
