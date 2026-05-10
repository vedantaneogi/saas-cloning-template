"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { forgotPassword } from "@/features/auth/api";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch {
      setSent(true); // same UI — don't leak whether email exists
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="w-full" style={{ maxWidth: "500px" }}>
      <div className="bg-white" style={{ borderRadius: "8px", border: "1px solid rgba(19,0,50,0.08)", padding: "48px 56px" }}>
        {sent ? (
          <div>
            <h1 style={{ color: "rgba(19,0,50,0.9)", fontSize: "24px", fontWeight: 400, marginBottom: "16px" }}>
              Check your email
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.6)", marginBottom: "24px", lineHeight: "1.6" }}>
              If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox (and spam folder).
            </p>
            <Link href="/sign-in" style={{ fontSize: "14px", color: "#260559", textDecoration: "underline" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <div>
            <h1 style={{ color: "rgba(19,0,50,0.9)", fontSize: "24px", fontWeight: 400, marginBottom: "8px" }}>
              Reset your password
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.6)", marginBottom: "24px" }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#1B0A3C", marginBottom: "4px" }}>
                  Email <span style={{ color: "#D93025" }}>*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  autoFocus
                  placeholder="Enter your email"
                  style={{
                    width: "100%", padding: "10px 12px", border: `1px solid ${errors.email ? "#D93025" : "#E0E0E0"}`,
                    borderRadius: "4px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) => (e.target.style.borderColor = errors.email ? "#D93025" : "#E0E0E0")}
                />
                {errors.email && <p style={{ marginTop: "4px", fontSize: "12px", color: "#D93025" }}>{errors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: "40px", background: loading ? "#9E9E9E" : "#260559",
                  color: "#fff", border: "none", borderRadius: "4px", fontSize: "16px", fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <Link href="/sign-in" style={{ fontSize: "14px", color: "#260559", textDecoration: "underline" }}>
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
