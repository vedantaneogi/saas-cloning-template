"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLogin } from "../hooks/useAuth";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type FullFormData = z.infer<typeof passwordSchema>;

export function LoginForm() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const loginMutation = useLogin();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const passwordForm = useForm<FullFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email },
  });

  const handleEmailSubmit = emailForm.handleSubmit((data) => {
    setEmail(data.email);
    passwordForm.setValue("email", data.email);
    setStep("password");
  });

  const handlePasswordSubmit = passwordForm.handleSubmit((data) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  });

  useEffect(() => {
    if (step === "password") {
      const timer = setTimeout(() => passwordForm.setValue("password", ""), 80);
      return () => clearTimeout(timer);
    }
  }, [step, passwordForm]);

  return (
    <div className="w-full" style={{ maxWidth: "500px" }}>
      <div
        className="bg-white"
        style={{ borderRadius: "8px", border: "1px solid rgba(19,0,50,0.08)", padding: "48px 56px" }}
      >
        {step === "email" ? (
          <div>
            <h1
              className="mb-3"
              style={{ color: "rgba(19, 0, 50, 0.9)", fontSize: "24px", fontWeight: 400, lineHeight: "30px", letterSpacing: "-0.24px" }}
            >
              Log in to Docusign
            </h1>
            <p className="mb-6" style={{ fontSize: "14px", color: "rgba(19, 0, 50, 0.6)" }}>
              Enter your email to log in.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#1B0A3C" }}
                >
                  Email <span style={{ color: "#D93025" }}>*</span>
                </label>
                <input
                  {...emailForm.register("email")}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="Enter email"
                  className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
                  style={{
                    borderColor: emailForm.formState.errors.email
                      ? "#D93025"
                      : "#E0E0E0",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) =>
                    (e.target.style.borderColor =
                      emailForm.formState.errors.email ? "#D93025" : "#E0E0E0")
                  }
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-xs" style={{ color: "#D93025" }}>
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full text-white transition-colors"
                style={{ background: "#260559", borderRadius: "4px", height: "40px", fontSize: "16px", fontWeight: 500 }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#3A1A70")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#260559")
                }
              >
                NEXT
              </button>
            </form>

            {/* Sign Up outlined button */}
            <div className="mt-3">
              <Link href="/sign-up" className="block w-full">
                <button
                  type="button"
                  className="w-full transition-colors"
                  style={{
                    background: "rgba(19, 0, 50, 0.05)",
                    border: "1px solid transparent",
                    borderRadius: "4px",
                    height: "40px",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "rgba(19, 0, 50, 0.9)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(19, 0, 50, 0.1)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "rgba(19, 0, 50, 0.05)")
                  }
                >
                  Sign Up for Free
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Back arrow + email */}
            <button
              onClick={() => setStep("email")}
              className="flex items-center gap-1.5 text-sm mb-5 hover:opacity-70 transition-opacity"
              style={{ color: "#1B0A3C" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              {email}
            </button>

            <h1
              className="text-xl font-semibold mb-5"
              style={{ color: "#1B0A3C" }}
            >
              Log In
            </h1>

            <form onSubmit={handlePasswordSubmit} className="space-y-4" autoComplete="off">
              {/* Honeypot: hidden field absorbs browser autofill */}
              <input
                type="password"
                name="password-fake"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: "absolute", opacity: 0, height: 0, width: 0, padding: 0, border: 0, overflow: "hidden", pointerEvents: "none" }}
              />
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#1B0A3C" }}
                >
                  Password <span style={{ color: "#D93025" }}>*</span>
                </label>
                <input
                  {...passwordForm.register("password")}
                  type="password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  autoFocus
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
                  style={{
                    borderColor: passwordForm.formState.errors.password
                      ? "#D93025"
                      : "#E0E0E0",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) =>
                    (e.target.style.borderColor =
                      passwordForm.formState.errors.password
                        ? "#D93025"
                        : "#E0E0E0")
                  }
                />
                {passwordForm.formState.errors.password && (
                  <p className="mt-1 text-xs" style={{ color: "#D93025" }}>
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {loginMutation.isError && (
                <div
                  className="p-3 rounded text-sm"
                  style={{ background: "#FFEBEE", color: "#D93025" }}
                >
                  {(loginMutation.error as Error).message}
                </div>
              )}

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-2.5 rounded text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: "#1B0A3C" }}
                onMouseOver={(e) => {
                  if (!loginMutation.isPending)
                    e.currentTarget.style.background = "#2D1260";
                }}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#1B0A3C")
                }
              >
                {loginMutation.isPending ? "Signing in..." : "Log in"}
              </button>

              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: "#1B0A3C" }}
                >
                  Reset password
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
